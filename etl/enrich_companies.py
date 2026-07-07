"""
enrich_companies — 抓公司官网首页,提取「简介 + 行业」落库(E8-04 / D1=B,2026-07-06)。

背景:Job Bank 公司只带官网 URL(~24%),无简介/行业 → 弹窗事实段几乎空(0.1%)。
本脚本按官网 URL 抓首页,从 og:description / meta description 提简介、meta keywords 提行业,
落 data/processed/company_enrich.json(slug → {description, sectors, website, fetched, status}),
09_build_mart 合并进 companies 行。**增量**:已缓存(成功或近期失败)跳过;**每轮限量**(--limit),
逐轮累积覆盖;**失败容错**:抓不到只记 status,不炸整轮。抓取留本地(容器内 httpx),非 gov 站无 403 顾虑。

D2 找官网阶梯(2026-07-06 用户拍板「用自己的爬虫先抓」):无官网的公司(~8,000 家)先「找官网」再富化——
① JD 正文线索:该公司岗位的已抓 JD 里挖邮箱/链接域名(雇主自己写的,置信最高);
② DuckDuckGo HTML 搜索兜底(每轮 --find-limit 家,礼貌限速)。
两级共用一道**护栏**:域名/首页标题 ↔ 公司名 对得上才收,不达阈值=留空不猜(宁缺勿错——错认官网
→ 写错简介,比没有简介伤害大)。命中记 found: jd|searched(searched 前端加小字标注),同轮接着抓简介。

Usage:  python etl/enrich_companies.py [--limit N] [--refresh-days D] [--find-limit N]
"""
import argparse
import html
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

IN_POSTINGS = _paths.PROCESSED_JOBBANK / "postings.json"      # 公司官网来源(employer + website)
IN_JD_DETAILS = _paths.PROCESSED / "jobbank" / "details"      # 已抓 JD .md(找官网①:JD 正文域名线索)
IN_ATS = _paths.PROCESSED_ATS                                # ATS 公司已自带 profile,跳过
OUT_CACHE = _paths.PROCESSED / "company_enrich.json"         # 增量缓存(slug → 富化结果)

UA = "Mozilla/5.0 (compatible; PNPJobTracker/1.0; +https://offer2pr.com)"
RETRY_FAILED_DAYS = 30      # 失败的公司多久后才重试(避免每轮死磕抓不动的站)
RETRY_NOSITE_DAYS = 90     # 找不到官网的公司多久后才再找(找官网比抓首页贵)
MAX_DESC = 600             # 简介截断(事实段展示够用,过长是整页倒灌)

# ── 找官网(D2):域名护栏 ──────────────────────────────────────
DDG_HTML = "https://html.duckduckgo.com/html/"
# 名称归一停用词(公司后缀 + 泛词)——不参与「域名↔公司名」匹配
NAME_STOP = {"the", "and", "inc", "incorporated", "ltd", "ltee", "limited", "llp", "llc", "corp",
             "corporation", "company", "co", "of", "du", "de", "la", "le", "les", "et", "group",
             "groupe", "services", "service", "enterprises", "enterprise", "canada", "canadian",
             "holdings", "holding", "international", "solutions", "consulting", "management"}
# 聚合站/社交/黄页域名——搜索结果里绝不是「官网」
NOT_OFFICIAL = {"indeed.com", "linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com",
                "tiktok.com", "youtube.com", "yelp.ca", "yelp.com", "yellowpages.ca", "yellowpages.com",
                "jobbank.gc.ca", "guichetemplois.gc.ca", "glassdoor.ca", "glassdoor.com", "zoominfo.com",
                "opencorporates.com", "canada411.ca", "bloomberg.com", "dnb.com", "ziprecruiter.com",
                "kijiji.ca", "careerbeacon.com", "workopolis.com", "monster.ca", "jooble.org",
                "talent.com", "simplyhired.ca", "wikipedia.org", "betterteam.com", "jobillico.com",
                "trustpilot.com", "google.com", "duckduckgo.com", "cylex.ca", "forms.gle", "bit.ly",
                "wa.me", "mapquest.ca", "grabjobs.co", "postjobfree.com", "workingincanada.gc.ca"}
# JD 里的通用邮箱域——不是官网线索
GENERIC_MAIL = {"gmail.com", "gmail.ca", "hotmail.com", "hotmail.ca", "yahoo.com", "yahoo.ca",
                "outlook.com", "outlook.ca", "icloud.com", "live.com", "live.ca", "aol.com", "me.com",
                "msn.com", "telus.net", "shaw.ca", "bell.net", "sympatico.ca", "rogers.com",
                "protonmail.com", "mail.com", "videotron.ca", "eastlink.ca", "cogeco.ca", "sasktel.net"}


def name_tokens(name: str) -> list[str]:
    """公司名 → 显著 token(去后缀/泛词/短词),供域名/标题匹配。"""
    s = re.split(r"\bo/a\b|\bdba\b|\bd/b/a\b", (name or "").lower())[0]
    toks = re.findall(r"[a-z0-9]{3,}", s)
    return [t for t in toks if t not in NAME_STOP]


def domain_of(url_or_domain: str) -> str:
    """→ 归一化裸域(去 www.)。"""
    s = (url_or_domain or "").strip().lower()
    netloc = urlparse(s if s.startswith("http") else "http://" + s).netloc or s
    return netloc.split(":")[0].removeprefix("www.")


def is_blocked_domain(dom: str) -> bool:
    return any(dom == b or dom.endswith("." + b) for b in NOT_OFFICIAL | GENERIC_MAIL) or dom.endswith(".gc.ca")


def guard_match(name: str, dom: str, client: httpx.Client | None = None) -> bool:
    """护栏:域名(或首页 <title>/og:site_name)与公司名对得上才算官网。宁缺勿错。"""
    toks = name_tokens(name)
    if not toks or is_blocked_domain(dom):
        return False
    core = re.sub(r"[^a-z0-9]", "", ".".join(dom.split(".")[:-1]))  # 去 TLD 后的字母数字串
    hits = sum(1 for t in toks if t in core)
    need = 1 if len(toks) == 1 else 2
    if hits >= need or (len(toks) >= 2 and "".join(t[0] for t in toks) == core):  # 全词命中 或 纯首字母缩写
        return True
    if client is None:
        return False
    try:  # 域名对不上 → 看首页标题(如 tcfoods.ca 的 <title>Tillsonburg Custom Foods</title>)
        r = client.get(f"https://{dom}", timeout=8)
        head = r.text[:4000].lower()
        m = re.search(r"<title[^>]*>(.*?)</title>", head, re.S)
        site = re.search(r'og:site_name["\'][^>]+content=["\']([^"\']+)', head)
        text = f"{m.group(1) if m else ''} {site.group(1) if site else ''}"
        return sum(1 for t in toks if t in text) >= max(1, (len(toks) + 1) // 2)
    except Exception:  # noqa: BLE001
        return False


def jd_domain_hints() -> dict[str, set[str]]:
    """找官网①:posting url → 已抓 JD .md → 正文里的邮箱/链接域名。返回 slug → 候选域名集。"""
    if not IN_JD_DETAILS.exists() or not IN_POSTINGS.exists():
        return {}
    url2md: dict[str, Path] = {}
    for p in IN_JD_DETAILS.rglob("*.md"):
        try:
            m = re.search(r"^url:\s*(.+)$", p.read_text(encoding="utf-8", errors="replace")[:600], re.M)
        except Exception:  # noqa: BLE001
            continue
        if m:
            url2md.setdefault(m.group(1).strip(), p)
    email_re = re.compile(r"[\w.+-]+@([\w-]+\.[\w.-]+)")
    url_re = re.compile(r"https?://([\w-]+\.[\w.-]+)")
    hints: dict[str, set[str]] = {}
    for j in json.loads(IN_POSTINGS.read_text(encoding="utf-8")):
        if j.get("website") or not j.get("employer"):
            continue
        p = url2md.get(j.get("url") or "")
        if not p:
            continue
        try:
            body = p.read_text(encoding="utf-8", errors="replace")
        except Exception:  # noqa: BLE001
            continue
        doms = {domain_of(d) for d in email_re.findall(body)} | {domain_of(d) for d in url_re.findall(body)}
        doms = {d for d in doms if d and not is_blocked_domain(d)}
        if doms:
            hints.setdefault(slugify(j["employer"]), set()).update(doms)
    return hints


def ddg_find(client: httpx.Client, name: str, province: str) -> str:
    """找官网②:DuckDuckGo HTML 搜索,取前几条结果域名过护栏;找不到/对不上=''。"""
    try:
        r = client.get(DDG_HTML, params={"q": f'"{name}" {province} Canada'}, timeout=12)
        if not r.is_success:
            return ""
    except Exception:  # noqa: BLE001
        return ""
    seen: list[str] = []
    for href in re.findall(r'class="result__a"[^>]+href="([^"]+)"', r.text)[:6]:
        target = href
        if "uddg=" in href:  # DDG 跳转链:/l/?uddg=<encoded>
            target = unquote(parse_qs(urlparse(href).query).get("uddg", [""])[0])
        dom = domain_of(target)
        if dom and dom not in seen and not is_blocked_domain(dom):
            seen.append(dom)
    for dom in seen[:3]:  # 只认前三个非聚合域,逐个过护栏(含首页标题复核)
        if guard_match(name, dom, client):
            return "https://" + dom
    return ""


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:60] or "company"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def days_since(iso: str) -> float:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).total_seconds() / 86400
    except Exception:  # noqa: BLE001
        return 1e9


def clean_text(s: str) -> str:
    s = html.unescape(s or "")           # &#x27; → ' 、&amp; → & 等实体解码
    s = re.sub(r"\s+", " ", s).strip()
    return s[:MAX_DESC].strip()


def extract(html: str) -> dict:
    """从首页 HTML 提简介/行业(纯正则,不依赖 bs4;拿不到就空)。"""
    def meta(patterns: list[str]) -> str:
        for pat in patterns:
            m = re.search(pat, html, re.I | re.S)
            if m and m.group(1).strip():
                return m.group(1).strip()
        return ""
    desc = meta([
        r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:description["\']',
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']',
    ])
    if not desc:  # 兜底:首个够长的 <p>
        for m in re.finditer(r"<p[^>]*>(.*?)</p>", html, re.I | re.S):
            txt = re.sub(r"<[^>]+>", "", m.group(1)).strip()
            if len(txt) >= 80:
                desc = txt
                break
    kw = meta([r'<meta[^>]+name=["\']keywords["\'][^>]+content=["\']([^"\']+)["\']'])
    sectors = ", ".join([k.strip() for k in kw.split(",")[:4] if k.strip()]) if kw else ""
    return {"description": clean_text(desc), "sectors": clean_text(sectors)}


def company_targets() -> tuple[dict[str, dict], dict[str, dict]]:
    """(有官网 targets, 无官网 nosite) —— 均排除 ATS(自带 profile)。
    targets: slug → {name, website};nosite: slug → {name, province, jobs}(按岗数计价值密度)。"""
    targets: dict[str, dict] = {}
    nosite: dict[str, dict] = {}
    if not IN_POSTINGS.exists():
        return targets, nosite
    ats_slugs = {p.name for p in IN_ATS.iterdir()} if IN_ATS.exists() else set()
    for j in json.loads(IN_POSTINGS.read_text(encoding="utf-8")):
        emp = j.get("employer") or ""
        if not emp:
            continue
        sl = slugify(emp)
        if sl in ats_slugs:
            continue
        site = (j.get("website") or "").strip()
        if site:
            if not site.startswith(("http://", "https://")):
                site = "https://" + site
            targets.setdefault(sl, {"name": emp, "website": site})
        else:
            rec = nosite.setdefault(sl, {"name": emp, "province": j.get("province") or "", "jobs": 0})
            rec["jobs"] += 1
    nosite = {sl: v for sl, v in nosite.items() if sl not in targets}  # 部分帖带官网=有官网
    return targets, nosite


def find_websites(cache: dict, targets: dict, nosite: dict, find_limit: int) -> tuple[int, int]:
    """D2 找官网阶梯:① JD 线索(全量,便宜)→ ② DDG 搜索(限量)。命中→进 targets(带 found 标记)
    并立即记缓存(status=found,防本轮 limit 截断丢结果);搜不到→记 nosite 冷却。返回 (jd命中, 搜索命中)。"""
    found_jd = found_search = 0
    skip = lambda sl: (c := cache.get(sl)) is not None and (  # noqa: E731
        c.get("website") or days_since(c.get("fetched", "")) <= RETRY_NOSITE_DAYS)
    hints = jd_domain_hints()
    with httpx.Client(follow_redirects=True, timeout=10, headers={"User-Agent": UA}, verify=False) as client:
        for sl, v in nosite.items():  # ① JD 正文域名线索(雇主自己写的,置信最高)
            if sl in targets or skip(sl) or sl not in hints:
                continue
            for dom in sorted(hints[sl]):
                if guard_match(v["name"], dom, client):
                    site = "https://" + dom
                    targets[sl] = {"name": v["name"], "website": site, "found": "jd"}
                    cache[sl] = {"name": v["name"], "website": site, "found": "jd",
                                 "status": "found", "fetched": now_iso()}
                    found_jd += 1
                    break
        budget = find_limit  # ② DDG 兜底(岗多的公司先搜=价值密度高)
        for sl, v in sorted(nosite.items(), key=lambda kv: -kv[1]["jobs"]):
            if budget <= 0:
                break
            if sl in targets or skip(sl):
                continue
            budget -= 1
            site = ddg_find(client, v["name"], v["province"])
            if site:
                targets[sl] = {"name": v["name"], "website": site, "found": "searched"}
                cache[sl] = {"name": v["name"], "website": site, "found": "searched",
                             "status": "found", "fetched": now_iso()}
                found_search += 1
            else:
                cache[sl] = {"name": v["name"], "status": "nosite", "fetched": now_iso()}
            time.sleep(1.5)  # 礼貌:搜索限速比抓首页更保守
    return found_jd, found_search


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=300, help="本轮最多抓多少家(逐轮累积)")
    ap.add_argument("--refresh-days", type=int, default=180, help="成功记录多久后刷新")
    ap.add_argument("--find-limit", type=int, default=60, help="本轮 DDG 找官网最多搜多少家(0=关)")
    args = ap.parse_args()

    cache: dict[str, dict] = {}
    if OUT_CACHE.exists():
        cache = json.loads(OUT_CACHE.read_text(encoding="utf-8"))

    targets, nosite = company_targets()
    print(f"IN postings : {IN_POSTINGS}")

    # D2 找官网阶梯(JD 线索 + DDG 兜底);往轮找到的(status=found/ok/fail 带 found)并回 targets 走刷新逻辑
    found_jd, found_search = find_websites(cache, targets, nosite, args.find_limit)
    for sl, c in cache.items():
        if sl not in targets and c.get("website") and c.get("found"):
            targets[sl] = {"name": c.get("name") or sl, "website": c["website"], "found": c["found"]}
    print(f"找官网: 无官网公司 {len(nosite)} · 本轮 JD 线索 +{found_jd} · DDG +{found_search}"
          f"(find-limit {args.find_limit})")

    # 待抓 = 有官网、缓存缺失 / 刚找到(found) / 成功过期 / 失败超冷却
    todo = []
    for sl, info in targets.items():
        c = cache.get(sl)
        if c is None or c.get("status") == "found":
            todo.append((sl, info))
        elif c.get("status") == "ok" and days_since(c.get("fetched", "")) > args.refresh_days:
            todo.append((sl, info))
        elif c.get("status") == "fail" and days_since(c.get("fetched", "")) > RETRY_FAILED_DAYS:
            todo.append((sl, info))
    todo = todo[: args.limit]

    print(f"目标公司(有官网,非 ATS): {len(targets)} · 缓存: {len(cache)} · 本轮抓: {len(todo)}(limit {args.limit})")

    ok = fail = 0
    with httpx.Client(follow_redirects=True, timeout=8,
                      headers={"User-Agent": UA}, verify=False) as client:
        for sl, info in todo:
            rec = {"name": info["name"], "website": info["website"], "fetched": now_iso()}
            if info.get("found"):
                rec["found"] = info["found"]  # 官网来路(jd/searched)跟着记录走,mart 透传给前端小字
            try:
                r = client.get(info["website"])
                if r.is_success and r.text:
                    data = extract(r.text)
                    if data["description"] or data["sectors"]:
                        rec.update(data)
                        rec["status"] = "ok"
                        ok += 1
                    else:
                        rec["status"] = "fail"; rec["note"] = "no meta"
                        fail += 1
                else:
                    rec["status"] = "fail"; rec["note"] = f"http {r.status_code}"
                    fail += 1
            except Exception as e:  # noqa: BLE001
                rec["status"] = "fail"; rec["note"] = type(e).__name__
                fail += 1
            cache[sl] = rec
            time.sleep(0.2)  # 礼貌:轻微限速

    OUT_CACHE.parent.mkdir(parents=True, exist_ok=True)
    OUT_CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    total_ok = sum(1 for c in cache.values() if c.get("status") == "ok")
    print(f"本轮 ✓ {ok} 抓到 · ✗ {fail} 无内容/失败 · 累计成功 {total_ok}/{len(cache)} 家 → {OUT_CACHE.name}")


if __name__ == "__main__":
    main()
