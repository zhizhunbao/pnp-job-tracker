"""
build_lmia — ESDC「获批正面 LMIA 雇主清单」季度开放数据 → 按雇主聚合的「外劳雇佣记录」维度表。
源(免费,季度更新,加拿大开放政府许可;E6-02):
  https://open.canada.ca/data/en/dataset/90fed587-1364-4f33-a9ee-208181dc0b97
列(实查 2025Q4):Province/Territory · Program Stream · Employer · Address ·
  Occupation(NOC 码-名)· Incorporate Status · Approved LMIAs · Approved Positions。

语义红线(实现文档 §0):产出的是「雇主雇过外国人的历史事实」,不是「能担保」判定;
聚合保留股别/季度/职位数,展示层必须带这些语境。

只取近 N 个季度(默认 8,约两年)——更老的雇佣史对「现在还愿不愿意」的证据价值衰减。
聚合键 = 05c 的 norm_name(与 AIP 匹配同一把尺子,мart join 时对 companies 用同一函数)。

Usage:  uv run python etl/build_lmia.py          # 增量:已缓存季度不重下
        LMIA_QUARTERS=12 uv run python etl/build_lmia.py
"""
from __future__ import annotations

import importlib.util
import json
import os
import re
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

# norm_name 住在 clean/05c(数字开头模块名 → importlib 拉;单一来源,不复制)
_spec = importlib.util.spec_from_file_location(
    "flag_aip", Path(__file__).resolve().parent / "clean" / "05c_flag_aip.py")
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
norm_name = _mod.norm_name

# ── 输入/输出全路径(先声明再用)──────────────────────────────────────
CKAN_PKG = ("https://open.canada.ca/data/api/action/package_show"
            "?id=90fed587-1364-4f33-a9ee-208181dc0b97")
IN_XLSX_DIR = _paths.LMIA                       # 季度源缓存 tfwp_YYYYqN_pos_en.xlsx(gitignore)
OUT_TABLE = _paths.LMIA / "lmia-employers.json"  # 维护表(gitignore,可由缓存重建;09 消费)

KEEP_QUARTERS = int(os.environ.get("LMIA_QUARTERS", "8"))  # 近两年
_QUARTER_RE = re.compile(r"tfwp_(\d{4}q\d)_pos_en\.xlsx$", re.I)
_NOC_RE = re.compile(r"^(\d{4,5})")             # Occupation 形如 "63200-Cooks"

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")


def list_quarter_urls() -> list[tuple[str, str]]:
    """CKAN → [(quarter, url)],只要 *_pos_en.xlsx,按季度升序,截近 KEEP_QUARTERS 个。"""
    with httpx.Client(timeout=60, follow_redirects=True) as c:
        r = c.get(CKAN_PKG)
        r.raise_for_status()
    out = []
    for res in r.json()["result"]["resources"]:
        m = _QUARTER_RE.search(res.get("url") or "")
        if m:
            out.append((m.group(1).upper(), res["url"]))
    out.sort()
    return out[-KEEP_QUARTERS:]


def download(quarter: str, url: str) -> Path:
    IN_XLSX_DIR.mkdir(parents=True, exist_ok=True)
    dest = IN_XLSX_DIR / f"tfwp_{quarter.lower()}_pos_en.xlsx"
    if dest.exists():
        return dest
    print(f"下载 {quarter}: {url}")
    with httpx.Client(timeout=180, follow_redirects=True) as c:
        r = c.get(url)
        r.raise_for_status()
    dest.write_bytes(r.content)
    return dest


def parse_quarter(path: Path, quarter: str, table: dict) -> int:
    """单季 XLSX → 累加进 table[normKey]。表头在第 2 行;尾部注释行(Employer 空)跳过。"""
    import openpyxl  # 延迟 import:本脚本外不需要(镜像 Dockerfile 需装 openpyxl)

    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.active
    rows = ws.iter_rows(values_only=True)
    header = None
    kept = 0
    for row in rows:
        cells = ["" if c is None else str(c).strip() for c in row]
        if header is None:
            if cells and cells[0].startswith("Province"):
                header = cells
            continue
        if len(cells) < 8 or not cells[2]:          # Employer 空 = 注释/空行
            continue
        prov, stream, employer, _addr, occ, _inc, lmias, positions = cells[:8]
        key = norm_name(employer)
        if not key:
            continue
        try:
            n_lmias = int(float(lmias or 0))
            n_pos = int(float(positions or 0))
        except ValueError:
            continue
        e = table.setdefault(key, {
            "name": employer, "provinces": set(), "streams": {},
            "quarters": {}, "lmias": 0, "positions": 0, "positionsSkilled": 0, "nocs": {},
        })
        e["provinces"].add(prov)
        e["streams"][stream] = e["streams"].get(stream, 0) + n_pos
        # 技能类口径(榜单排序用):只计 High Wage / Global Talent / PR-only 三股 ——
        # Low Wage(鱼厂/快餐百人计)与农业/SAWP 会淹没技能类担保榜;PR-only 股=为支持 PR 申请办的 LMIA,最强移民信号
        if re.search(r"high wage|global talent|permanent resident", stream, re.I):
            e["positionsSkilled"] += n_pos
        q = e["quarters"].setdefault(quarter, [0, 0])
        q[0] += n_lmias
        q[1] += n_pos
        e["lmias"] += n_lmias
        e["positions"] += n_pos
        m = _NOC_RE.match(occ)
        if m:
            noc = m.group(1).zfill(5)
            e["nocs"][noc] = e["nocs"].get(noc, 0) + n_pos
        kept += 1
    wb.close()
    return kept


def main() -> None:
    quarters = list_quarter_urls()
    print(f"IN:  {IN_XLSX_DIR}  (近 {len(quarters)} 季度: {quarters[0][0]}..{quarters[-1][0]})")
    print(f"OUT: {OUT_TABLE}")
    table: dict[str, dict] = {}
    for quarter, url in quarters:
        path = download(quarter, url)
        kept = parse_quarter(path, quarter, table)
        print(f"  {quarter}: {kept} 行")
    for e in table.values():                        # set → 排序列表(JSON 可写)
        e["provinces"] = sorted(e["provinces"])
        e["lastQuarter"] = max(e["quarters"])
    OUT_TABLE.write_text(json.dumps(
        {"source": "ESDC TFWP positive LMIA employers (open.canada.ca 90fed587)",
         "quarters": [q for q, _ in quarters], "employers": table},
        ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    size_mb = OUT_TABLE.stat().st_size / 1e6
    print(f"建表完成:{len(table)} 个雇主 → {OUT_TABLE.name} ({size_mb:.1f} MB)")
    for probe in ("tim hortons", "google canada", "maple leaf foods"):
        hit = table.get(norm_name(probe))
        print(f"  探针 [{probe}]: {'✓ ' + str(hit['positions']) + ' 职位/' + hit['lastQuarter'] if hit else '—'}")


if __name__ == "__main__":
    main()
