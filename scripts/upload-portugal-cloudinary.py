#!/usr/bin/env python3
"""Idempotently upload the Portugal hero manifest to the niche Cloudinary account."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
SOURCE_MANIFEST = SCRIPTS / "portugal-commons-images.json"
UPLOAD_MANIFEST = SCRIPTS / "portugal-cloudinary-manifest.json"
EXPECTED_CLOUD = "dlrrtf6bq"
PREFIX = "more-group/portugal"
MAX_EDGE = 1920
WARNING_PERCENT = 50.0
HARD_STOP_PERCENT = 60.0
CHECKPOINT_SIZE = 25


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def credentials() -> tuple[str, str, str]:
    load_env_file(ROOT / ".env.local")
    load_env_file(ROOT.parent / "99_Системное" / ".env.cloudinary-niche")
    cloud = os.environ.get("CLOUDINARY_CLOUD_NAME", EXPECTED_CLOUD)
    key = os.environ.get("CLOUDINARY_API_KEY", "")
    secret = os.environ.get("CLOUDINARY_API_SECRET", "")
    if cloud != EXPECTED_CLOUD:
        raise SystemExit(f"Refusing upload: expected Cloudinary cloud {EXPECTED_CLOUD}, got {cloud}")
    if not key or not secret:
        raise SystemExit("Missing Cloudinary credentials")
    return cloud, key, secret


def auth_header(key: str, secret: str) -> str:
    token = base64.b64encode(f"{key}:{secret}".encode()).decode()
    return f"Basic {token}"


def admin_json(path: str, key: str, secret: str) -> dict:
    req = urllib.request.Request(f"https://api.cloudinary.com/v1_1/{EXPECTED_CLOUD}{path}")
    req.add_header("Authorization", auth_header(key, secret))
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)


def usage(key: str, secret: str) -> dict:
    return admin_json("/usage", key, secret)


def usage_percent(data: dict) -> float:
    credits = data["credits"]
    return float(credits["usage"]) / float(credits["limit"]) * 100


def usage_snapshot(data: dict, label: str) -> dict:
    return {
        "label": label,
        "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "percent": round(usage_percent(data), 4),
        "credits": round(float(data["credits"]["usage"]), 4),
        "storage_credits": round(float(data["storage"].get("credits_usage", 0)), 4),
        "bandwidth_credits": round(float(data["bandwidth"].get("credits_usage", 0)), 4),
        "transformation_credits": round(float(data["transformations"].get("credits_usage", 0)), 4),
    }


def projected_percent(current: dict, next_count: int) -> float:
    # Conservative free-plan estimate: each hero can add up to 1 MB of source
    # storage and four responsive derived transformations after rollout.
    storage_credits = next_count / 1024
    transformation_credits = (next_count * 4) / 1000
    projected_credits = float(current["credits"]["usage"]) + storage_credits + transformation_credits
    return projected_credits / float(current["credits"]["limit"]) * 100


def enforce_usage(current: dict, next_count: int, label: str) -> None:
    percent = usage_percent(current)
    projected = projected_percent(current, next_count)
    print(f"Usage checkpoint {label}: {percent:.2f}% (projected after next {next_count}: {projected:.2f}%)")
    if percent >= HARD_STOP_PERCENT or projected > HARD_STOP_PERCENT:
        raise SystemExit(
            f"HARD STOP: Cloudinary usage {percent:.2f}%, projected {projected:.2f}% after next batch"
        )
    if percent >= WARNING_PERCENT:
        print(f"WARNING: Cloudinary usage is at or above {WARNING_PERCENT:.0f}%")


def list_existing(key: str, secret: str) -> dict[str, dict]:
    existing: dict[str, dict] = {}
    cursor = ""
    while True:
        query = urllib.parse.urlencode(
            {
                "type": "upload",
                "prefix": f"{PREFIX}/",
                "max_results": 500,
                "context": "true",
                **({"next_cursor": cursor} if cursor else {}),
            }
        )
        data = admin_json(f"/resources/image/upload?{query}", key, secret)
        for resource in data.get("resources", []):
            existing[resource["public_id"]] = resource
        cursor = data.get("next_cursor", "")
        if not cursor:
            return existing


def source_hash(item: dict) -> str:
    return hashlib.sha256(item["originalUrl"].encode()).hexdigest()


def public_id(item: dict) -> str:
    return f"{PREFIX}/{item['collection']}/{item['slug']}/hero"


def sign(params: dict[str, str], secret: str) -> str:
    payload = "&".join(f"{key}={params[key]}" for key in sorted(params))
    return hashlib.sha1(f"{payload}{secret}".encode()).hexdigest()


def download(item: dict) -> bytes:
    request = urllib.request.Request(
        item["url"],
        headers={
            "User-Agent": "portuguese-estate-image-migration/1.0 (https://portuguese-estate.com; info@portuguese-estate.com)"
        },
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                if response.headers.get_content_type() != "image/jpeg":
                    raise RuntimeError(f"Unexpected source format for {item['slug']}")
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 4:
                raise
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"Could not download {item['slug']}")


def multipart(fields: dict[str, str], image: bytes) -> tuple[bytes, str]:
    boundary = f"----MGPortugal{int(time.time() * 1000)}"
    chunks: list[bytes] = []
    for key, value in fields.items():
        chunks.append(
            (
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="{key}"\r\n\r\n'
                f"{value}\r\n"
            ).encode()
        )
    chunks.append(
        (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="file"; filename="hero.jpg"\r\n'
            "Content-Type: image/jpeg\r\n\r\n"
        ).encode()
    )
    chunks.extend([image, f"\r\n--{boundary}--\r\n".encode()])
    return b"".join(chunks), boundary


def upload(item: dict, key: str, secret: str) -> dict:
    pid = public_id(item)
    marker = source_hash(item)
    timestamp = str(int(time.time()))
    signed = {
        "context": f"source_sha256={marker}",
        "overwrite": "false",
        "public_id": pid,
        "timestamp": timestamp,
    }
    fields = {
        **signed,
        "api_key": key,
        "signature": sign(signed, secret),
    }
    if "/1280px-" not in item["url"] or not item["url"].lower().split("?", 1)[0].endswith((".jpg", ".jpeg")):
        raise RuntimeError(f"Source is not the controlled 1280px JPEG rendition: {item['slug']}")
    body, boundary = multipart(fields, download(item))
    request = urllib.request.Request(
        f"https://api.cloudinary.com/v1_1/{EXPECTED_CLOUD}/image/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:300]
        raise RuntimeError(f"Cloudinary HTTP {error.code}: {detail}") from error
    if result.get("public_id") != pid or result.get("format") not in {"jpg", "jpeg"}:
        raise RuntimeError(f"Unexpected upload response for {pid}")
    if max(int(result.get("width", 0)), int(result.get("height", 0))) > MAX_EDGE:
        raise RuntimeError(f"Uploaded source exceeds {MAX_EDGE}px: {pid}")
    time.sleep(1)
    return {
        "public_id": pid,
        "source_url": item["url"],
        "original_url": item["originalUrl"],
        "source_page": item["sourcePage"],
        "source_sha256": marker,
        "secure_url": result["secure_url"],
        "version": result.get("version"),
        "format": result.get("format"),
        "width": result.get("width"),
        "height": result.get("height"),
        "bytes": result.get("bytes"),
        "uploaded_at": result.get("created_at"),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--slug", action="append", default=[])
    parser.add_argument("--workers", type=int, default=1)
    args = parser.parse_args()

    cloud, key, secret = credentials()
    source = json.loads(SOURCE_MANIFEST.read_text(encoding="utf-8"))
    items = source["images"]
    if source.get("total") != 132 or len(items) != 132 or len({x["commonsTitle"] for x in items}) != 132:
        raise SystemExit("Source manifest inventory is not exactly 132 unique images")
    if args.slug:
        requested = set(args.slug)
        items = [item for item in items if item["slug"] in requested]
        missing = requested - {item["slug"] for item in items}
        if missing:
            raise SystemExit(f"Unknown slug(s): {', '.join(sorted(missing))}")

    state = (
        json.loads(UPLOAD_MANIFEST.read_text(encoding="utf-8"))
        if UPLOAD_MANIFEST.exists()
        else {"cloud": cloud, "prefix": PREFIX, "uploaded": {}, "failed": []}
    )
    uploaded = state.setdefault("uploaded", {})
    remote = list_existing(key, secret)
    jobs: list[dict] = []
    resumed = 0

    for item in items:
        pid = public_id(item)
        marker = source_hash(item)
        saved = uploaded.get(item["slug"])
        if saved and saved.get("public_id") == pid and saved.get("source_sha256") == marker:
            resumed += 1
            continue
        if pid in remote:
            remote_marker = (remote[pid].get("context") or {}).get("custom", {}).get("source_sha256")
            if remote_marker != marker:
                raise SystemExit(f"Collision guard: {pid} already exists with a different or missing source marker")
            raise SystemExit(f"Remote asset {pid} matches source but is absent from local manifest; recover it before continuing")
        jobs.append(item)

    print(f"Portugal heroes: selected={len(items)} pending={len(jobs)} resumed={resumed} dry_run={args.dry_run}")
    for item in jobs:
        print(f"  {public_id(item)}")
    if args.dry_run or not jobs:
        return

    failures: list[dict] = []
    checkpoints = state.setdefault("usage_checkpoints", [])
    initial_usage = usage(key, secret)
    enforce_usage(initial_usage, min(CHECKPOINT_SIZE, len(jobs)), "before-upload")
    checkpoints.append(usage_snapshot(initial_usage, "before-upload"))

    for offset in range(0, len(jobs), CHECKPOINT_SIZE):
        batch = jobs[offset : offset + CHECKPOINT_SIZE]
        with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 4))) as pool:
            futures = {pool.submit(upload, item, key, secret): item for item in batch}
            for future in as_completed(futures):
                item = futures[future]
                try:
                    uploaded[item["slug"]] = future.result()
                    print(f"  uploaded {public_id(item)}")
                except Exception as error:
                    failures.append({"slug": item["slug"], "error": str(error)[:240]})
                    print(f"  failed {public_id(item)}: {error}")
                state["failed"] = failures
                state["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                UPLOAD_MANIFEST.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

        current = usage(key, secret)
        completed = min(offset + len(batch), len(jobs))
        label = f"after-{completed}-new"
        next_count = min(CHECKPOINT_SIZE, len(jobs) - completed)
        checkpoints.append(usage_snapshot(current, label))
        state["usage_checkpoints"] = checkpoints
        UPLOAD_MANIFEST.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        enforce_usage(current, next_count, label)
        if failures:
            break

    if failures:
        raise SystemExit(f"{len(failures)} upload(s) failed; rerun to resume")
    print(f"Complete: {len(uploaded)} asset(s) recorded")


if __name__ == "__main__":
    main()
