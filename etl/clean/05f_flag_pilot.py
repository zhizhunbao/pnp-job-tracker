"""
05d — flag whether each job sits in an RCIP/FCIP pilot community (fields: `pilot`, `pilotCommunity`).

「一个清洗关注点一个脚本」:本脚本只回答「岗在不在试点社区」——城市 × 省 精确匹配
人工核对过的社区城市映射(build_pilots 产,宁漏勿错:区域型社区 cities=[] 不参与)。
口径红线(E6-11 §5):试点是社区推荐制且雇主须先被社区指定,命中≠能走试点 —— 粗筛信号。
同城双试点(Sudbury/Timmins 同时在 RCIP 与 FCIP)→ pilot='RCIP+FCIP'。

Usage:  uv run python etl/clean/05f_flag_pilot.py
"""
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/ 上层(_paths 在那)
import _paths  # noqa: E402

# ── 输入/输出全路径(先声明再用)──────────────────────────────────────
IN_PILOT_LIST = _paths.PILOT / "pilot-communities.json"       # 社区名单+城市映射(只读)
IN_PILOT_EMP = _paths.PILOT / "pilot-employers.json"          # 批B:社区指定雇主名单(只读,可缺)
IN_JOBBANK_FILE = _paths.PROCESSED_JOBBANK / "postings.json"  # 读 city/province → 写回 pilot
IN_COMPANIES_DIR = _paths.COMPANIES                           # ATS 各 <slug>/jobs.json
OUT_JOBBANK_FILE = IN_JOBBANK_FILE                            # 原地写回
OUT_COMPANIES_DIR = IN_COMPANIES_DIR                          # 原地写回

# 雇主名归一(与 05c_flag_aip / lib/designationMatch.ts 同源口径:去 o/a 别名、去法人后缀、去标点小写)
_SUFFIX = re.compile(
    r"\b(inc|incorporated|ltd|limited|llp|llc|corp|corporation|co|company|enr|ltee|lt[eé]e|"
    r"holdings?|group|services?|enterprises?)\b\.?", re.I)


def norm_name(name: str) -> str:
    n = (name or "").lower()
    n = re.split(r"\bo/a\b|\bdba\b|\bd/b/a\b|\bo\.a\.\b", n)[0]
    n = _SUFFIX.sub(" ", n)
    n = re.sub(r"[^a-z0-9& ]", " ", n)
    return re.sub(r"\s+", " ", n).strip()


def load_employers() -> dict[str, set[str]]:
    """社区名 → 该社区指定雇主的归一名集合(legal 名与 o/a 别名都入)。文件可缺(批B 渐进覆盖)。"""
    out: dict[str, set[str]] = {}
    if not IN_PILOT_EMP.exists():
        return out
    for r in json.loads(IN_PILOT_EMP.read_text(encoding="utf-8")).get("rows", []):
        names = out.setdefault(r.get("community", ""), set())
        raw = r.get("name", "")
        names.add(norm_name(raw))
        m = re.search(r"\bo/a\b(.+)", raw, re.I)
        if m:
            names.add(norm_name(m.group(1)))
        names.discard("")
    return out


def load_map() -> dict[tuple[str, str], list[dict]]:
    """(province, city) → 命中的社区行列表(同城可命中 RCIP+FCIP 两行)。"""
    out: dict[tuple[str, str], list[dict]] = {}
    for r in json.loads(IN_PILOT_LIST.read_text(encoding="utf-8"))["rows"]:
        for city in r.get("cities") or []:
            out.setdefault((r["province"], city), []).append(r)
    return out


def verdict(hits: list[dict]) -> tuple[str, str]:
    """命中行 → (pilot, pilotCommunity)。类型去重排序保证 'RCIP+FCIP' 顺序稳定。"""
    types = sorted({h["type"] for h in hits}, reverse=True)   # RCIP 在前
    # 社区名:同城多命中时取 RCIP 行的名(社区名本就相同或同城,逗号连接会破一行一条铁律)
    name = next((h["name"] for h in hits if h["type"] == "RCIP"), hits[0]["name"])
    return "+".join(types), name


def main() -> None:
    print(f"IN pilot list    : {IN_PILOT_LIST}")
    print(f"IN/OUT job bank  : {OUT_JOBBANK_FILE}")
    cmap = load_map()
    emp = load_employers()
    print(f"  mapped (province, city) keys: {len(cmap)} · communities with employer list: {len(emp)}")
    flagged = total = emp_hits = 0

    if IN_JOBBANK_FILE.exists():
        posts = json.loads(IN_JOBBANK_FILE.read_text(encoding="utf-8"))
        for j in posts:
            total += 1
            hits = cmap.get((j.get("province", ""), j.get("city", "")))
            if hits:
                j["pilot"], j["pilotCommunity"] = verdict(hits)
                flagged += 1
                # 批B:雇主在**本社区**的官方指定名单上(强一级信号)。False≠未指定 ——
                # 名单未公布的社区一律 False,前端只做正向展示,禁反向解读
                j["pilotEmployer"] = norm_name(j.get("employer", "")) in emp.get(j["pilotCommunity"], set())
                emp_hits += j["pilotEmployer"]
            else:
                j["pilot"], j["pilotCommunity"] = "", ""
                j["pilotEmployer"] = False
        tmp = OUT_JOBBANK_FILE.with_suffix(".json.tmp")  # 原子写:与 05/05b/05c 一致
        tmp.write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, OUT_JOBBANK_FILE)

    # ATS 公司岗在 Ottawa(非试点社区)→ 一律空(保持字段一致)
    for jobs_json in IN_COMPANIES_DIR.rglob("jobs.json"):
        data = json.loads(jobs_json.read_text(encoding="utf-8"))
        changed = False
        for j in data.get("jobs", []):
            total += 1
            if j.get("pilot") != "" or j.get("pilotCommunity") != "" or j.get("pilotEmployer") is not False:
                j["pilot"], j["pilotCommunity"], j["pilotEmployer"] = "", "", False
                changed = True
        if changed:
            jobs_json.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"pilot flagged {flagged}/{total} jobs (city inside an RCIP/FCIP community); designated-employer hits {emp_hits}.")


if __name__ == "__main__":
    main()
