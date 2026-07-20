"""grades — E12-08 多维评分档位(1-5)的单一来源(2026-07-20 Frank 拍板)。

全维度 1-5 档,**不加权不合成**(「权重怎么算都不合理,所有维度按 1-5」);
缺数返 None=该维不评(拆解层灰显,禁硬算)。割点=implementation/E12-移民路径引擎/08 附表(已批「按推荐」)。
jsonb 只存 {g: 档, v: 原始值};依据句由前端按 维度×档 走 i18n 三语生成(数据层不存文案)。

职位三维:channel(移民通道)/ salary(薪资质量)/ emp(雇佣质量)
公司四维:sponsor(担保记录)/ active(在库活跃度)/ salary(薪资水平)/ fame(规模知名度)

由 09_build_mart 在行组装处调用(全字段只在 mart 层齐:薪资中位 join、雇佣字段、公司聚合)。
"""
from __future__ import annotations

from datetime import date

# 紧缺职业段(与 08_score.INDEMAND2 同源;两处同改)
INDEMAND2 = {"21", "22", "31", "32", "72", "73", "42"}


# ── 职位三维 ─────────────────────────────────────────────────────

def grade_channel(noc: str | None, teer: int | None, pnp_stream: str | None, pnp_eligible: bool) -> dict:
    """移民通道:5=省具名清单命中 · 4=TEER0-3 且紧缺段 · 3=TEER0-3 · 2=低 TEER 但在紧缺通道清单 · 1=其余/未分类。"""
    if pnp_stream:
        return {"g": 5, "v": pnp_stream}
    if teer is not None and teer <= 3:
        if noc and noc[:2] in INDEMAND2:
            return {"g": 4, "v": f"TEER {teer}"}
        return {"g": 3, "v": f"TEER {teer}"}
    if pnp_eligible:
        return {"g": 2, "v": f"TEER {teer}" if teer is not None else ""}
    return {"g": 1, "v": f"TEER {teer}" if teer is not None else ""}


def grade_salary(salary_annual: float | None, wage_med_annual: float | None) -> dict | None:
    """薪资质量(vs 官方中位 %):≥+20→5 · +5~20→4 · ±5→3 · -15~-5→2 · <-15→1;无中位/无薪资=None 不评。"""
    if not salary_annual or not wage_med_annual:
        return None
    pct = round((salary_annual / wage_med_annual - 1) * 100)
    g = 5 if pct >= 20 else 4 if pct >= 5 else 3 if pct >= -5 else 2 if pct >= -15 else 1
    return {"g": g, "v": pct}


def grade_emp(term: str | None, hours: str | None, direct: bool) -> dict:
    """雇佣质量:永久/全职/直发 三命中→5 · 两→4 · 一→2 · 零→1(跳 3 档;未标注项不计入命中)。"""
    hits = []
    if term == "permanent":
        hits.append("permanent")
    if hours == "full":
        hits.append("full")
    if direct:
        hits.append("direct")
    g = {3: 5, 2: 4, 1: 2, 0: 1}[len(hits)]
    return {"g": g, "v": hits}


def job_grades(noc, teer, pnp_stream, pnp_eligible, salary_annual, wage_med_annual, term, hours, direct) -> tuple[int, dict]:
    """返回 (通道档, score_detail jsonb)。通道档单列下发主表「通道」列;明细走额度 API。"""
    ch = grade_channel(noc, teer, pnp_stream, pnp_eligible)
    detail = {"channel": ch, "salary": grade_salary(salary_annual, wage_med_annual), "emp": grade_emp(term, hours, direct)}
    return ch["g"], detail


# ── 公司四维 ─────────────────────────────────────────────────────

def _quarters_ago(q: str | None) -> int | None:
    """'2025Q4' → 距今几个季度;解析失败 None。"""
    if not q or len(q) < 6 or "Q" not in q.upper():
        return None
    try:
        y, qn = q.upper().split("Q")
        today = date.today()
        cur = today.year * 4 + (today.month - 1) // 3
        return cur - (int(y) * 4 + int(qn) - 1)
    except Exception:  # noqa: BLE001
        return None


def grade_sponsor(skilled: int | None, total: int | None, last_quarter: str | None, aip: bool) -> dict | None:
    """担保记录:5=技能类≥5 且近 4 季 · 4=技能类 1-4 且近 · 3=有记录但仅低薪/较旧(或 AIP 指定无 LMIA) · 2=仅很旧;
    全无记录且非 AIP=None 不评(无记录≠不担保,语义红线)。"""
    skilled = skilled or 0
    total = total or 0
    qa = _quarters_ago(last_quarter)
    recent = qa is not None and qa <= 4
    if total <= 0:
        return {"g": 3, "v": {"aip": True}} if aip else None
    v = {"skilled": skilled, "total": total, "q": last_quarter or "", **({"aip": True} if aip else {})}
    if skilled >= 5 and recent:
        return {"g": 5, "v": v}
    if skilled >= 1 and recent:
        return {"g": 4, "v": v}
    if recent or (qa is not None and qa <= 8):
        return {"g": 3, "v": v}     # 仅低薪类或稍旧(8 季=ESDC 聚合窗)
    return {"g": 2, "v": v}         # 仅很旧记录


def grade_active(open_jobs: int, new30: int) -> dict:
    """在库活跃度:5=≥20 且近 30 天有新 · 4=≥20 或 5-19+新 · 3=5-19 · 2=1-4 · 1=0。"""
    if open_jobs >= 20 and new30 > 0:
        g = 5
    elif open_jobs >= 20 or (open_jobs >= 5 and new30 > 0):
        g = 4
    elif open_jobs >= 5:
        g = 3
    elif open_jobs >= 1:
        g = 2
    else:
        g = 1
    return {"g": g, "v": {"open": open_jobs, "new30": new30}}


def grade_co_salary(avg_pct: float | None) -> dict | None:
    """薪资水平(该司帖面 vs 同 NOC 中位的均值 %):≥+10→5 · +3~10→4 · ±3→3 · -10~-3→2 · <-10→1;无样本=None。"""
    if avg_pct is None:
        return None
    pct = round(avg_pct)
    g = 5 if pct >= 10 else 4 if pct >= 3 else 3 if pct >= -3 else 2 if pct >= -10 else 1
    return {"g": g, "v": pct}


def grade_fame(wiki: bool, provinces: int, open_jobs: int) -> dict:
    """规模知名度:5=维基+多省 · 4=维基 · 3=多省或在库 ≥50 · 2=常规 · 1=极小(在库 ≤1 且单省)。
    (割点表「累计岗」以在库岗数为代理——mart 无历史累计,注记于此。)"""
    multi = provinces >= 2
    if wiki and multi:
        g = 5
    elif wiki:
        g = 4
    elif multi or open_jobs >= 50:
        g = 3
    elif open_jobs <= 1:
        g = 1
    else:
        g = 2
    return {"g": g, "v": {"wiki": wiki, "provs": provinces, "open": open_jobs}}


def company_grades(skilled, total, last_quarter, aip, open_jobs, new30, avg_pct, wiki, provinces) -> tuple[int | None, dict]:
    """返回 (担保档(药丸用,可 None), score_detail jsonb 四维)。"""
    sp = grade_sponsor(skilled, total, last_quarter, aip)
    detail = {
        "sponsor": sp,
        "active": grade_active(open_jobs, new30),
        "salary": grade_co_salary(avg_pct),
        "fame": grade_fame(wiki, provinces, open_jobs),
    }
    return (sp["g"] if sp else None), detail
