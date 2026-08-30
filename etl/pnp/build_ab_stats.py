"""
build_ab_stats — AB(AAIP)官方**配额用量 + EOI 池内人数 + 抽选史 + 积压游标**。

与 build_sk_stats 同一族(「我要等多久 / 还有没有名额」),但 AB 发得更全 —— 全国唯一
把**EOI 池内人数**(被抽中概率的分母)直接发出来的省:
  · 2026 总配额 / 已发 / 剩余 / 待处理(全程序 + 逐 stream)
  · 「正在审哪一天收到的申请」= 积压游标(比「预计 N 周」诚实得多)
  · Expression of Interest 池内人数逐 stream(AOS 2026-07-30 实见 23,056 人)——
    配合同页抽选史(单轮邀请数),「被捞概率」第一次可算:单轮 ≈ 邀请数 ÷ 池内人数
  · 65 轮抽选史(日期 / 通道 / 最低分 / 邀请数)

产出 raw/pnp/ab-stats.json。抽选史原样存在这里(同页一并到手);**pnp_draws 维度表的
canonical 源仍是 build_draws.py**,不在这里重复灌 —— 两处写同一张维度表迟早打架。

页面结构:每个 stream 一节(h2/h3)+ 一张表,表头统一「allocation / issued / remaining /
to be processed / assessing … on or before」。个别格是文字(「Less than 10」「Not applicable」)
→ 数值列解析失败时保留原文(raw),不硬转数字。

自校是硬闸(照 build_bc_req):总表对不上账 / EOI 池缺 / 抽选史过短就**保留旧表不覆盖**并 exit 1。

Usage:  uv run python etl/pnp/build_ab_stats.py
"""
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths

URL = "https://www.alberta.ca/aaip-processing-information"
OUT = _paths.PNP / "ab-stats.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"}

PROVINCE = "AB"
NOTE = ("AAIP 官方处理信息页:配额/已发/剩余、积压游标(正在审哪天收到的申请)、"
        "**EOI 池内人数**(被抽中概率的分母 —— 单轮概率 ≈ 当轮邀请数 ÷ 池内人数)与抽选史。"
        "官方注明所有数字随时可变、配额可在 stream 间腾挪;医生与法语者走联邦附加名额,不占本省配额。"
        "抽选史的 canonical 维度表仍由 build_draws.py 维护,本表原样留档。")

RE_UPDATED = re.compile(r"([A-Z][a-z]+ \d{1,2}, \d{4})")
RE_INT = re.compile(r"^[\d,]+$")


def cells(tr) -> list[str]:
    return [re.sub(r"\s+", " ", td.get_text(" ", strip=True)) for td in tr.find_all(["td", "th"])]


def num(s: str):
    """'3,425' → 3425;文字格(Less than 10 / Not applicable)原样返回,不硬转。"""
    return int(s.replace(",", "")) if RE_INT.match(s.replace(",", "").strip() or "x") else s


def main() -> None:
    print(f"OUT: {OUT}")
    html = httpx.get(URL, headers=UA, follow_redirects=True, timeout=45).text
    soup = BeautifulSoup(html, "html.parser")
    problems: list[str] = []

    # 页面自带的更新日(h2「2026 summary」上方独立一行日期);取正文里第一个能解析的日期
    as_of = ""
    main_el = soup.find("main") or soup
    for m in RE_UPDATED.finditer(main_el.get_text(" ", strip=True)[:3000]):
        try:
            as_of = datetime.strptime(m.group(1), "%B %d, %Y").date().isoformat()
            break
        except ValueError:
            continue
    if not as_of:
        problems.append("页面更新日没解析到")

    summary: dict = {}
    streams: list[dict] = []
    eoi_pool: list[dict] = []
    draws: list[dict] = []

    for tbl in soup.find_all("table"):
        rows = [cells(tr) for tr in tbl.find_all("tr")]
        if len(rows) < 2 or not rows[0]:
            continue
        head = [h.lower() for h in rows[0]]
        # 该表属于哪个 stream:取前面最近的标题(官方每节一表)
        h = tbl.find_previous(["h2", "h3"])
        section = re.sub(r"\s+", " ", h.get_text(" ", strip=True)) if h else ""

        if head[0].startswith("draw date"):
            for r in rows[1:]:
                if len(r) >= 4:
                    draws.append({"date": r[0], "stream": r[1], "minScore": num(r[2]), "invitations": num(r[3])})
        elif head[0].startswith("stream or pathway"):
            for r in rows[1:]:
                # 表内有小节标题行(「Alberta Express Entry Stream:」)数字格为空 → 跳过,不存空值
                if len(r) >= 2 and r[1].strip():
                    eoi_pool.append({"stream": r[0], "count": num(r[1])})
        elif "nomination allocation" in head[0] and "summary" in section.lower():
            summary = dict(zip(["allocation", "issued", "remaining", "toProcess"], (num(x) for x in rows[1])))
        elif "nomination allocation" in " ".join(head):
            # 逐 stream 表:单行表(节名=stream)或多行表(首列=pathway 名)
            has_name_col = "allocation" not in head[0]
            for r in rows[1:]:
                vals = r[1:] if has_name_col else r
                row = {"stream": r[0] if has_name_col else section}
                for key, v in zip(["allocation", "issued", "remaining", "toProcess", "assessingUpTo"], vals):
                    row[key] = num(v) if key != "assessingUpTo" else v
                streams.append(row)

    # ── 自校 ──────────────────────────────────────────────────────────────────
    if not summary or not isinstance(summary.get("allocation"), int):
        problems.append("总表(2026 summary)没解析到")
    elif isinstance(summary.get("issued"), int) and isinstance(summary.get("remaining"), int) \
            and summary["issued"] + summary["remaining"] != summary["allocation"]:
        problems.append(f"总表对不上账:{summary}")
    if len(streams) < 5:
        problems.append(f"逐 stream 表只解析到 {len(streams)} 行(期望 ≥5)")
    if len(eoi_pool) < 4:
        problems.append(f"EOI 池只解析到 {len(eoi_pool)} 行(期望 ≥4)")
    elif not any(isinstance(r["count"], int) and r["count"] > 1000 for r in eoi_pool):
        problems.append("EOI 池数字异常(没有任何 stream 超过 1000 人,疑似列错位)")
    if len(draws) < 20:
        problems.append(f"抽选史只解析到 {len(draws)} 轮(期望 ≥20)")

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": "PNP",
        "source": "AAIP processing information", "url": URL, "note": NOTE,
        "asOf": as_of, "fetched": date.today().isoformat(),
        "summary": summary, "streams": streams, "eoiPool": eoi_pool, "draws": draws,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    aos = next((r for r in eoi_pool if "Opportunity" in r["stream"]), None)
    print(f"✓ {OUT}  asOf {as_of}:配额 {summary['allocation']:,} 已发 {summary['issued']:,} "
          f"剩 {summary['remaining']:,};stream {len(streams)} 行;EOI 池 {len(eoi_pool)} 档"
          f"(AOS {aos['count']:,} 人);抽选史 {len(draws)} 轮")


if __name__ == "__main__":
    main()
