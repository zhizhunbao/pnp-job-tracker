"""
wages 域:工资与空缺岗位的市场分母(ESDC 中位工资 + StatCan JVWS 空缺岗位)。

三步:build_esdc_wage_medians(年度源,09 拿去算 vs 工资中位)、build_statcan_jvws
(季度源,E14-01 担保率的分母)、build_statcan_jvws_mart(列对齐 jvws_vacancies 表)。

无 META(不自带役,2026-08-30 批D 全溶时保持原状):分域批2 立 __init__ 时本域就没挂
角色,年度/季度源一直是手动跑(`--only` 点名);要挂役请 Frank 拍 role/interval 再加 META。
本 __init__ 零 import(auto_update 域发现会 import 每个 etl/*/__init__,轻门防噪)。
"""
