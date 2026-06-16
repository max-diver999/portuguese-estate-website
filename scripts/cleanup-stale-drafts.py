#!/usr/bin/env python3
"""Remove stale _drafts copies (already published in src/content)."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
DRAFTS = ROOT / "_drafts"
CACHE = ROOT / "scripts" / "__pycache__"

if DRAFTS.exists():
    shutil.rmtree(DRAFTS)
    print(f"Removed {DRAFTS}")
if CACHE.exists():
    shutil.rmtree(CACHE)
    print(f"Removed {CACHE}")
