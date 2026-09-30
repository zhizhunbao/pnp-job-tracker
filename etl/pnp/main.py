"""
pnp 域唯一入口(一域一门;33 个步骤文件 2026-08-30 批B 全溶进 functions.py,本门直调函数,
不再 subprocess —— 全溶域的门形,样张 etl/company/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(旧 _steps.py 同款硬闸):
自校失败会 exit 1 的步骤一律钉在末尾,失败拖不到任何人;排前面会把后面的清单一起拖掉。
(直调后这条硬闸由 SystemExit 兑现:functions 里的 fail_keep_old 走 sys.exit(1),
不被 `except Exception` 接住,进程当场退出 1 —— 与旧的「子进程 exit 1 即中止」逐字同义。)
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/pnp/main.py                     # 默认链(28 步)
    python etl/pnp/main.py --only draws        # 单步调试 / 手动工具(见 TOOLS)

⚡ 2026-09-26 改判(/fe Frank「一步失败不再拖停整轮」):门改为**每步各自兜住**(run_steps)—— 失败那步保留旧表
(各步的硬闸本来就不覆盖)、打 ✗ 留痕,其余步照跑;本轮末尾只要有一步失败仍返回 1,调度器照旧扣 ping、告警照常。
SystemExit 也在门里接住(自校硬闸 fail_keep_old / fail_zh 走 sys.exit(1),不接住就还是一步炸全轮)。
依据:mb_stats 因官方改句自校失败,把链尾 nl_employers / watch_allocations / draw_streams_zh 拖停 10 天
(09-16 → 09-26 三份产物被保鲜闸判超期;同类旧账:pnp 24 步一根绳的 25 天陈账)。
上面「一步失败中止本轮」「exit 1 的步骤钉末尾」两条从此只剩排序习惯,不再是语义;原文保留作沿革。
同日稍后(Frank「推广」)run_steps 纯移动进 door 叶,各域门共用(自测 ChainKeepGoingTest 随迁);本门只剩一行 return。
⚡ 同日晚再改判(Frank「我他妈之前让你拆成多个 docker 你非的合一起」「其中一个失败,其余照跑?那我怎么知道这个失败」):
一条链一个 ping,「其余照跑」把哪步坏了藏进了日志 —— 撤回照跑,door 叶改回一步失败即中止;本域拆成 20 个调度单元
(UNITS:九省各一、抽选九省各一、灰注、名额哨兵),一单元一容器一 ping,容器跑 `--only <单元名>`。
SCHEDULED 不再是调度真相,只剩手动全跑;调度声明从 META 改为 __init__ 的 METAS(一单元一条)。
    python etl/pnp/main.py --only pnp_ab       # 跑一个单元(容器就是这么跑的)
"""
import sys
from itertools import chain
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from pnp.functions import (
    audit_c01_gold, build_ab, build_ab_draws, build_ab_req, build_ab_stats, build_bc, build_bc_draws, build_bc_req,
    build_bc_sirs, build_bc_stats, build_bc_stats_processing, build_mb, build_mb_draws, build_mb_points,
    build_mb_req, build_mb_req_swm, build_mb_stats, build_nb, build_nb_draws, build_nb_req, build_nl, build_nl_draws,
    build_nl_employers, build_nl_points, build_nl_req, build_ns, build_ns_draws, build_ns_req, build_on_draws,
    build_on_points, build_on_req, build_on_stats, build_pe, build_pe_aip, build_pe_draws, build_pe_req,
    build_sk, build_sk_joboffer, fetch_mb_draw_pages,
    fetch_bc_draw_archive,
    build_sk_points, build_sk_req, build_sk_stats, gate_quotes, run_tests,
    scrape_bc_nominations, scrape_ns_allocations, scrape_ns_stats, scrape_pe_iidi, translate_draw_streams,
    watch_on_workforce, watch_prov_allocations,
    scrape_nb_stats, scrape_nl_stats,
)
# 2026-09-29 魁省拆成 pnp/qc 子域(按省拆首例),本门从子域取步骤
from pnp.qc.functions import (
    build_qc_draws, build_qc_french_levels, build_qc_noc_streams, build_qc_peq_req, build_qc_req, build_qc_stats,
    run_qc_tests,
)

UNITS = {
    "pnp_ab": [("ab", build_ab), ("ab_req", build_ab_req), ("ab_stats", build_ab_stats)],
    "pnp_bc": [("bc", build_bc), ("bc_req", build_bc_req), ("bc_sirs", build_bc_sirs), ("bc_stats", build_bc_stats),
               ("bc_nominations", scrape_bc_nominations)],
    "pnp_sk": [("sk", build_sk), ("sk_joboffer", build_sk_joboffer), ("sk_points", build_sk_points),
               ("sk_req", build_sk_req), ("sk_stats", build_sk_stats)],
    "pnp_mb": [("mb", build_mb), ("mb_req", build_mb_req), ("mb_points", build_mb_points),
               ("mb_stats", build_mb_stats)],
    "pnp_ns": [("ns", build_ns), ("ns_req", build_ns_req), ("ns_stats", scrape_ns_stats),
               ("ns_allocations", scrape_ns_allocations)],
    "pnp_nb": [("nb", build_nb), ("nb_req", build_nb_req), ("nb_stats", scrape_nb_stats)],
    "pnp_nl": [("nl", build_nl), ("nl_req", build_nl_req), ("nl_points", build_nl_points),
               ("nl_employers", build_nl_employers), ("nl_stats", scrape_nl_stats)],
    "pnp_pe": [("pe", build_pe), ("pe_aip", build_pe_aip), ("pe_req", build_pe_req), ("pe_iidi", scrape_pe_iidi)],
    "pnp_on": [("on_workforce", watch_on_workforce), ("on_req", build_on_req), ("on_points", build_on_points),
               ("on_stats", build_on_stats)],
    "pnp_qc": [("qc_req", build_qc_req), ("qc_peq_req", build_qc_peq_req), ("qc_stats", build_qc_stats),
               ("qc_noc_streams", build_qc_noc_streams), ("qc_french_levels", build_qc_french_levels)],
    "pnp_draws_ab": [("draws_ab", build_ab_draws)],
    "pnp_draws_bc": [("draws_bc", build_bc_draws)],
    "pnp_draws_mb": [("draws_mb", build_mb_draws)],
    "pnp_draws_nb": [("draws_nb", build_nb_draws)],
    "pnp_draws_nl": [("draws_nl", build_nl_draws)],
    "pnp_draws_ns": [("draws_ns", build_ns_draws)],
    "pnp_draws_on": [("draws_on", build_on_draws)],
    "pnp_draws_pe": [("draws_pe", build_pe_draws)],
    "pnp_draws_qc": [("draws_qc", build_qc_draws)],
    "pnp_drawzh": [("draw_streams_zh", translate_draw_streams)],
    "pnp_watch": [("watch_allocations", watch_prov_allocations)],
}
"""调度单元(调度真相,2026-09-26 晚立;Frank「我他妈之前让你拆成多个 docker 你非的合一起」「其中一个失败,其余照跑?
那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」「一单元一容器」「抽选按省拆」)。
一单元 = 一个容器(SOURCE = 单元名)= 一个 healthchecks 检查项;容器跑 `python etl/pnp/main.py --only <单元>`,
单元内按序跑、**一步失败即中止**(door 叶),哪个单元坏了哪个 ping 红。声明(role / interval / ping)在 __init__ 的 METAS。
切法:一省的清单 / 门槛 / 分值 / 统计同一个官方来源一个单元(省内步骤无数据依赖,同站坏了一起坏);各省抽选页
另成一省一单元(一省一份 draws-<省>.json,见 functions.put_prov_draws);两件跨省的各成一单元 ——
pnp_drawzh 盯九个抽选单元的轮次标记(新流名一进来就翻),pnp_watch 只读配额表 / crawl 缓存 / news。
手动件(TOOLS 里不进任何单元的)归属:mb_req_swm、mb_draw_pages 随 pnp_mb 的来源,bc_stats_processing、
bc_draw_archive 随 pnp_bc 的来源;c01_gold、gate_quotes、test 是审计 / 取证 / 自测,不进任何单元。"""

SCHEDULED = list(chain.from_iterable(UNITS.values()))
"""默认链(不带参数跑 = 各单元的步按 UNITS 顺序拼成一串;一步失败即中止)。
2026-09-26 晚改判:容器不再跑这条链(每个容器只跑自己那个单元,见 UNITS);它只剩「手动全跑一遍」这个用途,
下面整段沿革与排序理由原文保留 —— 步名与函数一一对应,只是分进了各单元。
原文:默认链(调度真相):按序执行,一步抛错即中止本轮。逐步沿革与排序理由(原 STEPS 行内注释
2026-08-30 批B 逐字搬进本 docstring —— 方言律「注释只许 docstring」):
2026-09-15 mb_stats / nl_employers 从手动件挂进链(watch 哨兵之前;Frank「3,那 10 个源也查一下」):两步纯读 crawl 缓存
不发请求,缓存每小时在刷;不进链时两份产物停在 08-30,被 raw/pnp/*.json 两天保鲜规则判超期、拖红心跳。当日手动各跑一次均通过。
另外四个手动件 on_stats / mb_points / nl_points / sk_joboffer 会打官网,进不进链待 Frank 拍。
2026-09-23 draw_streams_zh 从手动件挂进链尾(Frank「这个如果没有中文翻译也要加 AI 自动翻译吧」):只翻缓存里没有的
通道名(本地 Ollama),新通道名下一轮汇装就带中文;校验没过 / 超时的留到下一轮再翻。钉在最末:盒子不在线时只拖它自己。
2026-09-26 on_workforce 守望挂进链(/fe Frank「安省劳动力优先清单感觉是死掉了」→「你建议怎么弄」→ lead 建议守望):
纯读 crawl 缓存的 ON 流页,举证原句还在就刷人工表 on-workforce-priority.json 的日期,不在只留痕;自身失败不拦役,
所以排在具名清单一组的尾巴、所有硬闸步之前(排后面会被 mb_stats 这类自校失败连带拖停,表就假性超期)。
同日 draws 步多收两省:NS 月度选取人数、QC PSTQ 邀请(都只读 crawl 缓存,QC 不属 PNP)。
2026-09-26 四个手动件 sk_joboffer / on_stats / mb_points / nl_points 挂进链尾(Frank 定保鲜标准「我现在职位是小时更新。
其他最次也是日更」—— 上面 09-15 那句「进不进链待 Frank 拍」就此拍定):四份产物停在 08-30 / 09-09,被两天保鲜规则判超期。
打官网的量每轮 +10 次(ontario.ca 1、web.archive.org 4、immigratemanitoba 1、gov.nl.ca 2、publications.saskatchewan.ca 2)。
排在 draw_streams_zh 之后:后三个自校失败会 exit 1,钉最末只拖它们自己;sk_joboffer 失败不退出,排在三者前面。
2026-09-26 同日门改判(Frank「一步失败不再拖停整轮」,见文件头):任一步失败不再中止本轮 —— 上面各处「排末尾免得
拖累后面」的排序理由从此只剩习惯,不再是语义;顺序仍保留(先具名清单、后门槛 / 统计,出事时日志好读)。

  build_ab               AB AAIP(实时,exclusion 排除式)
  build_bc               BC 2026 新政 Care/Build 清单(实时,2026-07-25 接入;旧 tech 定向 2024-12 关)
  build_sk               SK SINP 三通道(实时)
  build_ns               NS 两通道(实时)
  build_mb               MB MPNP 在需职业 + 乡镇在需(实时,E6-09;旧「MB 无清单」假设已纠正)
  build_nb               NB 不受理职业两表(实时,E6-09;叠加式排除 overlay)
  build_nl               NL 优先处理职位(2026-08-03;职位名文本非 NOC,不参与打分)
  build_pe               PE 在需职业 8 个(2026-08-03;走官方指南 PDF——PEI 网页在 Radware 后面)
  watch_on_workforce     ON 劳动力优先表守望(2026-09-26;原句在 → 刷人工表日期,不在 → ✗ 留痕;不拦役)
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

  2026-09-29 九省门槛卡接齐后注(Frank「都接上,开工吧」):上面这些 *_req 行(连同 E13 的 BC / ON 两行)只记起步时的
  范围,之后各步陆续补抓(执照、学历、打分表最低分、工资……),现状以各 build_*_req 的 docstring 为准,
  实际抽到哪些因素看 data/mart/pnp_requirements.json 的 factor 列 —— 不在这里再抄一份。

↓ 官方运营统计(2026-08-03,Frank「官方没有数据么」问出来的;此前误断言「分母没有省公布」):
  「等多久 / 还剩多少名额 / 被捞概率」的官方答案。同为硬闸自校,失败保留旧表。

  build_sk_stats         SINP:季度处理时长 + 配额三档 YTD(日更)+ 优先/受限行业
  build_ab_stats         AAIP:逐 stream 配额/已发/剩余 + 积压游标 + **EOI 池人数**(分母!)+ 64 轮抽选史
  build_bc_stats         BC PNP:注册池 **SIRS 分数分布**(三省分母里颗粒度最细;与 build_draws 同页,分工见段头)

↓ 2026-08-31 批D(ops 拆散归各域)收编两步,接过原 ops 周更役的链尾语义;
  **本域 META 同时接过 pnp 角色的 ping 权**(原在 ops):

  scrape_ns_stats        NS 已发提名数(省开放数据 Socrata,与 ns_allocations 同平台;2026-09-08 把脉页缺行)
  scrape_bc_nominations  BC 已发提名数(官方年度 Statistical Report PDF 的 Total 行;同日同因)
  scrape_pe_iidi         PE 配额(自然年)与已发提名(财年)—— 省 IIDI 年报 PDF(2026-09-09,PE 官网在墙后但 PDF 直链不在)
  scrape_nb_stats        NB 往年已发提名(自然年)—— PETL 年报 PDF 的 KPI 表(2026-09-29,pnp_nb 单元末尾;AIP 分列不并入)
  scrape_nl_stats        NL 往年提名人数(自然年,单位人)—— IPGS 年报 PDF 原句(2026-09-29,pnp_nl 单元末尾;不进按证书的已发提名)
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
    "pe_aip": build_pe_aip,
    "on_workforce": watch_on_workforce,
    "draws_ab": build_ab_draws,
    "draws_bc": build_bc_draws,
    "draws_mb": build_mb_draws,
    "draws_nb": build_nb_draws,
    "draws_nl": build_nl_draws,
    "draws_ns": build_ns_draws,
    "draws_on": build_on_draws,
    "draws_pe": build_pe_draws,
    "draws_qc": build_qc_draws,
    "qc_req": build_qc_req,
    "qc_peq_req": build_qc_peq_req,
    "qc_stats": build_qc_stats,
    "qc_noc_streams": build_qc_noc_streams,
    "qc_french_levels": build_qc_french_levels,
    "mb_draw_pages": fetch_mb_draw_pages,
    "bc_draw_archive": fetch_bc_draw_archive,
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
    "ns_stats": scrape_ns_stats,
    "bc_nominations": scrape_bc_nominations,
    "pe_iidi": scrape_pe_iidi,
    "nb_stats": scrape_nb_stats,
    "nl_stats": scrape_nl_stats,
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
    "test": run_tests,
    "test_qc": run_qc_tests,
}
"""全部可 --only 点名的步(默认链 28 步 + 不进链的手动件)。
2026-09-26 晚按省拆:原 draws 一步(九省一份 draws.json)拆成 draws_ab … draws_qc 九步,各属一个抽选单元;
`--only draws` 仍能一次跑完九省(子串命中)。点名单元(pnp_ab 这类整名)先于本表匹配,见 main。
不进默认链的十个及其理由:
  bc_stats_processing  只重算 BC 处理时长(纯读 crawl 缓存;原 --processing-only 开关)
  mb_req_swm           只重算 MB SWM 在职时长(纯读 crawl 缓存;原 --swm-only 开关)
  on_stats             ON 运营统计(逐年页 + 官方重定向复核)
  mb_stats             MB 运营统计(纯读 crawl 缓存)
  mb_points            MB EOI 分值表(实抓优先、缓存兜底)
  nl_points            NL EE 分值表(Annex A PDF)
  nl_employers         NL 指定雇主名录(纯读 crawl 缓存,不发请求)
  sk_joboffer          SK Job Offer 排除清单(另一张 PDF)
                       —— mb_stats / nl_employers 2026-09-15 起、on_stats / mb_points / nl_points / sk_joboffer
                       2026-09-26 起进默认链(见 SCHEDULED 沿革),这里仍可单跑
  draw_streams_zh      抽选流名中文灰注(本地 Ollama,批量翻译不进定时链)
                       —— 2026-09-23 起进默认链尾(只翻缓存里没有的,见 SCHEDULED 沿革),这里仍可单跑
  watch_allocations    名额公告哨兵(只提醒不写表,自身失败不拦役;2026-08-31 批D 起进默认链尾)
  c01_gold             C4 金标审计:案例 C01 的数字必须能从 mart 查出(批D 自 ops 收编,手动)
  gate_quotes          门槛取证器:13 条通道三类闸的官方候选原句(批D 收编,手动;
                       可再跟通道名只扫点名的,如 --only gate_quotes PE-sw)
  mb_draw_pages        MB 抽选索引第 2..5 页进 crawl 缓存(2026-09-26 抽选补全;只补历史,新轮由 draws 首页实抓跟上)
  bc_draw_archive      BC 逐年存档 PDF(2025)进 crawl 层(同日;过去年份不变,不进定时链)
  test                 本域自测(2026-09-26;unittest,不联网不写仓):ON 劳动力优先表守望判定
                       (门循环的自测随 run_steps 搬去 door 叶)
  test_qc              魁省子域自测(2026-09-29;PSTQ 逐档解析的金标 / 拒猜 / 变异探针;`--only test` 连同本域一起跑)
"""


def main() -> int:
    """跑默认链、点名的调度单元(UNITS,名字整名命中;容器走这条)或 --only 点名的单步;返回进程退出码。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        if args[1] in UNITS:
            return run_steps(UNITS[args[1]])
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
    return run_steps(todo)


if __name__ == "__main__":
    sys.exit(main())
