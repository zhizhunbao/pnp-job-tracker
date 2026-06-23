"""
check_crawl.py — validate a crawled source's .md output (quality gate).

Checks one slug's docs/<slug>/md for problems and reports them. Used standalone
or by crawl_all.py to verify each source right after crawling (fix before next).

Hard issues (fail): no pages, bot-challenge residue, soft-404 pages, missing
`fetched` frontmatter, leftover HTML-comment/CSS artifacts.
Warnings (report only): very few pages, many tiny files.

Usage:
    uv run python scripts/crawl/check_crawl.py <slug> [--min-pages N]
"""
import argparse
import io
import os
import re
import sys
from pathlib import Path

# Wrap stdout only when run standalone; if imported (e.g. by crawl_all, which
# already wrapped), re-wrapping would double-wrap and close the shared buffer.
if os.name == "nt" and (getattr(sys.stdout, "encoding", "") or "").lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

_SELF = Path(__file__).resolve()
sys.path.insert(0, str(_SELF.parent))
import browser_fetch  # noqa: E402 — looks_like_challenge

DOCS_DIR = _SELF.parent.parent.parent / "data" / "crawl"
SOFT_404_TITLE_MARKERS = ("not found", "404", "introuvable", "page non trouv", "no longer available")
MIN_CONTENT_BYTES = 200
TINY_RATIO_WARN = 0.5  # warn if >50% of files are tiny


def _frontmatter(text: str) -> str:
    """Return the YAML frontmatter block (between the first two ---), or ''."""
    if not text.startswith("---"):
        return ""
    end = text.find("\n---", 3)
    return text[3:end] if end > 0 else ""


def check_slug(slug: str, min_pages: int = 1) -> tuple[bool, list[str], list[str], dict]:
    """Return (ok, issues, warnings, stats) for a crawled slug."""
    md_dir = DOCS_DIR / slug / "md"
    files = list(md_dir.rglob("*.md")) if md_dir.is_dir() else []
    if not files:
        return False, ["no .md files (crawl produced nothing)"], [], {"pages": 0}

    challenge = soft404 = no_fetched = artifact = tiny = 0
    for f in files:
        text = f.read_text(encoding="utf-8", errors="replace")
        fm = _frontmatter(text)

        if browser_fetch.looks_like_challenge(text):
            challenge += 1
        title_line = next((ln for ln in fm.splitlines() if ln.startswith("title:")), "").lower()
        source_line = next((ln for ln in fm.splitlines() if ln.startswith("source:")), "")
        if any(m in title_line for m in SOFT_404_TITLE_MARKERS) or "/404" in source_line:
            soft404 += 1
        if "fetched:" not in fm:
            no_fetched += 1
        if re.search(r"(?m)^\.[a-z][\w-]*\s*$", text) or "<!--" in text:
            artifact += 1
        # body length excluding frontmatter
        body = text[text.find("\n---", 3) + 4:] if fm else text
        if len(body.strip()) < MIN_CONTENT_BYTES:
            tiny += 1

    n = len(files)
    stats = {"pages": n, "challenge": challenge, "soft404": soft404,
             "no_fetched": no_fetched, "artifact": artifact, "tiny": tiny}

    issues, warns = [], []
    if challenge:
        issues.append(f"{challenge}/{n} bot-challenge residue pages")
    if soft404:
        issues.append(f"{soft404}/{n} soft-404 pages")
    if no_fetched:
        issues.append(f"{no_fetched}/{n} missing `fetched` frontmatter")
    if artifact:
        issues.append(f"{artifact}/{n} HTML-comment/CSS artifact pages")
    if n < min_pages:
        warns.append(f"only {n} page(s) (expected >= {min_pages}; check scope/keywords)")
    if tiny and tiny / n > TINY_RATIO_WARN:
        warns.append(f"{tiny}/{n} pages have <{MIN_CONTENT_BYTES} bytes of body (thin content)")

    return (len(issues) == 0), issues, warns, stats


def main() -> int:
    p = argparse.ArgumentParser(description="Validate a crawled source's .md output")
    p.add_argument("slug")
    p.add_argument("--min-pages", type=int, default=1)
    args = p.parse_args()

    ok, issues, warns, stats = check_slug(args.slug, args.min_pages)
    print(f"[{args.slug}] pages={stats.get('pages', 0)}  {'✅ OK' if ok else '❌ ISSUES'}")
    for i in issues:
        print(f"   ❌ {i}")
    for w in warns:
        print(f"   ⚠️  {w}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
