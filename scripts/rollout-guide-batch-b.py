#!/usr/bin/env python3
"""Apply batch-B thematic images only (43 guide MDX files)."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
BATCH_B_PATH = SCRIPTS / "mexico-guide-images-batch-b.json"

spec = importlib.util.spec_from_file_location("rollout_guides", SCRIPTS / "rollout-guide-images.py")
rollout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rollout)


def main() -> None:
    batch_b = json.loads(BATCH_B_PATH.read_text(encoding="utf-8"))
    articles = {a["slug"]: a for a in batch_b["articles"]}
    excluded = rollout.load_excluded()
    rollout.verify_urls(articles, excluded)
    changed = 0
    for slug in sorted(articles):
        if rollout.apply_to_mdx(slug, articles[slug]):
            changed += 1
    print(f"Done. Updated {changed}/{len(articles)} batch-B guide files.")


if __name__ == "__main__":
    main()
