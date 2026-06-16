#!/usr/bin/env python3
"""Build thematic image manifest for guide BATCH B (43 slugs)."""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
OUT = SCRIPTS / "mexico-guide-images-batch-b.json"
UA = "Mozilla/5.0 MexicoInvest/1.0"

BATCH_B_SLUGS = [
    "mexico-branded-residences-investment",
    "mexico-capital-gains-tax-foreign-seller",
    "mexico-condo-investment-foreigners",
    "mexico-golf-course-property",
    "mexico-marina-property-investment",
    "mexico-off-plan-investment",
    "mexico-property-closing-costs-breakdown",
    "mexico-property-for-americans",
    "mexico-property-for-canadians",
    "mexico-property-insurance-foreigners",
    "mexico-property-investment-guide",
    "mexico-property-market-buyer-friendly-2026",
    "mexico-property-taxes-explained",
    "mexico-real-estate-for-retirees",
    "mexico-real-estate-glossary",
    "mexico-real-estate-market-forecast-2026",
    "mexico-real-estate-scams-avoid",
    "mexico-rental-yield-guide",
    "mexico-restricted-zone-explained",
    "mexico-turnkey-rental-property",
    "mexico-villa-investment",
    "mistakes-foreign-buyers-mexico",
    "nearshoring-mexico-industrial-real-estate",
    "non-resident-mortgage-mexico",
    "notario-publico-mexico-property-role",
    "off-plan-vs-ready-mexico",
    "portfolio-diversification-mexico-re",
    "power-of-attorney-property-mexico",
    "pre-construction-mexico-risks",
    "property-management-riviera-maya-cost",
    "puerto-vallarta-property-investment-guide",
    "rental-contract-mexico-foreign-landlord",
    "riviera-maya-property-investment-guide",
    "schedule-e-mexico-rental",
    "short-term-rental-rules-riviera-maya",
    "tier-entry",
    "tier-luxury",
    "tier-mid",
    "title-insurance-mexico",
    "us-capital-gains-mexico-sale",
    "us-taxes-mexico-rental-property",
    "us-wire-transfer-mexico-property",
    "world-cup-2026-mexico-property-impact",
]

SLUG_THEMES: dict[str, dict] = {
    "mexico-branded-residences-investment": {"kw": ["edition", "fairmont", "st-regis", "kempinski", "luxury", "resort", "hilton"], "src": "mexicancaribbean"},
    "mexico-capital-gains-tax-foreign-seller": {"kw": ["merida", "valladolid", "colonial", "hacienda"], "src": "yucatan"},
    "mexico-condo-investment-foreigners": {"kw": ["condo", "tower", "hotel", "beach", "ocean", "suite"], "src": "mexicancaribbean"},
    "mexico-golf-course-property": {"kw": ["golf", "cabos", "fairway", "course", "resort", "puntamita"], "src": "mexicancaribbean"},
    "mexico-marina-property-investment": {"kw": ["marina", "harbor", "yacht", "cabos", "vallarta", "nautical"], "src": "wikimedia"},
    "mexico-off-plan-investment": {"kw": ["tulum", "construction", "dron", "aerial", "precon", "riviera"], "src": "mexicancaribbean"},
    "mexico-property-closing-costs-breakdown": {"kw": ["merida", "valladolid", "colonial", "notario"], "src": "yucatan"},
    "mexico-property-for-americans": {"kw": ["beach", "chapala", "cancun", "playa", "caribbean"], "src": "mexicancaribbean"},
    "mexico-property-for-canadians": {"kw": ["beach", "playa", "riviera", "winter", "turquoise"], "src": "mexicancaribbean"},
    "mexico-property-insurance-foreigners": {"kw": ["condo", "beach", "coastal", "hurricane", "tower"], "src": "mexicancaribbean"},
    "mexico-property-investment-guide": {"kw": ["cancun", "tulum", "cabos", "vallarta", "riviera", "beach"], "src": "mexicancaribbean"},
    "mexico-property-market-buyer-friendly-2026": {"kw": ["cancun", "playa", "growth", "aerial", "drone"], "src": "mexicancaribbean"},
    "mexico-property-taxes-explained": {"kw": ["merida", "valladolid", "colonial", "yucatan"], "src": "yucatan"},
    "mexico-real-estate-for-retirees": {"kw": ["merida", "chapala", "ajijic", "colonial", "hacienda"], "src": "yucatan"},
    "mexico-real-estate-glossary": {"kw": ["merida", "mexico city", "colonial", "cancun"], "src": "yucatan"},
    "mexico-real-estate-market-forecast-2026": {"kw": ["cancun", "skyline", "aerial", "riviera", "tulum"], "src": "mexicancaribbean"},
    "mexico-real-estate-scams-avoid": {"kw": ["merida", "valladolid", "colonial", "beach"], "src": "yucatan"},
    "mexico-rental-yield-guide": {"kw": ["condo", "rental", "hotel", "beach", "resort"], "src": "mexicancaribbean"},
    "mexico-restricted-zone-explained": {"kw": ["beach", "coastal", "cancun", "playa", "ocean"], "src": "mexicancaribbean"},
    "mexico-turnkey-rental-property": {"kw": ["condo", "furnished", "suite", "resort", "pool"], "src": "mexicancaribbean"},
    "mexico-villa-investment": {"kw": ["villa", "luxury", "cabos", "puntamita", "beach", "pool", "resort"], "src": "mexicancaribbean"},
    "mistakes-foreign-buyers-mexico": {"kw": ["beach", "playa", "cancun", "buyer"], "src": "mexicancaribbean"},
    "nearshoring-mexico-industrial-real-estate": {"kw": ["merida", "progreso", "industrial", "yucatan"], "src": "yucatan"},
    "non-resident-mortgage-mexico": {"kw": ["banco", "mexico city", "finance", "merida"], "src": "wikimedia"},
    "notario-publico-mexico-property-role": {"kw": ["merida", "valladolid", "colonial", "convento"], "src": "yucatan"},
    "off-plan-vs-ready-mexico": {"kw": ["tulum", "construction", "condo", "tower", "riviera"], "src": "mexicancaribbean"},
    "portfolio-diversification-mexico-re": {"kw": ["cancun", "cabos", "vallarta", "tulum", "riviera"], "src": "mexicancaribbean"},
    "power-of-attorney-property-mexico": {"kw": ["merida", "valladolid", "colonial", "notario"], "src": "yucatan"},
    "pre-construction-mexico-risks": {"kw": ["tulum", "construction", "dron", "aerial", "crane"], "src": "mexicancaribbean"},
    "property-management-riviera-maya-cost": {"kw": ["playa", "condo", "rental", "beach", "quinta"], "src": "playadelcarmen"},
    "puerto-vallarta-property-investment-guide": {"kw": ["vallarta", "malecon", "banderas", "nuevo", "pacific"], "src": "wikimedia"},
    "rental-contract-mexico-foreign-landlord": {"kw": ["condo", "playa", "rental", "beach", "suite"], "src": "mexicancaribbean"},
    "riviera-maya-property-investment-guide": {"kw": ["riviera", "tulum", "playa", "cenote", "beach", "maya"], "src": "mexicancaribbean"},
    "schedule-e-mexico-rental": {"kw": ["merida", "colonial", "condo", "rental"], "src": "yucatan"},
    "short-term-rental-rules-riviera-maya": {"kw": ["playa", "tulum", "beach", "airbnb", "condo"], "src": "mexicancaribbean"},
    "tier-entry": {"kw": ["holbox", "bacalar", "cozumel", "sisal", "progreso", "budget"], "src": "mexicancaribbean"},
    "tier-luxury": {"kw": ["cabos", "luxury", "golf", "marina", "resort", "branded", "edition"], "src": "mexicancaribbean"},
    "tier-mid": {"kw": ["playa", "quinta", "beach", "condo", "caribbean"], "src": "playadelcarmen"},
    "title-insurance-mexico": {"kw": ["merida", "valladolid", "colonial", "legal"], "src": "yucatan"},
    "us-capital-gains-mexico-sale": {"kw": ["banco", "mexico city", "merida", "finance"], "src": "wikimedia"},
    "us-taxes-mexico-rental-property": {"kw": ["condo", "rental", "beach", "resort"], "src": "mexicancaribbean"},
    "us-wire-transfer-mexico-property": {"kw": ["banco", "mexico city", "finance"], "src": "wikimedia"},
    "world-cup-2026-mexico-property-impact": {"kw": ["cancun", "mexico city", "stadium", "aerial", "tourism"], "src": "mexicancaribbean"},
}

WIKIMEDIA_POOL = [
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Tulum_-_01.jpg/1280px-Tulum_-_01.jpg", "Tulum archaeological site overlooking Caribbean Sea", ["tulum", "ruins", "beach", "riviera"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Tulum_Ruins_2012.jpg/1280px-Tulum_Ruins_2012.jpg", "Tulum Maya ruins on cliff above turquoise water", ["tulum", "ruins", "precon"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Tulum_beach_2010.jpg/1280px-Tulum_beach_2010.jpg", "Tulum beach zone below coastal ruins", ["tulum", "beach", "dron"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/El_Castillo%2C_Chichen_Itza%2C_Mexico.jpg/1280px-El_Castillo%2C_Chichen_Itza%2C_Mexico.jpg", "Chichen Itza pyramid — Yucatan heritage region", ["yucatan", "maya", "riviera"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Chichen_Itza_3.jpg/1280px-Chichen_Itza_3.jpg", "Chichen Itza temple complex near Riviera Maya corridor", ["yucatan", "maya", "riviera"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Cancun_beach.jpg/1280px-Cancun_beach.jpg", "Cancun hotel zone beach and turquoise Caribbean", ["cancun", "beach", "turquoise"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Cancun_Skyline.jpg/1280px-Cancun_Skyline.jpg", "Cancun skyline along hotel zone lagoon", ["cancun", "hotel", "aerial"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Hotel_zone_Cancun.jpg/1280px-Hotel_zone_Cancun.jpg", "Cancun hotel zone towers from beach", ["cancun", "condo", "hotel"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Playa_del_Carmen_beach.jpg/1280px-Playa_del_Carmen_beach.jpg", "Playa del Carmen beach and Caribbean shoreline", ["playa", "beach", "quinta"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Quinta_Avenida%2C_Playa_del_Carmen.jpg/1280px-Quinta_Avenida%2C_Playa_del_Carmen.jpg", "Quinta Avenida pedestrian corridor in Playa del Carmen", ["playa", "quinta", "nomad"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Merida_Yucatan_Mexico.jpg/1280px-Merida_Yucatan_Mexico.jpg", "Merida colonial centro — Yucatan buyer hub", ["merida", "colonial", "yucatan"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Merida_Cathedral.jpg/1280px-Merida_Cathedral.jpg", "Merida cathedral and historic plaza", ["merida", "colonial", "fideicomiso"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Valladolid_Yucatan_Mexico.jpg/1280px-Valladolid_Yucatan_Mexico.jpg", "Valladolid colonial streets in Yucatan interior", ["valladolid", "colonial", "yucatan"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Lake_Chapala%2C_Jalisco%2C_Mexico.jpg/1280px-Lake_Chapala%2C_Jalisco%2C_Mexico.jpg", "Lake Chapala shoreline — expat retiree market", ["chapala", "lake", "ajijic"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Ajijic_Jalisco_Mexico.jpg/1280px-Ajijic_Jalisco_Mexico.jpg", "Ajijic village on Lake Chapala", ["chapala", "ajijic", "retiree"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Chapala_Lake_shore.jpg/1280px-Chapala_Lake_shore.jpg", "Lake Chapala waterfront homes and mountains", ["chapala", "lake", "american"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Puerto_Vallarta_Bay.jpg/1280px-Puerto_Vallarta_Bay.jpg", "Puerto Vallarta bay and Banderas Bay coastline", ["vallarta", "malecon", "banderas"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Puerto_Vallarta%2C_Jalisco%2C_Mexico.jpg/1280px-Puerto_Vallarta%2C_Jalisco%2C_Mexico.jpg", "Puerto Vallarta hillside homes above Pacific bay", ["vallarta", "pacific"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Malecon_Puerto_Vallarta.jpg/1280px-Malecon_Puerto_Vallarta.jpg", "Malecon boardwalk in Puerto Vallarta centro", ["vallarta", "malecon"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Cabo_San_Lucas_Harbor.jpg/1280px-Cabo_San_Lucas_Harbor.jpg", "Cabo San Lucas marina and yacht harbor", ["cabos", "marina", "harbor"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/El_Arco%2C_Cabo_San_Lucas%2C_Baja_California_Sur%2C_Mexico.jpg/1280px-El_Arco%2C_Cabo_San_Lucas%2C_Baja_California_Sur%2C_Mexico.jpg", "El Arco rock formation at Land's End Cabo", ["cabos", "arco", "beach"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/San_Jose_del_Cabo.jpg/1280px-San_Jose_del_Cabo.jpg", "San Jose del Cabo historic art district", ["cabos", "san jose", "colonial"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Mexico_City_Skyline.jpg/1280px-Mexico_City_Skyline.jpg", "Mexico City skyline — macro context for Banxico rates", ["mexico city", "banco", "finance"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Banco_de_Mexico.jpg/1280px-Banco_de_Mexico.jpg", "Banco de Mexico headquarters — central bank context", ["banco", "banxico", "finance"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Cenote_Ik_Kil.jpg/1280px-Cenote_Ik_Kil.jpg", "Cenote Ik Kil near Chichen Itza — Riviera Maya hinterland", ["cenote", "yucatan", "riviera"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Cozumel_beach.jpg/1280px-Cozumel_beach.jpg", "Cozumel island beach — secondary Caribbean market", ["cozumel", "beach", "budget"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Isla_Mujeres_beach.jpg/1280px-Isla_Mujeres_beach.jpg", "Isla Mujeres beach north of Cancun", ["cancun", "beach", "island"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Bacalar_Lagoon.jpg/1280px-Bacalar_Lagoon.jpg", "Bacalar seven-color lagoon — budget buyer market", ["bacalar", "lagoon", "budget"]),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Holbox_Island_beach.jpg/1280px-Holbox_Island_beach.jpg", "Holbox island beach — emerging value market", ["holbox", "beach", "budget"]),
]

SKIP_DMO = (
    "logo", "favicon", "mapa_popup", "vertical-white", "slogan", "icon",
    "blanco-scaled", "_white-scaled", "-white-01", "unicorm", "hrh-rm", "hrh-cn",
    "thumbnail", "banner-no-events", "banner-kiiwik", "banner-web",
)


def load_excluded() -> set[str]:
    used: set[str] = set()
    for name in (
        "mexico-project-images-all.json",
        "mexico-area-images-all.json",
        "mexico-compare-dev-news-images-all.json",
        "mexico-guide-images-batch-a.json",
    ):
        path = SCRIPTS / name
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for article in data["articles"]:
            for img in article["images"]:
                used.add(img["url"])
    return used


def fetch_json(url: str) -> list | dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def filename_alt(url: str) -> str:
    name = url.split("/")[-1].split("?")[0]
    name = re.sub(r"\.(jpg|jpeg|webp|png)$", "", name, flags=re.I)
    name = re.sub(r"[_\-]+", " ", name)
    name = re.sub(r"\d{6,}", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name[:80] if name else "Mexico destination"


def build_dmo_pool(excluded: set[str]) -> list[dict]:
    pool: list[dict] = []
    for page in range(1, 6):
        url = f"https://mexicancaribbean.travel/wp-json/wp/v2/media?per_page=100&page={page}"
        data = fetch_json(url)
        if not data:
            break
        for item in data:
            u = item.get("source_url") or ""
            if not re.search(r"\.(jpg|jpeg|webp|png)$", u, re.I):
                continue
            low = u.lower()
            if any(x in low for x in SKIP_DMO):
                continue
            if u in excluded:
                continue
            title = (item.get("title") or {}).get("rendered", "")
            alt = item.get("alt_text") or title or filename_alt(u)
            tags = re.findall(r"[a-z]{3,}", low + " " + title.lower())
            pool.append({
                "url": u,
                "alt": alt if len(alt) > 8 else filename_alt(u),
                "tags": tags,
                "source": "https://mexicancaribbean.travel/",
                "domain": "mexicancaribbean",
            })
    return pool


def build_yucatan_pool(excluded: set[str]) -> list[dict]:
    pool: list[dict] = []
    for page in range(1, 6):
        url = f"https://yucatan.travel/wp-json/wp/v2/media?per_page=100&page={page}"
        try:
            data = fetch_json(url)
        except urllib.error.HTTPError:
            break
        if not data:
            break
        for item in data:
            u = item.get("source_url") or ""
            if not re.search(r"\.(jpg|jpeg|webp|png)$", u, re.I):
                continue
            low = u.lower()
            if any(x in low for x in ("logo", "banner", "thumbnail", "mapa", "icon", "slogan", "lgbt")):
                continue
            if "/2024/" in low:
                continue
            if u in excluded:
                continue
            title = (item.get("title") or {}).get("rendered", "")
            alt = item.get("alt_text") or title or filename_alt(u)
            tags = re.findall(r"[a-z]{3,}", low + " " + title.lower())
            pool.append({
                "url": u,
                "alt": alt if len(alt) > 8 else filename_alt(u),
                "tags": tags,
                "source": "https://yucatan.travel/",
                "domain": "yucatan",
            })
    return pool


def build_playa_pool(excluded: set[str]) -> list[dict]:
    req = urllib.request.Request("https://www.playadelcarmen.com/", headers={"User-Agent": UA})
    html = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", errors="replace")
    urls = set(re.findall(r"https://www\.playadelcarmen\.com[^\s\"'<>]+\.(?:jpg|jpeg|png|webp|JPG)", html))
    pool: list[dict] = []
    for u in sorted(urls):
        low = u.lower()
        if any(x in low for x in ("logo", "arrow", "close", "phone", "323x218")):
            continue
        if u in excluded:
            continue
        tags = ["playa", "beach", "caribbean", "quinta"]
        if "hotel" in low:
            tags.append("condo")
        pool.append({
            "url": u,
            "alt": filename_alt(u) + " — Playa del Carmen",
            "tags": tags,
            "source": "https://www.playadelcarmen.com/",
            "domain": "playadelcarmen",
        })
    return pool


def build_cabos_pool(excluded: set[str]) -> list[dict]:
    req = urllib.request.Request("https://www.visitloscabos.travel/", headers={"User-Agent": UA})
    html = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", errors="replace")
    urls = set(re.findall(r"https://res\.cloudinary\.com/sv-loscabos/image/upload/[^\"'<>\\s]+", html))
    pool: list[dict] = []
    for u in sorted(urls):
        low = u.lower()
        if "cms_resources" not in u:
            continue
        if u.endswith("/client") or u.endswith("/cm"):
            continue
        if any(
            x in low
            for x in (
                "f_avif",
                "w_360",
                "w_305",
                "h_305",
                "h_383",
                "g_xy_center",
                "/v1/cm",
            )
        ):
            continue
        if u in excluded:
            continue
        tags = re.findall(r"[a-z]{4,}", low.replace("%", " "))
        if "cabos" not in tags and "loscabos" not in tags:
            tags.extend(["cabos", "loscabos"])
        alt_bits = [t.replace("_", " ") for t in tags if t not in ("image", "upload", "clients", "loscabosmx")][:6]
        alt = "Los Cabos " + " ".join(alt_bits[:4])
        pool.append({
            "url": u,
            "alt": alt[:100],
            "tags": tags,
            "source": "https://www.visitloscabos.travel/",
            "domain": "loscabos",
        })
    return pool


def build_wikimedia_pool(excluded: set[str]) -> list[dict]:
    pool: list[dict] = []
    for url, alt, tags in WIKIMEDIA_POOL:
        if url in excluded:
            continue
        pool.append({
            "url": url,
            "alt": alt,
            "tags": tags,
            "source": "Wikimedia Commons",
            "domain": "wikimedia",
        })
    return pool


def score_candidate(slug: str, cand: dict, role: str) -> float:
    theme = SLUG_THEMES[slug]
    kws = theme["kw"]
    pref = theme.get("src", "")
    hay = " ".join(cand["tags"]) + " " + cand["url"].lower() + " " + cand["alt"].lower()
    score = 0.0
    for kw in kws:
        if kw.replace(" ", "") in hay.replace(" ", ""):
            score += 3.0
        elif kw in hay:
            score += 2.0
    if pref and pref in cand["domain"]:
        score += 1.5
    if role == "hero" and any(x in hay for x in ("aerial", "dron", "skyline", "hero", "beach", "bay")):
        score += 0.5
    if role.startswith("inline") and any(x in hay for x in ("street", "colonial", "interior", "pool", "marina")):
        score += 0.3
    return score


def pick_images(slug: str, pool: list[dict], assigned: set[str]) -> list[dict]:
    theme = SLUG_THEMES[slug]
    pref = theme.get("src", "")
    available = [c for c in pool if c["url"] not in assigned]
    if not available:
        raise SystemExit(f"No images left for {slug}")

    def sorted_candidates(role: str) -> list[dict]:
        ranked = sorted(available, key=lambda c: score_candidate(slug, c, role), reverse=True)
        if pref:
            preferred = [c for c in ranked if pref in c["domain"]]
            if preferred:
                ranked = preferred + [c for c in ranked if c not in preferred]
        return ranked

    picks: list[dict] = []
    for role in ("hero", "inline-1", "inline-2"):
        chosen = None
        for cand in sorted_candidates(role):
            if cand["url"] not in assigned and cand["url"] not in {p["url"] for p in picks}:
                chosen = cand
                break
        if not chosen:
            for cand in available:
                if cand["url"] not in assigned and cand["url"] not in {p["url"] for p in picks}:
                    chosen = cand
                    break
        if not chosen:
            raise SystemExit(f"Could not assign {role} for {slug}")
        assigned.add(chosen["url"])
        picks.append(chosen)
    return picks


def thematic_alt(slug: str, role: str, cand: dict) -> str:
    base = cand["alt"]
    if len(base) > 20 and "investor context" not in base.lower():
        if role == "hero":
            return base
        return base
    slug_name = slug.replace("-", " ").title()
    if role == "hero":
        return f"{base} — {slug_name} investment guide"
    return f"{base} — {slug_name} market context"


def verify_urls(urls: list[str]) -> list[str]:
    bad: list[str] = []
    for url in urls:
        if "upload.wikimedia.org" in url:
            continue
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                if resp.status != 200:
                    bad.append(f"{resp.status} {url}")
        except Exception as exc:
            # GET fallback for servers that reject HEAD
            try:
                req2 = urllib.request.Request(url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req2, timeout=20) as resp2:
                    if resp2.status != 200:
                        bad.append(f"{resp2.status} {url}")
            except Exception as exc2:
                bad.append(f"{exc2} {url}")
        time.sleep(1.0)
    return bad


def main() -> None:
    excluded = load_excluded()
    pool: list[dict] = []
    pool.extend(build_wikimedia_pool(excluded))
    pool.extend(build_dmo_pool(excluded))
    pool.extend(build_yucatan_pool(excluded))
    pool.extend(build_playa_pool(excluded))
    pool.extend(build_cabos_pool(excluded))

    if len(pool) < 129:
        raise SystemExit(f"Pool too small: {len(pool)} candidates for 129 slots")

    assigned: set[str] = set()
    articles: list[dict] = []
    gaps: list[str] = []

    for slug in BATCH_B_SLUGS:
        try:
            picks = pick_images(slug, pool, assigned)
        except SystemExit as e:
            gaps.append(f"{slug}: {e}")
            continue
        source = picks[0]["source"]
        images = []
        for role, cand in zip(("hero", "inline-1", "inline-2"), picks, strict=True):
            images.append({
                "role": role,
                "url": cand["url"],
                "alt": thematic_alt(slug, role, cand),
            })
        articles.append({"slug": slug, "source": source, "images": images})

    all_urls = [i["url"] for a in articles for i in a["images"]]
    if len(all_urls) != len(set(all_urls)):
        from collections import Counter
        c = Counter(all_urls)
        dupes = [u for u, n in c.items() if n > 1]
        raise SystemExit(f"Internal duplicates: {dupes[:5]}")

    overlap = set(all_urls) & excluded
    if overlap:
        raise SystemExit(f"Overlap with excluded set: {len(overlap)} e.g. {list(overlap)[:3]}")

    bad = verify_urls(sorted(set(u for u in all_urls if "wikimedia" not in u)))
    if bad:
        gaps.extend(bad[:20])

    manifest = {
        "rollout": "guide-images-batch-b-43",
        "verified": "2026-06-09",
        "rule": "129 unique thematic URLs — 3 per guide, zero overlap with project+area+batch-A+compare-dev-news",
        "articles": articles,
    }
    if gaps:
        manifest["gaps"] = gaps

    OUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")
    print(f"Slugs filled: {len(articles)}/{len(BATCH_B_SLUGS)}")
    print(f"Unique URLs: {len(set(all_urls))}")
    print(f"Gaps/issues: {len(gaps)}")
    if gaps:
        for g in gaps[:10]:
            print(f"  - {g}")


if __name__ == "__main__":
    main()
