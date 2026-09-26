"""
ircc 域唯一入口(一域一门;5 个步骤文件 2026-08-30 批C 全溶进 functions.py,本门直调函数,
不再 subprocess —— 全溶域的门形,样张 etl/company/main.py 与 etl/pnp/main.py)。
2026-08-31 批I3:批H2 归户进来的第六件 build_ircc_difficulty.py 也溶进 functions.py 段7,
本域步骤文件清零,六步全是段函数直调。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(旧 _steps.py 同款硬闸):
自校失败会 exit 1 的两步(pgwp / fees)一律钉在末尾,失败拖不到任何人。
(直调后这条硬闸由 SystemExit 兑现:functions 里的 fail_keep_old 走 sys.exit(1),
不被 `except Exception` 接住,进程当场退出 1 —— 与旧的「子进程 exit 1 即中止」逐字同义。)
2026-08-31 批H2:difficulty 一步的 clean/04e 归户成 ircc/build_ircc_difficulty.py,本门随之
从 subprocess 包装改直调(旧判「04e 属清洗横切层不归本域」被消费面复验推翻 —— 沿革全文
现住 functions.py 段7 入口函数的 docstring)。批I3 它进一步溶成 functions.py 的段7:
难度指数是**纯算件**(零网络、只吃前三步落好的 raw),段号接段尾不插回链序位,
`--only difficulty` 照样单跑。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/ircc/main.py                # 默认链(4 步;2026-09-06 段3/段4 搬去 statcan 域后由 6 步减为 4)
    python etl/ircc/main.py --only fees    # 单步调试(见 TOOLS)

⚡ 2026-09-26 晚改判(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」「一单元一容器」):
默认链四步拆成两个调度单元(UNITS:ircc = stats → difficulty、ircc_rules = pgwp → fees),一单元一容器一 ping,
容器跑 `--only <单元名>`,单元内一步失败即中止(door 叶)。SCHEDULED 不再是调度真相,只剩手动全跑;
调度声明从 META 改为 __init__ 的 METAS(一单元一条)。
    python etl/ircc/main.py --only ircc_rules   # 跑一个单元(容器就是这么跑的)
"""
import sys
from itertools import chain
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from ircc.functions import (
    build_ircc_difficulty, build_ircc_fees, build_ircc_pgwp_rules, scrape_ircc_stats,
)

UNITS = {
    "ircc": [("stats", scrape_ircc_stats), ("difficulty", build_ircc_difficulty)],
    "ircc_rules": [("pgwp", build_ircc_pgwp_rules), ("fees", build_ircc_fees)],
}
"""调度单元(调度真相,2026-09-26 晚立;Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」
「一单元一容器」,pnp 同批同形)。一单元 = 一个容器(SOURCE = 单元名)= 一个 healthchecks 检查项;
容器跑 `python etl/ircc/main.py --only <单元>`,单元内按序跑、**一步失败即中止**(door 叶),哪个单元坏了哪个 ping 红。
声明(role / interval / ping)在 __init__ 的 METAS。
切法:stats → difficulty 有数据依赖(难度指数吃 stats 刚落的 raw),同生共死;pgwp / fees 是规则 / 规费抓取、
自校失败 exit 1,与前两步互不依赖,另成一单元(下面「钉在最后」的那两步,拆开后各报各的 ping)。"""

SCHEDULED = list(chain.from_iterable(UNITS.values()))
"""默认链(不带参数跑 = 各单元的步按 UNITS 顺序拼成一串;一步失败即中止)。
2026-09-26 晚改判:容器不再跑这条链(每个容器只跑自己那个单元,见 UNITS);它只剩「手动全跑一遍」这个用途,
步序与改判前逐项相同(stats → difficulty → pgwp → fees),下面原文保留 —— 只是分进了各单元。
原文:默认链(调度真相):按序执行,一步抛错即中止本轮。逐步沿革与排序理由(原 STEPS 行内注释
2026-08-30 批C 逐字搬进本 docstring —— 方言律「注释只许 docstring」):

  scrape_ircc_stats       IRCC 官方 XLSX:学签/工签年末存量 + PNP 登陆数 + 新发学签流量
  build_ircc_difficulty   重算九省移民难度因子(纯算件,消费上面这步的 raw + statcan 域落的
                          分省临时居民存量 + pnp draws)

2026-09-06 段3/段4 搬去 statcan 域(产物路径不动):本链去掉的两步原文照录,现住
etl/statcan/main.py 的 SCHEDULED —— 它们抓的是 StatCan 的表,不是 IRCC 开放数据。

  scrape_statcan_npr      NPR 占总人口比(联邦「临时人口降到 5%」目标的唯一可核验刻度)
  scrape_statcan_tr_prov  StatCan 分省临时居民存量(IRCC 年末存量停在 2024 后的唯一分省刻度)

↓ 自校失败会 exit 1 的步骤钉在最后:本域是「一步失败就中止本轮」,排前面会把后面的一起拖掉。

  build_ircc_pgwp_rules   联邦 PGWP 规则库(quote-anchored;引用消失即保留旧表 exit 1)
  build_ircc_fees         G8:联邦段官方规费(段落定位+交叉自校硬闸;拆中介报价的原料)
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
同日晚改判回一步失败即中止(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):门叶改回 fail-fast,本门一字不改;互不相干的步拆成各自的调度单元(各自容器、各自 ping)。
"""

TOOLS = {
    "stats": scrape_ircc_stats,
    "difficulty": build_ircc_difficulty,
    "pgwp": build_ircc_pgwp_rules,
    "fees": build_ircc_fees,
}
"""全部可 --only 点名的步(与默认链同一份四步,本域没有不进链的手动件)。
2026-09-06:npr / tr_prov 两键随段3/段4 搬去 statcan 域,那边叫 npr_share / tr_prov。"""


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
