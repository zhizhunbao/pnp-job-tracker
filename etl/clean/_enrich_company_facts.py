"""雇主 D 富化(2026-07-19 Frank 批「开工做雇主 D」):行业 + 中韩别名 + 知名。
① 行业 = 该雇主在库开放岗的 NOC 大类多数派(mart/jobs.json,零新抓取);
② 别名 = Wikidata 跨语言标签(zh/ko 官方条目名,不机翻;严格名称匹配,宁缺勿滥);
③ 知名 = 有英文 Wikipedia 条目(sitelink)。
产出 processed/company_facts.json;入库由 apply_company_facts.tmp.mjs 直写 companies
(industry/alias_zh/alias_ko/wiki_url 在 seed 白名单外,增量对账不动它们)。重跑幂等,可周期性刷新。
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402

IN_JOBS = _paths.MART / "jobs.json"
IN_COMPANIES = _paths.MART / "companies.json"
OUT = _paths.PROCESSED / "company_facts.json"
print(f"IN_JOBS={IN_JOBS}\nIN_COMPANIES={IN_COMPANIES}\nOUT={OUT}", flush=True)

WD = "https://www.wikidata.org/w/api.php"
UA = {"User-Agent": "offer2pr-company-facts/1.0 (data enrichment; contact via site)"}
SUFFIX = re.compile(r"\b(incorporated|inc|ltd|limited|llp|llc|corp|corporation|co|company|ltee|ltée|group|holdings?)\b\.?", re.I)

def norm(s: str) -> str:
    return re.sub(r"\s+", " ", SUFFIX.sub(" ", (s or "").lower()).replace(".", " ").replace(",", " ")).strip()

def wd_get(params: dict) -> dict:
    url = WD + "?" + urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)

ERR = "__err__"   # 网络/限速失败哨兵:不缓存、下轮重试(与「查过确实没有」区分——首跑 23/1666 偏低即失败被记成未命中)

def wikidata_lookup(name: str) -> dict | str | None:
    """严格匹配:搜索前 3 个条目,en 标签/别名归一后等于公司名才收;返回 {zh, ko, wiki} | None=确实没有 | ERR=请求失败"""
    try:
        hits = wd_get({"action": "wbsearchentities", "search": name, "language": "en", "type": "item", "limit": 3}).get("search", [])
        ids = [h["id"] for h in hits]
        if not ids:
            return None
        ents = wd_get({"action": "wbgetentities", "ids": "|".join(ids), "props": "labels|aliases|sitelinks", "languages": "en|zh|ko"}).get("entities", {})
        target = norm(name)
        for eid in ids:
            e = ents.get(eid) or {}
            labels = e.get("labels", {})
            names = [labels.get("en", {}).get("value", "")] + [a.get("value", "") for a in e.get("aliases", {}).get("en", [])]
            if not any(norm(x) == target for x in names if x):
                continue
            title = e.get("sitelinks", {}).get("enwiki", {}).get("title")
            if not title:
                continue   # 无英文维基条目=不算知名,别名也不收(知名徽标与别名同一门槛)
            return {
                "zh": labels.get("zh", {}).get("value", ""),
                "ko": labels.get("ko", {}).get("value", ""),
                "wiki": "https://en.wikipedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_")),
            }
        return None
    except Exception:
        return ERR

def main() -> None:
    jobs = json.loads(IN_JOBS.read_text(encoding="utf-8"))
    companies = json.loads(IN_COMPANIES.read_text(encoding="utf-8"))
    name_of = {c["slug"]: c.get("name", "") for c in companies if c.get("slug")}
    # ① 行业多数派(开放岗按 companySlug 归组;大类值=数据层中文值,前端 t('broad.*') 三语显示)
    by_slug: dict[str, Counter] = defaultdict(Counter)
    n_open = 0
    for j in jobs:
        if (j.get("status") or "open") == "closed":
            continue
        slug, broad = j.get("companySlug"), j.get("broad")
        if slug and broad and broad != "未分类":
            by_slug[slug][broad] += 1
            n_open += 1
    industry = {slug: c.most_common(1)[0][0] for slug, c in by_slug.items()}
    print(f"industry: {len(industry)} 家(来自 {n_open} 开放岗)", flush=True)

    # ② 候选=技能股大户 或 在库岗 ≥3 —— 控制 Wikidata 查询量;按公司名查
    posting_big = {name_of.get(s, "") for s, c in by_slug.items() if sum(c.values()) >= 3}
    lmia_big = {c.get("name") for c in companies if (c.get("lmiaPositionsSkilled") or 0) >= 10}
    cands = sorted((posting_big | lmia_big) - {None, ""})
    print(f"wikidata 候选: {len(cands)} 家", flush=True)

    prev = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    prev_names: dict[str, dict] = prev.get("by_name", prev if isinstance(prev, dict) else {})
    by_name: dict[str, dict] = {}
    hit = 0
    n_err = 0
    for i, co in enumerate(cands):
        cached = prev_names.get(co, {})
        if "wiki_checked" in cached:      # 幂等:确实查过的不重查(命中与确认未命中);失败的没进缓存,自然重试
            r = cached if cached.get("wiki") else None
        else:
            r = wikidata_lookup(co)
            time.sleep(0.6)               # 温和限速
        if r == ERR:
            n_err += 1
            continue                       # 失败不写缓存,下轮重试
        by_name[co] = {"wiki_checked": 1, **({"zh": r["zh"], "ko": r["ko"], "wiki": r["wiki"]} if r else {})}
        if r:
            hit += 1
        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{len(cands)} · wiki 命中 {hit}", flush=True)
    OUT.write_text(json.dumps({"by_slug": {s: {"industry": v} for s, v in industry.items()}, "by_name": by_name}, ensure_ascii=False, indent=1), encoding="utf-8")
    with_alias = sum(1 for v in by_name.values() if v.get("zh") or v.get("ko"))
    print(f"done → {OUT} · industry {len(industry)} · wiki {hit} · 有中/韩别名 {with_alias}", flush=True)

if __name__ == "__main__":
    main()
