#!/usr/bin/env python3
"""Upload Spain project images to Cloudinary — more-group/spain/projects/{slug}/"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ssl._create_default_https_context = ssl._create_unverified_context

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
MORE_GROUP = SCRIPTS.parent.parent.parent
CLOUD = "dphvjbqb4"
UPLOAD_WORKERS = 3
RATE_SLEEP = 0.15
MAX_UPLOAD_BYTES = 9_500_000
ROLE_PUBLIC = {"hero": "hero", "inline-1": "inline_1", "inline-2": "inline_2"}


def compress_image_bytes(data: bytes) -> bytes:
    if len(data) <= MAX_UPLOAD_BYTES:
        return data
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    path = tmp.name
    tmp.write(data)
    tmp.close()
    try:
        for max_dim in (2200, 1800, 1400, 1100):
            subprocess.run(["sips", "-Z", str(max_dim), path], check=False, capture_output=True)
            subprocess.run(
                ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "78", path],
                check=False,
                capture_output=True,
            )
            out = Path(path).read_bytes()
            if len(out) <= MAX_UPLOAD_BYTES:
                return out
        return Path(path).read_bytes()
    finally:
        Path(path).unlink(missing_ok=True)


def load_env() -> tuple[str, str, str]:
    for env_path in (
        MORE_GROUP / "more-group-website" / ".env.local",
        MORE_GROUP / "invest-spain-property-website" / ".env.local",
    ):
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
            if m and not os.environ.get(m.group(1)):
                os.environ[m.group(1)] = m.group(2).strip().strip('"')
    cloud = os.environ.get("CLOUDINARY_CLOUD_NAME", CLOUD)
    key = os.environ.get("CLOUDINARY_API_KEY", "")
    secret = os.environ.get("CLOUDINARY_API_SECRET", "")
    if not key or not secret:
        sys.exit("Missing CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in more-group-website/.env.local")
    return cloud, key, secret


def download_bytes(url: str) -> bytes | None:
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (MORE Group Spain)"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except Exception:
            if attempt:
                return None
            time.sleep(0.5)
    return None


def cloudinary_upload(image_bytes: bytes, folder: str, public_id: str, cloud: str, api_key: str, api_secret: str) -> str | None:
    timestamp = str(int(time.time()))
    full_public_id = f"{folder}/{public_id}"
    sig_str = f"overwrite=true&public_id={full_public_id}&timestamp={timestamp}{api_secret}"
    signature = hashlib.sha1(sig_str.encode()).hexdigest()
    boundary = "----MGSpainBoundary"

    def field(name: str, value: str) -> bytes:
        return (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            f"{value}\r\n"
        ).encode()

    body = b""
    body += field("api_key", api_key)
    body += field("timestamp", timestamp)
    body += field("signature", signature)
    body += field("public_id", full_public_id)
    body += field("overwrite", "true")
    body += (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="image.jpg"\r\n'
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode()
    body += image_bytes
    body += f"\r\n--{boundary}--\r\n".encode()

    upload_url = f"https://api.cloudinary.com/v1_1/{cloud}/image/upload"
    req = urllib.request.Request(
        upload_url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            return json.loads(resp.read()).get("secure_url")
    except urllib.error.HTTPError as e:
        print(f"    Cloudinary HTTP {e.code}: {e.read().decode(errors='replace')[:180]}")
        return None
    except Exception as e:
        print(f"    Cloudinary error: {e}")
        return None


def upload_one(job: dict) -> dict:
    slug, role, source_url, alt, cloud, key, secret, dry_run, kid = (
        job[k] for k in ("slug", "role", "source_url", "alt", "cloud", "key", "secret", "dry_run", "kid")
    )
    folder = f"more-group/spain/projects/{slug}"
    public_id = ROLE_PUBLIC.get(role, role.replace("-", "_"))

    if dry_run:
        return {
            "kid": kid,
            "slug": slug,
            "role": role,
            "ok": True,
            "secure_url": f"https://res.cloudinary.com/{cloud}/image/upload/{folder}/{public_id}.jpg",
        }

    img = download_bytes(source_url)
    if not img:
        return {"kid": kid, "slug": slug, "role": role, "ok": False, "error": "download_failed", "source_url": source_url}

    img = compress_image_bytes(img)
    url = cloudinary_upload(img, folder, public_id, cloud, key, secret)
    time.sleep(RATE_SLEEP)
    if url:
        return {
            "kid": kid,
            "slug": slug,
            "role": role,
            "ok": True,
            "secure_url": url,
            "source_url": source_url,
            "alt": alt,
            "public_id": f"{folder}/{public_id}",
        }
    return {"kid": kid, "slug": slug, "role": role, "ok": False, "error": "upload_failed", "source_url": source_url}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--slug", action="append", default=[])
    parser.add_argument("--workers", type=int, default=UPLOAD_WORKERS)
    args = parser.parse_args()

    manifest_in = SCRIPTS / "spain-project-images-all.json"
    manifest_out = SCRIPTS / "spain-cloudinary-manifest.json"
    articles = json.loads(manifest_in.read_text(encoding="utf-8"))["articles"]
    if args.slug:
        articles = [a for a in articles if a["slug"] in args.slug]

    cloud, key, secret = load_env()
    existing = json.loads(manifest_out.read_text(encoding="utf-8")) if manifest_out.exists() else {"uploaded": {}, "failed": []}
    uploaded = existing.get("uploaded", {})

    jobs = []
    for article in articles:
        slug = article["slug"]
        for img in article["images"]:
            role = img["role"]
            kid = f"{slug}:{role}"
            if kid in uploaded and uploaded[kid].get("secure_url"):
                continue
            jobs.append(
                {
                    "slug": slug,
                    "role": role,
                    "source_url": img["url"],
                    "alt": img.get("alt", ""),
                    "cloud": cloud,
                    "key": key,
                    "secret": secret,
                    "dry_run": args.dry_run,
                    "kid": kid,
                }
            )

    print(f"Spain projects: {len(articles)} articles, {len(jobs)} images to upload")
    if not jobs:
        print("Nothing pending.")
        return

    ok = fail = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(upload_one, j): j for j in jobs}
        for fut in as_completed(futures):
            res = fut.result()
            if res.get("ok"):
                ok += 1
                uploaded[res["kid"]] = res
                print(f"  ✓ {res['kid']}")
            else:
                fail += 1
                existing.setdefault("failed", []).append(res)
                print(f"  ✗ {res['kid']} — {res.get('error')}")

    existing["uploaded"] = uploaded
    existing["cloud"] = cloud
    existing["generatedAt"] = time.strftime("%Y-%m-%d")
    if not args.dry_run:
        manifest_out.write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nDone: {ok} ok, {fail} failed → {manifest_out}")


if __name__ == "__main__":
    main()
