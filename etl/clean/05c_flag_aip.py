"""
05c — flag whether each job's employer is an AIP designated employer (single field: `aip`).

「一字段一脚本」示例:本脚本只产出一个字段 `aip`(bool),来源单一(官方 AIP 指定雇主名单),
不依赖别的字段 → 适合独立成脚本。读雇主名 → 归一化匹配 → 写回 aip。

AIP = Atlantic Immigration Program(NL/NB/NS/PE),是唯一公布「指定雇主名单」的通道。
名单只覆盖大西洋四省,所以只有这些省的岗可能命中。

Usage:  uv run python etl/clean/05c_flag_aip.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/ 上层(_paths 在那)
import _paths  # noqa: E402

# ── 输入/输出全路径(先声明再用)──────────────────────────────────────
IN_AIP_LIST = _paths.DESIGNATED / "aip-designated-employers.json"  # 官方指定雇主名单(只读)
IN_JOBBANK_FILE = _paths.JOBBANK / "postings.json"                 # 读雇主 → 写回 aip
IN_COMPANIES_DIR = _paths.COMPANIES                                # ATS 各 <slug>/jobs.json
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
        OUT_JOBBANK_FILE.write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")

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


if __name__ == "__main__":
    main()
