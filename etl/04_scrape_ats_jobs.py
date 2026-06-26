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
WORKDAY = {"workday", "myworkdayjobs"}  # 企业级 ATS:cxs JSON 端点,需单独发现 host/site
# careers 页里发现 Workday 站点:<tenant>.wdN.myworkdayjobs.com/<lang?>/<site>
WD_HOST_RE = re.compile(r"([a-z0-9-]+\.wd\d+\.myworkdayjobs\.com)/(?:[a-z]{2}-[A-Z]{2}/)?([A-Za-z0-9_-]+)")
# Workday 公司多为全球招聘,客户端按地点过滤到 Ottawa 都会区
OTTAWA_LOC = re.compile(r"ottawa|kanata|nepean|gloucester|orl[eé]ans|stittsville|manotick|barrhaven", re.I)

from datetime import datetime, timezone  # noqa: E402

ADDR_RE = re.compile(
    r"\d{1,5}\s+[A-Za-z0-9.\-' ]{2,40}?\b(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Way|"
    r"Crescent|Cres|Court|Ct|Lane|Place|Pl|Parkway|Pkwy|Terrace|Trail)\b[^.\n;]{0,50}", re.I)


def extract_address(text: str) -> str:
    if not text:
        return ""
    t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", text))
    m = ADDR_RE.search(t)
    return m.group(0).strip(" ,;") if m else ""


def to_iso(v) -> str:
    if not v:
        return ""
    if isinstance(v, (int, float)):  # ms epoch (lever)
        try:
            return datetime.fromtimestamp(v / 1000, tz=timezone.utc).date().isoformat()
        except Exception:  # noqa: BLE001
            return ""
    return str(v)[:10]


def clean_text(html: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", re.sub(r"<[^>]+>", " ", html or "")).strip()


def _money(n) -> str:
    if not n:
        return ""
    return f"${n:,.0f}" if float(n) == int(n) else f"${n:,.2f}"


def fmt_lever_salary(sr: dict) -> str:
    """Lever salaryRange {min,max,currency,interval} -> '$125,000 - $175,000 USD annually'."""
    if not sr:
        return ""
    lo, hi = sr.get("min"), sr.get("max")
    cur = (sr.get("currency") or "").strip()
    unit = {"per-hour-wage": "per hour", "per-day-wage": "per day", "per-week-salary": "per week",
            "per-month-salary": "per month", "per-year-salary": "annually"}.get(sr.get("interval", ""), "")
    if lo and hi and lo != hi:
        amt = f"{_money(lo)} - {_money(hi)}"
    elif lo or hi:
        amt = _money(lo or hi)
    else:
        return ""
    return " ".join(p for p in [amt, cur, unit] if p)


def job_id(j: dict) -> str:
    m = re.search(r"/([A-Za-z0-9_\-]{4,})/?(?:[?#]|$)", j.get("url", ""))
    base = m.group(1) if m else re.sub(r"[^a-z0-9]+", "-", j.get("title", "job").lower())
    return (base or "job")[:60].strip("-")


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
            j = client.get(f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true").json()
            return [{"title": x["title"], "location": (x.get("location") or {}).get("name", ""),
                     "url": x.get("absolute_url", ""), "department": "",
                     "posted": to_iso(x.get("updated_at", "")), "address": extract_address(x.get("content", "")),
                     "description": x.get("content", "")}
                    for x in j.get("jobs", [])]
        if ats == "lever":
            j = client.get(f"https://api.lever.co/v0/postings/{token}?mode=json").json()
            out = []
            for x in j:
                dp = x.get("descriptionPlain", "") or ""
                add = x.get("additionalPlain", "") or ""  # 结尾段(含 Compensation & Benefits)之前漏抓
                full = dp + ("\n\n" + add if add else "")
                out.append({"title": x.get("text", ""), "location": (x.get("categories") or {}).get("location", ""),
                            "url": x.get("hostedUrl", ""), "department": (x.get("categories") or {}).get("team", ""),
                            "posted": to_iso(x.get("createdAt")), "address": extract_address(dp),
                            "salary": fmt_lever_salary(x.get("salaryRange")),  # ATS 结构化薪资优先
                            "description": full})
            return out
        if ats == "bamboohr":
            j = client.get(f"https://{token}.bamboohr.com/careers/list").json()
            out = []
            for x in j.get("result", []):
                jid = x.get("id", "")
                loc = x.get("location") or {}
                loc = ", ".join(v for v in [loc.get("city"), loc.get("state")] if v) if isinstance(loc, dict) else str(loc)
                desc, comp = "", ""
                try:  # 详情页含完整描述 + 结构化薪资 compensation
                    jo = (client.get(f"https://{token}.bamboohr.com/careers/{jid}/detail").json().get("result") or {}).get("jobOpening") or {}
                    desc = jo.get("description", "")
                    comp = (jo.get("compensation") or "").strip()
                except Exception:  # noqa: BLE001
                    pass
                out.append({"title": x.get("jobOpeningName", ""), "location": loc,
                            "url": f"https://{token}.bamboohr.com/careers/{jid}",
                            "department": x.get("departmentLabel", ""),
                            "posted": to_iso(x.get("datePosted", "")),
                            "address": extract_address(desc), "salary": comp, "description": desc})
            return out
        if ats == "recruitee":
            j = client.get(f"https://{token}.recruitee.com/api/offers/").json()
            return [{"title": x.get("title", ""), "location": x.get("location", "") or x.get("city", ""),
                     "url": x.get("careers_url") or x.get("url", ""), "department": x.get("department", ""),
                     "posted": to_iso(x.get("published_at") or x.get("created_at")), "address": extract_address(x.get("description", "")),
                     "description": x.get("description", "")}
                    for x in j.get("offers", [])]
        if ats == "smartrecruiters":
            j = client.get(f"https://api.smartrecruiters.com/v1/companies/{token}/postings?limit=100").json()
            out = []
            for x in j.get("content", []):
                pid = x.get("id", "")
                loc = x.get("location") or {}
                desc = ""
                try:  # 详情含 jobAd 各段
                    det = client.get(f"https://api.smartrecruiters.com/v1/companies/{token}/postings/{pid}").json()
                    secs = ((det.get("jobAd") or det.get("defaultJobAd") or {}).get("sections") or {})
                    desc = " ".join((secs.get(k) or {}).get("text", "") for k in ("companyDescription", "jobDescription", "qualifications", "additionalInformation"))
                except Exception:  # noqa: BLE001
                    pass
                out.append({"title": x.get("name", ""),
                            "location": ", ".join(v for v in [loc.get("city"), loc.get("region")] if v),
                            "url": f"https://jobs.smartrecruiters.com/{token}/{pid}",
                            "department": (x.get("department") or {}).get("label", ""),
                            "posted": to_iso(x.get("releasedDate", "")),
                            "address": extract_address(desc) or ", ".join(v for v in [loc.get("address"), loc.get("city")] if v),
                            "description": desc})
            return out
        if ats == "workable":
            r = client.get(f"https://www.workable.com/api/accounts/{token}?details=true")
            j = r.json()
            return [{"title": x.get("title", ""), "location": x.get("location", {}).get("location_str", "")
                     if isinstance(x.get("location"), dict) else x.get("location", ""),
                     "url": x.get("url") or x.get("application_url", ""), "department": x.get("department", ""),
                     "posted": to_iso(x.get("published_on", "")), "address": extract_address(x.get("description", "")),
                     "description": x.get("description", "")}
                    for x in j.get("jobs", [])]
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {e}"}
    return []


def workday_targets(client, careers_url: str) -> list[tuple[str, str, str]]:
    """从 careers 页 HTML 发现 Workday 站点 → [(host, tenant, site)]。"""
    try:
        html = client.get(careers_url).text
    except Exception:  # noqa: BLE001
        return []
    seen, out = set(), []
    for host, site in WD_HOST_RE.findall(html):
        if site.lower() in {"jobs", ""} or (host, site) in seen:
            continue
        seen.add((host, site))
        out.append((host, host.split(".")[0], site))  # tenant = 子域第一段
    return out[:4]  # 同公司最多取 4 个站点(主站 + 学生站等)


def fetch_workday(client, targets: list[tuple[str, str, str]]) -> list[dict]:
    """翻页 cxs/jobs,过滤 Ottawa,逐岗取详情。返回与 fetch_jobs 同构的标准化职位。"""
    out, seen = [], set()
    hdr = {"Accept": "application/json"}
    for host, tenant, site in targets:
        base = f"https://{host}/wday/cxs/{tenant}/{site}"
        off = 0
        try:
            while True:
                d = client.post(f"{base}/jobs", headers=hdr,
                                json={"appliedFacets": {}, "limit": 20, "offset": off, "searchText": ""}).json()
                posts = d.get("jobPostings", [])
                if not posts:
                    break
                for p in posts:
                    ep = p.get("externalPath", "")
                    if ep in seen or not OTTAWA_LOC.search(p.get("locationsText", "")):
                        continue
                    seen.add(ep)
                    try:
                        jpi = client.get(f"{base}{ep}", headers=hdr).json().get("jobPostingInfo", {})
                    except Exception:  # noqa: BLE001
                        jpi = {}
                    desc = jpi.get("jobDescription", "") or ""
                    out.append({
                        "title": jpi.get("title") or p.get("title", ""),
                        "location": jpi.get("location") or p.get("locationsText", ""),
                        "url": jpi.get("externalUrl", ""), "department": "",
                        "posted": to_iso(jpi.get("startDate", "")),
                        "address": extract_address(desc), "salary": "", "description": desc,
                    })
                off += 20
                if off >= d.get("total", 0):
                    break
        except Exception:  # noqa: BLE001
            continue
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="Stage 3: pull jobs from company ATS feeds.")
    ap.add_argument("--region", default="ottawa-kanata-north")
    args = ap.parse_args()
    region_dir = COMPANIES_DIR  # _paths.COMPANIES 已含地域(processed/<region>/companies)

    summary, skipped = [], []
    with httpx.Client(headers={"User-Agent": UA}, follow_redirects=True, timeout=20) as client:
        for folder in sorted(p for p in region_dir.iterdir() if p.is_dir()):
            cj = folder / "careers.json"
            if not cj.exists():
                continue
            car = json.loads(cj.read_text(encoding="utf-8"))
            ats = car.get("ats", "")
            token = ""
            if ats in WORKDAY:  # Workday:发现 host/site → cxs 翻页 + Ottawa 过滤
                jobs = fetch_workday(client, workday_targets(client, car.get("careers_url", "")))
                if not jobs:
                    skipped.append((folder.name, f"{ats}(0 ottawa / 无站点)"))
                    continue
            elif ats not in SUPPORTED:
                if ats:
                    skipped.append((folder.name, ats))
                continue
            else:
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
            # 每个职位写一份详情 .md(frontmatter + 完整描述);并把 description 移出 jobs.json 保持精简
            md_dir = folder / "jobs"
            md_dir.mkdir(exist_ok=True)
            for jb in jobs:
                desc = clean_text(jb.pop("description", ""))
                body = (f"---\ntitle: {jb.get('title', '')}\ncompany: {folder.name}\n"
                        f"location: {jb.get('location', '')}\nposted: {jb.get('posted', '')}\n"
                        f"ats: {ats}\nurl: {jb.get('url', '')}\n---\n\n{desc}\n")
                (md_dir / f"{job_id(jb)}.md").write_text(body, encoding="utf-8")
            (folder / "jobs.json").write_text(json.dumps(
                {"ats": ats, "token": token, "count": len(jobs), "jobs": jobs},
                ensure_ascii=False, indent=2), encoding="utf-8")
            tech = [j for j in jobs if j["tech"]]
            ott = [j for j in tech if re.search(r"ottawa|kanata|nepean|remote|canada", j.get("location", ""), re.I)]
            summary.append({"company": folder.name, "ats": ats, "total": len(jobs),
                            "tech": len(tech), "ottawa_or_remote_tech": len(ott), "tech_jobs": tech})

    summary.sort(key=lambda s: s["tech"], reverse=True)
    total_tech = sum(s["tech"] for s in summary)
    print(f"Stage 3: {len(summary)} companies, {total_tech} tech jobs. Skipped {len(skipped)}.")


if __name__ == "__main__":
    main()
