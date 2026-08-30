"""NS 官方年度配额抓取(2026-08-14 立项,竞争卡缺口探索):NS 是唯一把 PNP 配额
放进省开放数据平台的省 —— Socrata API 免密钥,NSNP/AIP 分列,2015 起整条年序列。
人工核对表(pnp_allocations.json)的 NS 行以此为源;watch_allocations 哨兵逐轮对账,
对不上就「!」喊人 —— 自动抓的**不直接写**人工表(Frank 抽查制不破)。

  IN : https://data.novascotia.ca/resource/8rf7-hw2p.json (Socrata)
  OUT: raw/ircc/ns_allocations.json

Usage:  uv run python etl/scrape_ns_allocations.py
"""
import io
import json
import os
import sys
from datetime import date
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # 分域后上一级才是 etl/
import _paths  # noqa: E402

if os.name == "nt":  # 本机控制台 cp1252;容器由 auto_update 设 PYTHONIOENCODING
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

API = "https://data.novascotia.ca/resource/8rf7-hw2p.json"
PAGE = "https://data.novascotia.ca/Immigration-and-Migration/Annual-Allocations-for-Immigration-Programs/8rf7-hw2p"
OUT = _paths.IRCC / "ns_allocations.json"
print(f"OUT={OUT}", flush=True)


def main() -> None:
    _paths.IRCC.mkdir(parents=True, exist_ok=True)
    try:
        r = httpx.get(API, timeout=60, headers={"User-Agent": "offer2pr-ns-alloc/1.0"})
        r.raise_for_status()
        by_prog: dict[str, dict[str, int]] = {}
        for row in r.json():
            prog, year, n = str(row.get("program", "")).strip(), str(row.get("year", "")).strip(), row.get("allocation")
            if prog and year.isdigit() and n is not None:
                by_prog.setdefault(prog.lower(), {})[year] = int(n)
        nsnp = by_prog.get("nsnp") or {}
        if len(nsnp) < 5 or not any(int(y) >= 2024 for y in nsnp):
            raise RuntimeError(f"NSNP 序列异常(仅 {len(nsnp)} 年,最新 {max(nsnp, default='-')})—— 疑似数据集改版")
    except Exception as e:  # noqa: BLE001  抓取失败 → 保留旧表(宁可留旧也不留空)
        print(f"  ✗ NS 配额抓取失败: {type(e).__name__} {e}(保留旧表)")
        return

    OUT.write_text(json.dumps({
        "source": PAGE, "api": API, "fetched": date.today().isoformat(),
        "byProgram": by_prog,
        "note": "NS 省官方开放数据:年度配额,NSNP(=PNP 提名名额)与 AIP 分列。人工表 NS 行以 NSNP 为准,AIP 不并入;哨兵逐轮对账。",
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    latest = max(nsnp)
    print(f"  ✓ NS 配额 {len(nsnp)} 年({min(nsnp)}–{latest}) · NSNP {latest}={nsnp[latest]:,} · AIP {latest}={(by_prog.get('aip') or {}).get(latest, 0):,}", flush=True)


if __name__ == "__main__":
    main()
