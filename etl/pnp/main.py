"""
pnp 域入口:十省清单/门槛/分值/运营统计。

一域一门(2026-08-29 Frank「每个域只有一个 main.py」):本文件是本域唯一入口,
STEPS = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(etl/_steps.py 同款硬闸):
自校失败会 exit 1 的步骤一律钉在末尾,失败拖不到任何人;排前面会把后面的清单一起拖掉。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:python etl/pnp/main.py [--only 子串]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 _steps
from _steps import run_steps

STEPS = [
    ["python", "etl/pnp/build_ab.py"],   # AB AAIP(实时,exclusion 排除式)
    ["python", "etl/pnp/build_bc.py"],   # BC 2026 新政 Care/Build 清单(实时,2026-07-25 接入;旧 tech 定向 2024-12 关)
    ["python", "etl/pnp/build_sk.py"],   # SK SINP 三通道(实时)
    ["python", "etl/pnp/build_ns.py"],   # NS 两通道(实时)
    ["python", "etl/pnp/build_mb.py"],   # MB MPNP 在需职业 + 乡镇在需(实时,E6-09;旧「MB 无清单」假设已纠正)
    ["python", "etl/pnp/build_nb.py"],   # NB 不受理职业两表(实时,E6-09;叠加式排除 overlay)
    ["python", "etl/pnp/build_nl.py"],   # NL 优先处理职位(2026-08-03;职位名文本非 NOC,不参与打分)
    ["python", "etl/pnp/build_pe.py"],   # PE 在需职业 8 个(2026-08-03;走官方指南 PDF——PEI 网页在 Radware 后面)
    ["python", "etl/pnp/build_draws.py"],  # E6-04 省抽选事实(BC/AB/MB+ON通告;无 occupations 键,08 扫表跳过)
    ["python", "etl/pnp/scrape_ns_allocations.py"],  # NS 官方年度配额(唯一上开放平台的省;沿革:原 ircc 役搭车,月→周无害)
    # ↓ 自校失败会 exit 1 的步骤一律排在最后:本域是「一步失败就中止本轮」,
    #   排前面会把后面的清单一起拖掉(build_bc_sirs / build_sk_points 同理,曾因此长期手动)。
    ["python", "etl/pnp/build_bc_req.py"],  # E13-01 BC 官方门槛(语言/最低收入/经验/雇主侧;解析不全则保留旧表 exit 1)
    ["python", "etl/pnp/build_on_req.py"],     # E13-02 ON/OINP 门槛(雇主侧经营年限/营业额/雇员数 + 技工语言分档;同上)
    ["python", "etl/pnp/build_on_points.py"],  # E12-09 第三个省:ON EOI 打分表(自校同上)
    # 2026-08-03 Frank 立铁律「抓完就要 docker 定时跑,不是抓一次完事」→ 这两个不再手动:
    # 它们自校失败会 exit 1 中止本轮,所以钉在**最末尾**,失败也拖不到任何人。
    ["python", "etl/pnp/build_bc_sirs.py"],    # BC SIRS 分值表(手动 → 入役,2026-08-03)
    ["python", "etl/pnp/build_sk_points.py"],  # SINP 分值表(手动 → 入役,2026-08-03)
    # ↓ B1-1(2026-08-03):其余七省的官方门槛(语言/经验/雇主侧)。QC 走自有体系不属 PNP,
    #   所以「其余八省」实际是七个。全部照 build_bc_req 的硬闸:解析不全 → 保留旧表 + exit 1。
    #   ⚠️ 本域一步失败即中止本轮 → 排在这里的七步是**串在同一根绳上**的:AB 挂了,后面六个
    #   本轮不会跑(各自保留旧表,不会写坏数据)。这正是 B3-1「新鲜度告警」盯的场景(哨兵在 ops 域)。
    ["python", "etl/pnp/build_ab_req.py"],  # AAIP AOS:语言按 TEER + 33102 单档、经验 24 个月
    ["python", "etl/pnp/build_sk_req.py"],  # SINP 主线:CLB 4 + 近 10 年 1 年经验(两页交叉校验)
    ["python", "etl/pnp/build_mb_req.py"],  # MPNP:**逐职业** Minimum CLB(158 个)+ TEER 4/5 下限
    ["python", "etl/pnp/build_ns_req.py"],  # NSNP:指南 PDF(链接从通道页现取)语言两档 + 经验 + 雇主年限
    ["python", "etl/pnp/build_nb_req.py"],  # NBPNP:三份 pathway 指南 PDF 互校,CLB 4
    ["python", "etl/pnp/build_pe_req.py"],  # PEI Workforce:指南 PDF,CLB 4 + TEER 0-3 经验 24 个月
    ["python", "etl/pnp/build_nl_req.py"],  # NLPNP:TEER 4/5 要 CLB 4、TEER 0-3 免考(档位算出来的)
    # ↓ 官方运营统计(2026-08-03,Frank「官方没有数据么」问出来的;此前误断言「分母没有省公布」):
    #   「等多久 / 还剩多少名额 / 被捞概率」的官方答案。同为硬闸自校,失败保留旧表。
    ["python", "etl/pnp/build_sk_stats.py"],  # SINP:季度处理时长 + 配额三档 YTD(日更)+ 优先/受限行业
    ["python", "etl/pnp/build_ab_stats.py"],  # AAIP:逐 stream 配额/已发/剩余 + 积压游标 + **EOI 池人数**(分母!)+ 64 轮抽选史
    ["python", "etl/pnp/build_bc_stats.py"],  # BC PNP:注册池 **SIRS 分数分布**(三省分母里颗粒度最细;与 build_draws 同页,分工见脚本头)
]

if __name__ == "__main__":
    sys.exit(run_steps(STEPS))
