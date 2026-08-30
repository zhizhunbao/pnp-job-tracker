"""build_pilot_quota — RCIP 社区**名额状态**抽取(2026-08-15,Frank「如果没有竞争,我怎么知道要不要选 RCIP」)。

为什么要有这一步:省提名那套「存量 ÷ 名额 = 34.7:1」在 RCIP 上不成立 —— 没有 EOI 池、不排队、不打分,
它是**先到先得 + 逐职业限额**。所以「该不该押这条路」的判据不是比值,是四件事:
职业在不在清单、**该职业额度用完没有**、**现在收不收**、每雇主能报几个。
联邦不按社区公布名额(fed-rcip 30 页命中 0 条),得逐个社区去它自己的官网上找 —— 就抓这个。
2026-08-16 全 20 社区实测:10 个官网写了(本步产出 10 行),其余 10 个**全站不提名额**(逐社区举证见
交付报告),那是「官方没写」,不是「我们没抓」—— 两者在用户那里意思相反,别混。

  IN : data/crawl/{rcip,fcip}-*/{manifest.json,html_cache}  (crawl 役周更;URL→数据→SQL 的第一站)
       raw/pilot/pilot-communities.json                     (社区官方名 → 省/类型,与既有表对齐)
       两个社区的官网(缓存够不着,直连补抓 —— 见 LIVE_EXTRACTORS 的举证)
  OUT: raw/pilot/pilot-quota.json                    ({communities: [...], occupations: [...]})

红线(同 pilot_extractors):**宁缺勿猜**。每一行必须锚定一句官网原文(quote)与它的 URL;
正则拿不准的句子一律不产出行 —— 名额状态直接决定用户押不押这条路,编一个比不给更糟。

Usage:  uv run python etl/build_pilot_quota.py
"""
import datetime
import html
import io
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urljoin

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # 分域后上一级才是 etl/
import _paths  # noqa: E402

if os.name == "nt":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

IN_CRAWL = _paths.DATA / "crawl"
IN_COMMUNITIES = _paths.PILOT / "pilot-communities.json"
OUT = _paths.PILOT / "pilot-quota.json"
print(f"IN_CRAWL={IN_CRAWL}\nIN_COMMUNITIES={IN_COMMUNITIES}\nOUT={OUT}", flush=True)

# crawl slug → 社区官方名(与 pilot-communities.json 的 name 逐字一致,不然接不上既有表)
SLUG_TO_COMMUNITY = {
    "rcip-altona": "Altona/Rhineland, MB",
    "rcip-brandon": "Brandon, MB",
    "rcip-claresholm": "Claresholm, AB",
    "rcip-moose-jaw": "Moose Jaw, SK",
    "rcip-north-bay": "North Bay and Area",
    "rcip-okanagan-shuswap": "North Okanagan Shuswap, BC",
    "rcip-peace-liard": "Peace Liard, BC",
    "rcip-pictou": "Pictou County, NS",
    "rcip-ssm": "Sault Ste. Marie, ON",
    "rcip-steinbach": "Steinbach, MB",
    "rcip-sudbury": "Sudbury, ON",
    "rcip-thunder-bay": "Thunder Bay, ON",
    "rcip-timmins": "Timmins, ON",
    "rcip-west-kootenay": "West Kootenay, BC",
    # FCIP 四社区(RCIP 之外的独立站;首版漏挂 → 它们的缓存从没被扫过)。
    # 2026-08-16 实测四站全文都不提名额,所以挂上去也不产行 —— 挂的是**覆盖**,不是结论。
    "fcip-acadian": "Acadian Peninsula, NB",
    "fcip-kelowna": "Kelowna, BC",
    "fcip-st-pierre": "St. Pierre Jolys, MB",
    "fcip-superior-east": "Superior East Region, ON",
}

# ── 抽取规则:一条规则 = 一个可证伪的正则 + 它证出来的字段 ────────────────────────
# 职业满额:句子里必须同时有「满/不再收」的**明文**和五位 NOC 码,两者缺一不产出行。
# 🔴 首版这里写宽了(`maximum .{0,20}recommendations`),把 Timmins 的
#    「**Added to** the RCIP Priority Occupation List: NOC 74200…」抓成了满额 —— 那是**新增**职业,
#    意思正好相反。收窄成官方实际用过的三种说法,再加一道否定闸挡住「新增/加入清单」的句子。
#    2026-08-16 加第四种:Peace Liard 写「reached the cap imposed by IRCC … (NOC 62010)」——
#    同句自带 NOC 码,与前三种一样是「这个职业不再发了」的明文,不是「新增」。
RE_OCC_FULL = re.compile(
    r"(reached the maximum allowable recommendations|"
    r"reached the cap imposed by|"
    r"have been successfully met|"
    r"(?:can |will )?no longer accept\w*)",
    re.I,
)
RE_OCC_NOT_FULL = re.compile(r"(added to the|adding to the|newly added|now (?:open|accepting))", re.I)
RE_NOC = re.compile(r"\bNOC\s*(\d{5})\b")
# 剩余名额:官方写成 remaining allocations (153) 这种;只认带括号或紧跟的数字
RE_REMAINING = re.compile(r"remaining allocation[s]?\s*[\(\:]?\s*(\d{1,4})\b", re.I)
RE_FIRST_COME = re.compile(r"first[-\s]come,?\s*first[-\s]serve", re.I)
# 每轮名额上限:核原句时从 Moose Jaw/Steinbach 的引语里发现的,比「先到先得」这个布尔具体得多
# (「Per intake period, … will issue up to 12 recommendations」)
#   2026-08-16 放宽定语:Peace Liard 写的是「authorized to issue up to 60 **candidate** recommendations
#   … in the 2026 intake year」(该社区一年就一轮 intake,官网自己也叫「this intake cycle」)。
RE_PER_INTAKE = re.compile(
    r"issue up to\s*(\d{1,4})\s*(?:community |candidate )?recommendations", re.I)
# ⚠️「每雇主上限」本版**不抽**:实测各社区写的根本不是同一件事 —— Peace Liard 是
#   「capped at 5% of allocations」(百分比,不是人数)、Moose Jaw 只限「10 人以下的餐饮企业」、
#   Steinbach 是「某个 NOC 下 may be limited to 1」。塞成一个数字会把条件全丢了,比不给更误导。
#   要做得连同它的适用条件一起建模,那是另一件事。

SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")


def text_of_html(raw: str) -> str:
    raw = re.sub(r"(?is)<(script|style).*?</\1>", " ", raw)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"(?s)<[^>]+>", " ", raw)))


def text_of(path: Path) -> str:
    return text_of_html(path.read_text(encoding="utf-8", errors="ignore"))


def sentences(text: str) -> list[str]:
    return [s.strip() for s in SENT_SPLIT.split(text) if s.strip()]


def window(sent: str, m: re.Match, before: int = 130, after: int = 200) -> str:
    """原句取**匹配点周围的窗口**,不取句首。有些社区页整页没标点,一「句」上千字,
    从句首截 400 字会截出一段看不见匹配短语的话 —— 那种 quote 没法复核,等于没举证。"""
    return sent[max(0, m.start() - before):m.start() + after].strip()


def scan_slug(slug: str, community: str, province: str) -> tuple[list[dict], dict]:
    """返回(该社区的职业满额行, 社区级名额状态)。抓不到就返回空 —— 空 ≠ 没有限额,只是官网没写。"""
    root = IN_CRAWL / slug
    man = root / "manifest.json"
    if not man.exists():
        return [], {}
    pages = json.loads(man.read_text(encoding="utf-8")).get("pages", [])
    fetched = json.loads(man.read_text(encoding="utf-8")).get("crawled_at", "")[:10]

    occ_rows: dict[str, dict] = {}
    comm: dict = {}
    for it in pages:
        f = it.get("html")
        p = root / "html_cache" / (f or "")
        if not f or not p.exists():
            continue
        url = it.get("url", "")
        for sent in sentences(text_of(p)):
            # ① 职业满额(必须同句出现「满」与 NOC 码 —— 分句抓正是为了不跨句乱配)
            if RE_OCC_FULL.search(sent) and not RE_OCC_NOT_FULL.search(sent):
                mfull = RE_OCC_FULL.search(sent)
                for noc in RE_NOC.findall(sent):
                    occ_rows.setdefault(noc, {
                        "community": community, "province": province, "noc": noc,
                        "status": "full", "asOf": fetched, "url": url, "quote": window(sent, mfull),
                    })
            # ② 剩余名额
            m = RE_REMAINING.search(sent)
            if m and "remaining" not in comm:
                comm.update({"remaining": int(m.group(1)), "remainingQuote": window(sent, m), "remainingUrl": url})
            # ③ 先到先得
            m = RE_FIRST_COME.search(sent)
            if m and "firstCome" not in comm:
                comm.update({"firstCome": True, "firstComeQuote": window(sent, m), "firstComeUrl": url})
            # ④ 每轮名额上限
            m = RE_PER_INTAKE.search(sent)
            if m and "perIntake" not in comm:
                comm.update({"perIntake": int(m.group(1)), "perIntakeQuote": window(sent, m), "perIntakeUrl": url})
    if comm:
        comm.update({"community": community, "province": province, "asOf": fetched})
    return list(occ_rows.values()), comm


# ── 直连补抓:缓存够不着的两个社区 ────────────────────────────────────────────────
# 为什么破例走网络(其余社区一律吃 crawl 缓存):
#   Claresholm, AB —— 缓存里那一页是 **403 Forbidden**(爬役 UA 被站点挡),正文一个字没落地。
#     「爬完零命中」在这里根本不是证据,而官网首页白纸黑字写着月度名额 → 换浏览器 UA 直连即可。
#   West Kootenay, BC —— 官网**换域**(wk-rnip.ca → westkootenayimmigration.ca),爬役停在旧域首页,
#     名额写在换域后的公告贴里。贴子 URL 每年变,所以从 /updates/ 索引现取,不写死某一篇。
# 形态照 pilot_extractors:一社区一个函数,httpx + 浏览器 UA,句子对不上就返回空(宁缺勿猜)。
LIVE_UA = {"User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")}
LIVE_TIMEOUT = 60
CL_URL = "https://claresholm-rcip.ca/"
WK_UPDATES_URL = "https://westkootenayimmigration.ca/updates/"

# 「三(3)个 allocation/月」——「per month」正是本社区的 intake 周期(官网:intake 逐月开)
# quote 从「We will issue…」起头,不带前面那串导航/标题 —— 这两站整段没有句号,
# 从「句」首截会截出一大坨看不见匹配短语的话,那种举证没法复核。
RE_CL_PER_INTAKE = re.compile(r"We will issue \w+ \((\d{1,3})\) allocations per month[^.]*\.", re.I)
# WK 2026-05 改制后的现行口径(改制前的「~18/月、先到先得」已作废,故只认这一句)
RE_WK_PER_INTAKE = re.compile(
    r"Approximately (\d{1,4}) Community Recommendations may be issued per intake[^.]*\.", re.I)


def _live(url: str) -> tuple[str, str]:
    """直连取页 → (最终 URL, 纯文本)。跟重定向(WK 换域全靠它)。"""
    r = httpx.get(url, headers=LIVE_UA, follow_redirects=True, timeout=LIVE_TIMEOUT)
    r.raise_for_status()
    return str(r.url), text_of_html(r.text)


def live_claresholm() -> tuple[dict, list]:
    url, t = _live(CL_URL)
    m = RE_CL_PER_INTAKE.search(t)
    if not m:
        return {}, []
    return {"perIntake": int(m.group(1)), "perIntakeQuote": m.group(0).strip(),
            "perIntakeUrl": url}, []


def live_west_kootenay() -> tuple[dict, list]:
    idx_url, idx_html = (lambda r: (str(r.url), r.text))(
        httpx.get(WK_UPDATES_URL, headers=LIVE_UA, follow_redirects=True, timeout=LIVE_TIMEOUT))
    host = idx_url.split("/")[2]
    posts = [u for u in dict.fromkeys(
        urljoin(idx_url, h) for h in re.findall(r'href="([^"#?]+)"', idx_html))
        if u.split("/")[2:3] == [host] and re.search(r"intake|allocation", u, re.I)]
    for p in posts[:8]:  # 索引按时间倒序 → 先命中的就是最新一篇
        purl, t = _live(p)
        m = RE_WK_PER_INTAKE.search(t)
        if m:
            return {"perIntake": int(m.group(1)), "perIntakeQuote": m.group(0).strip(),
                    "perIntakeUrl": purl}, []
    return {}, []


LIVE_EXTRACTORS = {
    "Claresholm, AB": live_claresholm,
    "West Kootenay, BC": live_west_kootenay,
}


def main() -> int:
    known = {r["name"]: r for r in json.loads(IN_COMMUNITIES.read_text(encoding="utf-8")).get("rows", [])}
    occupations: list[dict] = []
    communities: list[dict] = []
    for slug, name in SLUG_TO_COMMUNITY.items():
        prov = (known.get(name) or {}).get("province", "")
        if not prov:
            print(f"  ! {slug}: 社区名对不上 pilot-communities.json({name})—— 跳过,不猜省份", flush=True)
            continue
        occ, comm = scan_slug(slug, name, prov)
        occupations.extend(occ)
        if comm:
            communities.append(comm)
        flags = []
        if occ:
            flags.append(f"满额职业 {len(occ)}")
        for k, label in (("remaining", "剩余名额"), ("firstCome", "先到先得")):
            if k in comm:
                flags.append(f"{label}={comm[k]}" if k != "firstCome" else label)
        print(f"  {name:<28} {'、'.join(flags) or '—'}", flush=True)

    # 直连补抓(缓存够不着的社区);抓不到/抓挂了 = 该社区这轮没有名额行,绝不吞成 0 或猜一个
    today = datetime.date.today().isoformat()
    by_name = {c["community"]: c for c in communities}
    for name, fn in LIVE_EXTRACTORS.items():
        prov = (known.get(name) or {}).get("province", "")
        if not prov:
            print(f"  ! live {name}: 对不上 pilot-communities.json —— 跳过", flush=True)
            continue
        try:
            comm, occ = fn()
        except Exception as e:  # noqa: BLE001 —— 官网抖动不该炸掉整步,保其余社区
            print(f"  ! live {name}: 抓取/解析失败({type(e).__name__}: {e})—— 本轮不产行", flush=True)
            continue
        for r in occ:
            r.update({"community": name, "province": prov, "asOf": today})
        occupations.extend(occ)
        if comm:
            comm.update({"community": name, "province": prov, "asOf": today})
            if name in by_name:  # 缓存已产出社区级行 → 只补缓存里没有的字段,不覆盖既有举证
                by_name[name].update({k: v for k, v in comm.items() if k not in by_name[name]})
            else:
                communities.append(comm)
                by_name[name] = comm
        print(f"  {name:<28} [直连] "
              f"{'每期名额=%s' % comm['perIntake'] if comm.get('perIntake') is not None else '—'}",
              flush=True)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "note": "RCIP 社区名额状态;每行锚定官网原句(quote+url)。空 = 官网没写,不是没有限额。",
        "communities": communities, "occupations": occupations,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nOUT {OUT}  社区级 {len(communities)} 行 / 职业满额 {len(occupations)} 行", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
