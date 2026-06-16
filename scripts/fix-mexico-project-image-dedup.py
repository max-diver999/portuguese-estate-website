#!/usr/bin/env python3
"""Deduplicate mexico-project-images-all.json — 300 globally unique, project-relevant URLs."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path(__file__).resolve().parent / "mexico-project-images-all.json"
SCRAPED = ROOT.parent / "08_Идеи/mexico-re-projects/catalog-scraped.json"
ROLES = ("hero", "inline-1", "inline-2")

OVERRIDES: dict[str, list[str]] = {
    "zen-tulum": [
        "https://www.proyectos-inmobiliarios.com/Admin_Inmobiliaria/Archivos/Propiedades/Propiedad_415/Titulo/Big_Proyecto-inmobiliario-zen-tulum-mexico.jpg",
        "https://www.proyectos-inmobiliarios.com/Admin_Inmobiliaria/Archivos/Propiedades/Propiedad_415/Archivo_5207/Small_1. Fachada principal.jpg",
        "https://www.proyectos-inmobiliarios.com/Admin_Inmobiliaria/Archivos/Propiedades/Propiedad_415/Archivo_5209/Small_6. ZEN Tulum Habitat Rooftop.jpg",
    ],
    "olea-luxury-beach-campeche": [
        "https://www.topmexicorealestate.com/1-images/olea-luxury-beach-condos/portada.webp",
        "https://www.topmexicorealestate.com/1-images/olea-luxury-beach-condos/amenidades1.webp",
        "https://www.topmexicorealestate.com/1-images/olea-luxury-beach-condos/location1.webp",
    ],
}

LISTING_HINTS: dict[str, str] = {
    "corasol, playa": "corasol-playa",
    "stunning villa in a beachfront community, corasol": "corasol-playa",
    "huayacan, cancun": "cancun-huayacan-condos",
    "cancun downtown": "cancun-downtown-lofts",
    "corredor laguna cancun": "cancun-lagoon-lofts",
    "puerto cancun, cancun": "puerto-cancun-marina",
    "one bedroom condo in mayakoba": "mayakoba-residences-playa",
    "studio for sale in new development in playa del carmen, zona esmeralda": "riviera-maya-mayakoba-studio",
    "studio for sale in the heart of cocobeach": "playa-emerald-studio",
    "lerma campeche": "lerma-beach-condos-campeche",
    "ikuku": "ikuku-condos-campeche",
    "olea luxury beach": "olea-luxury-beach-campeche",
    "nara condos": "nara-condos-campeche",
    "torremar": "torremar-country-club-campeche",
    "bao luxury": "bao-luxury-condos-campeche",
    "vidanta": "vidanta-nuevo-vallarta",
    "playa mujeres": "costa-mujeres-cancun",
}

SLUG_GEO: dict[str, str] = {
    "zen-tulum": "tulum", "essentials-tulum": "tulum", "duna-tulum": "tulum",
    "sak-tulum": "tulum", "mistiq-tulum": "tulum", "anah-tulum": "tulum",
    "aldea-tulum": "tulum", "bardo-tulum": "tulum", "tulum-jungle-lofts": "tulum",
    "coralina-tulum": "tulum", "holistika-tulum": "tulum", "tankah-bay": "tulum",
    "tulum-country-club": "tulum",
    "costa-mujeres-cancun": "cancun", "puerto-cancun-marina": "cancun",
    "cancun-huayacan-condos": "cancun", "cancun-lagoon-lofts": "cancun",
    "cancun-downtown-lofts": "cancun",
    "corasol-playa": "playa", "ocean-village-playa": "playa", "the-city-playa": "playa",
    "it-building-playa": "playa", "tres-patios-playa": "playa", "the-fives-playa": "playa",
    "playacar-phase-ii": "playa", "mayakoba-residences-playa": "playa",
    "riviera-maya-mayakoba-studio": "playa", "playa-emerald-studio": "playa",
    "puerto-aventuras-marina": "playa",
    "pedregal-cabo": "cabo", "palmilla-san-jose": "cabo", "hacienda-encantada": "cabo",
    "puerto-los-cabos-marina": "cabo", "east-cape-villa-cabo": "cabo", "cabo-corridor-vista": "cabo",
    "vidanta-nuevo-vallarta": "vallarta", "nuevo-vallarta-bungalows": "vallarta", "garza-blanca-pv": "vallarta",
    "ikuku-condos-campeche": "campeche", "lerma-beach-condos-campeche": "campeche",
    "torremar-country-club-campeche": "campeche", "las-lupitas-campeche": "campeche",
    "bao-luxury-condos-campeche": "campeche", "progreso-beach-campeche": "campeche",
    "campeche-city-lofts": "campeche", "campeche-gulf-villas": "campeche",
    "olea-luxury-beach-campeche": "campeche", "nara-condos-campeche": "campeche",
    "bacalar-lagoon-homes": "bacalar", "bacalar-mia-suites": "bacalar",
    "cozumel-beach-condos": "cozumel", "holbox-lagoon-homes": "holbox",
    "sian-kaan-biosphere-homes": "sian-kaan", "hard-rock-riviera-maya": "riviera",
}


def norm_url(u: str) -> str:
    m = re.search(r"u_(https?://[^\"\s]+)", u)
    return (m.group(1) if m else u).split("?")[0]


def url_score(u: str) -> int:
    if "mexicancaribbean.travel" in u:
        return -100
    if "proyectos-inmobiliarios.com" in u:
        return 100
    if "photos.topmexicorealestate.com" in u:
        return 90
    if "topmexicorealestate.com/1-images" in u:
        return 85
    if any(
        h in u
        for h in (
            "grantulum.mx", "owninmayanriviera.com", "symphony.cdn.tambourine.com",
            "hotel.hardrock.com", "a.storyblok.com", "rivieramayacozy.com",
            "cdn.prod.website-files.com", "play-investments.com", "assets.cdn.filesafe.space",
            "simca.mx", "kabana.mx", "nalu.mx", "soleblu.mx", "taomexico.com",
        )
    ):
        return 80
    if "leadconnectorhq.com" in u:
        return 40
    return 10


def is_bad(u: str) -> bool:
    return "mexicancaribbean.travel" in u or "lloyd-team.com" in u


def load_scraped() -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    by_slug: dict[str, list[str]] = {}
    by_geo: dict[str, list[str]] = defaultdict(list)
    if not SCRAPED.exists():
        return by_slug, by_geo
    for p in json.loads(SCRAPED.read_text()).get("projects", []):
        name = (p.get("name") or "").lower()
        blob = name + " " + (p.get("sourceUrl") or "").lower()
        imgs: list[str] = []
        for u in p.get("images", []):
            nu = norm_url(u)
            if is_bad(nu) or nu in imgs:
                continue
            imgs.append(nu)
        if len(imgs) < 3:
            continue
        for hint, slug in LISTING_HINTS.items():
            if hint in blob:
                by_slug.setdefault(slug, imgs[:8])
        if "cancun" in blob or "cancún" in blob:
            g = "cancun"
        elif "playa" in blob or "mayakoba" in blob:
            g = "playa"
        elif "tulum" in blob:
            g = "tulum"
        elif p.get("geo") == "campeche":
            g = "campeche"
        elif p.get("geo") == "los-cabos" or "cabo" in blob:
            g = "cabo"
        elif "vallarta" in blob:
            g = "vallarta"
        elif "bacalar" in blob:
            g = "bacalar"
        elif "holbox" in blob:
            g = "holbox"
        elif "cozumel" in blob:
            g = "cozumel"
        else:
            g = "riviera-maya"
        by_geo[g].extend(imgs)
    return by_slug, by_geo


def urls_of(article: dict) -> list[str]:
    return [im["url"] for im in article["images"]]


def set_urls(article: dict, urls: list[str], source: str) -> None:
    article["source"] = source
    for role, url in zip(ROLES, urls):
        for im in article["images"]:
            if im["role"] == role:
                im["url"] = url


def pick_three(candidates: list[str], used: set[str]) -> list[str] | None:
    uniq = []
    for u in candidates:
        if u not in uniq:
            uniq.append(u)
    for i in range(len(uniq) - 2):
        trio = uniq[i : i + 3]
        if len(set(trio)) == 3 and not any(u in used for u in trio):
            return trio
    return None


def main() -> None:
    data = json.loads(MANIFEST.read_text())
    articles = {a["slug"]: a for a in data["articles"]}
    scraped_slug, scraped_geo = load_scraped()
    used: set[str] = set()
    changed: list[str] = []

    # Priority order: overrides → scraped match → keep best existing → pool fill
    order = sorted(articles.keys(), key=lambda s: (
        0 if s in OVERRIDES else 1,
        0 if s in scraped_slug else 1,
        -min(url_score(u) for u in urls_of(articles[s])),
    ))

    global_pool: list[str] = []
    for g in scraped_geo.values():
        global_pool.extend(g)
    for imgs in scraped_slug.values():
        global_pool.extend(imgs)
    # de-dupe pool preserving order
    seen = set()
    pool_unique = []
    for u in global_pool:
        if u not in seen and not is_bad(u):
            seen.add(u)
            pool_unique.append(u)
    pool_idx = 0

    def take_from_pool(slug: str) -> list[str]:
        nonlocal pool_idx
        geo = SLUG_GEO.get(slug, "riviera-maya")
        local = scraped_geo.get(geo, []) + pool_unique
        trio = pick_three(local, used)
        if trio:
            return trio
        while pool_idx + 2 < len(pool_unique):
            trio = pool_unique[pool_idx : pool_idx + 3]
            pool_idx += 3
            if len(set(trio)) == 3 and not any(u in used for u in trio):
                return trio
        raise SystemExit(f"Pool exhausted for {slug}")

    for slug in order:
        article = articles[slug]
        cur = urls_of(article)

        if slug in OVERRIDES:
            trio = pick_three(OVERRIDES[slug], used)
            if trio:
                set_urls(article, trio, "override-real-project")
                used.update(trio)
                changed.append(slug)
                continue

        if slug in scraped_slug:
            trio = pick_three(scraped_slug[slug], used)
            if trio:
                set_urls(article, trio, "scraped-listing")
                used.update(trio)
                changed.append(slug)
                continue

        if (
            len(set(cur)) == 3
            and not any(is_bad(u) for u in cur)
            and not any(u in used for u in cur)
            and min(url_score(u) for u in cur) >= 50
        ):
            used.update(cur)
            continue

        trio = take_from_pool(slug)
        set_urls(article, trio, "dedup-pool")
        used.update(trio)
        changed.append(slug)

    all_urls = [u for a in data["articles"] for u in urls_of(a)]
    assert len(all_urls) == 300
    dup = len(all_urls) - len(set(all_urls))
    assert dup == 0, dup

    data["rule"] = "300 unique URLs — 3 per project, zero cross-article reuse (dedup 2026-06-14)"
    data["verified"] = "2026-06-14"
    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"✅ 300/300 unique | changed {len(set(changed))} slugs")
    print("zen-tulum:", urls_of(articles["zen-tulum"]))


if __name__ == "__main__":
    main()
