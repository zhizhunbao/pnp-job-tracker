"""build_nl_points - NLPNP Express Entry Skilled Worker Annex A (100 points, pass mark 67).

The province-wide EOI introduced in 2025 is not a numeric points contest: OIM publishes
non-exhaustive prioritization criteria and may change their weight.  This builder therefore
extracts only the separate Express Entry Skilled Worker Point Assessment Grid that the
current category page explicitly links and requires at 67/100.

Output: data/raw/pnp/nl-points.json -> 09_build_mart.py -> pnp_score_factors.
The output is replaced only after the PDF rows, section maxima, total and current category
page pass mark all validate.  A maintenance page or changed document leaves the old table
untouched.

Usage: uv run python etl/pnp/build_nl_points.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import fitz
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths

PDF_URL = "https://www.gov.nl.ca/immigration/files/AnnexA_PNP.pdf"
PAGE_URL = ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/"
            "provincial-nominee-program/applicants/express-entry-skilled-worker/")
OUT = _paths.PNP / "nl-points.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\u2019", "'").replace("\u2018", "'")
                  .replace("\u2013", "-").replace("\u2014", "-").replace("\u00ad", "")).strip()


def section(text: str, start: str, end: str) -> str:
    a = text.find(start)
    b = text.find(end, a + len(start)) if a >= 0 else -1
    return text[a:b] if a >= 0 and b > a else ""


def rows_by_labels(text: str, labels: list[str], *, last_number: bool = False) -> list[dict]:
    rows = []
    for i, label in enumerate(labels):
        a = text.find(label)
        if a < 0:
            continue
        b = text.find(labels[i + 1], a + len(label)) if i + 1 < len(labels) else len(text)
        nums = re.findall(r"(?<![A-Za-z])(-?\d{1,3})(?![A-Za-z])", text[a + len(label):b])
        if nums:
            clean_label = re.sub(r";?\s+OR$", "", label, flags=re.I)
            rows.append({"label": clean_label, "points": int(nums[-1] if last_number else nums[0])})
    return rows


def year_rows(text: str) -> list[dict]:
    found = re.findall(r"\b([1-5]) years?\s+(\d{1,2})\b", text, re.I)
    return [{"label": f"{years} year" + ("s" if years != "1" else ""), "points": int(points)}
            for years, points in found]


def main() -> None:
    headers = {"User-Agent": UA}
    pdf_res = httpx.get(PDF_URL, headers=headers, follow_redirects=True, timeout=60)
    pdf_res.raise_for_status()
    if not pdf_res.content.startswith(b"%PDF"):
        fail(["official Annex A URL did not return a PDF (maintenance or changed URL)"])
    doc = fitz.open(stream=pdf_res.content, filetype="pdf")
    text = norm("\n".join(page.get_text("text") for page in doc))

    page_res = httpx.get(PAGE_URL, headers=headers, follow_redirects=True, timeout=40)
    page_res.raise_for_status()
    page_text = norm(re.sub(r"<[^>]+>", " ", page_res.text))
    mark = re.search(r"Minimum\s+(\d{2})\s+points on the NLPNP Point Assessment Grid", page_text, re.I)
    pass_mark = int(mark.group(1)) if mark else None

    edu_text = section(text, "FACTOR I (A): EDUCATION & TRAINING", "FACTOR I (B): SKILLED WORK EXPERIENCE")
    education = rows_by_labels(edu_text, [
        "Master's or Doctorate degree; OR",
        "University Degree that required at least three years of full-time study; OR",
        "Trade certification equivalent to journeyperson status in Newfoundland and Labrador",
        "Degree, diploma or certificate that required at least two years of full-time post-secondary study",
        "Degree, diploma or certificate that required at least one year of full-time post-secondary study",
    ])

    recent_text = section(text, "(A) WORK EXPERIENCE DURING THE MOST RECENT FIVE YEARS", "(B) WORK EXPERIENCE DURING THE SIX TO 10-YEAR")
    older_text = section(text, "(B) WORK EXPERIENCE DURING THE SIX TO 10-YEAR", "FACTOR I (C): LANGUAGE ABILITY")
    work5, work610 = year_rows(recent_text), year_rows(older_text)

    lang_text = section(text, "FACTOR I (C): LANGUAGE ABILITY", "FACTOR I (D): AGE")
    language = []
    for clb, points in re.findall(r"CLB\s+([5-8])(?:\s+and higher)?\s+(\d{1,2})\b", lang_text, re.I):
        language.append({"label": f"CLB {clb}" + (" and higher" if clb == "8" else ""), "points": int(points)})

    age_text = section(text, "FACTOR I (D): AGE", "FACTOR II: CONNECTION TO LABOUR MARKET")
    age_labels = ["<18 years", "18-21 years", "22-33 years", "34-45 years", "46-50 years", ">50 years"]
    age = rows_by_labels(age_text, age_labels)

    conn_text = text[text.find("FACTOR II: CONNECTION TO LABOUR MARKET"):]
    conn_labels = [
        "Close relative in Newfoundland and Labrador",
        "Previous work experience in Newfoundland and Labrador",
        "Previous student experience in Newfoundland and Labrador",
        "MAXIMUM POINTS TOTAL",
    ]
    connection = rows_by_labels(conn_text, conn_labels, last_number=True)[:-1]

    factors = {
        "education": {"group": "", "rows": education, "bonus": [], "max": 28},
        "work5": {"group": "WORK", "rows": work5, "bonus": [], "max": 15},
        "work610": {"group": "WORK", "rows": work610, "bonus": [], "max": 7},
        "language1": {"group": "", "rows": language, "bonus": [], "max": 27},
        "age": {"group": "", "rows": age, "bonus": [], "max": 12},
        "connection": {"group": "", "rows": [], "bonus": connection, "max": 13},
    }

    expected = {
        "education": [28, 23, 23, 18, 15],
        "work5": [15, 12, 9, 6, 3],
        "work610": [7, 6, 5, 4, 2],
        "language1": [27, 23, 21, 19],
        "age": [0, 8, 12, 10, 8, 0],
        "connection": [7, 3, 3],
    }
    problems = []
    if pass_mark != 67:
        problems.append(f"current category page pass mark is {pass_mark!r}, expected 67")
    for key, values in expected.items():
        bucket = "bonus" if key == "connection" else "rows"
        got = [row["points"] for row in factors[key][bucket]]
        if got != values:
            problems.append(f"{key}: parsed {got}, expected {values}")
    if max(f["points"] for f in education) + 20 + max(f["points"] for f in language) + max(f["points"] for f in age) + sum(f["points"] for f in connection) != 100:
        problems.append("factor maxima do not add to the official 100-point total")
    if problems:
        fail(problems)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": "NL", "system": "NLPNP Point Assessment Grid (Express Entry Skilled Worker)",
        "maxTotal": 100, "passMark": pass_mark,
        "source": "NLPNP Express Entry Skilled Worker Category Application Guide - Annex A",
        "url": PDF_URL, "pageUrl": PAGE_URL, "guideEffective": "", "fetched": date.today().isoformat(),
        "groupMax": {"WORK": 20}, "factors": factors,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK {OUT} - 100 points, pass mark {pass_mark}")


def fail(problems: list[str]) -> None:
    print("NL points grid validation failed; existing output was not replaced:")
    for problem in problems:
        print(" -", problem)
    sys.exit(1)


if __name__ == "__main__":
    main()
