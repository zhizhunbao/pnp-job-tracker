"""
ee 域唯一入口(一域一门;3 个步骤文件 2026-08-30 批C 全溶进 functions.py,本门直调函数,
不再 subprocess —— 全溶域的门形,样张 etl/company/main.py 与 etl/pnp/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(旧 _steps.py 同款硬闸):
自校失败会 exit 1 的步骤一律钉在末尾(本域是 rules,它压根不进默认链)。
(直调后这条硬闸由 SystemExit 兑现:functions 里的 say_missing 走 sys.exit(1)、
自校抛 SystemExit(原句),都不被 `except Exception` 接住,进程当场退出 1 ——
与旧的「子进程 exit 1 即中止」逐字同义。)
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/ee/main.py                # 默认链(2 步)
    python etl/ee/main.py --only rules   # 单步调试 / 手动工具(见 TOOLS)

⚡ 2026-09-26 晚改判(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」「一单元一容器」):
默认链四步拆成两个调度单元(UNITS:ee = categories → draws、ee_rules = rules → category_rules),一单元一容器一 ping,
容器跑 `--only <单元名>`,单元内一步失败即中止(door 叶)。SCHEDULED 不再是调度真相,只剩手动全跑;
调度声明从 META 改为 __init__ 的 METAS(一单元一条)。
    python etl/ee/main.py --only ee_rules   # 跑一个单元(容器就是这么跑的)
"""
import sys
from itertools import chain
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from ee.functions import build_ircc_ee_categories, build_ircc_ee_category_rules, build_ircc_ee_draws, build_ircc_ee_rules

UNITS = {
    "ee": [("categories", build_ircc_ee_categories), ("draws", build_ircc_ee_draws)],
    "ee_rules": [("rules", build_ircc_ee_rules), ("category_rules", build_ircc_ee_category_rules)],
}
"""调度单元(调度真相,2026-09-26 晚立;Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」
「一单元一容器」,pnp 同批同形)。一单元 = 一个容器(SOURCE = 单元名)= 一个 healthchecks 检查项;
容器跑 `python etl/ee/main.py --only <单元>`,单元内按序跑、**一步失败即中止**(door 叶),哪个单元坏了哪个 ping 红。
声明(role / interval / ping)在 __init__ 的 METAS。
切法:categories / draws 发请求取类别清单与抽选轮次;rules / category_rules 纯读 crawl 缓存、自校失败 exit 1 ——
两组互不依赖,拆开后规则表自校失败只红 ee_rules,不再连带扣 ee 的 ping(下面 09-15 沿革「ee 心跳不发」那种场景)。"""

SCHEDULED = list(chain.from_iterable(UNITS.values()))
"""默认链(不带参数跑 = 各单元的步按 UNITS 顺序拼成一串;一步失败即中止)。
2026-09-26 晚改判:容器不再跑这条链(每个容器只跑自己那个单元,见 UNITS);它只剩「手动全跑一遍」这个用途,
步序与改判前逐项相同(categories → draws → rules → category_rules),下面原文保留 —— 只是分进了各单元。
原文:默认链(调度真相):按序执行,一步抛错即中止本轮。逐步说明:
2026-09-15 rules / category_rules 挂到链尾(Frank「3,那 10 个源也查一下」):两步纯读 crawl 缓存,缓存每小时在刷;
不进链时 crs-grid / fed-eligibility / language-grid 停在 09-06,被 raw/ee/*.json 两天保鲜规则判超期、拖红心跳。
放链尾:自校失败 exit 1 时前两步已落盘,只是本轮记失败、ee 心跳不发(这正是该报的);当日手动各跑一次均通过。
下面 TOOLS 说明里「不进默认链」的理由就此作废,原文保留。

  build_ircc_ee_categories  类别抽选职业清单(httpx 直取,解析为空则保留旧表打 ⚠)
  build_ircc_ee_draws       抽选轮次(IRCC 开放 JSON;byCategory / history / recent 三块)
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
同日晚改判回一步失败即中止(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):门叶改回 fail-fast,本门一字不改;互不相干的步拆成各自的调度单元(各自容器、各自 ping)。
"""

TOOLS = {
    "categories": build_ircc_ee_categories,
    "draws": build_ircc_ee_draws,
    "rules": build_ircc_ee_rules,
    "category_rules": build_ircc_ee_category_rules,
}
"""全部可 --only 点名的步(默认链 2 步 + 一个不进链的手动件)。
不进默认链的那个及其理由:
  rules  联邦 EE 官方口径三表(CRS 计分 / 资格规则 / 语言换算)。纯读 crawl 缓存不发请求,
         节奏跟着 crawl 役走;且它自校失败会 exit 1,进链就会把后面的步骤一起拖掉。
  category_rules  类别抽选「谁有资格」逐类别条文(2026-09-13,把脉页抽选表联邦轮次的门槛钮);同 rules 的理由不进链。
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
