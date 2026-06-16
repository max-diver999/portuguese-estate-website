#!/usr/bin/env python3
"""
Upload Mexico content images to Cloudinary from per-collection manifests.

Folders:
  more-group/mexico/projects/{slug}/
  more-group/mexico/guides/{slug}/
  more-group/mexico/areas/{slug}/
  more-group/mexico/{compare|developers|news}/{slug}/

Usage:
  python3 scripts/upload-mexico-cloudinary.py --collection guides
  python3 scripts/upload-mexico-cloudinary.py --collection areas
  python3 scripts/upload-mexico-cloudinary.py --collection editorial
  python3 scripts/upload-mexico-cloudinary.py --collection projects
  python3 scripts/upload-mexico-cloudinary.py --collection all
"""
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

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent

CLOUD = "dphvjbqb4"
UPLOAD_WORKERS = 3
RATE_SLEEP = 0.15
MAX_UPLOAD_BYTES = 9_500_000
ROLE_PUBLIC = {"hero": "hero", "inline-1": "inline_1", "inline-2": "inline_2"}

COLLECTIONS = {
    "projects": {
        "manifest_in": SCRIPTS / "mexico-project-images-all.json",
        "manifest_out": SCRIPTS / "mexico-cloudinary-manifest.json",
        "folder": lambda _slug: "more-group/mexico/projects",
        "key_id": lambda slug, role: f"{slug}:{role}",
    },
    "guides": {
        "manifest_in": SCRIPTS / "mexico-guide-images-all.json",
        "manifest_out": SCRIPTS / "mexico-cloudinary-guides-manifest.json",
        "folder": lambda _slug: "more-group/mexico/guides",
        "key_id": lambda slug, role: f"guides:{slug}:{role}",
    },
    "areas": {
        "manifest_in": SCRIPTS / "mexico-area-images-all.json",
        "manifest_out": SCRIPTS / "mexico-cloudinary-areas-manifest.json",
        "folder": lambda _slug: "more-group/mexico/areas",
        "key_id": lambda slug, role: f"areas:{slug}:{role}",
    },
    "editorial": {
        "manifest_in": SCRIPTS / "mexico-compare-dev-news-images-all.json",
        "manifest_out": SCRIPTS / "mexico-cloudinary-editorial-manifest.json",
        "folder": None,  # resolved per slug
        "key_id": lambda slug, role: f"editorial:{slug}:{role}",
    },
}

EDITORIAL_DIRS = {
    "compare": ROOT / "src/content/compare",
    "developers": ROOT / "src/content/developers",
    "news": ROOT / "src/content/news",
}


def editorial_subfolder(slug: str) -> str:
    for name, path in EDITORIAL_DIRS.items():
        if (path / f"{slug}.mdx").exists():
            return f"more-group/mexico/{name}"
    raise FileNotFoundError(f"No editorial MDX for slug: {slug}")


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
                print(f"    compressed {len(data) // 1024}KB → {len(out) // 1024}KB")
                return out
        return Path(path).read_bytes()
    finally:
        Path(path).unlink(missing_ok=True)


def load_env() -> tuple[str, str, str]:
    for env_path in (ROOT / ".env.local", ROOT.parent / "more-group-website" / ".env.local"):
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
        sys.exit("Missing CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET")
    return cloud, key, secret


def download_bytes(url: str) -> bytes | None:
    from urllib.parse import quote, urlparse, urlunparse

    parsed = urlparse(url)
    if " " in parsed.path:
        url = urlunparse(
            (parsed.scheme, parsed.netloc, quote(parsed.path, safe="/"), parsed.params, parsed.query, parsed.fragment)
        )
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (MORE Group)"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if attempt:
                return None
            time.sleep(0.5)
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
    boundary = "----MGMexicoBoundary"

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
    slug, role, source_url, alt, folder, cloud, key, secret, dry_run, kid = (
        job[k]
        for k in ("slug", "role", "source_url", "alt", "folder", "cloud", "key", "secret", "dry_run", "kid")
    )
    public_id = ROLE_PUBLIC.get(role, role.replace("-", "_"))
    full_folder = f"{folder}/{slug}"

    if dry_run:
        return {"kid": kid, "slug": slug, "role": role, "ok": True, "secure_url": f"https://res.cloudinary.com/{cloud}/image/upload/{full_folder}/{public_id}.jpg"}

    img = download_bytes(source_url)
    if not img:
        return {"kid": kid, "slug": slug, "role": role, "ok": False, "error": "download_failed", "source_url": source_url}

    img = compress_image_bytes(img)
    url = cloudinary_upload(img, full_folder, public_id, cloud, key, secret)
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
            "public_id": f"{full_folder}/{public_id}",
        }
    return {"kid": kid, "slug": slug, "role": role, "ok": False, "error": "upload_failed", "source_url": source_url}


def run_collection(name: str, cfg: dict, cloud: str, key: str, secret: str, slugs: list[str], dry_run: bool, workers: int) -> tuple[int, int]:
    manifest_in = cfg["manifest_in"]
    manifest_out = cfg["manifest_out"]
    articles = json.loads(manifest_in.read_text(encoding="utf-8"))["articles"]
    if slugs:
        articles = [a for a in articles if a["slug"] in slugs]

    existing = json.loads(manifest_out.read_text(encoding="utf-8")) if manifest_out.exists() else {"uploaded": {}, "failed": []}
    uploaded = existing.get("uploaded", {})

    jobs = []
    for article in articles:
        slug = article["slug"]
        if name == "editorial":
            base_folder = editorial_subfolder(slug)
        else:
            base_folder = cfg["folder"](slug)
        for img in article["images"]:
            role = img["role"]
            kid = cfg["key_id"](slug, role)
            if kid in uploaded and uploaded[kid].get("secure_url"):
                if uploaded[kid].get("source_url") == img["url"]:
                    continue
            jobs.append(
                {
                    "slug": slug,
                    "role": role,
                    "source_url": img["url"],
                    "alt": img.get("alt", ""),
                    "folder": base_folder,
                    "cloud": cloud,
                    "key": key,
                    "secret": secret,
                    "dry_run": dry_run,
                    "kid": kid,
                }
            )

    print(f"\n[{name}] {len(articles)} articles, {len(jobs)} images to upload")
    if not jobs:
        print(f"[{name}] complete (nothing pending)")
        return 0, 0

    ok = fail = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(upload_one, j): j for j in jobs}
        for fut in as_completed(futures):
            res = fut.result()
            label = res["kid"]
            if res.get("ok"):
                ok += 1
                uploaded[label] = res
                print(f"  ✓ {label}")
            else:
                fail += 1
                existing.setdefault("failed", []).append(res)
                print(f"  ✗ {label} — {res.get('error', 'unknown')}")

    existing["uploaded"] = uploaded
    existing["cloud"] = cloud
    existing["collection"] = name
    existing["generatedAt"] = time.strftime("%Y-%m-%d")
    if not dry_run:
        manifest_out.write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[{name}] Done: {ok} ok, {fail} failed → {manifest_out.name}")
    return ok, fail


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--collection", default="projects", choices=[*COLLECTIONS, "all"])
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--slug", action="append", default=[])
    parser.add_argument("--workers", type=int, default=UPLOAD_WORKERS)
    args = parser.parse_args()

    cloud, key, secret = load_env()
    names = list(COLLECTIONS) if args.collection == "all" else [args.collection]
    total_ok = total_fail = 0
    for name in names:
        if name == "projects" and args.collection == "all":
            continue  # projects already migrated
        ok, fail = run_collection(name, COLLECTIONS[name], cloud, key, secret, args.slug, args.dry_run, args.workers)
        total_ok += ok
        total_fail += fail
    print(f"\nTotal: {total_ok} ok, {total_fail} failed")


if __name__ == "__main__":
    main()
