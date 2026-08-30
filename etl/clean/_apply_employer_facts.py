"""B3 回写 SQL 生成器(照 _apply 手法:只填空,不覆写)。

读 data/processed/employer_facts.json(_enrich_employer_facts.py + _batch_ai_employer_facts.py 的产物),
按 slug 生成 UPDATE companies SET ... WHERE slug=... AND <列> IS NULL 语句,写
docs/sql/emp-eligibility-facts-data.sql —— **机器生成,不手改**,数据源更新后重跑本脚本覆盖式重生成。

不连库(本任务硬约束):只出文件,由收口人在生产手跑(docs/sql/emp-eligibility-facts.sql 的 DDL 先跑过之后)。

「只填空不覆写」= 每条 UPDATE 都在 WHERE 里加 `<col> IS NULL`(逐列判断,不是整行判断)——
下次重抓/AI 补数据后重跑本脚本,已经人工核实/更早写入的值不会被这轮结果打骨折覆盖;
唯一例外是 founded_year:registry 证据允许覆盖同行的 ai 估算(硬数据 > AI 估算,靠 founded_src 判断
——WHERE (founded_year IS NULL OR founded_src = 'ai') AND 本轮来源='registry' 时才覆盖着写。
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths

IN_FACTS = _paths.PROCESSED / "employer_facts.json"
OUT_SQL = _paths.ROOT / "docs" / "sql" / "emp-eligibility-facts-data.sql"
print(f"IN_FACTS={IN_FACTS}\nOUT_SQL={OUT_SQL}", flush=True)


def esc(s: str) -> str:
    return (s or "").replace("'", "''")


def main() -> None:
    facts: dict[str, dict] = json.loads(IN_FACTS.read_text(encoding="utf-8"))
    lines = [
        "-- 机器生成:etl/clean/_apply_employer_facts.py < data/processed/employer_facts.json",
        "-- 不手改;数据更新后重跑脚本覆盖式重生成。跑序:先跑 docs/sql/emp-eligibility-facts.sql(DDL),",
        "-- 换版确认列已存在,再跑本文件。「只填空」= 每条 UPDATE 逐列 IS NULL 判断,不覆盖已有值",
        "-- (founded_year 现阶段唯一来源=AI 估算,src='ai';registry 路 2026-08-09 起不再产出 founded_year,",
        "--  见 docs/sql/emp-eligibility-facts.sql 头注释——留了 registry 覆盖 ai 的分支代码,现在不会触发)。",
        "",
    ]
    n_public = n_registry = n_ai_founded = n_ai_size = 0
    for slug, rec in sorted(facts.items()):
        sets, wheres = [], []
        if rec.get("sector") == "public":
            sets.append("sector='public'")
            wheres.append("sector IS NULL")
            n_public += 1
        if rec.get("registry_status"):
            sets.append(f"registry_status='{esc(rec['registry_status'])}'")
            wheres.append("registry_status IS NULL")
        if rec.get("founded_year") is not None:
            y = int(rec["founded_year"])
            src = rec.get("founded_src") or ("registry" if rec.get("registry_src") else "ai")
            sets.append(f"founded_year={y}, founded_src='{esc(src)}'")
            if src == "registry":
                wheres.append("(founded_year IS NULL OR founded_src = 'ai')")
                n_registry += 1
            else:
                wheres.append("founded_year IS NULL")
                n_ai_founded += 1
        if rec.get("staff_est") is not None:
            sets.append(f"staff_est={int(rec['staff_est'])}, staff_est_src='{esc(rec.get('staff_est_src', ''))}'")
            wheres.append("staff_est IS NULL")
            n_ai_size += 1
        if not sets:
            continue
        # 每个字段独立一条 UPDATE(各自 WHERE IS NULL),比拼一条大 WHERE 更不容易漏填半行
        for i, (s, w) in enumerate(zip(sets, wheres)):
            lines.append(f"UPDATE companies SET {s} WHERE slug='{esc(slug)}' AND {w};")
    OUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    OUT_SQL.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"done → {OUT_SQL} · public {n_public} · registry founded {n_registry} · "
          f"ai founded {n_ai_founded} · ai size {n_ai_size} · 共 {len(facts)} 家有事实缓存")


if __name__ == "__main__":
    main()
