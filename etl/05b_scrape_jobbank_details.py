"""
05b — fetch each Job Bank posting's detail page for precise address (city + postal),
full description, and posting date. Writes a per-job .md and adds `address` back to
jobbank-on.json so the loader can show a precise location.

Usage:  uv run python etl/05b_scrape_jobbank_details.py
Output: data/raw/jobbank/details/<posting_id>.md  (+ address added to jobbank-on.json)
"""
import json
import re
import sys
import time
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")


def text(el) -> str:
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)) if el else ""


def main() -> None:
    jb = _paths.JOBBANK / "jobbank-on.json"
    jobs = json.loads(jb.read_text(encoding="utf-8"))
    det_dir = _paths.JOBBANK / "details"
    det_dir.mkdir(parents=True, exist_ok=True)
    done = 0
    with httpx.Client(headers={"User-Agent": UA}, follow_redirects=True, timeout=20) as c:
        for j in jobs:
            try:
                s = BeautifulSoup(c.get(j["url"]).text, "html.parser")
            except Exception:  # noqa: BLE001
                continue
            addr = text(s.select_one('[property="address"]'))
            desc = text(s.select_one('[property="description"]'))
            dp = text(s.select_one('[property="datePosted"]')).replace("Posted on", "").strip()
            if addr:
                j["address"] = addr
            if dp:
                j["date_detail"] = dp
            pid = j.get("posting_id") or re.sub(r"\W+", "", j.get("url", ""))[-12:]
            md = (f"---\ntitle: {j.get('title', '')}\nemployer: {j.get('employer', '')}\n"
                  f"address: {addr}\nposted: {dp}\nsalary: {j.get('salary', '')}\n"
                  f"source: {j.get('source', '')}\nurl: {j.get('url', '')}\n---\n\n{desc}\n")
            (det_dir / f"{pid}.md").write_text(md, encoding="utf-8")
            done += 1
            time.sleep(0.25)
    jb.write_text(json.dumps(jobs, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Fetched details for {done}/{len(jobs)} Job Bank jobs → {det_dir}")


if __name__ == "__main__":
    main()
