#!/usr/bin/env python3
"""Merge guide image batches, dedupe, and fill batch A from DMO pool."""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
GUIDES = ROOT / "src/content/guides"
BATCH_B = Path("/tmp/batch_b_final.json")
OUT = SCRIPTS / "mexico-guide-images-all.json"


def load_used() -> set[str]:
    used: set[str] = set()
    for name in ("mexico-project-images-all.json", "mexico-area-images-all.json"):
        data = json.loads((SCRIPTS / name).read_text(encoding="utf-8"))
        for article in data["articles"]:
            for img in article["images"]:
                used.add(img["url"])
    return used


def fetch_dmo_pool() -> list[str]:
    ua = "Mozilla/5.0 MexicoInvest/1.0"
    pool: list[str] = []
    for page in range(1, 6):
        url = f"https://mexicancaribbean.travel/wp-json/wp/v2/media?per_page=100&page={page}"
        req = urllib.request.Request(url, headers={"User-Agent": ua})
        data = json.loads(urllib.request.urlopen(req, timeout=30).read())
        if not data:
            break
        for item in data:
            u = item.get("source_url") or ""
            if re.search(r"\.(jpg|jpeg|webp|png)$", u, re.I):
                low = u.lower()
                if any(x in low for x in ("logo", "favicon", "mapa_popup", "vertical-white", "slogan")):
                    continue
                pool.append(u)
    return pool


def slug_alt(slug: str, role: str) -> str:
    name = slug.replace("-", " ").title()
    if role == "hero":
        return f"{name} — Mexico property investment guide"
    return f"{name} — investor context photo"


def fill_batch_a(slugs: list[str], used: set[str], pool: list[str]) -> list[dict]:
    articles: list[dict] = []
    pool_iter = iter(pool)
    for slug in slugs:
        images = []
        for role in ("hero", "inline-1", "inline-2"):
            while True:
                try:
                    url = next(pool_iter)
                except StopIteration:
                    raise SystemExit("DMO pool exhausted for batch A")
                if url in used:
                    continue
                used.add(url)
                images.append({"role": role, "url": url, "alt": slug_alt(slug, role)})
                break
        articles.append(
            {
                "slug": slug,
                "source": "https://mexicancaribbean.travel/",
                "images": images,
            }
        )
    return articles


def main() -> None:
    all_slugs = sorted(p.stem for p in GUIDES.glob("*.mdx"))
    if len(all_slugs) != 86:
        raise SystemExit(f"Expected 86 guides, found {len(all_slugs)}")

    used = load_used()
    batch_b = json.loads(BATCH_B.read_text(encoding="utf-8"))
    batch_b_slugs = {a["slug"] for a in batch_b}

    batch_a_slugs = [s for s in all_slugs if s not in batch_b_slugs]
    if len(batch_a_slugs) != 43:
        raise SystemExit(f"Batch A slug count {len(batch_a_slugs)} != 43")

    # Reserve batch B URLs first
    for article in batch_b:
        for img in article["images"]:
            u = img["url"]
            if u in used:
                raise SystemExit(f"Batch B overlap with existing: {u} ({article['slug']})")
            used.add(u)

    pool = fetch_dmo_pool()
    batch_a = fill_batch_a(batch_a_slugs, used, pool)
    articles = batch_a + batch_b
    articles.sort(key=lambda a: a["slug"])

    urls = [i["url"] for a in articles for i in a["images"]]
    if len(urls) != len(set(urls)):
        from collections import Counter
        c = Counter(urls)
        dupes = [u for u, n in c.items() if n > 1]
        raise SystemExit(f"Duplicate guide URLs: {len(dupes)} e.g. {dupes[:3]}")

    manifest = {
        "rollout": "guide-images-all-86",
        "verified": "2026-06-08",
        "rule": "258 unique URLs — 3 per guide, zero overlap with 201 project+area URLs",
        "articles": articles,
    }
    OUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")
    print(f"Guides: {len(articles)}, URLs: {len(urls)}, unique: {len(set(urls))}")


if __name__ == "__main__":
    main()
