"""audit_c01_gold — C4 金标审计:案例 C01(马龙/木匠/72310)手工核对过的数字必须能从 mart 直接查出。

案例库=验收标尺(docs/design/案例C01-马龙木匠路径-路径分析-20260805.md):任何一条不过 = 数据层 bug,
不许改金标凑数;金标本身被数据推翻时(如 645→639 家)先逐页核实、改案例文档、再改这里(带修正注记)。
C5 判定层(pathVerdict)沿用同一套断言当单测底座。

  IN : data/mart/{pnp_score_factors,pnp_draws,pnp_occupations,designated_employers,pnp_ops_stats}.json
  OUT: 无(退出码 0=全绿;1=有红,逐条打印)

Usage:  uv run python etl/audit_c01_gold.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 _paths 等共享库
import _paths

MART = _paths.MART

fails: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(f"  {'✓' if ok else '✗'} {name}" + (f"  ({detail})" if detail else ""))
    if not ok:
        fails.append(name)


def load(name: str) -> list:
    return json.loads((MART / f"{name}.json").read_text(encoding="utf-8"))


def main() -> None:
    # ── 1. MPNP EOI 积分表(W2):马龙估分 695 的每个组件都在表里 ─────────────────
    sf = [r for r in load("pnp_score_factors") if r["province"] == "MB"]
    print(f"pnp_score_factors MB:{len(sf)} 行")

    def pts(factor: str, points: int, label_has: str = "") -> bool:
        return any(r for r in sf if r["factor"] == factor and r["points"] == points
                   and label_has.lower() in (r["label"] or "").lower())

    check("MB 年龄 40 岁档 = 75", pts("age", 75))
    check("MB 工作 1 年档 = 40", pts("work", 40, "one year"))
    check("MB 两年制学历档 = 100", pts("education", 100, "program of two years"))
    # 语言按单项 CLB 打分:CLB6 每项 20 → 四项 80;CLB8 每项 25 → 100(差 20)
    check("MB 语言 CLB6 单项 = 20(×4=80)", pts("language", 20))
    check("MB 语言 CLB8 单项 = 25(拉满多 20)", pts("language", 25))
    check("MB 适应性 500 满档存在", any(r for r in sf if r["points"] == 500))
    check("MB 风险:外省学习 −100", pts("risk", -100, "studies"))
    check("MB 风险因子上限 −200", any(r for r in sf if r["factor"] == "risk" and r["factorMax"] == -200))
    check("案例合计 695 可复现", 80 + 75 + 40 + 100 + 500 - 100 == 695)

    # ── 2. MB 抽选分流(W1):632 与 825 各自成行,193 分差从此可定量 ────────────────
    dr = load("pnp_draws")
    mb = [r for r in dr if r["province"] == "MB" and r["kind"] == "draw"]
    check("MB #276(2026-07-30)score 632 成行",
          any(r for r in mb if r["drawDate"] == "2026-07-30" and r["score"] == 632))
    check("MB #275(2026-07-16)score 825 成行",
          any(r for r in mb if r["drawDate"] == "2026-07-16" and r["score"] == 825))

    # ── 3. NB 邀请轮次(W1):按类别定向,建筑类 2026 年活跃度可数 ──────────────────
    nb = [r for r in dr if r["province"] == "NB" and r["kind"] == "draw"]
    cons = [r for r in nb if "construction trades" in (r["note"] or "").lower()
            and (r["drawDate"] or "").startswith("2026")]
    check("NB 2026 建筑类轮次 ≥5", len(cons) >= 5, f"实际 {len(cons)} 轮")
    inv = {r["invitations"] for r in cons}
    check("NB 7 月三轮(58/209/114)在列", {58, 209, 114} <= inv, f"命中 {sorted(inv & {58, 209, 114})}")

    # ── 4. SINP 适用范围(W3):排除清单只管 OID/EE,Employment Offer 不排 72310 ────
    occ = load("pnp_occupations")
    sk_excl = [r for r in occ if r["province"] == "SK" and r["type"] == "ineligible"]
    oid_ee = [r for r in sk_excl if r.get("appliesTo") == "OID/EE"]
    check("SK 排除清单 152 条全带 appliesTo=OID/EE", len(oid_ee) == 152, f"实际 {len(oid_ee)}")
    jo = [r for r in sk_excl if r.get("appliesTo") == "Employment Offer"]
    check("SK Job Offer 排除清单已入(14 条)", len(jo) == 14, f"实际 {len(jo)}")
    check("72310 不在 Job Offer 排除清单", not any(r["noc"] == "72310" for r in jo))

    # ── 5. NL 指定雇主(W4):639 家、3 家申报过木工(C01 原文 645/1 已修正) ─────────
    de = [r for r in load("designated_employers") if r["province"] == "NL"]
    check("NL 雇主 639 家", len(de) == 639, f"实际 {len(de)}")
    hits = [r["name"] for r in de if "72310" in (r.get("nocs") or "")]
    check("NL 申报 72310 的 = 3 家", len(hits) == 3, "; ".join(hits)[:90])

    # ── 6. OINP 运营(W5):配额/提名数入库;审理时长=举证过的 not-collected,不设断言 ──
    ops = [r for r in load("pnp_ops_stats") if r["province"] == "ON"]
    check("OINP 2026 配额 14,119",
          any(r for r in ops if r["metric"] == "allocation" and r["value"] == 14119 and r["period"] == "2026"))
    check("OINP 2025 提名数 10,750",
          any(r for r in ops if r["metric"] == "nominations_issued" and r["value"] == 10750 and r["period"] == "2025"))

    print(f"\n{'✓ 金标全绿' if not fails else '✗ ' + str(len(fails)) + ' 条不过:' + ', '.join(fails)}")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
