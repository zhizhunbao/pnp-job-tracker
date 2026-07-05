"""字段级来源注册表(E4-04):每个前端字段 → 数据集级 citation,由 ETL 抓取验证。

契约(advisor-fields-plan Part C):
- 来源解释 = 抓取页面 <title>/meta description **原文**(不经 LLM 不翻译);抓取失败 → unverified 只留链接(宁可留空)。
- 派生字段(kind=derived)不抓网:citation = 底层来源链 + 本站口径一句(静态文案住这里,单一来源)。
- 记录级 citation(pnp 通道 url / applyUrl / AIP 名单)已在各维度,前端优先显示 —— 本表只管数据集级兜底。
- URL 聚合自各 build 脚本既有常量(build_wages/build_noc_descriptions/build_ee_*),不重复维护数据 URL,
  citation 用**着陆页**(人能读的页面,title/description 有意义;数据文件 URL 抓不出解释)。

挂 `pnp` 源周更(sources/pnp/META);输出 raw/sources/field-sources.json(跟踪,09 直通进 mart)。
"""
from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")  # Windows 本地控制台 cp1252 打不出中文


OUT_FILE = _paths.RAW / "sources" / "field-sources.json"   # 输出:字段→来源注册表(跟踪)

UA = {"User-Agent": "Mozilla/5.0 (compatible; pnp-job-tracker source-verifier)"}
TODAY = date.today().isoformat()

# ── 注册表:数据集级来源(fields 共享同一 citation;URL=着陆页) ────────────────
DATASETS = [
    {
        "publisher": "Job Bank / Guichet-Emplois (Government of Canada)",
        "url": "https://www.jobbank.gc.ca/jobsearch/",
        "fields": ["title", "company", "salary", "datePosted", "address", "city", "province", "country", "source", "jd"],
    },
    {
        "publisher": "Statistics Canada — NOC 2021 Version 1.0",
        "url": "https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1",
        "fields": ["noc", "teer", "broad", "mid", "fine"],
    },
    {
        "publisher": "ESDC — Wages by occupation (Open Government)",
        "url": "https://open.canada.ca/data/en/dataset/adad580f-76b0-4502-bd05-20c125de9116",
        "fields": ["wageMedHr", "wageMedYr"],
    },
    {
        "publisher": "IRCC — Express Entry category-based selection",
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations/category-based-selection.html",
        "fields": ["ee"],
    },
    {
        "publisher": "IRCC — Atlantic Immigration Program",
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html",
        "fields": ["aip"],
    },
    {
        "publisher": "IRCC — Provincial Nominee Program",
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html",
        "fields": ["pnp"],
    },
    {
        "publisher": "GeoNames — Canada postal codes (open data)",
        "url": "https://download.geonames.org/export/zip/",
        "fields": ["district"],
    },
    {   # E6-02:雇主外劳雇佣记录(正面 LMIA 清单;着陆页=开放数据集页)
        "publisher": "ESDC — TFWP positive LMIA employers list (Open Government)",
        "url": "https://open.canada.ca/data/en/dataset/90fed587-1364-4f33-a9ee-208181dc0b97",
        "fields": ["lmia"],
    },
]

# ── 派生字段:本站口径(kind=derived,不抓网;citation=口径一句+底层来源链) ──────
DERIVED = [
    {"field": "score", "note": "评分为本站派生:TEER 基准 + 紧缺大类 + 省具名通道 + 第一方雇主 + 经验 + 省份(弹框有逐项明细);底层来源 = StatCan NOC × 省提名清单", "basedOn": ["noc", "pnp"]},
    {"field": "vsMedian", "note": "vs 中位为本站派生:本岗年薪 ÷ 当地同 NOC 中位年薪 − 1;中位来自 ESDC 工资开放数据", "basedOn": ["salary", "wageMedYr"]},
    {"field": "salaryYr", "note": "年薪(折算)为本站派生:从原帖薪资文本按时薪×2080/周薪×52 等口径归一;原始薪资见官方原帖", "basedOn": ["salary"]},
    {"field": "accessibility", "note": "经验级别为本站派生:按职位文本启发式判定(co-op/初/中/高级),非官方分级", "basedOn": ["title"]},
    {"field": "status", "note": "状态/下架为本站口径:本次抓取未见 且 发布超 30 天 → 标记已下架;非雇主官方状态", "basedOn": ["datePosted"]},
    {"field": "firstSeen", "note": "首次收录/更新时间为本站抓取时间戳,非职位官方发布/修改时间", "basedOn": ["datePosted"]},
    {"field": "origin", "note": "渠道为本站口径:抓取来源(jobbank/ats/directory),表示发布通道,不代表雇主真假", "basedOn": ["source"]},
    {"field": "direct", "note": "第一方/转贴为本站派生:按发布渠道与公司名(中介名单)判定", "basedOn": ["source"]},
    {"field": "match", "note": "「与我的匹配」为本站派生:你自报的档案 × 公开清单/抽选数据的机械比对,非资格认定", "basedOn": ["pnp", "ee", "wageMedYr"]},
]


def fetch_meta(client: httpx.Client, url: str) -> dict:
    """抓着陆页,抽 <title> + meta description 原文;失败 → unverified(宁可留空)。"""
    try:
        r = client.get(url, headers=UA, timeout=30, follow_redirects=True)
        if r.status_code != 200:
            return {"status": "unverified", "title": "", "description": ""}
        html = r.text
        m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
        title = re.sub(r"\s+", " ", m.group(1)).strip() if m else ""
        m = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', html, re.I | re.S) or \
            re.search(r'<meta[^>]+content=["\'](.*?)["\'][^>]+name=["\']description["\']', html, re.I | re.S)
        desc = re.sub(r"\s+", " ", m.group(1)).strip() if m else ""
        return {"status": "verified", "title": title[:300], "description": desc[:500]}
    except Exception as e:  # noqa: BLE001
        print(f"  ! {url} → {e.__class__.__name__}(unverified)")
        return {"status": "unverified", "title": "", "description": ""}


def main() -> None:
    print(f"IN : (registry in-script, {len(DATASETS)} datasets / {len(DERIVED)} derived)")
    print(f"OUT: {OUT_FILE}")
    rows: list[dict] = []
    with httpx.Client() as client:
        meta_by_url = {d["url"]: fetch_meta(client, d["url"]) for d in DATASETS}
    for d in DATASETS:
        meta = meta_by_url[d["url"]]
        for f in d["fields"]:
            rows.append({
                "field": f, "kind": "dataset", "publisher": d["publisher"], "url": d["url"],
                "title": meta["title"], "description": meta["description"],
                "status": meta["status"], "fetched": TODAY, "note": "",
            })
    for d in DERIVED:
        rows.append({
            "field": d["field"], "kind": "derived", "publisher": "PNP Job Tracker(本站派生)", "url": "",
            "title": "", "description": "", "status": "derived", "fetched": TODAY,
            "note": d["note"],
        })
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps({"fetched": TODAY, "rows": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
    ok = sum(1 for r in rows if r["status"] == "verified")
    print(f"field-sources: {len(rows)} 行(verified {ok} / unverified {sum(1 for r in rows if r['status'] == 'unverified')} / derived {len(DERIVED)})")


if __name__ == "__main__":
    main()
