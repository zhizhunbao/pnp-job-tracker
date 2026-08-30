"""
build_jvws_mart — data/raw/jvws/jvws-vacancies.json(StatCan 原始过滤表)→ data/mart/jvws_vacancies.json
(列对齐草案 DB 表 jvws_vacancies,seed 灌库前的最后一步)。E14-01。

独立小构建器,**不进 09_build_mart.py 主链**(那条链拼的是 jobs/companies 事实表;JVWS 是外部市场
分母,自成一张维度表,join key = noc,不依赖 08_score 产物,没有先后顺序耦合)。

列对齐 docs/sql/e14-01-jvws-vacancies.sql 的 jvws_vacancies 表(草案,未执行):
  noc / province / quarter / ref_date / vacancies / quality / available / source_url / fetched

Usage:  python -X utf8 etl/build_jvws_mart.py   # 依赖 build_jvws.py 已产出 data/raw/jvws/jvws-vacancies.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # 分域后上一级才是 etl/
import paths

IN_TABLE = paths.JVWS / "jvws-vacancies.json"
OUT_MART = paths.MART / "jvws_vacancies.json"

# StatCan 质量码含义(WDS getCubeMetadata footnote #1,quote-anchored 见 build_jvws.py):
# A-E = 已发布(A 最优,E 谨慎使用);F = 太不可靠不发布;'..' = 当期未采集;'x' = 保密抑制。
# 后三者 vacancies 本就是 None(build_jvws 已处理),这里只派生 available 供消费端一眼判断可不可信。
_UNAVAILABLE_QUALITY = {None, "F", "..", "x"}


def main() -> None:
    print(f"IN:  {IN_TABLE}")
    print(f"OUT: {OUT_MART}")
    data = json.loads(IN_TABLE.read_text(encoding="utf-8"))
    src = data["source"]
    rows = []
    for r in data["rows"]:
        rows.append({
            "noc": r["noc"],
            "province": r["province"],
            "quarter": r["quarter"],
            "refDate": r["refDate"],
            "vacancies": r["vacancies"],                              # 🔴 None 就是 None,不折 0(见表头红线)
            "quality": r["quality"],
            "available": r["vacancies"] is not None and r["quality"] not in _UNAVAILABLE_QUALITY,
            "sourceUrl": src["url"],
            "fetched": src["fetched"],
        })
    OUT_MART.parent.mkdir(parents=True, exist_ok=True)
    OUT_MART.write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    n_avail = sum(1 for r in rows if r["available"])
    print(f"建表完成:{len(rows)} 行({data['quarters'][0]}..{data['quarters'][-1]}),"
          f"{n_avail} 行可用/{len(rows) - n_avail} 行抑制或未采集 → {OUT_MART.name}"
          f"({OUT_MART.stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
