"""
build_draws — 省 PNP 抽选事实(E6-04):BC / AB / MB / NB 最近抽选 + ON 改制通告,全 httpx 实时抓。
**事实展示层,非资格判定**:各省分制互不相通(BC=SIRS / AB=WEOI / MB=MPNP EOI),都不是 CRS——
score 一律带 scale 标注,前端展示必须声明「省自评分制,非 CRS」。SK 2025 改制后无抽选、QC 不属 PNP,不产出。
抓取失败/解析空 → 该省保留旧数据(循 build_on 模式,宁可留旧不留错)。

  IN : (网络)welcomebc.ca / alberta.ca / immigratemanitoba.com / ontario.ca / www2.gnb.ca
  OUT: raw/pnp/draws.json   (⚠️ 无 occupations 键 —— 08_score 目录驱动扫 raw/pnp/*.json 时天然跳过)

Usage:  uv run python etl/pnp/build_draws.py
"""
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 _paths
import _paths  # noqa: E402

OUT = _paths.PNP / "draws.json"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
BC_URL = "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/invitations-to-apply"
AB_URL = "https://www.alberta.ca/aaip-processing-information"
MB_URL = "https://immigratemanitoba.com/draws/"
ON_URL = "https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-updates"
# ON 的**抽选记录**在另一页(逐轮公布日期/邀请数/分数区间/说明),更新页只当通告用。
# 2026-07-31 复核推翻旧结论「OINP 不公布分数线」——invitations 页有 Score range 一列(如「57 and above」)。
ON_INV_URL = "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp-invitations-apply"

NL_URL = "https://www.gov.nl.ca/immigration/invitations-to-apply-updates/"
# NL(2026-08-03 接入,海洋四省的第一份抽选):OIM 自 2025-02 起走 EOI 模型,按批次发 ITA。
# **只公布日期与邀请数,不公布分数线** —— score 一律 None、scale 一律 None(不是抓漏了,是官方不发)。
# Notes 列写 NLPNP / AIP 各多少,原样留在 note 里(AIP 是联邦大西洋项目,与省提名同批发)。

# NB(2026-08-05 接入,海洋四省第二份):ImmigrationNB 也是 EOI 模型,**按职业类别定向发邀请,不发分数线**
# —— score/scale 一律 None,不假装有分制。「最新一轮」和「本年历史」分别在两个页面(URL 经
# data/crawl/nb-imm/manifest.json 核对,禁凭印象猜):当期页只挂最新一轮(~5 条),更早的轮次要去
# previous-invitations-<year>.html 才有 —— 两页合并去重后再按日期倒排、截 MAX_PER_PROV。
NB_URL = "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/invitations-to-apply.html"
NB_PREV_URL = ("https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/"
               "immigrating-to-nb/invitations-to-apply/previous-invitations-2026.html")

MAX_PER_PROV = 12  # raw 留最近 N 条;mart 再截
# NB 例外(C4):按职业类别定向邀请,一轮拆 4-5 行(一通道一行),12 条只装得下两轮半 ——
# 三月那轮建筑类 279 邀请就被挤掉了。判定层要数「某类别一年被选中几轮」,给 NB 留一年的量。
NB_MAX = 48


def fetch(url: str) -> str:
    r = httpx.get(url, headers={"User-Agent": UA}, follow_redirects=True, timeout=30)
    r.raise_for_status()
    return r.text


def _int(s) -> int | None:
    try:
        return int(re.sub(r"[,\s]", "", s or ""))
    except (ValueError, TypeError):
        return None


def _iso(s: str) -> str | None:
    try:
        return datetime.strptime(s.strip(), "%B %d, %Y").date().isoformat()
    except ValueError:
        return None


def expand_table(table) -> list[list[str]]:
    """rowspan/colspan 展开成规则网格(BC 表日期/分数列大量 rowspan)。"""
    grid: list[list[str]] = []
    pending: dict[int, tuple[int, str]] = {}  # col → (剩余行数, 值)
    for tr in table.find_all("tr"):
        row: list[str] = []
        cells = tr.find_all(["th", "td"])
        ci = 0
        col = 0
        while ci < len(cells) or col in pending:
            if col in pending:
                left, val = pending[col]
                row.append(val)
                pending[col] = (left - 1, val)
                if left - 1 <= 0:
                    del pending[col]
                col += 1
                continue
            c = cells[ci]
            ci += 1
            text = re.sub(r"\s+", " ", c.get_text(" ", strip=True))
            span = _int(c.get("rowspan")) or 1
            for k in range(_int(c.get("colspan")) or 1):
                row.append(text)
                if span > 1:
                    pending[col + k] = (span - 1, text)
            col += (_int(c.get("colspan")) or 1)
        grid.append(row)
    return grid


def parse_bc(html: str) -> list[dict]:
    """Skills Immigration ITA 表(表头含「ITA type」;Entrepreneur/池分布表不取)。"""
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table"):
        grid = expand_table(table)
        if not grid or "ita type" not in " ".join(grid[0]).lower():
            continue
        draws, seen = [], set()
        for row in grid[1:]:
            if len(row) < 5:
                continue
            d = _iso(row[0])
            if not d:
                continue
            # 官方一次抽选可带多行「选择因素」(rowspan 展开后 日期/流/分/邀请 相同)→ 合并为一条
            key = (d, row[1], _int(row[3]), _int(row[4]))
            if key in seen:
                continue
            seen.add(key)
            draws.append({"date": d, "stream": row[1], "note": row[2][:160],
                          "score": _int(row[3]), "invitations": _int(row[4])})
        return draws[:MAX_PER_PROV]
    return []


def parse_ab(html: str) -> list[dict]:
    """「Draw information」表:Draw date / 流+参数 / 最低分 / 邀请数(线性,无 rowspan)。"""
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table"):
        head = table.find("tr")
        if not head or "draw date" not in head.get_text(" ", strip=True).lower():
            continue
        draws = []
        for tr in table.find_all("tr")[1:]:
            cells = [re.sub(r"\s+", " ", c.get_text(" ", strip=True)) for c in tr.find_all(["th", "td"])]
            if len(cells) < 4:
                continue
            d = _iso(cells[0])
            if not d:
                continue
            draws.append({"date": d, "stream": cells[1], "note": "",
                          "score": _int(cells[2]), "invitations": _int(cells[3])})
        return draws[:MAX_PER_PROV]
    return []


MB_SCORE = re.compile(r"score of (?:the )?lowest[\s-]*ranked candidate[^:]*:?\s*(\d{2,4})", re.I)
MB_LAA = re.compile(r"Letters? of Advice to Apply issued\s*:?\s*([\d,]+)", re.I)
MB_DATE = re.compile(r"[A-Z][a-z]+ \d{1,2}, \d{4}")


def _mb_is_heading(tag) -> bool:
    """整段加粗的 <p>/<h2-4> 才算子标题(如「Skilled Worker Stream」「Francophone selection」);
    正文段落里夹 <strong> 强调的不算(全文字数要等于其唯一 <strong> 子节点的字数)。"""
    if tag.name not in ("p", "h2", "h3", "h4"):
        return False
    strongs = tag.find_all("strong")
    if len(strongs) != 1:
        return False
    full = re.sub(r"\s+", " ", tag.get_text(" ", strip=True))
    inner = re.sub(r"\s+", " ", strongs[0].get_text(" ", strip=True))
    return bool(full) and full == inner and len(full) < 100


def _mb_stream_blocks(art) -> list[tuple[str, int | None, int | None]]:
    """一期公告里常有多个「…were considered / Number of LAA issued / (可选)Ranking score…」小节
    (Occupation-specific / broad category / Francophone / Skilled Worker Stream 各一段)。
    分数线和 LAA 数官方总是写在同一个 <ul> 里 → 按 ul 配对,不会把 A 段的分算进 B 段。
    每段的名字取「最近的整段加粗子标题」;同一子标题下第 2 个带数据的 ul(比如
    「Occupation-specific selections」标题下,后面紧跟一段没有独立加粗标题的
    「broad occupational category」选法)用其前面最近的普通段落原句去区分,不瞎归并。
    找不到任何加粗子标题(老格式/改版)→ 返回空列表,调用方退回合并成一行的老逻辑。"""
    blocks: list[tuple[str, int | None, int | None]] = []
    heading, desc, count = "", "", 0
    for tag in art.find_all(["p", "h2", "h3", "h4", "ul"]):
        if tag.name == "ul":
            li_text = " ".join(li.get_text(strip=True) for li in tag.find_all("li", recursive=False))
            m_laa = MB_LAA.search(li_text)
            if not m_laa:
                continue  # NOC 码列表 / 分项拆解列表,不是「流」的数据块
            m_score = MB_SCORE.search(li_text)
            count += 1
            name = heading if count == 1 else f"{heading} – {desc}".strip(" –")
            blocks.append((name[:140] or "Expression of Interest",
                            _int(m_laa.group(1)), _int(m_score.group(1)) if m_score else None))
            desc = ""
            continue
        text = re.sub(r"\s+", " ", tag.get_text(" ", strip=True))
        if _mb_is_heading(tag):
            heading, desc, count = text, "", 0
        elif text:
            desc = text
    return blocks


def parse_mb(html: str) -> list[dict]:
    """/draws/ 索引页 prose:每期一个 <article class=post>,标题 h2「…Draw #N」。
    能按 <ul> 配出「子标题 + 该段分数线 + 该段 LAA」时一段一行(_mb_stream_blocks);
    配不出来(老格式)才退回一期一行、多分不猜的合并行为。"""
    soup = BeautifulSoup(html, "html.parser")
    draws = []
    for art in soup.find_all("article"):
        m = re.search(r"Draw\s*#(\d+)", art.get_text()[:300], re.I)
        if not m:
            continue
        num = m.group(1)
        body = art.get_text("\n", strip=True)
        dm = MB_DATE.search(body)
        d = _iso(dm.group(0)) if dm else None
        if not d:
            continue
        blocks = _mb_stream_blocks(art)
        if blocks:
            for name, laa, score in blocks:
                draws.append({"date": d, "stream": name, "note": f"Draw #{num}",
                              "score": score, "invitations": laa})
        else:
            laas = [_int(x) for x in MB_LAA.findall(body)]
            scores = [_int(x) for x in MB_SCORE.findall(body)]
            stream = next((ln.strip() for ln in body.split("\n")
                           if re.search(r"(Stream|Pathway)$", ln.strip()) and len(ln.strip()) < 60), "")
            draws.append({
                "date": d,
                "stream": stream or "Expression of Interest",
                "note": f"Draw #{num}",
                "score": scores[0] if len(scores) == 1 else None,   # 多流多分不猜
                "invitations": laas[0] if laas else None,
            })
    draws.sort(key=lambda x: x["date"], reverse=True)  # 稳定排序:同日多段保持原文顺序
    return draws[:MAX_PER_PROV]


def build(prov: str, url: str, parse, scale: str | None, label: str, old: dict) -> dict:
    try:
        draws = parse(fetch(url))
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ {prov} 抓取失败: {type(e).__name__} {e}(保留旧数据)")
        return old.get(prov) or {}
    if not draws:
        print(f"  ✗ {prov} 没解析到抽选(保留旧数据)")
        return old.get(prov) or {}
    print(f"  ✓ {prov:<3} {len(draws):>2} 条  最近 {draws[0]['date']} {draws[0]['stream'][:40]}"
          f"  score={draws[0]['score']} inv={draws[0]['invitations']}")
    return {"label": label, "scale": scale, "url": url, "draws": draws}


# ── ON:OINP 更新页(#153,Frank 报障「OINP 新通道出来了但站上没更新」)──────────────
# 原先 ON 整块是**写死**的:2026-06-26 手写「新通道细则待公布」,再不会自己更新 ——
# 7-20 官方已公布新 Ontario Workforce Priority Stream 的资格标准,站上还在说「待公布」= 过期误导。
# 改为实抓该页:①最新一条更新 → notice(有新动静一小时内自动跟上)②带「issued N invitations」
# 的条目 → draws(官方按轮次公布邀请数,无分数线 → score=None,scale=None 不假装有分制)。
ON_ENTRY = re.compile(
    r"^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d\d$")
ON_INV = re.compile(r"issued\s+([\d,]+)\s+invitations?", re.I)


def parse_on(html: str) -> tuple[list[dict], dict | None]:
    """返回 (draws, notice)。页面是「日期行 + 标题行 + 正文」的更新流。"""
    body = re.sub(r"(?:<(script|style|nav|header|footer)[^>]*>[\s\S]*?</\1>)", " ", html)
    lines = [re.sub(r"\s+", " ", x).strip() for x in re.sub(r"<[^>]+>", "\n", body).split("\n")]
    lines = [x for x in lines if len(x) > 2]

    entries: list[tuple[str, str, str]] = []   # (iso 日期, 标题, 正文片段)
    for i, ln in enumerate(lines):
        if not ON_ENTRY.match(ln):
            continue
        iso = _iso(ln)
        if not iso:
            continue
        title = lines[i + 1] if i + 1 < len(lines) else ""
        blob = " ".join(lines[i + 1:i + 4])
        entries.append((iso, title[:160], blob))

    if not entries:
        return [], None
    entries.sort(key=lambda e: e[0], reverse=True)

    draws = []
    for iso, title, blob in entries:
        m = ON_INV.search(blob)
        if m:
            draws.append({"date": iso, "stream": title, "score": None,
                          "invitations": _int(m.group(1)), "note": ""})
    latest = entries[0]
    notice = {"date": latest[0], "note": latest[1]}
    return draws[:MAX_PER_PROV], notice


# invitations 页:一张表一条通道,表头 Date issued / Number of invitations / Date profiles created /
# Score range / Notes。分数写成「57 and above」(区间下界)——取那个数当分数线,取不到就留空不猜。
ON_SCORE = re.compile(r"(\d{2,3})\s*(?:and above|\+|or higher)", re.I)


def parse_on_draws(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    draws: list[dict] = []
    for table in soup.find_all("table"):
        grid = expand_table(table)
        if not grid:
            continue
        head = " ".join(grid[0]).lower()
        if "score range" not in head:
            continue
        # 通道名 = 表格前面最近的一个标题(官方一张表一条通道)
        h = table.find_previous(["h2", "h3", "h4"])
        stream = re.sub(r"\s+", " ", h.get_text(" ", strip=True))[:120] if h else ""
        cols = {name: i for i, name in enumerate(x.lower() for x in grid[0])}
        i_date = next((i for n, i in cols.items() if "date issued" in n), 0)
        i_num = next((i for n, i in cols.items() if "number of invitations" in n), 1)
        i_score = next((i for n, i in cols.items() if "score range" in n), 3)
        i_note = next((i for n, i in cols.items() if n.startswith("notes")), None)
        for row in grid[1:]:
            if len(row) <= max(i_date, i_num, i_score):
                continue
            d = _iso(row[i_date])
            if not d:
                continue
            m = ON_SCORE.search(row[i_score])
            draws.append({"date": d, "stream": stream, "note": (row[i_note][:160] if i_note is not None and len(row) > i_note else ""),
                          "score": int(m.group(1)) if m else None, "invitations": _int(row[i_num])})
    draws.sort(key=lambda x: x["date"], reverse=True)
    return draws[:MAX_PER_PROV]


def parse_nl(html: str) -> list[dict]:
    """NL ITA 批次表:| Date Issued | Number of ITAs Issued | Notes |。无分数线(官方不发)。"""
    soup = BeautifulSoup(html, "lxml")
    draws: list[dict] = []
    for table in soup.find_all("table"):
        grid = expand_table(table)
        if not grid:
            continue
        head = " ".join(grid[0]).lower()          # NL 这张表没有 <th>,表头是首行 <td>
        if "date issued" not in head or "ita" not in head:
            continue
        for row in grid[1:]:
            if len(row) < 2 or not (d := _iso(row[0])):
                continue
            draws.append({"date": d, "stream": "NLPNP + AIP (ITA batch)",
                          "note": re.sub(r"\s+", " ", row[2])[:160] if len(row) > 2 else "",
                          "score": None, "invitations": _int(row[1])})
    draws.sort(key=lambda x: x["date"], reverse=True)
    return draws[:MAX_PER_PROV]


NB_ORDINAL = re.compile(r"(\d)(st|nd|rd|th)\b", re.I)
NB_RANGE = re.compile(r"^([A-Za-z]+)\s+\d{1,2}\s*(?:to|[–-])\s*(\d{1,2}),\s*(\d{4})$")


def _iso_nb(s: str) -> str | None:
    """NB 官方日期常写成区间(「July 16 to 18, 2026」「October 6-7, 2025」)或带序数词
    (「May 1st, 2026」)——区间取**最后一天**当抽选日(那天邀请才算发出);序数词去掉再喂 _iso。"""
    s = NB_ORDINAL.sub(r"\1", (s or "").strip())
    m = NB_RANGE.match(s)
    if m:
        mon, day2, yr = m.group(1), m.group(2), m.group(3)
        s = f"{mon} {day2}, {yr}"
    return _iso(s)


def _nb_br_lines(cell) -> list[str]:
    """officia 表格用 <br> 分隔多行(Pathways 可多条、Occupational categories 常见 5+ 条),
    不能直接 get_text 合并——那样逗号本就出现在类别名里(如「Education, social and community
    services」),会分不清是类别名内部逗号还是分隔符。按 <br> 切出原生的每行文本。"""
    for br in cell.find_all("br"):
        br.replace_with("\n")
    return [re.sub(r"\s+", " ", x).strip() for x in cell.get_text("\n").split("\n") if x.strip()]


def parse_nb(html: str) -> list[dict]:
    """ImmigrationNB 的「表格块」格式(当期页与 previous-invitations-*.html 通用):
    每轮一段「<p><b>通道名</b></p> + <table>」,表格是「标签: 值」两列行(Date of draw /
    Cut-off date and time / Pathways(可无,如 AIP) / Invitations issued 或 Applications selected /
    Occupational categories selected)。按类别定向发邀请、官方不发分数线 —— score 恒 None。"""
    soup = BeautifulSoup(html, "html.parser")
    draws: list[dict] = []
    for table in soup.find_all("table"):
        rows: dict[str, object] = {}
        for tr in table.find_all("tr"):
            cells = tr.find_all("td")
            if len(cells) < 2:
                continue
            label = re.sub(r"\s+", " ", cells[0].get_text(" ", strip=True)).rstrip(":").lower()
            if "occupational" in label and "categories" in label:
                rows[label] = _nb_br_lines(cells[1])
            elif label == "pathways":
                rows[label] = _nb_br_lines(cells[1])
            else:
                rows[label] = re.sub(r"\s+", " ", cells[1].get_text(" ", strip=True))
        if "date of draw" not in rows:
            continue
        d = _iso_nb(str(rows["date of draw"]))
        if not d:
            continue
        # 通道名 = 表格前最近一个居中加粗段落(官方原文,如「New Brunswick Skilled Worker stream」)
        head = table.find_previous(lambda t: t.name == "p" and t.find("b"))
        base = re.sub(r"\s+", " ", head.get_text(" ", strip=True)) if head else ""
        base = re.sub(r"\s+stream$", "", base, flags=re.I).strip()
        base = re.sub(r"^New Brunswick\s+", "", base, flags=re.I)
        if base.lower() == "atlantic immigration program":
            base = "AIP"
        pathways = rows.get("pathways") or []
        if pathways:
            short = [re.sub(r"^New Brunswick\s+", "NB ", p, flags=re.I) for p in pathways]
            stream = f"{base} ({' + '.join(short)})" if base else " + ".join(short)
        else:
            stream = base or "NBPNP"
        categories = rows.get("occupational categories selected") or []
        note = f"Categories: {', '.join(categories)}" if categories else ""
        inv = _int(rows.get("invitations issued") or rows.get("applications selected"))
        draws.append({"date": d, "stream": stream, "note": note[:160], "score": None, "invitations": inv})
    draws.sort(key=lambda x: x["date"], reverse=True)  # 稳定排序:同轮多通道保持原文顺序
    return draws[:NB_MAX]  # 页内不截 12:合并前截会把历史页(三月建筑轮)提前挤掉,截断统一在 build_nb


def build_nb(old: dict) -> dict:
    """两页合并:当期页(最新一轮,~5 条)+ previous-invitations-2026.html(本年历史,~20+ 条)。
    任一页抓失败不清空、拿另一页结果照跑(循 BC/AB「抓失败→保留旧数据」的兜底,但 NB 是两页,
    两页都失败才真正退回旧数据)。"""
    draws: list[dict] = []
    errors: list[str] = []
    for label, url in (("当期", NB_URL), ("history", NB_PREV_URL)):
        try:
            draws += parse_nb(fetch(url))
        except Exception as e:  # noqa: BLE001
            errors.append(f"{label} {type(e).__name__} {e}")
    if not draws:
        print(f"  ✗ NB 两页都抓取/解析失败: {'; '.join(errors) or '无数据'}(保留旧数据)")
        return old.get("NB") or {}
    if errors:
        print(f"  ⚠ NB 有一页失败(用另一页结果续跑): {'; '.join(errors)}")
    seen = set()
    merged = []
    for d in draws:
        key = (d["date"], d["stream"], d["invitations"])
        if key in seen:
            continue
        seen.add(key)
        merged.append(d)
    merged.sort(key=lambda x: x["date"], reverse=True)
    merged = merged[:NB_MAX]
    print(f"  ✓ NB  {len(merged):>2} 条  最近 {merged[0]['date']} {merged[0]['stream'][:40]}"
          f"  score={merged[0]['score']} inv={merged[0]['invitations']}")
    return {"label": "NBPNP + AIP", "scale": None, "url": NB_URL, "draws": merged}


def build_on(old: dict) -> dict:
    try:
        _, notice = parse_on(fetch(ON_URL))          # 通告仍取更新页(新通道细则的第一手动静)
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ ON 更新页抓取失败: {type(e).__name__} {e}(保留旧数据)")
        return old.get("ON") or {}
    if not notice:
        print("  ✗ ON 没解析到更新条目(保留旧数据)")
        return old.get("ON") or {}
    # 抽选记录改取 invitations 页(带分数区间)——抓不到就退回旧数据里的 draws,不清空
    try:
        draws = parse_on_draws(fetch(ON_INV_URL))
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ ON invitations 页抓取失败: {type(e).__name__} {e}(保留旧抽选)")
        draws = (old.get("ON") or {}).get("draws") or []
    if not draws:
        draws = (old.get("ON") or {}).get("draws") or []
    scored = sum(1 for d in draws if d.get("score") is not None)
    print(f"  ✓ ON  {len(draws):>2} 条抽选(其中 {scored} 条带分数线)  最新通告 {notice['date']} {notice['note'][:50]}")
    # scale:OINP 的 EOI 分制(与 BC SIRS / AB WEOI 互不可比,前端必须带标注)
    return {"label": "OINP", "scale": "OINP EOI" if scored else None,
            "url": ON_INV_URL, "draws": draws, "notice": notice}


def main() -> None:
    print(f"OUT: {OUT}")
    old = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8")).get("provinces", {})
        except Exception:  # noqa: BLE001
            old = {}

    provinces = {
        "BC": build("BC", BC_URL, parse_bc, "SIRS", "BC PNP Skills Immigration", old),
        "AB": build("AB", AB_URL, parse_ab, "WEOI", "AAIP", old),
        "MB": build("MB", MB_URL, parse_mb, "MPNP EOI", "MPNP Expression of Interest", old),
        "ON": build_on(old),
        # NL:scale=None —— 官方只发邀请数不发分数线,前端不得凭空造一条「分数线」列
        "NL": build("NL", NL_URL, parse_nl, None, "NLPNP + AIP(ITA 批次)", old),
        # NB:scale=None —— 按职业类别定向发邀请,官方同样不发分数线
        "NB": build_nb(old),
    }
    provinces = {k: v for k, v in provinces.items() if v}

    OUT.write_text(json.dumps({
        "source": "Provincial nominee program draw results (BC/AB/MB official pages)",
        "fetched": date.today().isoformat(),
        "provinces": provinces,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  ({sum(len(v.get('draws', [])) for v in provinces.values())} 条抽选 / {len(provinces)} 省)")


if __name__ == "__main__":
    main()
