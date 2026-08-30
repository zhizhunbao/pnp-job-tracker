"""
build_pe — PE(爱德华王子岛)PEI PNP 具名职业清单(每省一个 build 脚本,完全自包含)。

**实时抓,但走 PDF**:`princeedwardisland.ca` 的 **HTML 页在 Radware 后面**(httpx 拿到的是
「Verifying your browser before proceeding...」壳,2026-08-03 用全套浏览器头 + http1.1 复验仍被挡),
而**文件服务器 `/sites/default/files/` 不挡** —— 官方申请指南 PDF 直接 200。
于是本站的 PE 口径取自官方申请指南原文,而不是网页。

产出 raw/pnp/pe-oid.json(PEI Occupations in Demand,8 个具名 NOC,inclusion)。
抓不到/解析到的条数异常 → 保留旧表(宁可留旧也不留空)。

⚠️ 口径:PEI Occupations in Demand 是**具名清单**(必须是这 8 个 NOC 之一 + PEI 雇主全职长期 offer)。
PEI 另有 Skilled Worker / Critical Worker / Intermediate Experience 等通道**不列职业**(按 offer + TEER 判),
所以「不在这 8 个里」**不等于** PE 走不通 —— 前端/报告不得据此下「PE 不收」的结论。

Usage:  uv run python etl/pnp/build_pe.py   (需 httpx+pymupdf,系统 python 没装 → 用 .venv / docker etl 镜像)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/ → _paths
import _paths

PROVINCE = "PE"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
GUIDE_URL = "https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf"
PAGE_URL = "https://www.princeedwardisland.ca/en/information/office-of-immigration/pei-pnp-workforce-streams"
OUT = _paths.PNP / "pe-oid.json"
NOTE = ("PEI Occupations in Demand:须是清单内 NOC + PEI 雇主全职非季节性长期 offer,另有 1 年相关经验、"
        "18-59 岁、高中以上、CLB/NCLC 4 等条件。PEI 另有 Skilled Worker / Critical Worker / "
        "Intermediate Experience 等通道**不列职业**(按 offer + TEER 判)——不在本清单不等于 PE 走不通。"
        "口径取自官方申请指南 PDF(PEI 网页在 Radware 反爬后面,无法自动抓)。")

SECTION = re.compile(r"Occupations\s+in\s+Demand", re.I)
NOC_LINE = re.compile(r"NOC\s+(\d{5})\s*\(([^)]+)\)")
MIN_EXPECTED = 5   # 低于此数视为解析异常(2026-08-03 实见 8 个)


def main() -> None:
    print(f"OUT: {OUT}")
    _paths.PNP.mkdir(parents=True, exist_ok=True)
    try:
        import fitz  # pymupdf(已在 pyproject 依赖里)
        pdf = httpx.get(GUIDE_URL, headers={"User-Agent": UA}, follow_redirects=True, timeout=60).content
        with fitz.open(stream=pdf, filetype="pdf") as doc:
            text = "\n".join(p.get_text() for p in doc)
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ PE 申请指南抓取失败: {type(e).__name__} {e}(保留旧表)")
        return
    hits = list(SECTION.finditer(text))
    if not hits:
        print("  ✗ PE 指南里没找到 Occupations in Demand 段(改版?保留旧表,请人工复核)")
        return
    # 「Occupations in Demand」在目录页也会出现一次 —— 逐个候选段往后扫一屏,取第一个真带 NOC 的
    # (只扫本段那一屏,免得把别的通道的零星 NOC 混进这张清单)
    occ: dict[str, str] = {}
    for m in hits:
        found = NOC_LINE.findall(text[m.end():m.end() + 2500])
        if len(found) >= MIN_EXPECTED:
            for noc, name in found:
                occ.setdefault(noc, re.sub(r"\s+", " ", name).strip(" .,"))
            break
    if len(occ) < MIN_EXPECTED:
        print(f"  ✗ PE 只解析到 {len(occ)} 个 NOC(<{MIN_EXPECTED},疑似改版)—— 保留旧表,请人工复核")
        return
    table = {
        "stream": "PEI PNP — Occupations in Demand", "label": "PE 在需职业",
        "province": PROVINCE, "program": "PNP", "type": "indemand", "note": NOTE,
        "url": PAGE_URL, "sourceFile": GUIDE_URL, "fetched": date.today().isoformat(),
        "occupations": [{"noc": n, "name": nm} for n, nm in sorted(occ.items())],
    }
    OUT.write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ {'PE 在需职业':<10} {len(occ):>3} 个职业 → pnp/{OUT.name}  (实时 {table['fetched']})")
    for n, nm in sorted(occ.items()):
        print(f"      · {n} {nm[:60]}")


if __name__ == "__main__":
    main()
