"""
build_bc_sirs — BC PNP「注册打分表」(SIRS 200 分制)。E12-09 的数据底座。

**为什么读 PDF**:官网正文只写「how points are awarded 请见 Skills Immigration Program Guide」,
分数细则全在那份 PDF 里(实核 2026-07-27:welcomebc 旧的 SIRS 网页已 404,细则改挂 PDF)。
用 pymupdf 的 find_tables 逐表取(已是本仓依赖,不新增);解析后**逐节自校**——
每节「最高可得」必须等于官方写的 Max,不过就**保留旧表不覆盖**:分数表错一位比没有更危险。

产出 data/raw/pnp/bc-sirs.json:
  guideEffective  指南页脚的生效日期(官方改版就会变,是过期检测的锚)
  factors         work / education / language / wage / area 五节,各含 rows + bonus + max
  wage 存规则不存穷举:官方是 $16 起每整元 1 分($20.00-20.99 = 5),即 floor(时薪) − 15,≥$70 封顶 55

Usage:  uv run python etl/pnp/build_bc_sirs.py
"""
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

import fitz  # pymupdf
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402

PDF_URL = "https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf"
PAGE_URL = "https://www.welcomebc.ca/immigrate-to-b-c/for-workers"
OUT = _paths.PNP / "bc-sirs.json"

WORK_ROW = re.compile(r"^(5 or more years|At least \d but less than \d years|Less than 1 year|No experience)$", re.I)
EDU_ROW = re.compile(r"^(Doctoral|Master|Post-Graduate|Bachelor|Associate|Post-secondary Diploma|Secondary School)", re.I)
LANG_ROW = re.compile(r"^(9\+|[4-8]|Below 4.*)$", re.I)
AREA_ROW = re.compile(r"^Area [123]:", re.I)
SKIP_ROW = re.compile(r"^(Maximum Score Available|Additional points|Education|Points|Canadian Language Benchmark|Area of employment)", re.I)


def cells_of(row: list) -> tuple[str, int | None]:
    """一行 → (标签, 分值)。PDF 表格是稀疏格,取第一个非空格作标签、最后一个纯数字作分值。"""
    vals = [(c or "").replace("\n", " ").strip() for c in row]
    vals = [v for v in vals if v]
    if not vals:
        return "", None
    label = vals[0]
    pts = None
    for v in reversed(vals):
        if re.fullmatch(r"\d{1,3}", v):
            pts = int(v)
            break
    if pts is not None and label == str(pts) and len(vals) > 1:
        label = vals[0]
    return re.sub(r"\s+", " ", label), pts


def main() -> None:
    r = httpx.get(PDF_URL, timeout=60, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    doc = fitz.open(stream=r.content, filetype="pdf")

    eff = ""
    m = re.search(r"information in the guide is effective ([A-Z][a-z]+ \d{1,2}, \d{4})", doc[3].get_text())
    if m:
        eff = datetime.strptime(m.group(1), "%B %d, %Y").date().isoformat()

    F: dict[str, dict] = {k: {"rows": [], "bonus": []} for k in ("work", "education", "language", "area")}
    for page in doc:
        try:
            tables = page.find_tables().tables
        except Exception:  # noqa: BLE001 — 没表格的页直接跳过
            continue
        for tb in tables:
            rows = [cells_of(x) for x in tb.extract()]
            head = " ".join(lbl for lbl, _ in rows[:2]).lower()
            sec = ("language" if "canadian language benchmark" in head
                   else "education" if head.startswith("education") or "education points" in head
                   else "area" if "area of employment" in head
                   else "work" if any(WORK_ROW.match(lbl) for lbl, _ in rows) else "")
            if not sec:
                continue
            in_bonus = False
            for lbl, pts in rows:
                if not lbl:
                    continue
                if re.match(r"^Additional points", lbl, re.I):
                    in_bonus = True
                    continue
                if SKIP_ROW.match(lbl) or pts is None:
                    continue
                pat = {"work": WORK_ROW, "education": EDU_ROW, "language": LANG_ROW, "area": AREA_ROW}[sec]
                bucket = "bonus" if (in_bonus or not pat.match(lbl)) else "rows"
                # 官方用「…, or」表示**二选一**(如「在 BC 读完 8 分, or 在加拿大其它省 6 分」)——
                # 标成 xor,自校与前端算分都按「取其一」处理,否则会把 46 分当成 40 分的上限。
                item = {"label": lbl, "points": pts}
                if bucket == "bonus" and F[sec]["bonus"] and re.search(r",\s*or$", F[sec]["bonus"][-1]["label"]):
                    item["xorWithPrev"] = True
                F[sec][bucket].append(item)

    factors = {
        "work": {"max": 40, **F["work"]},
        "education": {"max": 40, **F["education"]},
        "language": {"max": 40, **F["language"]},
        "wage": {"max": 55, "rule": "floor(hourlyCAD) - 15", "floorAt": 16, "capAt": 70},
        "area": {"max": 25, **F["area"]},
    }

    problems = []
    if not eff:
        problems.append("没解析到指南生效日期")
    for k in ("work", "education", "language", "area"):
        f = factors[k]
        # 加分求和时,xor 组只取组内最大(见上面「…, or」的处理)
        bonus_sum, prev = 0, None
        for x in f["bonus"]:
            if x.get("xorWithPrev") and prev is not None:
                bonus_sum += max(0, x["points"] - prev)          # 用组内更大的那个替换
                prev = max(prev, x["points"])
            else:
                bonus_sum += x["points"]
                prev = x["points"]
        best = max((x["points"] for x in f["rows"]), default=0) + bonus_sum
        if not f["rows"]:
            problems.append(f"{k}: 一行都没解析到")
        elif best != f["max"]:
            problems.append(f"{k}: 最高 {best} ≠ 官方 Max {f['max']}(rows={[x['points'] for x in f['rows']]} bonus={[x['points'] for x in f['bonus']]})")
    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": "BC", "system": "SIRS", "maxTotal": 200,
        "source": "BC PNP Skills Immigration Program Guide", "url": PDF_URL, "pageUrl": PAGE_URL,
        "guideEffective": eff, "fetched": date.today().isoformat(), "factors": factors,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  指南生效 {eff}")
    for k in ("work", "education", "language", "area"):
        print(f"  {k:10} {len(factors[k]['rows'])} 档 + {len(factors[k]['bonus'])} 项加分")


if __name__ == "__main__":
    main()
