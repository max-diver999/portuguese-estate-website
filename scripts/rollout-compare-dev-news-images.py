#!/usr/bin/env python3
"""Apply unique hero + 2 inline images to compare, developers, news MDX."""
from __future__ import annotations

import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = Path(__file__).resolve().parent / "mexico-compare-dev-news-images-all.json"

COLLECTIONS = {
    "compare": ROOT / "src/content/compare",
    "developers": ROOT / "src/content/developers",
    "news": ROOT / "src/content/news",
}

IMG_LINE = re.compile(r"^!\[[^\]]*\]\([^)]+\)\s*$", re.M)


def slug_collection(slug: str) -> str:
    for name, path in COLLECTIONS.items():
        if (path / f"{slug}.mdx").exists():
            return name
    raise FileNotFoundError(f"No MDX for slug: {slug}")


def load_articles() -> dict[str, dict]:
    data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {entry["slug"]: entry for entry in data["articles"]}


def load_excluded() -> set[str]:
    excluded: set[str] = set()
    scripts = Path(__file__).resolve().parent
    for name in (
        "mexico-project-images-all.json",
        "mexico-area-images-all.json",
        "mexico-guide-images-all.json",
    ):
        path = scripts / name
        data = json.loads(path.read_text(encoding="utf-8"))
        for article in data["articles"]:
            for img in article["images"]:
                excluded.add(img["url"])
    return excluded


def verify_urls(articles: dict[str, dict], excluded: set[str]) -> None:
    all_urls = [i["url"] for a in articles.values() for i in a["images"]]
    if len(all_urls) != len(set(all_urls)):
        raise SystemExit("Duplicate URLs in compare/dev/news manifest")
    overlap = set(all_urls) & excluded
    if overlap:
        raise SystemExit(f"Overlap with prior manifests: {len(overlap)}")

    ua = "Mozilla/5.0 MexicoInvest/1.0"
    bad: list[str] = []
    for url in sorted(set(all_urls)):
        if "upload.wikimedia.org" in url:
            time.sleep(0.15)
            continue
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": ua})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                if resp.status != 200:
                    bad.append(f"{resp.status} {url}")
        except Exception as exc:
            bad.append(f"{exc} {url}")
        time.sleep(0.35)
    if bad:
        raise SystemExit(f"URL check failed ({len(bad)}):\n" + "\n".join(bad[:10]))
    print(f"Verified manifest: {len(set(all_urls))} unique URLs, 0 overlap")


def apply_to_mdx(slug: str, entry: dict) -> bool:
    coll = slug_collection(slug)
    path = COLLECTIONS[coll] / f"{slug}.mdx"
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError(f"{slug}: missing frontmatter")

    hero = next(i for i in entry["images"] if i["role"] == "hero")
    inlines = [i for i in entry["images"] if i["role"].startswith("inline")]

    fm_end = text.index("\n---\n", 4)
    frontmatter = text[4:fm_end]
    body = text[fm_end + 5 :]

    if "heroImage:" not in frontmatter:
        if re.search(r"^readingTime:\s*\d+\s*$", frontmatter, re.M):
            frontmatter = re.sub(
                r"^(readingTime:\s*\d+\s*)$",
                rf'\1\nheroImage: "{hero["url"]}"',
                frontmatter,
                count=1,
                flags=re.M,
            )
        else:
            frontmatter = frontmatter.rstrip() + f'\nheroImage: "{hero["url"]}"'
    else:
        frontmatter = re.sub(
            r"^heroImage:\s*.*$",
            f'heroImage: "{hero["url"]}"',
            frontmatter,
            count=1,
            flags=re.M,
        )

    body = IMG_LINE.sub("", body)
    body = re.sub(r"\n{3,}", "\n\n", body)

    first_h2 = body.find("\n## ")
    if first_h2 != -1:
        marker = "\n\n---\n\n## "
        section_end = body.find(marker, first_h2 + 1)
        if section_end == -1:
            section_end = body.find("\n## ", first_h2 + 4)
        if section_end != -1:
            block = "\n\n".join(f"![{img['alt']}]({img['url']})" for img in inlines)
            body = body[:section_end].rstrip() + "\n\n" + block + body[section_end:]

    new_text = f"---\n{frontmatter}\n---\n{body}"
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        return True
    return False


def main() -> None:
    articles = load_articles()
    on_disk: set[str] = set()
    for path in COLLECTIONS.values():
        on_disk.update(p.stem for p in path.glob("*.mdx"))

    missing = on_disk - set(articles)
    extra = set(articles) - on_disk
    if missing:
        raise SystemExit(f"Missing manifest entries: {sorted(missing)}")
    if extra:
        raise SystemExit(f"Extra manifest entries: {sorted(extra)}")

    verify_urls(articles, load_excluded())

    changed = 0
    for slug in sorted(articles):
        if apply_to_mdx(slug, articles[slug]):
            changed += 1
    print(f"Done. Updated {changed}/{len(articles)} files (compare+developers+news).")


if __name__ == "__main__":
    main()
