#!/usr/bin/env python3
import re
from pathlib import Path

def count_body_words(file_path):
    """Count words in MDX file body (excluding frontmatter)"""
    try:
        raw = Path(file_path).read_text()
        # Extract body after frontmatter
        body_match = re.match(r'^---\n[\s\S]*?\n---\n([\s\S]*)', raw)
        if not body_match:
            return 0
        body = body_match.group(1)
        # Count words (non-whitespace sequences)
        words = len(re.findall(r'\S+', body))
        return words
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return 0

def main():
    # Files from /tmp/final_fix.txt
    files_to_check = [
        "guides/aljada-sharjah-property-investment",
        "guides/villanova-property-investment", 
        "guides/buy-to-let-mortgage-dubai",
        "guides/dubai-property-valuation-guide",
        "guides/short-term-rental-dubai-license",
        "guides/schools-near-arabian-ranches",
        "guides/al-hamra-village-property-investment",
        "guides/oman-itc-zones-property",
        "guides/mina-al-arab-property-investment",
        "guides/impz-property-investment"
    ]
    
    for slug in files_to_check:
        file_path = f"src/content/{slug}.mdx"
        word_count = count_body_words(file_path)
        status = "✅" if word_count >= 2000 else "❌"
        print(f"{status} {slug}: {word_count} words")

if __name__ == "__main__":
    main()