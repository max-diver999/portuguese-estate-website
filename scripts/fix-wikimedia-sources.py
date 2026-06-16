#!/usr/bin/env python3
"""Replace broken Wikimedia URLs in image manifests with verified CDN fallbacks."""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
MANIFESTS = [
    SCRIPTS / "mexico-guide-images-all.json",
    SCRIPTS / "mexico-area-images-all.json",
]

POOLS = {
    "riviera": [
        "https://cdn.mexicancaribbean.travel/wp-content/uploads/2026/05/22201451/AerialConradTulum-0410508A-2.webp",
        "https://cdn.mexicancaribbean.travel/wp-content/uploads/2026/04/27155433/Hyatt-Centric-Playa-del-Carmen-Rooftop-Aerial1.jpg",
        "https://cdn.mexicancaribbean.travel/wp-content/uploads/2025/11/18230010/playa-mexico-familias-kids-beach-day-scaled.jpg",
        "https://cdn.mexicancaribbean.travel/wp-content/uploads/2025/11/26184011/riviera-maya-drone-beach-coastline-1.jpg",
        "https://cdn.mexicancaribbean.travel/wp-content/uploads/2026/04/22100604/the-riviera-maya-edition.jpg",
    ],
    "cabo": [
        "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/alvarrendering-5e4301b18c367.jpg",
        "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/Quivira-Insets_0001_GettingHere-58a4789e1dd38.jpg",
        "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/cache/Residences-Rotator_0001_Copala-589cc34062d27-930x550.jpg",
    ],
    "pacific": [
        "https://cdn.mexicancaribbean.travel/wp-content/uploads/2026/05/05130242/VS-Beach-Desktop.jpg",
        "https://cdn.mexicancaribbean.travel/wp-content/uploads/2026/05/05120518/VS-Beach.jpg",
        "https://cdn.mexicancaribbean.travel/wp-content/uploads/2026/04/24085928/grand-fiesta-coral-beach.jpg",
    ],
    "inland": [
        "https://cdn.mexicancaribbean.travel/wp-content/uploads/2024/09/30155356/Cenote-negro-bacalar-scaled.jpg",
        "https://cdn.mexicancaribbean.travel/wp-content/uploads/2026/04/22120453/MiaBacalar-Drone-Suites.jpg",
        "https://cdn.mexicancaribbean.travel/wp-content/uploads/2026/05/22142254/cenote-dos-ojos.webp",
    ],
}


def ok(url: str) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=25) as resp:
            return resp.status == 200
    except Exception:
        return False


def pool_for_slug(slug: str) -> list[str]:
    s = slug.lower()
    if re.search(r"cabo|los-cabos|east-cape|corridor|jose-del-cabo", s):
        return POOLS["cabo"]
    if re.search(r"vallarta|bucerias|nuevo-vallarta|punta-de-mita|sayulita|marina", s):
        return POOLS["pacific"]
    if re.search(r"chapala|san-miguel|merida|yucatan|notario|banxico|fatca|fbar|currency", s):
        return POOLS["inland"]
    return POOLS["riviera"]


def main() -> None:
    changed = 0
    for path in MANIFESTS:
        data = json.loads(path.read_text(encoding="utf-8"))
        for article in data["articles"]:
            pool = pool_for_slug(article["slug"])
            for i, img in enumerate(article["images"]):
                url = img["url"]
                if "wikimedia" not in url:
                    continue
                if ok(url):
                    continue
                replacement = pool[i % len(pool)]
                print(f"  {article['slug']}:{img['role']} → {replacement[:70]}...")
                img["url"] = replacement
                changed += 1
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nReplaced {changed} broken Wikimedia URLs")


if __name__ == "__main__":
    main()
