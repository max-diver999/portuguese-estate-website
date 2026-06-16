#!/usr/bin/env python3
"""Merge batch-B thematic images into mexico-guide-images-all.json."""
from __future__ import annotations

import json
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ALL_PATH = SCRIPTS / "mexico-guide-images-all.json"
BATCH_B_PATH = SCRIPTS / "mexico-guide-images-batch-b.json"


def main() -> None:
    all_data = json.loads(ALL_PATH.read_text(encoding="utf-8"))
    batch_b = json.loads(BATCH_B_PATH.read_text(encoding="utf-8"))
    b_map = {a["slug"]: a for a in batch_b["articles"]}

    replaced = 0
    for i, article in enumerate(all_data["articles"]):
        if article["slug"] in b_map:
            all_data["articles"][i] = b_map[article["slug"]]
            replaced += 1

    if replaced != len(b_map):
        missing = set(b_map) - {a["slug"] for a in all_data["articles"]}
        raise SystemExit(f"Batch B slugs missing from all.json: {sorted(missing)}")

    all_urls = [img["url"] for a in all_data["articles"] for img in a["images"]]
    if len(all_urls) != len(set(all_urls)):
        raise SystemExit("Duplicate URLs after merge")

    all_data["rollout"] = "guide-images-all-86-thematic"
    all_data["batch_b_upgraded"] = "2026-06-09"
    ALL_PATH.write_text(json.dumps(all_data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Merged {replaced} batch-B entries into {ALL_PATH}")
    print(f"Total guide URLs: {len(all_urls)} unique")


if __name__ == "__main__":
    main()
