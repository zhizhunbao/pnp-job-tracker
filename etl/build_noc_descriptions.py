"""build_noc_descriptions — NOC 2021 官方职业名 + 主要职责(StatCan Elements 开放 CSV,httpx 直取)。
源(开放政府许可,与 build_wages 同门户):
  https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-elements.csv
每个 5 位 NOC 取 Class title(官方名)+ Main duties(主要职责)+ Employment requirements(任职要求)
→ raw/noc/descriptions.json,供 09_build_mart 做 noc_descriptions 维度(NOC/职位弹框显示官方名+职责)。

Usage:  uv run python etl/build_noc_descriptions.py
"""
import csv
import datetime
import io
import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

URL = "https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-elements.csv"
IN_CSV = _paths.NOC / "noc-elements.csv"          # 下载缓存(可重下)
OUT = _paths.NOC / "descriptions.json"            # 维护表(09 消费)

# 关注的 element 类型 → 输出键
WANT = {"Main duties": "duties", "Employment requirements": "requirements"}


def download() -> str:
    IN_CSV.parent.mkdir(parents=True, exist_ok=True)
    if IN_CSV.exists():
        print(f"用已缓存 {IN_CSV}")
        return IN_CSV.read_text(encoding="utf-8-sig", errors="replace")
    print(f"下载 {URL}")
    r = httpx.get(URL, timeout=120, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    IN_CSV.write_bytes(r.content)
    return r.content.decode("utf-8-sig", errors="replace")


def main() -> None:
    reader = csv.DictReader(io.StringIO(download()))
    out: dict[str, dict] = {}
    for r in reader:
        if (r.get("Level") or "").strip() != "5":        # 只要 5 位单位组
            continue
        noc = (r.get("Code - NOC 2021 V1.0") or "").strip()
        if not noc:
            continue
        rec = out.setdefault(noc, {"noc": noc, "title": (r.get("Class title") or "").strip(),
                                   "duties": [], "requirements": []})
        et = (r.get("Element Type Label English") or "").strip()
        key = WANT.get(et)
        desc = (r.get("Element Description English") or "").strip()
        # 跳过「performs some or all of the following duties:」这类引导句,只留具体条目
        if key and desc and not desc.lower().rstrip(":").endswith("following duties"):
            rec[key].append(desc)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "source": "NOC 2021 V1.0 Elements (StatCan)", "url": URL,
        "fetched": datetime.date.today().isoformat(), "byNoc": out,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    wd = sum(1 for v in out.values() if v["duties"])
    print(f"✓ {OUT}  ({len(out)} 个 NOC · {wd} 有主要职责)")
    for noc in ("21331", "31301", "73300"):
        v = out.get(noc, {})
        print(f"  {noc} {v.get('title','?')}: {len(v.get('duties',[]))} 职责 · {len(v.get('requirements',[]))} 要求")


if __name__ == "__main__":
    main()
