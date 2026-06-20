"""
Stage 3 — pull real openings from companies' own ATS (first-party job feeds).

For each company folder that has a careers.json with a known ATS, resolve the ATS
board token from the careers page, call the ATS's public JSON API, and write the
normalized postings to jobs.json in that same company folder. These are first-party
listings (the company's own careers page backend), NOT aggregator reposts.

Supported ATS (clean public JSON): greenhouse, lever, bamboohr, recruitee,
smartrecruiters, workable. Others (workday, icims, teamtailor, dayforce, bullhorn,
applytojob) are flagged for manual follow-up.

Usage:
  uv run python scripts/jobs/ats_jobs.py --region ottawa-kanata-north

Output: data/companies/<region>/<slug>/jobs.json  +  data/companies/<region>-jobs.md
"""
import argparse
import json
import re
from pathlib import Path

import httpx

import _paths
PROJECT_ROOT = _paths.ROOT
COMPANIES_DIR = _paths.COMPANIES
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
TECH_JOB = re.compile(
    r"software|developer|engineer|programm|\bdata\b|scientist|cloud|devops|\bqa\b|"
    r"architect|machine learning|\bai\b|full[-\s]?stack|back[-\s]?end|front[-\s]?end|"
    r"\bweb\b|security|cyber|\bsystems?\b|\bit\b|network|database|analyst|firmware|embedded", re.I)
SUPPORTED = {"greenhouse", "lever", "bamboohr", "recruitee", "smartrecruiters", "workable"}


def _token(client, careers_url, ats):
    html = ""
    try:
        html = client.get(careers_url).text
    except Exception:  # noqa: BLE001
        pass
    pats = {
        "greenhouse": r'for=([a-z0-9]+)|boards\.greenhouse\.io/(?:embed/job_board\?for=)?([a-z0-9]+)',
        "lever": r'(?:jobs|api)\.lever\.co/(?:v0/postings/)?([a-z0-9\-]+)',
        "bamboohr": r'([a-z0-9\-]+)\.bamboohr\.com',
        "recruitee": r'([a-z0-9\-]+)\.recruitee\.com',
        "smartrecruiters": r'smartrecruiters\.com/(?:companies/)?([A-Za-z0-9]+)',
        "workable": r'apply\.workable\.com/([a-z0-9\-]+)|([a-z0-9\-]+)\.workable\.com',
    }
    m = re.search(pats[ats], html, re.I)
    return next((g for g in m.groups() if g), "") if m else ""


def fetch_jobs(client, ats, token):
    """Return list of normalized {title, location, url, department}."""
    try:
        if ats == "greenhouse":
            j = client.get(f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs").json()
            return [{"title": x["title"], "location": (x.get("location") or {}).get("name", ""),
                     "url": x.get("absolute_url", ""), "department": ""} for x in j.get("jobs", [])]
        if ats == "lever":
            j = client.get(f"https://api.lever.co/v0/postings/{token}?mode=json").json()
            return [{"title": x.get("text", ""), "location": (x.get("categories") or {}).get("location", ""),
                     "url": x.get("hostedUrl", ""), "department": (x.get("categories") or {}).get("team", "")} for x in j]
        if ats == "bamboohr":
            j = client.get(f"https://{token}.bamboohr.com/careers/list").json()
            out = []
            for x in j.get("result", []):
                loc = x.get("location") or {}
                loc = ", ".join(v for v in [loc.get("city"), loc.get("state")] if v) if isinstance(loc, dict) else str(loc)
                out.append({"title": x.get("jobOpeningName", ""), "location": loc,
                            "url": f"https://{token}.bamboohr.com/careers/{x.get('id','')}",
                            "department": x.get("departmentLabel", "")})
            return out
        if ats == "recruitee":
            j = client.get(f"https://{token}.recruitee.com/api/offers/").json()
            return [{"title": x.get("title", ""), "location": x.get("location", "") or x.get("city", ""),
                     "url": x.get("careers_url") or x.get("url", ""), "department": x.get("department", "")}
                    for x in j.get("offers", [])]
        if ats == "smartrecruiters":
            j = client.get(f"https://api.smartrecruiters.com/v1/companies/{token}/postings?limit=100").json()
            out = []
            for x in j.get("content", []):
                loc = x.get("location") or {}
                out.append({"title": x.get("name", ""),
                            "location": ", ".join(v for v in [loc.get("city"), loc.get("region")] if v),
                            "url": f"https://jobs.smartrecruiters.com/{token}/{x.get('id','')}",
                            "department": (x.get("department") or {}).get("label", "")})
            return out
        if ats == "workable":
            r = client.get(f"https://www.workable.com/api/accounts/{token}?details=true")
            j = r.json()
            return [{"title": x.get("title", ""), "location": x.get("location", {}).get("location_str", "")
                     if isinstance(x.get("location"), dict) else x.get("location", ""),
                     "url": x.get("url") or x.get("application_url", ""), "department": x.get("department", "")}
                    for x in j.get("jobs", [])]
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}"}
    return []


def main() -> None:
    ap = argparse.ArgumentParser(description="Stage 3: pull jobs from company ATS feeds.")
    ap.add_argument("--region", default="ottawa-kanata-north")
    args = ap.parse_args()
    region_dir = COMPANIES_DIR / args.region

    summary, skipped = [], []
    with httpx.Client(headers={"User-Agent": UA}, follow_redirects=True, timeout=20) as client:
        for folder in sorted(p for p in region_dir.iterdir() if p.is_dir()):
            cj = folder / "careers.json"
            if not cj.exists():
                continue
            car = json.loads(cj.read_text(encoding="utf-8"))
            ats = car.get("ats", "")
            if ats not in SUPPORTED:
                if ats:
                    skipped.append((folder.name, ats))
                continue
            token = _token(client, car.get("careers_url", ""), ats)
            if not token:
                skipped.append((folder.name, f"{ats}(no token)"))
                continue
            jobs = fetch_jobs(client, ats, token)
            if isinstance(jobs, dict):  # error
                skipped.append((folder.name, f"{ats}({jobs['error'][:20]})"))
                continue
            for jb in jobs:
                jb["tech"] = bool(TECH_JOB.search(jb.get("title", "")))
            (folder / "jobs.json").write_text(json.dumps(
                {"ats": ats, "token": token, "count": len(jobs), "jobs": jobs},
                ensure_ascii=False, indent=2), encoding="utf-8")
            tech = [j for j in jobs if j["tech"]]
            ott = [j for j in tech if re.search(r"ottawa|kanata|nepean|remote|canada", j.get("location", ""), re.I)]
            summary.append({"company": folder.name, "ats": ats, "total": len(jobs),
                            "tech": len(tech), "ottawa_or_remote_tech": len(ott), "tech_jobs": tech})

    summary.sort(key=lambda s: s["tech"], reverse=True)
    total_tech = sum(s["tech"] for s in summary)
    L = [f"# {args.region} · Stage 3 真实在招岗(公司ATS第一方)\n",
         f"> {len(summary)} 家ATS公司成功抓取,共 **{total_tech}** 个科技岗。数据来自各公司自己的招聘后台,非聚合站。",
         f"> 跳过 {len(skipped)} 家(不支持的ATS/无token)。每家明细见其文件夹 jobs.json。\n",
         "| 公司 | ATS | 总岗 | 科技岗 | 渥太华/远程科技岗 |", "|---|---|---:|---:|---:|"]
    for s in summary:
        L.append(f"| {s['company']} | {s['ats']} | {s['total']} | {s['tech']} | {s['ottawa_or_remote_tech']} |")
    # flatten tech jobs located in Ottawa/remote
    L.append("\n## 渥太华/远程 科技岗(可直接投递)\n")
    L.append("| 公司 | 职位 | 地点 | 投递 |")
    L.append("|---|---|---|---|")
    for s in summary:
        for j in s["tech_jobs"]:
            if re.search(r"ottawa|kanata|nepean|remote|canada", j.get("location", ""), re.I):
                L.append(f"| {s['company']} | {j['title']} | {j['location']} | [开](<{j['url']}>) |")
    if skipped:
        L.append(f"\n_未抓(待手动/其他ATS):_ " + "、".join(f"{n}({a})" for n, a in skipped[:50]))
    (_paths.OUTPUT / f"{args.region}-jobs.md").write_text("\n".join(L), encoding="utf-8")
    print(f"Stage 3: {len(summary)} companies, {total_tech} tech jobs. Skipped {len(skipped)}.")
    print(f"  → {_paths.OUTPUT / (args.region + '-jobs.md')}")


if __name__ == "__main__":
    main()
