#!/usr/bin/env python3
"""Apply unique hero + 2 inline images to all project MDX files."""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT / "src/content/projects"
MANIFEST_PATH = Path(__file__).resolve().parent / "mexico-project-images-all.json"

# slug -> {source, images: [{role, url, alt}]}
ARTICLES: dict[str, dict] = {
    # --- pilot (unchanged) ---
    "gran-tulum": {
        "source": "https://grantulum.mx/galeria",
        "images": [
            {"role": "hero", "url": "https://grantulum.mx/uploads/gallery/1696545483_6471de92c550b67a580a.jpg", "alt": "Gran Tulum gated community exterior at 101 Tulum"},
            {"role": "inline-1", "url": "https://grantulum.mx/uploads/gallery/1696545484_299289b4a34da7e10c85.jpg", "alt": "Gran Tulum exterior rendering at 101 Tulum master plan"},
            {"role": "inline-2", "url": "https://grantulum.mx/uploads/gallery/1696545484_ed6586e7ab4cc6ee24c7.jpg", "alt": "Gran Tulum pool and amenity deck at SIMCA 101 Tulum"},
        ],
    },
    "distrito-xcalacoco-beach": {
        "source": "https://www.distritoxcalacoco.com/",
        "images": [
            {"role": "hero", "url": "https://static.wixstatic.com/media/75248b_364dab5416624e298b0f54df638c24ae~mv2.jpg", "alt": "Distrito Xcalacoco Beach North Shore Playa aerial"},
            {"role": "inline-1", "url": "https://static.wixstatic.com/media/75248b_0e0097af089345839dc049d494afa3a9~mv2.jpg", "alt": "Distrito Xcalacoco Beach tower and North Shore skyline"},
            {"role": "inline-2", "url": "https://static.wixstatic.com/media/75248b_40f44de8e40b42389b21e1eba2d21ed8~mv2.jpg", "alt": "Distrito Xcalacoco Beach resort pool and amenity deck"},
        ],
    },
    "copala-quivira": {
        "source": "https://www.quiviraloscabos.com/residences/copala/",
        "images": [
            {"role": "hero", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/cache/Residences-Rotator_0001_Copala-589cc34062d27-930x550.jpg", "alt": "Copala at Quivira Los Cabos residences exterior"},
            {"role": "inline-1", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/Quivira-Inset-LargeInterior-Copala-58a46726aac5f.jpg", "alt": "Copala at Quivira Pacific-side condominium interior"},
            {"role": "inline-2", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/Quivira-Copala-Clubhouse-58f623071edd6.jpg", "alt": "Copala at Quivira clubhouse and golf community"},
        ],
    },
    "tao-blue-gardens-pv": {
        "source": "https://taomexico.com/tao-blue-gardens-puerto-vallarta/",
        "images": [
            {"role": "hero", "url": "https://taomexico.com/wp-content/uploads/2026/01/tao-blue-gardens-vallarta.webp", "alt": "TAO Blue Gardens Puerto Vallarta project hero"},
            {"role": "inline-1", "url": "https://taomexico.com/wp-content/uploads/2026/01/04-PVALLARTA_CAM06.webp", "alt": "TAO Blue Gardens building exterior Zona Romántica"},
            {"role": "inline-2", "url": "https://taomexico.com/wp-content/uploads/2026/01/Infinity-pool.webp", "alt": "TAO Blue Gardens infinity pool Banderas Bay"},
        ],
    },
    "montage-punta-mita": {
        "source": "https://www.montageresidences.com/punta-mita/",
        "images": [
            {"role": "hero", "url": "https://mnt-uploads-montage-residences-prod.s3.amazonaws.com/uploads/2025/12/11161945/Montage-Punta-Mita-1920x730-1-1000x643.jpeg", "alt": "Montage Residences Punta Mita peninsula hero"},
            {"role": "inline-1", "url": "https://mnt-uploads-montage-residences-prod.s3.amazonaws.com/uploads/2026/03/30094831/MRPM-Residential-Renderings-2025-ph-shutters-abiertos-1-1920x1080.jpg", "alt": "Montage Residences Punta Mita residential rendering"},
            {"role": "inline-2", "url": "https://mnt-uploads-montage-residences-prod.s3.amazonaws.com/uploads/2026/05/12083206/Montage_Film_04_010_Yacht-Arrival_Aerial_Still_260505-1000x643.jpg", "alt": "Aerial yacht arrival Montage Residences Punta Mita"},
        ],
    },
    # --- SIMCA ---
    "101-park-tulum": {
        "source": "https://grantulum.mx/galeria",
        "images": [
            {"role": "hero", "url": "https://grantulum.mx/uploads/gallery/1696545484_0304fa215e648fe9ccc2.jpg", "alt": "101 Park Tulum master plan exterior rendering"},
            {"role": "inline-1", "url": "https://grantulum.mx/uploads/gallery/1696545484_b7220735bccf53556868.jpg", "alt": "101 Park Tulum gated community amenity view"},
            {"role": "inline-2", "url": "https://grantulum.mx/uploads/gallery/1696545484_fb252879d80399bd9830.jpg", "alt": "101 Tulum SIMCA residential phase rendering"},
        ],
    },
    "ceiba-25-condo-paradise": {
        "source": "https://simca.mx/en/division/residential/development/ceiba-condos-en-playa-del-carmen",
        "images": [
            {"role": "hero", "url": "https://simca.mx/uploads/18/1618500451_951ad9e0ec6e58094702.png", "alt": "Ceiba at 25 Condo Paradise exterior rendering"},
            {"role": "inline-1", "url": "https://simca.mx/uploads/18/1618500459_962041102d02e49758a2.png", "alt": "Ceiba at 25 pool and amenity deck"},
            {"role": "inline-2", "url": "https://simca.mx/uploads/18/1618500465_c836b47ea03d0ac3e150.png", "alt": "Ceiba at 25 Playa del Carmen condo tower view"},
        ],
    },
    "maresol-downtown-studios": {
        "source": "https://simca.mx/en/division/residential/development/maresol-estudios-en-playa-del-carmen",
        "images": [
            {"role": "hero", "url": "https://simca.mx/uploads/28/1704994376_5d20850165d74274b0c6.jpg", "alt": "Maresol Downtown Studios exterior Playa del Carmen"},
            {"role": "inline-1", "url": "https://simca.mx/uploads/28/1704994377_e7b1e9a27e1216b02e53.jpg", "alt": "Maresol studio building facade near Fifth Avenue"},
            {"role": "inline-2", "url": "https://simca.mx/uploads/28/1704995009_2835ec83529041cd4a13.jpg", "alt": "Maresol Downtown Studios pool and common areas"},
        ],
    },
    "saint-marine": {
        "source": "https://simca.mx/en/division/residential/development/saint-marine-unico-desarrollo-frente-al-mar-playa-del-carmen",
        "images": [
            {"role": "hero", "url": "https://simca.mx/uploads/29/1721853376_38d264cbb8e578187c25.jpg", "alt": "Saint Marine seafront condo exterior Playa del Carmen"},
            {"role": "inline-1", "url": "https://simca.mx/uploads/29/1721853538_8afc296eb48c0f01c1a2.jpg", "alt": "Saint Marine beach-proximate tower rendering"},
            {"role": "inline-2", "url": "https://simca.mx/uploads/29/1721853566_3a737f49bbe63cd61973.jpg", "alt": "Saint Marine premium amenity deck and pool"},
        ],
    },
    "solar-midtown": {
        "source": "https://simca.mx/en/division/residential/development/invierte-con-solar-midtown",
        "images": [
            {"role": "hero", "url": "https://simca.mx/uploads/30/1747331036_58105500b7e5bc543be5.jpg", "alt": "SOLAR Midtown studio tower exterior Playa del Carmen"},
            {"role": "inline-1", "url": "https://simca.mx/uploads/30/1747331036_6db5c3c675dac8e0c4a1.jpg", "alt": "SOLAR Midtown rooftop and amenity rendering"},
            {"role": "inline-2", "url": "https://simca.mx/uploads/30/1747331036_9db2a514516a0ff5c76d.jpg", "alt": "SOLAR Midtown downtown Playa condo facade"},
        ],
    },
    # --- Grupo Emerita ---
    "amara-tulum": {
        "source": "https://owninmayanriviera.com/en/listings/amara-condos-tulum/",
        "images": [
            {"role": "hero", "url": "https://owninmayanriviera.com/wp-content/uploads/2025/11/AMA_01_FACHADA_PRINCIPAL_DIA_240531.jpg", "alt": "Amara Tulum Region 8 main facade daytime render"},
            {"role": "inline-1", "url": "https://owninmayanriviera.com/wp-content/uploads/2025/11/AMA_17_SWIMUP_240605.jpg", "alt": "Amara Tulum swim-up pool amenity render"},
            {"role": "inline-2", "url": "https://owninmayanriviera.com/wp-content/uploads/2025/11/06-ROOF-TOP-POOL.jpg", "alt": "Amara Tulum rooftop pool and lounge amenity"},
        ],
    },
    "constelada-tulum": {
        "source": "https://www.grupoemerita.com/en/desarrollos/constelada",
        "images": [
            {"role": "hero", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/69ab16c1df741563d388fafd_Constelada%20Frente.png", "alt": "Constelada Tulum front elevation Aldea Zama"},
            {"role": "inline-1", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/69ab16c0625cf56caeaf83bf_Constelada%20Roof.png", "alt": "Constelada rooftop terrace and pool amenity"},
            {"role": "inline-2", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/69ab16c06f275e32bf8c0abf_Constelada%20Gimnasio.png", "alt": "Constelada equipped gym interior render"},
        ],
    },
    "junglar-kaybe": {
        "source": "https://www.grupoemerita.com/en/desarrollos/junglar",
        "images": [
            {"role": "hero", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/68aca7808a0c3b6c074d2f68_Proyecto%20Junglar.webp", "alt": "Junglar at Kaybé townhouse community aerial"},
            {"role": "inline-1", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/68acadfff4dd9bfcde7472b8_JUNGLAR_FOTO_ALTEA.webp", "alt": "Junglar Kaybé Altea phase exterior"},
            {"role": "inline-2", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/68aca77c1267feadab95abcd_junglar%2020.webp", "alt": "Junglar Kaybé jungle-integrated villa exterior"},
        ],
    },
    "nhoa-aldea-zama": {
        "source": "https://www.grupoemerita.com/en/desarrollos/nhoa",
        "images": [
            {"role": "hero", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/68caec26a0716e19d07ffdc6_Nhoa.webp", "alt": "NHOA Aldea Zama condo exterior rendering"},
            {"role": "inline-1", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/68ac990ade6b044cbbd31eb1_alberca%20y%20soleadero.webp", "alt": "NHOA pool and sun deck amenity"},
            {"role": "inline-2", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/68ac990a45487de936a2c369_gimnasio%20equipado.webp", "alt": "NHOA equipped gym and wellness area"},
        ],
    },
    "omara-tulum": {
        "source": "https://www.grupoemerita.com/desarrollos/omara",
        "images": [
            {"role": "hero", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/68ac2ce3083155ebbbd02a3b_omara-exterior_7.webp", "alt": "Omara Tulum Aldea Zama exterior rendering"},
            {"role": "inline-1", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/68ac2cca4b8bfaf95580b707_showroom_1.webp", "alt": "Omara showroom finished unit interior"},
            {"role": "inline-2", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/68ac2b7a9a5f1c00b16e4e0e_omara-entry.webp", "alt": "Omara gated entry and arrival lobby"},
        ],
    },
    "paravian-playa": {
        "source": "https://www.grupoemerita.com/en/desarrollos/paravian",
        "images": [
            {"role": "hero", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/69f8e4b50e25b9e15d7d0deb_Paravian_Amenidades%20(10).jpg", "alt": "Paravian Playa del Carmen amenity terrace render"},
            {"role": "inline-1", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/68ac284997ffe9bd8785499a_1.webp", "alt": "Paravian tower exterior Playa corridor"},
            {"role": "inline-2", "url": "https://cdn.prod.website-files.com/688478dccbeba13cdede033b/68ac283f331875d60740e8a6_paravian-pool.webp", "alt": "Paravian resort-style pool deck"},
        ],
    },
    # --- Tulum / Zamá ---
    "kabana-aldea-zama": {
        "source": "https://kabana.mx/",
        "images": [
            {"role": "hero", "url": "https://kabana.mx/images/sliders/2/slide-1.jpg", "alt": "Kabana Aldea Zama Premium condo exterior"},
            {"role": "inline-1", "url": "https://kabana.mx/images/sliders/2/slide-2.jpg", "alt": "Kabana Tulum natural setting and architecture"},
            {"role": "inline-2", "url": "https://kabana.mx/images/sliders/2/home2_slider3.jpg", "alt": "Kabana pool and jungle-integrated amenity deck"},
        ],
    },
    "luum-zama": {
        "source": "https://selvazama.mx/",
        "images": [
            {"role": "hero", "url": "https://selvazama.mx/wp-content/uploads/2024/07/Heroe_Eng_web-1.webp", "alt": "Luum Zama Aldea Zama gated community master plan"},
            {"role": "inline-1", "url": "https://selvazama.mx/wp-content/uploads/2021/10/Mask-1@2x-3.jpg", "alt": "Luum Zama jungle-integrated residential landscape"},
            {"role": "inline-2", "url": "https://selvazama.mx/wp-content/uploads/2024/10/04_charlesmiroux1982_Luxury_villa_tulum_lifestyle_outdoor_wabi_sab_540c9267-90ef-4996-94eb-339d6d50c797.jpg", "alt": "Luum Zama eco-luxury outdoor living concept"},
        ],
    },
    "selva-zama-mondo": {
        "source": "https://selvazama.mx/mondo-multi-family/",
        "images": [
            {"role": "hero", "url": "https://selvazama.mx/wp-content/uploads/2024/07/Mondo_web.webp", "alt": "Selva Zama Mondo multi-family development render"},
            {"role": "inline-1", "url": "https://selvazama.mx/wp-content/uploads/2024/10/charlesmiroux1982_Aerial_view_of_luxury_properties_in_Tulum._a52c78d9-2a63-4368-bf48-f5ab7abfbd1b.jpg", "alt": "Selvazama master plan aerial Tulum"},
            {"role": "inline-2", "url": "https://selvazama.mx/wp-content/uploads/2024/10/02_charlesmiroux1982_different_images_of_tulum_lifestyle_outdoor_p_942f179b-b9b1-4da0-9441-87ac40e5ef3b.jpg", "alt": "Selvazama outdoor lifestyle and community amenity"},
        ],
    },
    "amaru-inka": {
        "source": "https://rivieramayacozy.com/listings/amaru-inka-tulum/",
        "images": [
            {"role": "hero", "url": "https://rivieramayacozy.com/wp-content/uploads/2023/03/Amaru-1.jpg", "alt": "Amaru Inka Aldea Zama boutique condo exterior"},
            {"role": "inline-1", "url": "https://rivieramayacozy.com/wp-content/uploads/2023/03/Amaru-2.jpg", "alt": "Amaru Inka rooftop pool and amenity deck"},
            {"role": "inline-2", "url": "https://rivieramayacozy.com/wp-content/uploads/2023/03/Amaru-3.jpg", "alt": "Amaru Inka unit interior living area render"},
        ],
    },
    # --- Quivira ---
    "mavila-quivira": {
        "source": "https://www.quiviraloscabos.com/residences/mavila/",
        "images": [
            {"role": "hero", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/49658277173_5b487b2579_c-5f46e95828ab0.jpg", "alt": "Mavila at Quivira Los Cabos condominium community exterior"},
            {"role": "inline-1", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/dsc_1106_web-5e33ba40a67b4-optimized.png", "alt": "Mavila at Quivira building and Pacific-side residences"},
            {"role": "inline-2", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/intro-inset-1-58ed125b4d547-5dc99e6b8c6c3.jpg", "alt": "Mavila at Quivira lifestyle and amenity inset"},
        ],
    },
    "coronado-quivira": {
        "source": "https://www.quiviraloscabos.com/residences/coronado/",
        "images": [
            {"role": "hero", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/cache/Residences-Rotator_0003_Coronado-589cc7d986349-930x550.jpg", "alt": "Coronado at Quivira Los Cabos residences hero"},
            {"role": "inline-1", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/Coronado_ListView_0000s_0001_EspejoModel-58acbd19a9bd2.jpg", "alt": "Coronado at Quivira Espejo model home interior"},
            {"role": "inline-2", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/cornonadoroom-5dae3ed2914b5.jpg", "alt": "Coronado at Quivira luxury residence living room"},
        ],
    },
    "alvar-quivira": {
        "source": "https://www.quiviraloscabos.com/residences/alvar/",
        "images": [
            {"role": "hero", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/alvarrendering-5e4301b18c367.jpg", "alt": "Alvar at Quivira Los Cabos architectural rendering"},
            {"role": "inline-1", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/residences-alvar-5e3d8dcb1fa29.jpg", "alt": "Alvar at Quivira residences overview"},
            {"role": "inline-2", "url": "https://symphony.cdn.tambourine.com/quivira-los-cabos-residence/media/Quivira-Insets_0001_GettingHere-58a4789e1dd38.jpg", "alt": "Quivira Los Cabos access and master plan context for Alvar"},
        ],
    },
    "st-regis-residences-los-cabos": {
        "source": "https://srresidencesloscabos.com/",
        "images": [
            {"role": "hero", "url": "https://srresidencesloscabos.com/wp-content/uploads/2021/01/St-Regis-Cabos-Overview.jpg", "alt": "The Residences at The St. Regis Los Cabos overview"},
            {"role": "inline-1", "url": "https://srresidencesloscabos.com/wp-content/uploads/2021/01/St-Regis-Hotel-Overview2.jpg", "alt": "St. Regis Los Cabos hotel and branded residence setting"},
            {"role": "inline-2", "url": "https://srresidencesloscabos.com/wp-content/uploads/2021/10/st-regis-oceanfront-villas-2.jpg", "alt": "St. Regis Los Cabos oceanfront villas at Quivira"},
        ],
    },
    # --- TAO ---
    "tao-monte-rocella": {
        "source": "https://taomexico.com/monte-rocella/",
        "images": [
            {"role": "hero", "url": "https://taomexico.com/wp-content/uploads/2025/12/monte-rocella-4.webp", "alt": "TAO Monte Rocella Los Cabos building exterior"},
            {"role": "inline-1", "url": "https://taomexico.com/wp-content/uploads/2025/12/monte-rocella-two-infinity-pools.webp", "alt": "TAO Monte Rocella dual infinity pools"},
            {"role": "inline-2", "url": "https://taomexico.com/wp-content/uploads/2025/12/monte-rocella-coworking-area.webp", "alt": "TAO Monte Rocella coworking and amenity deck"},
        ],
    },
    "tao-santamar-akumal": {
        "source": "https://taomexico.com/properties/santamar-santamar-prime/",
        "images": [
            {"role": "hero", "url": "https://taomexico.com/wp-content/uploads/2025/12/santamar-prime-fachada-scaled.jpg", "alt": "TAO Santamar Prime Akumal building facade"},
            {"role": "inline-1", "url": "https://taomexico.com/wp-content/uploads/2025/12/Santamar_Photos_HighRes_0032-scaled.jpg", "alt": "TAO Santamar Akumal high-resolution property photo"},
            {"role": "inline-2", "url": "https://taomexico.com/wp-content/uploads/2025/12/Santamar-Prime-Pool.webp", "alt": "TAO Santamar Prime resort-style pool terrace"},
        ],
    },
    # --- Cabos luxury ---
    "chileno-bay-residences": {
        "source": "https://www.chilenobayresidences.com/",
        "images": [
            {"role": "hero", "url": "https://chilenobayresidences.com/wp-content/uploads/2026/02/CBR_Exterior_Beach_2017_29-2.jpeg", "alt": "Chileno Bay Residences beachfront exterior Los Cabos"},
            {"role": "inline-1", "url": "https://chilenobayresidences.com/wp-content/uploads/2026/02/CBR_Wellness_Spa_Garden_Ice-Fountain_2017_01-2.jpeg", "alt": "Chileno Bay Residences wellness spa garden"},
            {"role": "inline-2", "url": "https://chilenobayresidences.com/wp-content/uploads/2022/02/RemoteMediaFile_6619340_0_2022_02_01_07_43_02.jpeg", "alt": "Chileno Bay Residences resort amenities and coastline"},
        ],
    },
    "diamante-ocean-club": {
        "source": "https://www.diamantecabosanlucas.com/ocean-club",
        "images": [
            {"role": "hero", "url": "https://diamantecabosanlucas.com/wp-content/uploads/2022/10/OCR_Hero-2-scaled.jpg", "alt": "Diamante Ocean Club Los Cabos hero aerial"},
            {"role": "inline-1", "url": "https://diamantecabosanlucas.com/wp-content/uploads/2022/10/OCR_Slider_1.jpg", "alt": "Diamante Ocean Club residences and Pacific views"},
            {"role": "inline-2", "url": "https://diamantecabosanlucas.com/wp-content/uploads/2022/10/OCR_Slider_5.jpg", "alt": "Diamante Ocean Club luxury amenity and architecture"},
        ],
    },
    "hideaways-los-cabos": {
        "source": "https://hideaways-cabo.com/eng",
        "images": [
            {"role": "hero", "url": "https://assets.cdn.filesafe.space/4WKAshJWeeeLZiJbuxHA/media/27606737-0448-4762-99a7-c691fa34c792.jpeg", "alt": "Hideaways Los Cabos three-tower development rendering"},
            {"role": "inline-1", "url": "https://assets.cdn.filesafe.space/4WKAshJWeeeLZiJbuxHA/media/67b370dcf7165730ef3c2e23.jpeg", "alt": "Hideaways Los Cabos San José del Cabo condo exterior"},
            {"role": "inline-2", "url": "https://assets.cdn.filesafe.space/4WKAshJWeeeLZiJbuxHA/media/67b371ac2c2f04f45d0d142c.jpeg", "alt": "Hideaways Los Cabos amenity deck and Pacific views"},
        ],
    },
    "el-lago-querencia": {
        "source": "https://qcabo.com/featured-neighborhoods/el-lago/",
        "images": [
            {"role": "hero", "url": "https://qcabo.com/wp-content/uploads/hero-desktop2-scaled.jpg", "alt": "El Lago Querencia golf and lake villas hero"},
            {"role": "inline-1", "url": "https://qcabo.com/wp-content/uploads/img-carousel-1-desktop-2.jpg", "alt": "El Lago Querencia villa exterior and lake views"},
            {"role": "inline-2", "url": "https://qcabo.com/wp-content/uploads/img-carousel-2-desktop-3.jpg", "alt": "El Lago Querencia community amenity and architecture"},
        ],
    },
    "la-reserva-querencia": {
        "source": "https://theagencybaja.com/developments/la-reserva-at-querencia",
        "images": [
            {"role": "hero", "url": "https://dlajgvw9htjpb.cloudfront.net/cms/d60dd635-8983-45c2-843d-507c3e3e72e8/25-4851/-5817468571895516957.jpg", "alt": "La Reserva at Querencia boutique condo rendering"},
            {"role": "inline-1", "url": "https://dlajgvw9htjpb.cloudfront.net/cms/d60dd635-8983-45c2-843d-507c3e3e72e8/24-4016/-6600878216111569912.jpg", "alt": "La Reserva at Querencia Horizontes subdivision exterior"},
            {"role": "inline-2", "url": "https://snellrealestate.com/wp-content/uploads/2025/08/20241112204745185561000000-o-scaled.jpg", "alt": "La Reserva at Querencia pool and fitness amenity render"},
        ],
    },
    "fundadores-puerto-los-cabos": {
        "source": "https://www.puertoloscabos.com/real-estate",
        "images": [
            {"role": "hero", "url": "https://images.squarespace-cdn.com/content/v1/683639b5ec10703bbb9ecaee/1753471583154-UC8MPUJXJ1226EVG10NF/FundadoresRE3_1600x1067.jpg", "alt": "Fundadores at Puerto Los Cabos luxury real estate"},
            {"role": "inline-1", "url": "https://images.squarespace-cdn.com/content/v1/683639b5ec10703bbb9ecaee/1753471583333-9KR7Z36XG34GQCJVL4G1/FundadoresRE2_1600x1067.jpg", "alt": "Fundadores Puerto Los Cabos hillside and golf community"},
            {"role": "inline-2", "url": "https://images.squarespace-cdn.com/content/v1/683639b5ec10703bbb9ecaee/1755101637708-OTCBB1CSQZ9NOO404UFU/Puerto+Los+Cabos_Real+Estate_Casa+55+Fundadores_1.jpg", "alt": "Casa 55 Fundadores Puerto Los Cabos residence"},
        ],
    },
    "ritz-carlton-puerto-los-cabos": {
        "source": "https://www.puertoloscabos.com/real-estate",
        "images": [
            {"role": "hero", "url": "https://images.squarespace-cdn.com/content/v1/683639b5ec10703bbb9ecaee/1753470671765-VM1CC7ZTEGH4GZIZN404/Zad%C3%BAnResidencesRE1_1600x1067.jpg", "alt": "Zadún Ritz-Carlton Reserve Residences Puerto Los Cabos"},
            {"role": "inline-1", "url": "https://images.squarespace-cdn.com/content/v1/683639b5ec10703bbb9ecaee/1753471081791-V0S5AE92XG4UFJRLWOXX/Zad%C3%BAnResidencesRE2_1600x1067.jpg", "alt": "Ritz-Carlton Reserve branded residences at Puerto Los Cabos"},
            {"role": "inline-2", "url": "https://images.squarespace-cdn.com/content/v1/683639b5ec10703bbb9ecaee/1753471079396-QGBTT156ABIMFGTEGAZ5/Zad%C3%BAnResidencesRE4_1600x1067.jpg", "alt": "Zadún Reserve Residences luxury interiors Puerto Los Cabos"},
        ],
    },
    "four-seasons-costa-palmas": {
        "source": "https://www.costapalmas.com/real-estate/four-seasons/",
        "images": [
            {"role": "hero", "url": "https://media.costapalmas.com/2024/06/four-seasons-private-residences.jpg", "alt": "Four Seasons Private Residences Costa Palmas hero"},
            {"role": "inline-1", "url": "https://media.costapalmas.com/2024/07/Four-Seasons-Golf-Villas-SV-180026-WR.jpg", "alt": "Four Seasons Costa Palmas golf villa rendering"},
            {"role": "inline-2", "url": "https://media.costapalmas.com/2024/07/Four-Seasons-Oceanview-Villas-LCP_092.jpg", "alt": "Four Seasons Costa Palmas oceanview villa Sea of Cortez"},
        ],
    },
    # --- Nayarit / PMita ---
    "four-seasons-punta-mita": {
        "source": "https://realestate.puntamita.com/listing-category/four-seasons-residences/",
        "images": [
            {"role": "hero", "url": "https://www.puntamita.com/wp-content/uploads/2017/03/four_seasons.jpg", "alt": "Four Seasons Private Residences Punta Mita hero"},
            {"role": "inline-1", "url": "https://realestate.puntamita.com/wp-content/uploads/2017/05/FSPV-Sunset.jpg", "alt": "Four Seasons Punta Mita sunset villa Pacific view"},
            {"role": "inline-2", "url": "https://realestate.puntamita.com/wp-content/uploads/2025/12/Four-Season-Villa-37_6-1980x1319.webp", "alt": "Four Seasons Punta Mita luxury villa interior and terrace"},
        ],
    },
    "pendry-punta-mita": {
        "source": "https://www.pendryresidences.com/punta-mita/",
        "images": [
            {"role": "hero", "url": "https://mnt-uploads-pendry-residences.s3.amazonaws.com/uploads/2026/01/20102753/Pendry-Punta-Mita1.jpg", "alt": "Pendry Residences Punta Mita development hero"},
            {"role": "inline-1", "url": "https://mnt-uploads-pendry-residences.s3.amazonaws.com/uploads/2026/01/29133914/PMW2-LOBBY-03-1135-960x700-1.webp", "alt": "Pendry Residences Punta Mita lobby interior"},
            {"role": "inline-2", "url": "https://mnt-uploads-pendry-residences.s3.amazonaws.com/uploads/2026/01/20102838/UL-ThePendryResidences-01-Aerial_Night-07_logo-Horizontal-scaled-1-1-960x700.jpg", "alt": "Pendry Residences Punta Mita aerial night rendering"},
        ],
    },
    "one-only-mandarina": {
        "source": "https://rlhproperties.com/en/mandarina/",
        "images": [
            {"role": "hero", "url": "https://rlhproperties.com/wp-content/uploads/2021/12/One_Only_Mandarina_Resort_PoloAndEquestrianClub_PoloPlaying_5218_MASTER_Small.jpg", "alt": "One&Only Mandarina polo club and resort setting"},
            {"role": "inline-1", "url": "https://rlhproperties.com/wp-content/uploads/2021/12/One_Only_Mandarina_Resort_PoloAndEquestrianClub_PoloPlaying_5313_MASTER_Small.jpg", "alt": "One&Only Mandarina equestrian club aerial"},
            {"role": "inline-2", "url": "https://rlhproperties.com/wp-content/uploads/2021/12/mn0193RGB.jpg", "alt": "One&Only Mandarina ultra-luxury villa coastline"},
        ],
    },
    "rosewood-mandarina": {
        "source": "https://www.rosewoodhotels.com/en/mandarina-riviera-nayarit",
        "images": [
            {"role": "hero", "url": "https://picasso.rosewoodhotelgroup.com/transform/553ee8c8-9837-4731-b0e5-613d1c1198db/RWMDR_Destination_Beach_Ocean-Aerial-2", "alt": "Rosewood Mandarina ocean aerial destination view"},
            {"role": "inline-1", "url": "https://picasso.rosewoodhotelgroup.com/transform/2f5f1b05-9cb5-4379-b332-f3cd69fd9a20/RWMDR_Destination_Beachfront_aerial_landscape", "alt": "Rosewood Mandarina beachfront aerial landscape"},
            {"role": "inline-2", "url": "https://picasso.rosewoodhotelgroup.com/transform/201722ad-9a18-4776-a2d6-93fd5c74d9d8/RWMDR_Facilities_Suites_Canalan-Beachfront-Villa_Living-Room_Terrace", "alt": "Rosewood Mandarina Canalan beachfront villa living room"},
        ],
    },
    "siari-ritz-carlton-reserve": {
        "source": "https://siariresidences.com/",
        "images": [
            {"role": "hero", "url": "https://cdn.prod.website-files.com/6743c3e6ac714cfd67db12cc/68016e58b653c0aa71b9f52e_home-hero-bg.jpg", "alt": "Siari Ritz-Carlton Reserve Nayarit hero coastline"},
            {"role": "inline-1", "url": "https://cdn.prod.website-files.com/6743c3e6ac714cfd67db12cc/67997ae8bdfd71441fe5abc0_92a717e06e9c5a5147774dd0ee80300b_siari-development-rendering.jpg", "alt": "Siari Ritz-Carlton Reserve development rendering"},
            {"role": "inline-2", "url": "https://cdn.prod.website-files.com/6743c3e6ac714cfd67db12cc/6801710f78ae5da4b12d4760_56337c2735be7c2926259ce9d038308b_home-card-beach.jpg", "alt": "Siari Ritz-Carlton Reserve beach and jungle setting"},
        ],
    },
    # --- Playa / PM ---
    "aldea-thai": {
        "source": "https://www.aldeathaiplayadelcarmen.com/",
        "images": [
            {"role": "hero", "url": "https://static.wixstatic.com/media/7977c9_40a15fcb753b4a2eb31c6f17861ce885~mv2.jpg", "alt": "Aldea Thai Playa del Carmen condo-hotel exterior"},
            {"role": "inline-1", "url": "https://static.wixstatic.com/media/0dbd62_77b1b78566c54f8784bf5cebe3783d04~mv2.jpg", "alt": "Aldea Thai beach-proximate tower rendering"},
            {"role": "inline-2", "url": "https://static.wixstatic.com/media/0dbd62_20b4ac82f317400a961c916eabf6c79a~mv2.jpg", "alt": "Aldea Thai pool and rooftop amenity deck"},
        ],
    },
    "oceana-residences": {
        "source": "https://www.oceanaresidences.mx/",
        "images": [
            {"role": "hero", "url": "https://www.oceanaresidences.mx/img/gallery/muestra/1.jpg", "alt": "Oceana Residences Playa del Carmen Mamitas Beach exterior"},
            {"role": "inline-1", "url": "https://www.oceanaresidences.mx/img/gallery/muestra/5.jpg", "alt": "Oceana Residences tower and beachfront setting"},
            {"role": "inline-2", "url": "https://www.oceanaresidences.mx/img/gallery/renders/1.jpg", "alt": "Oceana Residences interior living area render"},
        ],
    },
    "inna-beach-condos": {
        "source": "https://lavallepeniche.com/project/inna-condos",
        "images": [
            {"role": "hero", "url": "https://lavallepeniche.com/storage/2023/09/FACHADA-MAR-FRONTAL.jpg", "alt": "Inna Beach Condos Puerto Morelos seafront facade"},
            {"role": "inline-1", "url": "https://lavallepeniche.com/storage/2023/09/AEREA-1.jpg", "alt": "Inna Beach Condos aerial Puerto Morelos coastline"},
            {"role": "inline-2", "url": "https://lavallepeniche.com/storage/2023/09/LOBBY.jpg", "alt": "Inna Beach Condos arrival lobby and amenity"},
        ],
    },
    "mukta-369": {
        "source": "https://play-investments.com/propiedad/departamento-en-venta-en-puerto-morelos-mukta-369-ruta-de-los-cenotes/",
        "images": [
            {"role": "hero", "url": "https://play-investments.com/wp-content/uploads/2025/01/departamento-en-venta-en-puerto-morelos-mukta-369-ruta-de-los-cenotes-01.jpg", "alt": "Mukta 369 Puerto Morelos jungle condo exterior render"},
            {"role": "inline-1", "url": "https://play-investments.com/wp-content/uploads/2025/01/departamento-en-venta-en-puerto-morelos-mukta-369-ruta-de-los-cenotes-02.jpg", "alt": "Mukta 369 amenity pool and clubhouse area"},
            {"role": "inline-2", "url": "https://play-investments.com/wp-content/uploads/2025/01/departamento-en-venta-en-puerto-morelos-mukta-369-ruta-de-los-cenotes-03.jpg", "alt": "Mukta 369 sustainable residential community aerial"},
        ],
    },
    "nalu-sea-living": {
        "source": "https://nalu.mx/",
        "images": [
            {"role": "hero", "url": "https://nalu.mx/wp-content/uploads/2024/04/1-Fachada-1-2-1.jpg", "alt": "NALU Sea Living Puerto Morelos building facade"},
            {"role": "inline-1", "url": "https://nalu.mx/wp-content/uploads/2024/04/3-Rooftop-1-1.jpg", "alt": "NALU Sea Living rooftop pool and lounge"},
            {"role": "inline-2", "url": "https://nalu.mx/wp-content/uploads/2024/04/7-Balcon-1-1.jpg", "alt": "NALU Sea Living balcony ocean-view unit"},
        ],
    },
    "piedra-de-mar": {
        "source": "https://piedrademarpuertomorelos.com/",
        "images": [
            {"role": "hero", "url": "https://piedrademarpuertomorelos.com/wp-content/uploads/2026/01/hero.jpg", "alt": "Piedra de Mar Puerto Morelos condo exterior hero"},
            {"role": "inline-1", "url": "https://piedrademarpuertomorelos.com/wp-content/uploads/2026/01/foto1.jpg", "alt": "Piedra de Mar Puerto Morelos building facade render"},
            {"role": "inline-2", "url": "https://piedrademarpuertomorelos.com/wp-content/uploads/2026/01/foto2.jpg", "alt": "Piedra de Mar pool and amenity deck Puerto Morelos"},
        ],
    },
    "sole-blu-ocean-living": {
        "source": "https://soleblu.mx/",
        "images": [
            {"role": "hero", "url": "https://soleblu.mx/wp-content/uploads/2025/06/02_Fachada-Principal_Tarde-scaled-800x600-1.webp", "alt": "Sole Blu Ocean Living Puerto Morelos main facade"},
            {"role": "inline-1", "url": "https://soleblu.mx/wp-content/uploads/2025/06/Aereo-Proyecto-800x600-1.webp", "alt": "Sole Blu Ocean Living aerial project view"},
            {"role": "inline-2", "url": "https://soleblu.mx/wp-content/uploads/2025/06/EXTERIOR2-800x600-1.webp", "alt": "Sole Blu Ocean Living exterior amenity terrace"},
        ],
    },
}


def verify_urls() -> None:
    all_urls: list[str] = []
    for slug, entry in ARTICLES.items():
        for img in entry["images"]:
            all_urls.append(img["url"])
    dupes = {u for u in all_urls if all_urls.count(u) > 1}
    if dupes:
        raise SystemExit(f"Duplicate URLs found: {len(dupes)}")
    if len(all_urls) != len(set(all_urls)):
        raise SystemExit("Duplicate URLs in manifest")
    print(f"Unique URLs: {len(set(all_urls))} / expected {len(ARTICLES) * 3}")


IMG_LINE = re.compile(r"^!\[[^\]]*\]\([^)]+\)\s*$", re.M)


def apply_to_mdx(slug: str, entry: dict) -> bool:
    path = PROJECTS / f"{slug}.mdx"
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
            r'^heroImage:\s*.*$',
            f'heroImage: "{hero["url"]}"',
            frontmatter,
            count=1,
            flags=re.M,
        )

    # Strip all prior inline markdown images, then insert once after first H2 section.
    body = IMG_LINE.sub("", body)
    body = re.sub(r"\n{3,}", "\n\n", body)

    first_h2 = body.find("\n## ")
    if first_h2 != -1:
        marker = "\n\n---\n\n## "
        section_end = body.find(marker, first_h2 + 1)
        if section_end != -1:
            block = "\n\n".join(f"![{img['alt']}]({img['url']})" for img in inlines)
            body = body[:section_end].rstrip() + "\n\n" + block + body[section_end:]

    new_text = f"---\n{frontmatter}\n---\n{body}"
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        return True
    return False


def main() -> None:
    slugs_on_disk = sorted(p.stem for p in PROJECTS.glob("*.mdx"))
    missing = set(slugs_on_disk) - set(ARTICLES)
    extra = set(ARTICLES) - set(slugs_on_disk)
    if missing:
        raise SystemExit(f"Missing manifest entries: {missing}")
    if extra:
        raise SystemExit(f"Extra manifest entries: {extra}")

    verify_urls()

    manifest = {
        "rollout": "project-images-all-46",
        "verified": "2026-06-08",
        "rule": "138 unique URLs — 3 per project, zero cross-article reuse",
        "articles": [{"slug": s, **ARTICLES[s]} for s in sorted(ARTICLES)],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote manifest: {MANIFEST_PATH}")

    changed = 0
    for slug in sorted(ARTICLES):
        if apply_to_mdx(slug, ARTICLES[slug]):
            changed += 1
            print(f"  updated {slug}")
        else:
            print(f"  unchanged {slug}")
    print(f"Done. Updated {changed}/{len(ARTICLES)} files.")


if __name__ == "__main__":
    main()
