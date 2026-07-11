"""榜单第一批(E5-02,PRD F8):计算全部下沉数据层,前端只 SELECT rankings 渲染。

两个命名榜单(slug 即 URL 段):
  weekly-top      本周新增 TOP 50 —— datePosted 7 天内、在招,按评分降序(同分薪资高优先)。
                  (口径注:mart 无 firstSeen(它是 DB 侧种入时间戳),用 datePosted 表达"本周新增",偏离文档已记档)
  sponsor-likely  最可能担保雇主 TOP 30 —— 公司聚合:第一方直发 + 省具名通道命中岗数,
                  按 (LMIA 获批职位数, 具名通道岗数, 在招岗数, 平均分) 降序(E6-02:LMIA 雇佣史=最硬证据,第一排序键)。
                  入榜门槛:具名通道命中 或 有近两年 LMIA 记录。

行遵守 E4-03 约束:只含事实字段 + 官方链接(applyUrl/officialUrl);展示字段冗余进行,页面零 join 零计算。
输入:data/mart/jobs.json + companies.json(跑在 09 之后);输出:data/mart/rankings.json(seed 灌 rankings 表)。
"""
from __future__ import annotations

import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")

IN_JOBS = _paths.MART / "jobs.json"
IN_COMPANIES = _paths.MART / "companies.json"
OUT_RANKINGS = _paths.MART / "rankings.json"

WEEKLY_N = 50
SPONSOR_N = 30
AGENCY = re.compile(r"recruit|staffing|talent|personnel|placement|outsourc|mercor|adecco|randstad|source code|manpower", re.I)


def is_direct(j: dict) -> bool:
    """第一方判定(镜像前端 isDirect):JB 渠道仅 source=='Job Bank' 算直发;ATS 天然第一方。"""
    if "jobbank.gc.ca" in (j.get("applyUrl") or ""):
        return j.get("source") == "Job Bank"
    return True


def job_row(slug: str, rank: int, j: dict) -> dict:
    return {
        "slug": slug, "rank": rank, "kind": "job",
        "externalId": j.get("externalId", ""),
        "title": j.get("title", ""), "company": j.get("companyName", ""),
        "city": j.get("city", ""), "province": j.get("province", ""),
        "noc": j.get("noc", ""), "teer": j.get("teer"),
        "score": j.get("score"), "salaryText": j.get("salaryText", ""), "salaryAnnual": j.get("salaryAnnual"),
        "pnpStream": j.get("pnpStream", ""), "eeCategory": j.get("eeCategory", ""),
        "datePosted": j.get("datePosted", ""), "applyUrl": j.get("applyUrl", ""),
        "openJobs": None, "namedJobs": None, "avgScore": None, "officialUrl": "",
    }


def main() -> None:
    print(f"IN : {IN_JOBS}\nIN : {IN_COMPANIES}\nOUT: {OUT_RANKINGS}")
    jobs = json.loads(IN_JOBS.read_text(encoding="utf-8"))
    companies = {c.get("slug"): c for c in json.loads(IN_COMPANIES.read_text(encoding="utf-8"))}
    for j in jobs:  # 公司名冗余进 job 行(展示用)
        j["companyName"] = (companies.get(j.get("companySlug")) or {}).get("name", "")

    rows: list[dict] = []

    # ── 榜 1:本周新增 TOP N ──
    cut = (date.today() - timedelta(days=7)).isoformat()
    pool = [j for j in jobs if j.get("status") != "closed" and (j.get("datePosted") or "") >= cut]
    pool.sort(key=lambda j: (-(j.get("score") or 0), -(j.get("salaryAnnual") or 0)))
    for i, j in enumerate(pool[:WEEKLY_N], 1):
        rows.append(job_row("weekly-top", i, j))
    print(f"weekly-top: 池 {len(pool)} → TOP {min(WEEKLY_N, len(pool))}")

    # ── 榜 2:最可能担保雇主 TOP N(公司聚合) ──
    agg: dict[str, dict] = {}
    for j in jobs:
        if j.get("status") == "closed" or not j.get("companySlug"):
            continue
        name = j.get("companyName", "")
        if not name or AGENCY.search(name):
            continue
        if not is_direct(j):
            continue
        comp = companies.get(j["companySlug"]) or {}
        a = agg.setdefault(j["companySlug"], {"name": name, "open": 0, "named": 0, "scores": [], "provs": set(), "official": "",
                                              "lmia": comp.get("lmiaPositionsSkilled") or 0,   # 榜单口径:剔除农业/季节股(温室/渔场百人季节工会淹没技能类榜)
                                              "lmiaQ": comp.get("lmiaLastQuarter") or ""})     # 第 17 轮 #21:第一排序键上榜可见,带最近季度
        a["open"] += 1
        if j.get("pnpStream"):
            a["named"] += 1
        if j.get("score") is not None:
            a["scores"].append(j["score"])
        if j.get("province"):
            a["provs"].add(j["province"])
        a["official"] = a["official"] or (j.get("officialUrl") or "")
    ranked = sorted(agg.items(), key=lambda kv: (-kv[1]["lmia"], -kv[1]["named"], -kv[1]["open"],
                                                 -(sum(kv[1]["scores"]) / len(kv[1]["scores"]) if kv[1]["scores"] else 0)))
    # 入榜口径(E6-02 升级):LMIA 雇佣史(实证)或 具名通道命中(省点名),二者其一
    ranked = [kv for kv in ranked if kv[1]["lmia"] > 0 or kv[1]["named"] > 0][:SPONSOR_N]
    for i, (slug, a) in enumerate(ranked, 1):
        rows.append({
            "slug": "sponsor-likely", "rank": i, "kind": "company",
            "externalId": "", "title": "", "company": a["name"],
            "city": "", "province": "/".join(sorted(a["provs"])),
            "noc": "", "teer": None, "score": None, "salaryText": "", "salaryAnnual": None,
            "pnpStream": "", "eeCategory": "", "datePosted": "", "applyUrl": "",
            "openJobs": a["open"], "namedJobs": a["named"],
            "avgScore": round(sum(a["scores"]) / len(a["scores"]), 1) if a["scores"] else None,
            "officialUrl": a["official"], "companySlug": slug,
            "lmiaPositions": a["lmia"] or None, "lmiaQuarter": a["lmiaQ"] or None,  # #21:榜单显示第一排序键
        })
    print(f"sponsor-likely: 公司 {len(agg)} → 具名命中 {len(ranked)} 家进榜")

    OUT_RANKINGS.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"rankings: {len(rows)} 行 → {OUT_RANKINGS}")


if __name__ == "__main__":
    main()
