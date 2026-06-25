"""
05b — fetch each Job Bank posting's detail page for precise address (city + postal),
full description, posting date, and the employer's official website (the posting links
the employer name to its own site). Writes a per-job .md and adds `address` + `website`
back to jobbank-on.json so the loader can show a precise location and link the company.

Usage:  uv run python etl/05b_scrape_jobbank_details.py
Output: data/raw/jobbank/details/<posting_id>.md  (+ address/website added to jobbank-on.json)
"""
import json
import re
import sys
import time
from collections import Counter
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")


def text(el) -> str:
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)) if el else ""


def slug(s: str) -> str:
    """单段 → 小写连字符,截断 50 字符。"""
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:50].strip("-")


def stem_of(employer: str, title: str) -> str:
    """可读文件名:<雇主>_<职位>(各自连字符,中间下划线分隔)。"""
    return f"{slug(employer)}_{slug(title)}".strip("_") or "job"


def employer_website(s) -> str:
    """The posting links the employer name to its own site, e.g.
    <span property="hiringOrganization"><span property="name">
       <a class="external" href="http://employer.com">Employer</a>."""
    org = s.select_one('[property="hiringOrganization"]')
    if not org:
        return ""
    a = org.select_one("a.external[href], a[href]")
    if not a:
        return ""
    href = a.get("href", "").strip()
    if href.startswith("http") and "jobbank.gc.ca" not in href and "canada.ca" not in href:
        return href
    return ""


GENERIC_EMAIL = {"gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "live.com",
                 "icloud.com", "hotmail.ca", "yahoo.ca", "gmail.ca", "aol.com"}


def email_website(html: str) -> str:
    """没有官网链接时,从申请邮箱域名推官网(hr@apollophysio.ca → http://apollophysio.ca)。"""
    for dom in re.findall(r"[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})", html):
        d = dom.lower()
        if d not in GENERIC_EMAIL and "jobbank" not in d and "canada.ca" not in d and "gc.ca" not in d:
            return "http://" + d
    return ""


def main() -> None:
    jb = _paths.JOBBANK / "postings.json"
    jobs = json.loads(jb.read_text(encoding="utf-8"))
    det_dir = _paths.JOBBANK / "details"
    det_dir.mkdir(parents=True, exist_ok=True)
    done = 0
    seen: set[str] = set()  # 文件名去重(雇主+职位偶尔重复时加帖子号)
    skipped = 0
    todo = sum(1 for j in jobs if not j.get("detail_fetched") and j.get("url"))  # 本轮真正要抓的
    prov_done: Counter[str] = Counter()  # 各省已抓计数(实时进度)
    t0 = time.monotonic()
    TICK = 50  # 每抓这么多打一行心跳(否则几十分钟零输出像死机)
    print(f"05b 抓详情:本轮待抓 {todo} 个(共 {len(jobs)} 帖,其余已抓过跳过)", flush=True)
    with httpx.Client(headers={"User-Agent": UA}, follow_redirects=True, timeout=20) as c:
        for j in jobs:
            if j.get("detail_fetched") or not j.get("url"):  # 增量:已抓过的跳过(全国 ~1500 帖,每日只抓新帖)
                skipped += 1
                continue
            try:
                raw_html = c.get(j["url"]).text
                s = BeautifulSoup(raw_html, "html.parser")
            except Exception:  # noqa: BLE001
                continue
            addr = text(s.select_one('[property="address"]'))
            desc = text(s.select_one('[property="description"]'))
            dp = text(s.select_one('[property="datePosted"]')).replace("Posted on", "").strip()
            web = employer_website(s) or email_website(raw_html)  # 官网链接优先,其次邮箱域名
            if addr:
                j["address"] = addr
            if dp:
                j["date_detail"] = dp
            if web:
                j["website"] = web
            j["detail_fetched"] = True  # 增量标记:下次跳过
            pid = j.get("posting_id") or re.sub(r"\W+", "", j.get("url", ""))[-12:]
            md = (f"---\ntitle: {j.get('title', '')}\nemployer: {j.get('employer', '')}\n"
                  f"address: {addr}\nwebsite: {web}\nposted: {dp}\nsalary: {j.get('salary', '')}\n"
                  f"source: {j.get('source', '')}\nurl: {j.get('url', '')}\n---\n\n{desc}\n")
            stem = stem_of(j.get("employer", ""), j.get("title", ""))
            fn = f"{stem}.md" if stem not in seen else f"{stem}-{pid}.md"
            seen.add(stem)
            (det_dir / fn).write_text(md, encoding="utf-8")
            done += 1
            prov_done[j.get("province") or "?"] += 1
            if done % TICK == 0 or done == todo:  # 心跳:进度 + 当前省/市/雇主 + 各省累计
                loc = addr or j.get("province", "")
                rate = done / max(time.monotonic() - t0, 1e-6)
                print(f"  …{done}/{todo} ({done * 100 // max(todo, 1)}%) · 刚抓 {j.get('province') or '?'} · "
                      f"{loc[:42]} · {(j.get('employer') or '')[:28]} · {rate:.1f}/s · 累计 {dict(prov_done)}",
                      flush=True)
            time.sleep(0.25)
    jb.write_text(json.dumps(jobs, ensure_ascii=False, indent=2), encoding="utf-8")
    webs = sum(1 for j in jobs if j.get("website"))
    addrs = sum(1 for j in jobs if j.get("address"))
    print(f"Fetched {done} details (skipped {skipped} already-done) · 省分布 {dict(prov_done)} · "
          f"{addrs} with address · {webs} with website -> {det_dir}", flush=True)


if __name__ == "__main__":
    main()
