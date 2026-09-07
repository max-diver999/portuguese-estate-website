#!/usr/bin/env python3
"""Re-host a town hero from Commons onto the active cloud under its new slug.

The rebuilt town pages carry the same photograph as the area pages they
replace, which is correct: the image is of the right town. Pointing at the old
legacy public_id is not, because the legacy manifest and the dimensions cache
are counted against each other and the retired slug has to leave both.
"""
from __future__ import annotations
import json, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UA = {"User-Agent": "MOREGroup-hero-rehost/1.0 (editorial use)"}
API = "https://commons.wikimedia.org/w/api.php"


def file_url(source_page: str) -> tuple[str, int, int]:
    title = urllib.parse.unquote(source_page.rsplit("/wiki/", 1)[1])
    u = f"{API}?" + urllib.parse.urlencode({
        "action": "query", "format": "json", "titles": title,
        "prop": "imageinfo", "iiprop": "url|size",
    })
    j = json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=90))
    page = next(iter(j["query"]["pages"].values()))
    ii = page["imageinfo"][0]
    return ii["url"], ii["width"], ii["height"]


rows = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
out = []
for r in rows:
    url, w, h = file_url(r["sourcePage"])
    out.append({**r, "collection": "property-for-sale", "originalUrl": url, "url": url,
                "width": w, "height": h, "commonsTitle": "File:" + url.rsplit("/", 1)[1],
                "subject": r["slug"]})
    print(f"  resolved {r['slug']:22} {w}x{h}")
dest = ROOT / ".content-os" / "batches" / "wave3-heroes-rehost.json"
dest.write_text(json.dumps({"rollout": "portugal-wave3-town-rehost", "generated": "2026-09-07",
    "source": "Wikimedia Commons", "rule": "Same photograph as the retired area page, re-hosted under the new slug.",
    "deliveryWidth": 1280, "total": len(out), "images": out}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("wrote", dest)
