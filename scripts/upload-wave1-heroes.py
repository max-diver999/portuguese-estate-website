#!/usr/bin/env python3
"""Upload the wave-1 relocation heroes to the active niche Cloudinary account.

Same public_id convention as the main Portugal rollout
(more-group/portugal/<collection>/<slug>/hero) so the delivery URLs and the
uniqueness audit behave identically. Idempotent: re-running overwrites in place.
"""
from __future__ import annotations
import base64, hashlib, json, os, sys, time, urllib.error, urllib.request, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / ".content-os" / "batches" / (sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "wave1-heroes.json")
PREFIX = "more-group/portugal"
LEGACY_CLOUD = "dlrrtf6bq"


def load_env(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip("\"'"))


load_env(ROOT / ".env.local")
load_env(ROOT.parent / "99_Системное" / ".env.cloudinary-niche-active")
CLOUD = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
KEY = os.environ.get("CLOUDINARY_API_KEY", "")
SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")
if CLOUD == LEGACY_CLOUD:
    sys.exit(f"Refusing upload to legacy {LEGACY_CLOUD}, it is read-only")
if not (CLOUD and KEY and SECRET):
    sys.exit("Missing Cloudinary credentials")

UA = {"User-Agent": "MOREGroup-hero-upload/1.0 (editorial use)"}
MAX_EDGE = 1920  # same ceiling as the main Portugal rollout


def fetch(url: str) -> bytes:
    """Commons rate-limits bursts of full-resolution downloads; back off and retry."""
    last = None
    for attempt in range(5):
        if attempt:
            time.sleep(5 * attempt)
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180).read()
        except urllib.error.HTTPError as exc:
            last = exc
            if exc.code not in (429, 503):
                raise
            print(f"    commons HTTP {exc.code}, retry {attempt + 1}/4")
    return b""  # caller decides whether a fallback source is acceptable


def fetch_with_fallback(item: dict) -> bytes:
    """Prefer the Commons original. When it stays rate-limited, the 1280px thumb
    is served from a different host and is already the delivery width."""
    blob = fetch(item["originalUrl"])
    if blob:
        return blob
    print("    falling back to the 1280px Commons thumbnail")
    blob = fetch(item["url"])
    if not blob:
        raise SystemExit(f"Commons unreachable for {item['slug']}")
    return blob


def already_uploaded(pid: str) -> bool:
    req = urllib.request.Request(f"https://api.cloudinary.com/v1_1/{CLOUD}/resources/image/upload/{pid}")
    req.add_header("Authorization", "Basic " + base64.b64encode(f"{KEY}:{SECRET}".encode()).decode())
    try:
        urllib.request.urlopen(req, timeout=60)
        return True
    except urllib.error.HTTPError:
        return False


def downscale(blob: bytes) -> bytes:
    """Commons originals run to 8000px and 12 MB. Cloudinary rejects the base64
    payload long before that, and the delivery transform is 1280 wide anyway."""
    from io import BytesIO
    from PIL import Image

    im = Image.open(BytesIO(blob))
    if im.mode not in ("RGB", "L"):
        im = im.convert("RGB")
    if max(im.size) > MAX_EDGE:
        im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
    buf = BytesIO()
    im.save(buf, "JPEG", quality=88, optimize=True, progressive=True)
    return buf.getvalue()


def sign(params: dict) -> str:
    payload = "&".join(f"{k}={params[k]}" for k in sorted(params)) + SECRET
    return hashlib.sha1(payload.encode()).hexdigest()


def upload(item: dict, blob: bytes) -> dict:
    pid = f"{PREFIX}/{item['collection']}/{item['slug']}/hero"
    ts = str(int(time.time()))
    signed = {"public_id": pid, "overwrite": "true", "timestamp": ts}
    body = {
        **signed,
        "api_key": KEY,
        "signature": sign(signed),
        "file": "data:image/jpeg;base64," + base64.b64encode(blob).decode(),
    }
    req = urllib.request.Request(
        f"https://api.cloudinary.com/v1_1/{CLOUD}/image/upload",
        data=urllib.parse.urlencode(body).encode(),
        headers=UA,
    )
    return json.loads(urllib.request.urlopen(req, timeout=300).read())


data = json.loads(MANIFEST.read_text(encoding="utf-8"))
out = []
for item in data["images"]:
    pid = f"{PREFIX}/{item['collection']}/{item['slug']}/hero"
    if already_uploaded(pid) and "--force" not in sys.argv:
        print(f"  {item['slug']:24} already on {CLOUD}, skipping download")
        res = {"public_id": pid, "width": 1920, "height": 0}
    else:
        blob = downscale(fetch_with_fallback(item))
        res = upload(item, blob)
        print(f"  {item['slug']:24} {res['width']}x{res['height']}  {len(blob) // 1024} KB  -> {res['public_id']}")
        time.sleep(2)
    cdn = f"https://res.cloudinary.com/{CLOUD}/image/upload/f_auto,q_auto,w_{data['deliveryWidth']}/{res['public_id']}"
    out.append({**item, "cloudinaryUrl": cdn, "cloudWidth": res["width"], "cloudHeight": res["height"]})

data["cloud"] = CLOUD
data["images"] = out
MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"\nuploaded {len(out)} heroes to {CLOUD}; manifest updated")
