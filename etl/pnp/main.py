"""
pnp 域唯一入口(一域一门;33 个步骤文件 2026-08-30 批B 全溶进 functions.py,本门直调函数,
不再 subprocess —— 全溶域的门形,样张 etl/company/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(旧 _steps.py 同款硬闸):
自校失败会 exit 1 的步骤一律钉在末尾,失败拖不到任何人;排前面会把后面的清单一起拖掉。
(直调后这条硬闸由 SystemExit 兑现:functions 里的 fail_keep_old 走 sys.exit(1),
不被 `except Exception` 接住,进程当场退出 1 —— 与旧的「子进程 exit 1 即中止」逐字同义。)
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/pnp/main.py                     # 默认链(25 步)
    python etl/pnp/main.py --only draws        # 单步调试 / 手动工具(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from pnp.functions import (
    audit_c01_gold, build_ab, build_ab_req, build_ab_stats, build_bc, build_bc_req, build_bc_sirs,
    build_bc_stats, build_bc_stats_processing, build_draws, build_mb, build_mb_points,
    build_mb_req, build_mb_req_swm, build_mb_stats, build_nb, build_nb_req, build_nl,
    build_nl_employers, build_nl_points, build_nl_req, build_ns, build_ns_req, build_on_points,
    build_on_req, build_on_stats, build_pe, build_pe_req, build_sk, build_sk_joboffer,
    build_sk_points, build_sk_req, build_sk_stats, gate_quotes,
    scrape_ns_allocations, translate_draw_streams, watch_prov_allocations,
)

SCHEDULED = [
    ("ab", build_ab),
    ("bc", build_bc),
    ("sk", build_sk),
    ("ns", build_ns),
    ("mb", build_mb),
    ("nb", build_nb),
    ("nl", build_nl),
    ("pe", build_pe),
    ("draws", build_draws),
    ("ns_allocations", scrape_ns_allocations),
    ("bc_req", build_bc_req),
    ("on_req", build_on_req),
    ("on_points", build_on_points),
    ("bc_sirs", build_bc_sirs),
    ("sk_points", build_sk_points),
    ("ab_req", build_ab_req),
    ("sk_req", build_sk_req),
    ("mb_req", build_mb_req),
    ("ns_req", build_ns_req),
    ("nb_req", build_nb_req),
    ("pe_req", build_pe_req),
    ("nl_req", build_nl_req),
    ("sk_stats", build_sk_stats),
    ("ab_stats", build_ab_stats),
    ("bc_stats", build_bc_stats),
    ("watch_allocations", watch_prov_allocations),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。逐步沿革与排序理由(原 STEPS 行内注释
2026-08-30 批B 逐字搬进本 docstring —— 方言律「注释只许 docstring」):

  build_ab               AB AAIP(实时,exclusion 排除式)
  build_bc               BC 2026 新政 Care/Build 清单(实时,2026-07-25 接入;旧 tech 定向 2024-12 关)
  build_sk               SK SINP 三通道(实时)
  build_ns               NS 两通道(实时)
  build_mb               MB MPNP 在需职业 + 乡镇在需(实时,E6-09;旧「MB 无清单」假设已纠正)
  build_nb               NB 不受理职业两表(实时,E6-09;叠加式排除 overlay)
  build_nl               NL 优先处理职位(2026-08-03;职位名文本非 NOC,不参与打分)
  build_pe               PE 在需职业 8 个(2026-08-03;走官方指南 PDF——PEI 网页在 Radware 后面)
  build_draws            E6-04 省抽选事实(BC/AB/MB+ON通告;无 occupations 键,08 扫表跳过)
  scrape_ns_allocations  NS 官方年度配额(唯一上开放平台的省;沿革:原 ircc 役搭车,月→周无害)

↓ 自校失败会 exit 1 的步骤一律排在最后:本域是「一步失败就中止本轮」,
  排前面会把后面的清单一起拖掉(build_bc_sirs / build_sk_points 同理,曾因此长期手动)。

  build_bc_req           E13-01 BC 官方门槛(语言/最低收入/经验/雇主侧;解析不全则保留旧表 exit 1)
  build_on_req           E13-02 ON/OINP 门槛(雇主侧经营年限/营业额/雇员数 + 技工语言分档;同上)
  build_on_points        E12-09 第三个省:ON EOI 打分表(自校同上)

2026-08-03 Frank 立铁律「抓完就要 docker 定时跑,不是抓一次完事」→ 这两个不再手动:
它们自校失败会 exit 1 中止本轮,所以钉在**最末尾**,失败也拖不到任何人:

  build_bc_sirs          BC SIRS 分值表(手动 → 入役,2026-08-03)
  build_sk_points        SINP 分值表(手动 → 入役,2026-08-03)

↓ B1-1(2026-08-03):其余七省的官方门槛(语言/经验/雇主侧)。QC 走自有体系不属 PNP,
  所以「其余八省」实际是七个。全部照 build_bc_req 的硬闸:解析不全 → 保留旧表 + exit 1。
  ⚠️ 本域一步失败即中止本轮 → 排在这里的七步是**串在同一根绳上**的:AB 挂了,后面六个
  本轮不会跑(各自保留旧表,不会写坏数据)。这正是 B3-1「新鲜度告警」盯的场景(哨兵在 ops 域)。

  build_ab_req           AAIP AOS:语言按 TEER + 33102 单档、经验 24 个月
  build_sk_req           SINP 主线:CLB 4 + 近 10 年 1 年经验(两页交叉校验)
  build_mb_req           MPNP:**逐职业** Minimum CLB(158 个)+ TEER 4/5 下限
  build_ns_req           NSNP:指南 PDF(链接从通道页现取)语言两档 + 经验 + 雇主年限
  build_nb_req           NBPNP:三份 pathway 指南 PDF 互校,CLB 4
  build_pe_req           PEI Workforce:指南 PDF,CLB 4 + TEER 0-3 经验 24 个月
  build_nl_req           NLPNP:TEER 4/5 要 CLB 4、TEER 0-3 免考(档位算出来的)

↓ 官方运营统计(2026-08-03,Frank「官方没有数据么」问出来的;此前误断言「分母没有省公布」):
  「等多久 / 还剩多少名额 / 被捞概率」的官方答案。同为硬闸自校,失败保留旧表。

  build_sk_stats         SINP:季度处理时长 + 配额三档 YTD(日更)+ 优先/受限行业
  build_ab_stats         AAIP:逐 stream 配额/已发/剩余 + 积压游标 + **EOI 池人数**(分母!)+ 64 轮抽选史
  build_bc_stats         BC PNP:注册池 **SIRS 分数分布**(三省分母里颗粒度最细;与 build_draws 同页,分工见段头)

↓ 2026-08-31 批D(ops 拆散归各域)收编两步,接过原 ops 周更役的链尾语义;
  **本域 META 同时接过 pnp 角色的 ping 权**(原在 ops):

  watch_allocations      名额公告哨兵(只提醒不写表;自身失败不拦役 —— 函数体内自 catch)
  check_freshness        曾钉本链最末(B3-1 哨兵);2026-08-31 批O 迁 sched 的 ping 门口
                         (全域保鲜闸,source_manifest 退役、契约进各域 META),本链不再带它
"""

TOOLS = {
    "ab": build_ab,
    "bc": build_bc,
    "sk": build_sk,
    "ns": build_ns,
    "mb": build_mb,
    "nb": build_nb,
    "nl": build_nl,
    "pe": build_pe,
    "draws": build_draws,
    "ns_allocations": scrape_ns_allocations,
    "bc_req": build_bc_req,
    "on_req": build_on_req,
    "on_points": build_on_points,
    "bc_sirs": build_bc_sirs,
    "sk_points": build_sk_points,
    "ab_req": build_ab_req,
    "sk_req": build_sk_req,
    "mb_req": build_mb_req,
    "mb_req_swm": build_mb_req_swm,
    "ns_req": build_ns_req,
    "nb_req": build_nb_req,
    "pe_req": build_pe_req,
    "nl_req": build_nl_req,
    "sk_stats": build_sk_stats,
    "ab_stats": build_ab_stats,
    "bc_stats": build_bc_stats,
    "bc_stats_processing": build_bc_stats_processing,
    "on_stats": build_on_stats,
    "mb_stats": build_mb_stats,
    "mb_points": build_mb_points,
    "nl_points": build_nl_points,
    "nl_employers": build_nl_employers,
    "sk_joboffer": build_sk_joboffer,
    "draw_streams_zh": translate_draw_streams,
    "watch_allocations": watch_prov_allocations,
    "c01_gold": audit_c01_gold,
    "gate_quotes": gate_quotes,
}
"""全部可 --only 点名的步(默认链 25 步 + 不进链的手动件)。
不进默认链的十个及其理由:
  bc_stats_processing  只重算 BC 处理时长(纯读 crawl 缓存;原 --processing-only 开关)
  mb_req_swm           只重算 MB SWM 在职时长(纯读 crawl 缓存;原 --swm-only 开关)
  on_stats             ON 运营统计(逐年页 + 官方重定向复核)
  mb_stats             MB 运营统计(纯读 crawl 缓存)
  mb_points            MB EOI 分值表(实抓优先、缓存兜底)
  nl_points            NL EE 分值表(Annex A PDF)
  nl_employers         NL 指定雇主名录(纯读 crawl 缓存,不发请求)
  sk_joboffer          SK Job Offer 排除清单(另一张 PDF)
  draw_streams_zh      抽选流名中文灰注(本地 Ollama,批量翻译不进定时链)
  watch_allocations    名额公告哨兵(只提醒不写表,自身失败不拦役;2026-08-31 批D 起进默认链尾)
  c01_gold             C4 金标审计:案例 C01 的数字必须能从 mart 查出(批D 自 ops 收编,手动)
  gate_quotes          门槛取证器:13 条通道三类闸的官方候选原句(批D 收编,手动;
                       可再跟通道名只扫点名的,如 --only gate_quotes PE-sw)
"""


def main() -> int:
    """跑默认链或 --only 点名的单步;返回进程退出码。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        picked = []
        for k, f in TOOLS.items():
            if args[1] in k:
                picked.append((k, f))
        if len(picked) == 0:
            say(f"✗ --only {args[1]} 没命中(可选:{'/'.join(TOOLS)})")
            return 1
        todo = picked
    else:
        todo = SCHEDULED
    for name, fn in todo:
        say(f"→ {name}")
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            err(name, e)
            return 1
    say(f"✓ 本域 {len(todo)} 步全过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
