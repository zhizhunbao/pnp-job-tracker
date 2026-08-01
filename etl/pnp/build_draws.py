"""
build_draws — 省 PNP 抽选事实(E6-04):BC / AB / MB 三省最近抽选 + ON 改制通告,全 httpx 实时抓。
**事实展示层,非资格判定**:各省分制互不相通(BC=SIRS / AB=WEOI / MB=MPNP EOI),都不是 CRS——
score 一律带 scale 标注,前端展示必须声明「省自评分制,非 CRS」。SK 2025 改制后无抽选、QC 不属 PNP,不产出。
抓取失败/解析空 → 该省保留旧数据(循 build_on 模式,宁可留旧不留错)。

  IN : (网络)welcomebc.ca / alberta.ca / immigratemanitoba.com / ontario.ca
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

MAX_PER_PROV = 12  # raw 留最近 N 条;mart 再截


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


def parse_mb(html: str) -> list[dict]:
    """/draws/ 索引页 prose:每期一个 <article class=post>,标题 h2「…Draw #N」。
    多流多分数期(通用抽选)只取总 LAA、score 留空(宁可留空,来源链兜底)。"""
    soup = BeautifulSoup(html, "html.parser")
    draws = []
    for art in soup.find_all("article"):
        m = re.search(r"Draw\s*#(\d+)", art.get_text()[:300], re.I)
        if not m:
            continue
        num = m.group(1)
        body = art.get_text("\n", strip=True)
        dm = MB_DATE.search(body)
        laas = [_int(x) for x in MB_LAA.findall(body)]
        scores = [_int(x) for x in MB_SCORE.findall(body)]
        stream = next((ln.strip() for ln in body.split("\n")
                       if re.search(r"(Stream|Pathway)$", ln.strip()) and len(ln.strip()) < 60), "")
        draws.append({
            "date": _iso(dm.group(0)) if dm else None,
            "stream": stream or "Expression of Interest",
            "note": f"Draw #{num}",
            "score": scores[0] if len(scores) == 1 else None,   # 多流多分不猜
            "invitations": laas[0] if laas else None,
        })
        if len(draws) >= MAX_PER_PROV:
            break
    return [d for d in draws if d["date"]]


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
