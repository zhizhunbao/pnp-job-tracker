"""
clean/05b_parse_details — 解析 Job Bank 详情页原始 HTML 快照 → 富集 processed postings
(address/date_detail/website)+ 写解析后的详情 .md。源框架 v2:抓取(05b)只存原始 HTML,
解析在这里下沉到 clean → processed。从旧 05b 的「边抓边解析」拆出来的解析半。

读哪些:raw/httpx/jobbank/details/<posting_id>.html 中、对应 posting 还没 detail_fetched 的。
解析后在 posting 上写 address/date_detail/website + detail_fetched=True,并写
processed/jobbank/details/<雇主_职位>.md(命名沿用旧 05b,advisor/06 按 url frontmatter 匹配)。

IN  : data/raw/httpx/jobbank/details/<posting_id>.html  (+ processed/jobbank/postings.json)
OUT : processed/jobbank/postings.json(原地富集) + processed/jobbank/details/<...>.md
Usage:  uv run python etl/clean/05b_parse_details.py
"""
import json
import os
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/ 上层(_paths 在那)
import _paths  # noqa: E402

_POSTING_RE = re.compile(r"/jobposting/(\d+)")
IN_RAW_DETAILS = _paths.RAW_HTTPX_JOBBANK / "details"        # 详情原始 HTML 快照
IN_POSTINGS = _paths.PROCESSED_JOBBANK / "postings.json"     # 累积 store(原地富集)
OUT_DETAILS = _paths.PROCESSED_JOBBANK / "details"           # 解析后的 .md

GENERIC_EMAIL = {"gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "live.com",
                 "icloud.com", "hotmail.ca", "yahoo.ca", "gmail.ca", "aol.com"}


def pid_of(j: dict) -> str:
    if j.get("posting_id"):
        return str(j["posting_id"])
    m = _POSTING_RE.search(j.get("url", ""))
    return m.group(1) if m else ""


def text(el) -> str:
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)) if el else ""


def slug(s: str) -> str:
    """单段 → 小写连字符,截断 50 字符。"""
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:50].strip("-")


def stem_of(employer: str, title: str) -> str:
    """可读文件名:<雇主>_<职位>(各自连字符,中间下划线分隔)。"""
    return f"{slug(employer)}_{slug(title)}".strip("_") or "job"


def employer_website(s) -> str:
    """帖子把雇主名链到其官网:<span property="hiringOrganization">…<a class="external" href>。"""
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


def email_website(html: str) -> str:
    """没有官网链接时,从申请邮箱域名推官网(hr@apollophysio.ca → http://apollophysio.ca)。"""
    for dom in re.findall(r"[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})", html):
        d = dom.lower()
        if d not in GENERIC_EMAIL and "jobbank" not in d and "canada.ca" not in d and "gc.ca" not in d:
            return "http://" + d
    return ""


def main() -> None:
    print(f"IN  raw details : {IN_RAW_DETAILS}", flush=True)
    print(f"OUT postings/md : {IN_POSTINGS} · {OUT_DETAILS}", flush=True)
    if not IN_POSTINGS.exists():
        print("没有 postings.json,跳过", flush=True)
        return
    jobs = json.loads(IN_POSTINGS.read_text(encoding="utf-8"))
    OUT_DETAILS.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()  # 本轮文件名去重(雇主+职位偶尔重复时加帖子号)
    parsed = 0
    for j in jobs:
        pid = pid_of(j)
        raw_f = IN_RAW_DETAILS / f"{pid}.html"
        if j.get("detail_fetched") or not pid or not raw_f.exists():  # 已解析 / 无原始 HTML → 跳过
            continue
        raw_html = raw_f.read_text(encoding="utf-8")
        s = BeautifulSoup(raw_html, "html.parser")
        addr = text(s.select_one('[property="address"]'))
        desc = text(s.select_one('[property="description"]'))
        dp = text(s.select_one('[property="datePosted"]')).replace("Posted on", "").strip()
        web = employer_website(s) or email_website(raw_html)
        if addr:
            j["address"] = addr
        if dp:
            j["date_detail"] = dp
        if web:
            j["website"] = web
        j["detail_fetched"] = True
        md = (f"---\ntitle: {j.get('title', '')}\nemployer: {j.get('employer', '')}\n"
              f"address: {addr}\nwebsite: {web}\nposted: {dp}\nsalary: {j.get('salary', '')}\n"
              f"source: {j.get('source', '')}\nurl: {j.get('url', '')}\n---\n\n{desc}\n")
        stem = stem_of(j.get("employer", ""), j.get("title", ""))
        fn = f"{stem}.md" if stem not in seen else f"{stem}-{pid}.md"
        seen.add(stem)
        (OUT_DETAILS / fn).write_text(md, encoding="utf-8")
        parsed += 1
    if parsed:  # 仅有变更才原子写回(temp + os.replace 同目录)
        tmp = IN_POSTINGS.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(jobs, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, IN_POSTINGS)
    webs = sum(1 for j in jobs if j.get("website"))
    addrs = sum(1 for j in jobs if j.get("address"))
    print(f"Parsed {parsed} new details · {addrs} with address · {webs} with website "
          f"→ postings 富集 + {OUT_DETAILS}", flush=True)


if __name__ == "__main__":
    main()
