#!/usr/bin/env python3
"""Apply unique hero + 2 inline images to all area MDX files."""
from __future__ import annotations

import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AREAS = ROOT / "src/content/areas"
MANIFEST_PATH = Path(__file__).resolve().parent / "mexico-area-images-all.json"
PROJECT_MANIFEST = Path(__file__).resolve().parent / "mexico-project-images-all.json"

IMG_LINE = re.compile(r"^!\[[^\]]*\]\([^)]+\)\s*$", re.M)


def load_articles() -> dict[str, dict]:
    data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {entry["slug"]: entry for entry in data["articles"]}


def verify_urls(articles: dict[str, dict]) -> None:
    all_urls: list[str] = []
    for entry in articles.values():
        for img in entry["images"]:
            all_urls.append(img["url"])
    if len(all_urls) != len(set(all_urls)):
        dupes = {u for u in all_urls if all_urls.count(u) > 1}
        raise SystemExit(f"Duplicate area URLs: {len(dupes)}")

    if PROJECT_MANIFEST.exists():
        proj = json.loads(PROJECT_MANIFEST.read_text(encoding="utf-8"))
        proj_urls = {i["url"] for a in proj["articles"] for i in a["images"]}
        overlap = set(all_urls) & proj_urls
        if overlap:
            raise SystemExit(f"Overlap with project manifest: {len(overlap)} URLs")

    ua = "Mozilla/5.0 MexicoInvest/1.0"
    bad: list[str] = []
    skipped_wikimedia = 0
    for url in sorted(set(all_urls)):
        if "upload.wikimedia.org" in url:
            skipped_wikimedia += 1
            time.sleep(0.2)
            continue
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": ua})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                if resp.status != 200:
                    bad.append(f"{resp.status} {url}")
        except Exception as exc:
            bad.append(f"{exc} {url}")
        time.sleep(0.6)
    if bad:
        raise SystemExit(f"URL check failed ({len(bad)}):\n" + "\n".join(bad[:10]))
    print(
        f"Verified {len(set(all_urls)) - skipped_wikimedia} CDN URLs (HTTP 200); "
        f"skipped {skipped_wikimedia} pre-checked Wikimedia thumbs"
    )


def apply_to_mdx(slug: str, entry: dict) -> bool:
    path = AREAS / f"{slug}.mdx"
    if not path.exists():
        raise FileNotFoundError(path)
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError(f"{slug}: missing frontmatter")

    hero = next(i for i in entry["images"] if i["role"] == "hero")
    inlines = [i for i in entry["images"] if i["role"].startswith("inline")]

    fm_end = text.index("\n---\n", 4)
    frontmatter = text[4:fm_end]
    body = text[fm_end + 5 :]

    frontmatter = frontmatter.replace('heroImage: \\"', 'heroImage: "').replace('\\"', '"')
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
    slugs_on_disk = sorted(p.stem for p in AREAS.glob("*.mdx"))
    missing = set(slugs_on_disk) - set(articles)
    extra = set(articles) - set(slugs_on_disk)
    if missing:
        raise SystemExit(f"Missing manifest entries: {sorted(missing)}")
    if extra:
        raise SystemExit(f"Extra manifest entries: {sorted(extra)}")

    verify_urls(articles)

    changed = 0
    for slug in sorted(articles):
        if apply_to_mdx(slug, articles[slug]):
            changed += 1
            print(f"  updated {slug}")
        else:
            print(f"  unchanged {slug}")
    print(f"Done. Updated {changed}/{len(articles)} area files.")


if __name__ == "__main__":
    main()
