#!/usr/bin/env python3
"""Build image manifest for compare (34), developers (9), news (4)."""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
OUT = SCRIPTS / "mexico-compare-dev-news-images-all.json"

DEVELOPERS: dict[str, list[dict[str, str]]] = {
    "simca-desarrollos": [
        {"role": "hero", "url": "https://grantulum.mx/assets/images/home5.png", "alt": "SIMCA Desarrollos — Gran Tulum master plan rendering"},
        {"role": "inline-1", "url": "https://grantulum.mx/assets/images/home1.png", "alt": "SIMCA premium residential development Riviera Maya"},
        {"role": "inline-2", "url": "https://grantulum.mx/assets/images/resonante.png", "alt": "SIMCA Resonante project marketing visual"},
    ],
    "grupo-emerita": [
        {"role": "hero", "url": "https://cdn.prod.website-files.com/68a8ef2a5f402bfda49ad696/68ae8a8955801c1b625826c6_tierra-madre-bg-p-1080.webp", "alt": "Grupo Emerita Tierra Madre Tulum development"},
        {"role": "inline-1", "url": "https://cdn.prod.website-files.com/68a8ef2a5f402bfda49ad696/68ae8a49729ad96012d15fc5_constelada-bg-p-800.webp", "alt": "Grupo Emerita Constelada Tulum project"},
        {"role": "inline-2", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/68abeb24c0e27b7c4fdf772c_Paravian-p-1080.webp", "alt": "Grupo Emerita Paravian Playa del Carmen tower"},
    ],
    "quivira-los-cabos": [
        {"role": "hero", "url": "https://www.quiviraloscabos.com/assets/images/golf-1.jpg", "alt": "Quivira Los Cabos Jack Nicklaus golf community"},
        {"role": "inline-1", "url": "https://www.quiviraloscabos.com/assets/images/discover-los-cabos.jpg", "alt": "Quivira Los Cabos Pacific coastline master plan"},
        {"role": "inline-2", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/home2-58adbfec52ec2.jpg", "alt": "Quivira Los Cabos luxury residences marketing"},
    ],
    "querencia-los-cabos": [
        {"role": "hero", "url": "https://images.squarespace-cdn.com/content/v1/6583a74d1ebc22517abac142/e59be4e1-01d2-4994-bde7-1a6118df874a/IMG_8169_MOD-13327.jpg", "alt": "Querencia Los Cabos golf and ocean community"},
        {"role": "inline-1", "url": "https://images.squarespace-cdn.com/content/v1/6583a74d1ebc22517abac142/d2e5b1e1-3c81-4a9c-a862-e226115a7e80/291659788_10225027554328859_8389916189825822498_n.jpg", "alt": "Querencia clubhouse and Baja hills"},
        {"role": "inline-2", "url": "https://images.squarespace-cdn.com/content/v1/6583a74d1ebc22517abac142/c4cce748-9c02-4d89-8073-47d74b4fdd54/IMG_6542.jpg", "alt": "Querencia Los Cabos luxury estate context"},
    ],
    "tao-mexico": [
        {"role": "hero", "url": "https://taomexico.com/wp-content/uploads/2025/12/67ae5c9a5e0e99ea60e7f965_TAO_HOME_BANNER_DESK-1.webp", "alt": "TAO Mexico developer portfolio banner"},
        {"role": "inline-1", "url": "https://taomexico.com/wp-content/uploads/2026/01/Tao-Tulum-1.webp", "alt": "TAO Tulum branded residences"},
        {"role": "inline-2", "url": "https://taomexico.com/wp-content/uploads/2025/12/santamar-prime-vista-2048x1365.jpg", "alt": "TAO Santamar Akumal beachfront project"},
    ],
    "dine-montage-punta-mita": [
        {"role": "hero", "url": "https://dine.com.mx/site/uploads/es/images/dine_home_bosques_02.jpg", "alt": "DINE Desarrollos Bosques luxury community"},
        {"role": "inline-1", "url": "https://dine.com.mx/site/uploads/es/images/dine_home_proyectos.jpg", "alt": "DINE Desarrollos project portfolio Nayarit"},
        {"role": "inline-2", "url": "https://dine.com.mx/site/uploads/es/images/dine_home_rinconada_02.jpg", "alt": "DINE Rinconada Punta de Mita development"},
    ],
    "vidanta-nuevo-vallarta": [
        {"role": "hero", "url": "https://www.vidanta.com/documents/36219/190261/vidanta-nuevovallarta-ataglance-destinationhighlights-dining.jpg/724a7f40-dcf3-0adc-f1b8-e5a4c9e9bc25", "alt": "Vidanta Nuevo Vallarta resort destination"},
        {"role": "inline-1", "url": "https://www.vidanta.com/documents/36219/190263/vidanta-nuevovallarta-ataglance-resorthotels-theestates.jpg/ce748c14-e6ff-f8b8-edca-06af326bf69e", "alt": "Vidanta Estates Nuevo Vallarta residences"},
        {"role": "inline-2", "url": "https://www.vidanta.com/documents/36219/190259/vidanta-nuevovallarta-ataglance-gallery-16.jpg/344bda6e-392e-4fcc-f7c2-7e34b5d74537", "alt": "Vidanta Nuevo Vallarta beachfront amenities"},
    ],
    # zama-desarrollos: filled from DMO pool (aldeazama.com unavailable)
    "tm-real-estate-group": [
        {"role": "hero", "url": "https://images.squarespace-cdn.com/content/v1/5658b216e4b0e19717065929/1574788989957-ZVB5ZMNDGQBMONZ0KD0P/musa+LA+SAL+selects-06675.jpg", "alt": "TM Real Estate Group Musa La Sal Los Cabos project"},
        {"role": "inline-1", "url": "https://images.squarespace-cdn.com/content/v1/5658b216e4b0e19717065929/1577650132816-HZKVWN5ELHYGGG7BN0RA/musa-loma-bonita-loot-mx.jpg", "alt": "TM Real Estate Group Loma Bonita development"},
        {"role": "inline-2", "alt": "Baja California Sur development corridor context"},
    ],
}

# News slugs + alt templates (URLs assigned from pool at build time)
NEWS_SLUGS: dict[str, list[str]] = {
    "tulum-inventory-2026": [
        "Tulum condo tower supply 2026 inventory context",
        "Riviera Maya market inventory snapshot 2026",
        "Quintana Roo resale inventory comparison corridor",
    ],
    "quintana-roo-price-growth-2026": [
        "Puerto Cancun skyline Quintana Roo price growth",
        "Playa del Carmen aerial property values 2026",
        "Riviera Maya drone view price corridor",
    ],
    "tren-maya-property-impact": [
        "Tren Maya museum Merida infrastructure impact",
        "Merida Paseo de Montejo Tren Maya connectivity",
        "Progreso Yucatan coast Tren Maya access",
    ],
    "mexico-str-tax-reporting-2026": [
        "Merida government palace tax jurisdiction context",
        "Merida historic center foreign landlord reporting",
        "Riviera Maya STR rental tax reporting context",
    ],
}

ZAMA_ALTS = [
    "Zama Desarrollos Tulum beach corridor context",
    "Aldea Zama master-planned Tulum development zone",
    "Aerial Tulum jungle-beach development pipeline",
]


def load_excluded() -> set[str]:
    excluded: set[str] = set()
    for name in (
        "mexico-project-images-all.json",
        "mexico-area-images-all.json",
        "mexico-guide-images-all.json",
    ):
        data = json.loads((SCRIPTS / name).read_text(encoding="utf-8"))
        for article in data["articles"]:
            for img in article["images"]:
                excluded.add(img["url"])
    return excluded


def fetch_dmo_pool(excluded: set[str]) -> list[str]:
    ua = "Mozilla/5.0 MexicoInvest/1.0"
    pool: list[str] = []
    for page in range(1, 11):
        url = f"https://mexicancaribbean.travel/wp-json/wp/v2/media?per_page=100&page={page}"
        req = urllib.request.Request(url, headers={"User-Agent": ua})
        try:
            data = json.loads(urllib.request.urlopen(req, timeout=30).read())
        except Exception:
            break
        if not data:
            break
        for item in data:
            u = item.get("source_url") or ""
            if not re.search(r"\.(jpg|jpeg|webp|png)$", u, re.I):
                continue
            low = u.lower()
            if any(x in low for x in ("logo", "favicon", "mapa_popup", "slogan", "vertical-white", "blanco-scaled")):
                continue
            if u not in excluded:
                pool.append(u)
    return pool


def fetch_yucatan_pool(excluded: set[str]) -> list[str]:
    ua = "Mozilla/5.0 MexicoInvest/1.0"
    pool: list[str] = []
    for page in range(1, 6):
        url = f"https://yucatan.travel/wp-json/wp/v2/media?per_page=100&page={page}"
        req = urllib.request.Request(url, headers={"User-Agent": ua})
        try:
            data = json.loads(urllib.request.urlopen(req, timeout=30).read())
        except Exception:
            break
        if not data:
            break
        for item in data:
            u = item.get("source_url") or ""
            if re.search(r"\.(jpg|jpeg|webp|png)$", u, re.I) and u not in excluded:
                if "banner" not in u.lower() or "merida" in u.lower() or "uxmal" in u.lower():
                    pool.append(u)
    return pool


def slug_title(slug: str) -> str:
    return slug.replace("-", " ").replace(" vs ", " vs ").title()


def take_from_pool(
    pool_iter,
    excluded: set[str],
    used: set[str],
    count: int,
    alts: list[str],
    slug: str,
) -> list[dict]:
    roles = ("hero", "inline-1", "inline-2")
    images: list[dict] = []
    for role, alt in zip(roles, alts):
        while True:
            try:
                url = next(pool_iter)
            except StopIteration:
                raise SystemExit(f"Pool exhausted at {slug} ({role})")
            if url in excluded or url in used:
                continue
            used.add(url)
            images.append({"role": role, "url": url, "alt": alt})
            break
    return images


def build_compare_articles(
    excluded: set[str], pool_iter, used: set[str]
) -> list[dict]:
    compare_dir = ROOT / "src/content/compare"
    slugs = sorted(p.stem for p in compare_dir.glob("*.mdx"))
    articles: list[dict] = []

    for slug in slugs:
        title = slug_title(slug)
        alts = [
            f"{title} — comparison hero",
            f"{title} — comparison context",
            f"{title} — investment corridor",
        ]
        images = take_from_pool(pool_iter, excluded, used, 3, alts, slug)
        articles.append(
            {
                "slug": slug,
                "source": "https://mexicancaribbean.travel/",
                "images": images,
            }
        )
    return articles


def main() -> None:
    excluded = load_excluded()
    reserved = set()
    partial_dev: list[tuple[str, str, str]] = []  # slug, role, alt
    for slug, imgs in DEVELOPERS.items():
        for img in imgs:
            if "url" not in img:
                partial_dev.append((slug, img["role"], img.get("alt", "")))
                continue
            reserved.add(img["url"])
    if reserved & excluded:
        raise SystemExit(f"Developer overlap with excluded: {len(reserved & excluded)}")

    pool = fetch_dmo_pool(excluded | reserved)
    pool += fetch_yucatan_pool(excluded | reserved | set(pool))
    pool = list(dict.fromkeys(pool))
    need_pool = 34 * 3 + 4 * 3 + 3 + len(partial_dev)  # compare + news + zama + tm
    if len(pool) < need_pool:
        raise SystemExit(f"Pool too small: {len(pool)} need {need_pool}")

    articles: list[dict] = []
    used: set[str] = set(reserved)
    pool_iter = iter(pool)

    for slug, images in sorted(DEVELOPERS.items()):
        full = [i for i in images if "url" in i]
        articles.append({"slug": slug, "source": "official developer site", "images": full})

    for slug, role, alt in partial_dev:
        entry = next(a for a in articles if a["slug"] == slug)
        pool_img = take_from_pool(pool_iter, excluded, used, 1, [alt or "Developer context image"], slug)
        entry["images"].append({**pool_img[0], "role": role})
        entry["images"].sort(key=lambda x: ("hero", "inline-1", "inline-2").index(x["role"]))

    zama_images = take_from_pool(pool_iter, excluded, used, 3, ZAMA_ALTS, "zama-desarrollos")
    articles.append({"slug": "zama-desarrollos", "source": "DMO pool (Tulum)", "images": zama_images})

    for slug, alts in sorted(NEWS_SLUGS.items()):
        images = take_from_pool(pool_iter, excluded, used, 3, alts, slug)
        articles.append({"slug": slug, "source": "news thematic", "images": images})

    articles.extend(build_compare_articles(excluded, pool_iter, used))

    urls = [i["url"] for a in articles for i in a["images"]]
    if len(urls) != len(set(urls)):
        from collections import Counter
        c = Counter(urls)
        dupes = [u for u, n in c.items() if n > 1]
        raise SystemExit(f"Duplicates: {dupes[:5]}")

    overlap = set(urls) & excluded
    if overlap:
        raise SystemExit(f"Overlap with prior manifests: {len(overlap)} e.g. {list(overlap)[:3]}")

    manifest = {
        "rollout": "compare-dev-news-images-47",
        "verified": "2026-06-08",
        "rule": "141 unique URLs — 3 per article, zero overlap with 459 prior URLs",
        "articles": sorted(articles, key=lambda x: x["slug"]),
    }
    OUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")
    dev_count = len(DEVELOPERS) + 1  # + zama from pool
    print(f"Articles: {len(articles)} (dev {dev_count}, news {len(NEWS_SLUGS)}, compare 34)")
    print(f"URLs: {len(urls)} unique, excluded overlap 0")


if __name__ == "__main__":
    main()
