"""
05e — flag jobs that accept zero experience (`apprentice_friendly` + provenance `experience_req`).

B1-3(2026-08-03,木匠案例):无经验用户的第一段路是「谁肯要 0 经验」。判据只认官方写下的:
① Job Bank 详情页结构化 Experience 短语(枚举值,05b 解析进 details/*.md 的正文):
   「Will train / No experience (will train) / Experience an asset」= 雇主明说不要求经验;
② 标题含 apprentice/apprenti(学徒岗按定义是入行通道,聚合帖没有结构化区,标题是唯一信号)。
两个都不命中 → False(语义=「没被官方标为不要经验」,不是「要经验」;漏标只会少数不会错数)。

一个关注点两个字段:`experience_req`(原始短语,flag 的出处,同源同脚本)+ `apprentice_friendly`(bool)。
md → posting 用 frontmatter 的 url 对(url 含帖子号,精确;同名雇主+职位覆盖掉的 md 少量帖对不上 → 留 False,宁缺不猜)。

IN  : processed/jobbank/postings.json + processed/jobbank/details/*.md
OUT : processed/jobbank/postings.json(原地写回) + companies/*/jobs.json(ATS 一律 False,保持字段一致)
Usage:  uv run python etl/clean/05e_flag_apprentice.py
"""
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/ 上层(paths 在那)
import paths

# ── 输入/输出全路径(先声明再用)──────────────────────────────────────
IN_JOBBANK_FILE = paths.PROCESSED_JOBBANK / "postings.json"   # 读 → 原地写回两个字段
IN_DETAILS_DIR = paths.PROCESSED_JOBBANK / "details"          # 05b 产出的 JD 全文 .md
IN_COMPANIES_DIR = paths.COMPANIES                            # ATS 各 <slug>/jobs.json
OUT_JOBBANK_FILE = IN_JOBBANK_FILE                             # 原地写回
OUT_COMPANIES_DIR = IN_COMPANIES_DIR                           # 原地写回

# Job Bank 的 Experience 是枚举下拉,这三个值 = 官方写明不要求经验(其余是年限档,不猜语义)
ZERO_EXP_PHRASES = {"Will train", "No experience (will train)", "Experience an asset"}
APPRENTICE_TITLE = re.compile(r"\bapprenti", re.I)  # apprentice / apprenti(e)(法语帖)
_URL_LINE = re.compile(r"^url:\s*(\S+)", re.M)
_PID = re.compile(r"/jobposting/(\d+)")


def experience_phrase(md_text: str) -> str:
    """JD 正文里独立成行的「Experience」节 → 下一非空行(「Experience and specialization」不算)。"""
    lines = [ln.strip() for ln in md_text.split("\n")]
    for i, ln in enumerate(lines):
        if ln == "Experience":
            for nx in lines[i + 1:]:
                if nx:
                    return nx.lstrip("• ").strip()
            return ""
    return ""


def phrase_by_pid() -> dict[str, str]:
    """扫 details/*.md:frontmatter url 的帖子号 → Experience 短语(没有该节的不入映射)。"""
    out: dict[str, str] = {}
    if not IN_DETAILS_DIR.exists():
        return out
    for f in IN_DETAILS_DIR.glob("*.md"):
        t = f.read_text(encoding="utf-8")
        m = _URL_LINE.search(t)
        pid = _PID.search(m.group(1)) if m else None
        if not pid:
            continue
        p = experience_phrase(t)
        if p:
            out[pid.group(1)] = p
    return out


def main() -> None:
    print(f"IN  details md  : {IN_DETAILS_DIR}")
    print(f"IN/OUT job bank : {OUT_JOBBANK_FILE}")
    phrases = phrase_by_pid()
    print(f"  md with Experience phrase: {len(phrases)}")
    flagged = by_phrase = by_title = total = 0

    if IN_JOBBANK_FILE.exists():
        posts = json.loads(IN_JOBBANK_FILE.read_text(encoding="utf-8"))
        for j in posts:
            total += 1
            pid = str(j.get("posting_id") or "")
            phrase = phrases.get(pid, "")
            j["experience_req"] = phrase
            hit_phrase = phrase in ZERO_EXP_PHRASES
            hit_title = bool(APPRENTICE_TITLE.search(j.get("title") or ""))
            j["apprentice_friendly"] = hit_phrase or hit_title
            flagged += j["apprentice_friendly"]
            by_phrase += hit_phrase
            by_title += hit_title
        tmp = OUT_JOBBANK_FILE.with_suffix(".json.tmp")  # 原子写:与 05/05b/05c 一致
        tmp.write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, OUT_JOBBANK_FILE)

    # ATS(Kanata 科技公司)没有 Job Bank 结构化区,也不是学徒工种 → 一律 False(保持字段一致)
    for jobs_json in IN_COMPANIES_DIR.rglob("jobs.json"):
        data = json.loads(jobs_json.read_text(encoding="utf-8"))
        changed = False
        for j in data.get("jobs", []):
            if j.get("apprentice_friendly") is not False:
                j["apprentice_friendly"] = False
                changed = True
        if changed:
            jobs_json.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"apprentice_friendly {flagged}/{total} jobs "
          f"(phrase {by_phrase} · title {by_title} · overlap {by_phrase + by_title - flagged}).")


if __name__ == "__main__":
    main()
