"""
06 — build per-company folders for Job Bank, partitioned by region (分地域 + 分公司),
mirroring the ATS `companies/<slug>/` pattern so both sources share one structure.

  data/raw/jobbank/<province>/<city>/companies/<employer-slug>/
    profile.json      公司信息(名称/网址/简介/邮箱/电话/地址/aip)
    jobs.json         该公司职位结构化列表
    jobs/<职位>.md    每个职位详情(frontmatter + 描述)

来源:扁平 postings.json(scrape+clean 的工作文件) → 在此**物化**成分层公司目录。
本脚本确定性、不联网;公司官网首页信息由 06b_fetch_company_sites.py 增强;职位描述
取自 05b 抓的 details/<stem>.md(若有)。

Usage:  uv run python etl/06_build_jobbank_companies.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

# ── 输入/输出全路径 ──────────────────────────────────────────────
IN_POSTINGS = _paths.JOBBANK / "postings.json"   # 扁平工作文件(scrape+clean)
IN_DETAILS = _paths.JOBBANK / "details"          # 05b 抓的帖子详情 .md(描述来源)
OUT_ROOT = _paths.JOBBANK                         # raw/jobbank/<province>/<city>/companies/<slug>/

# 省码 → 目录名(全称,对齐 ATS 的 ontario/ottawa 风格)
PROV_FULL = {
    "ON": "ontario", "QC": "quebec", "BC": "british-columbia", "AB": "alberta",
    "SK": "saskatchewan", "MB": "manitoba", "NB": "new-brunswick", "NS": "nova-scotia",
    "NL": "newfoundland-and-labrador", "PE": "prince-edward-island",
}


def slug(s: str, n: int = 60) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:n].strip("-") or "unknown"


def detail_index() -> dict[str, Path]:
    """url → details/*.md 路径(.md frontmatter 带 url:),用于取职位描述。"""
    idx: dict[str, Path] = {}
    if IN_DETAILS.exists():
        for md in IN_DETAILS.glob("*.md"):
            head = md.read_text(encoding="utf-8")[:800]
            m = re.search(r"^url:\s*(.+)$", head, re.M)
            if m:
                idx[m.group(1).strip()] = md
    return idx


def description_of(md_path: Path | None) -> str:
    if not md_path or not md_path.exists():
        return ""
    body = md_path.read_text(encoding="utf-8")
    return body.split("\n---\n", 1)[1].strip() if "\n---\n" in body else ""


def job_md(j: dict, desc: str) -> str:
    fm = {k: j.get(k, "") for k in ("title", "employer", "city", "province", "district",
                                    "address", "salary", "salaryText", "date", "source", "url")}
    lines = "\n".join(f"{k}: {v}" for k, v in fm.items() if v != "")
    return f"---\n{lines}\n---\n\n{desc}\n"


def main() -> None:
    print(f"IN postings : {IN_POSTINGS}")
    print(f"OUT root    : {OUT_ROOT}/<province>/<city>/companies/<slug>/")
    posts = json.loads(IN_POSTINGS.read_text(encoding="utf-8"))
    didx = detail_index()

    # 按 (省, 市, 雇主) 分组
    groups: dict[tuple, list[dict]] = {}
    for j in posts:
        key = (j.get("province", ""), j.get("city", ""), j.get("employer", "—"))
        groups.setdefault(key, []).append(j)

    companies = jobs_written = 0
    for (prov, city, employer), jobs in groups.items():
        prov_dir = PROV_FULL.get((prov or "").upper(), slug(prov) if prov else "unknown")
        cdir = OUT_ROOT / prov_dir / slug(city) / "companies" / slug(employer)
        (cdir / "jobs").mkdir(parents=True, exist_ok=True)

        first = jobs[0]
        profile = {
            "name": employer, "slug": slug(employer), "source": "jobbank",
            "province": prov, "city": city,
            "website": next((j.get("website") for j in jobs if j.get("website")), ""),
            "address": next((j.get("address") for j in jobs if j.get("address")), ""),
            "email": first.get("email", ""), "phone": first.get("phone", ""),
            "description": "",  # 由 06b 抓官网首页填
            "aip": any(j.get("aip") for j in jobs),
            "job_count": len(jobs),
        }
        (cdir / "profile.json").write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")
        (cdir / "jobs.json").write_text(
            json.dumps({"company": employer, "count": len(jobs), "jobs": jobs}, ensure_ascii=False, indent=2),
            encoding="utf-8")

        seen: set[str] = set()
        for j in jobs:
            desc = description_of(didx.get((j.get("url") or "").strip()))
            stem = slug(j.get("title", "job"))
            fn = stem if stem not in seen else f"{stem}-{(j.get('posting_id') or '')[-6:] or len(seen)}"
            seen.add(stem)
            (cdir / "jobs" / f"{fn}.md").write_text(job_md(j, desc), encoding="utf-8")
            jobs_written += 1
        companies += 1

    print(f"Built {companies} company folders ({jobs_written} job .md) under {OUT_ROOT}")


if __name__ == "__main__":
    main()
