"""
05c — flag whether each job's employer is an AIP designated employer (single field: `aip`).

「一字段一脚本」示例:本脚本只产出一个字段 `aip`(bool),来源单一(官方 AIP 指定雇主名单),
不依赖别的字段 → 适合独立成脚本。读雇主名 → 归一化匹配 → 写回 aip。

AIP = Atlantic Immigration Program(NL/NB/NS/PE),是唯一公布「指定雇主名单」的通道。
名单只覆盖大西洋四省,所以只有这些省的岗可能命中。

Usage:  uv run python etl/aip/main.py --only flag

2026-08-31 批H2 归户搬家:自 etl/clean/05c_flag_aip.py 迁进 aip 域改此名
(判据「谁的数据谁管」—— 它读的是本域产出 raw/aip/aip-designated-employers.json,
写的是一个 AIP 专有字段;住 clean/ 只是因为它写回岗位表,那是「写到哪」不是「谁的口径」)。
搬家批 —— 匹配逻辑一字未动,只去 `__main__` 收成 run()(一域一门,门在 aip/main.py)。
⚠ norm_name 是**跨域单一来源**:lmia 域 importlib 拉它当聚合键(lmia/constants.py 的
NORM_MODULE_PATH),mart 汇装拉它对 companies 做同一把尺子的 join —— 三处必须同一份实现,
改这个函数等于改 LMIA 榜单与 AIP 匹配两处口径,别复制、别就地「优化」。
样张 etl/ats/scrape_ats_jobs.py(同批同形:去 __main__ + 收 run() + 裸 `import paths`)。
"""
import json
import os
import re

import paths

# ── 输入/输出全路径(先声明再用)──────────────────────────────────────
IN_AIP_LIST = paths.AIP / "aip-designated-employers.json"  # 官方指定雇主名单(只读)
IN_JOBBANK_FILE = paths.PROCESSED_JOBBANK / "postings.json"       # 读雇主 → 写回 aip
IN_COMPANIES_DIR = paths.COMPANIES                                # ATS 各 <slug>/jobs.json
OUT_JOBBANK_FILE = IN_JOBBANK_FILE                                 # 原地写回
OUT_COMPANIES_DIR = IN_COMPANIES_DIR                               # 原地写回

ATLANTIC = {"NL", "NB", "NS", "PE"}  # AIP 只限大西洋四省;别省同名 franchise 不算

_SUFFIX = re.compile(
    r"\b(inc|incorporated|ltd|limited|llp|llc|corp|corporation|co|company|enr|ltee|lt[eé]e|"
    r"holdings?|group|services?|enterprises?)\b\.?", re.I)


def norm_name(name: str) -> str:
    """公司名归一:去 o/a 别名前缀、去公司后缀、去标点、压空格、小写。"""
    n = (name or "").lower()
    n = re.split(r"\bo/a\b|\bdba\b|\bd/b/a\b|\bo\.a\.\b", n)[0]  # 取「operating as」前的主名
    n = _SUFFIX.sub(" ", n)
    n = re.sub(r"[^a-z0-9& ]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def load_aip_names() -> set[str]:
    """官方名单 → 归一化雇主名集合(同时收 legal 名和 o/a 别名两种写法)。"""
    names: set[str] = set()
    for e in json.loads(IN_AIP_LIST.read_text(encoding="utf-8")):
        raw = e.get("employer", "")
        names.add(norm_name(raw))
        m = re.search(r"\bo/a\b(.+)", raw, re.I)  # 别名也单独入集合
        if m:
            names.add(norm_name(m.group(1)))
    names.discard("")
    return names


def main() -> None:
    print(f"IN aip list      : {IN_AIP_LIST}")
    print(f"IN/OUT job bank  : {OUT_JOBBANK_FILE}")
    aip = load_aip_names()
    print(f"  designated employers (normalized): {len(aip)}")
    flagged = total = 0

    # Job Bank
    if IN_JOBBANK_FILE.exists():
        posts = json.loads(IN_JOBBANK_FILE.read_text(encoding="utf-8"))
        for j in posts:
            total += 1
            j["aip"] = j.get("province") in ATLANTIC and norm_name(j.get("employer", "")) in aip
            flagged += j["aip"]
        tmp = OUT_JOBBANK_FILE.with_suffix(".json.tmp")  # 原子写:与 05/05b 一致
        tmp.write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, OUT_JOBBANK_FILE)

    # ATS 公司岗在 Ottawa(ON),定义上不属 AIP(大西洋四省)→ 一律 False(保持字段一致)
    for jobs_json in IN_COMPANIES_DIR.rglob("jobs.json"):
        data = json.loads(jobs_json.read_text(encoding="utf-8"))
        changed = False
        for j in data.get("jobs", []):
            total += 1
            if j.get("aip") is not False:
                j["aip"] = False
                changed = True
        if changed:
            jobs_json.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"AIP flagged {flagged}/{total} jobs (employer on official AIP designated list).")


def run() -> None:
    """本域步骤入口:官方指定雇主名单 × 岗位雇主名 → 就地写回 Job Bank / ATS 的 aip 字段。"""
    main()
