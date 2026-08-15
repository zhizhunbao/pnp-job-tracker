"""build_pilot_quota — RCIP 社区**名额状态**抽取(2026-08-15,Frank「如果没有竞争,我怎么知道要不要选 RCIP」)。

为什么要有这一步:省提名那套「存量 ÷ 名额 = 34.7:1」在 RCIP 上不成立 —— 没有 EOI 池、不排队、不打分,
它是**先到先得 + 逐职业限额**。所以「该不该押这条路」的判据不是比值,是四件事:
职业在不在清单、**该职业额度用完没有**、**现在收不收**、每雇主能报几个。
联邦不按社区公布名额(fed-rcip 30 页命中 0 条),但 14 个社区里 12 个自己在官网上写了 —— 就抓这个。

  IN : data/crawl/rcip-*/{manifest.json,html_cache}  (crawl 役周更;URL→数据→SQL 的第一站)
       raw/pilot/pilot-communities.json              (社区官方名 → 省/类型,与既有表对齐)
  OUT: raw/pilot/pilot-quota.json                    ({communities: [...], occupations: [...]})

红线(同 pilot_extractors):**宁缺勿猜**。每一行必须锚定一句官网原文(quote)与它的 URL;
正则拿不准的句子一律不产出行 —— 名额状态直接决定用户押不押这条路,编一个比不给更糟。

Usage:  uv run python etl/build_pilot_quota.py
"""
import html
import io
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
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
}

# ── 抽取规则:一条规则 = 一个可证伪的正则 + 它证出来的字段 ────────────────────────
# 职业满额:句子里必须同时有「满/不再收」的**明文**和五位 NOC 码,两者缺一不产出行。
# 🔴 首版这里写宽了(`maximum .{0,20}recommendations`),把 Timmins 的
#    「**Added to** the RCIP Priority Occupation List: NOC 74200…」抓成了满额 —— 那是**新增**职业,
#    意思正好相反。收窄成官方实际用过的三种说法,再加一道否定闸挡住「新增/加入清单」的句子。
RE_OCC_FULL = re.compile(
    r"(reached the maximum allowable recommendations|"
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
RE_PER_INTAKE = re.compile(r"issue up to\s*(\d{1,3})\s*(?:community\s*)?recommendations", re.I)
# ⚠️「每雇主上限」本版**不抽**:实测各社区写的根本不是同一件事 —— Peace Liard 是
#   「capped at 5% of allocations」(百分比,不是人数)、Moose Jaw 只限「10 人以下的餐饮企业」、
#   Steinbach 是「某个 NOC 下 may be limited to 1」。塞成一个数字会把条件全丢了,比不给更误导。
#   要做得连同它的适用条件一起建模,那是另一件事。

SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")


def text_of(path: Path) -> str:
    raw = path.read_text(encoding="utf-8", errors="ignore")
    raw = re.sub(r"(?is)<(script|style).*?</\1>", " ", raw)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"(?s)<[^>]+>", " ", raw)))


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

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "note": "RCIP 社区名额状态;每行锚定官网原句(quote+url)。空 = 官网没写,不是没有限额。",
        "communities": communities, "occupations": occupations,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nOUT {OUT}  社区级 {len(communities)} 行 / 职业满额 {len(occupations)} 行", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
