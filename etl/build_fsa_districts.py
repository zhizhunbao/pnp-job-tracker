"""
build_fsa_districts — 从 GeoNames 加拿大邮编开放数据建「FSA→区」维度表(我们自己维护,
无外部 API/限速)。GeoNames 给到社区级:K2K→"Kanata (Beaverbrook / South March)"。

源:https://download.geonames.org/export/zip/CA.zip(免费,~1657 个 FSA,偶尔更新)。
解析 place_name = "主名 (社区1 / 社区2 …)":
  main = 括号前(郊区社区名,如 Kanata/Gloucester;大城市则=城市名)
  hood = 括号内第一个(更细的社区,如 Bridgeland)
04c 据此洗区:district = main≠城市 ? main : hood(见 04c)。

Usage:  uv run python etl/build_fsa_districts.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

IN_GEONAMES = _paths.REFERENCE / "geonames" / "CA.txt"   # GeoNames 源(下载来的)
OUT_TABLE = _paths.REFERENCE / "fsa-districts.json"      # 我们维护的维度表


def main() -> None:
    print(f"IN  GeoNames : {IN_GEONAMES}")
    print(f"OUT 维度表    : {OUT_TABLE}")
    table: dict[str, dict] = {}
    for line in IN_GEONAMES.read_text(encoding="utf-8").splitlines():
        f = line.split("\t")
        if len(f) < 5 or f[0] != "CA":
            continue
        fsa, place, prov = f[1].strip().upper(), f[2].strip(), f[4].strip()
        if len(fsa) != 3:
            continue
        m = re.match(r"^(.*?)\s*\((.*?)\)\s*$", place)  # "Main (Sub / Sub)"
        if m:
            main = m.group(1).strip()
            hood = re.split(r"\s*/\s*", m.group(2))[0].strip()
        else:
            main, hood = place, ""
        table[fsa] = {"main": main, "hood": hood, "prov": prov}
    OUT_TABLE.write_text(json.dumps(table, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    print(f"建表完成:{len(table)} 个 FSA → reference/fsa-districts.json")


if __name__ == "__main__":
    main()
