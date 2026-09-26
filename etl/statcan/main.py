"""
statcan 域唯一入口(一域一门;三步全是 functions.py 的段函数直调,零步骤文件 ——
全溶域的门形,样张 etl/ee/main.py 与 etl/eligibility/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**:
自校失败会 exit 1 的步骤一律钉在末尾(本域是 cubes:任一张表未更新就让本轮红)。
(直调后这条硬闸由 SystemExit 兑现:functions 里 scrape_statcan_cubes 走 sys.exit(1),
不被 `except Exception` 接住,进程当场退出 1。)
2026-09-06 立域:npr_share / tr_prov 两步自 ircc 域 main 的 SCHEDULED/TOOLS 搬来
(产物路径不动,仍写 raw/ircc/);cubes 是新增(把脉页省份段四张宏观表 → raw/statcan/)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/statcan/main.py                # 默认链(3 步)
    python etl/statcan/main.py --only cubes   # 单步调试(见 TOOLS)
    python etl/statcan/main.py --only naics   # NAICS 类目表(手动件,不进定时链)

⚡ 2026-09-26 改判(/fe Frank「一步失败不再拖停整轮」,与 pnp 门同批):门改为**每步各自兜住**(run_steps)——
失败那步保留旧表、打 ✗ 留痕,其余步照跑;本轮末尾只要有一步失败仍返回 1(扣 ping,告警照常)。
依据:cubes 每轮总有一两张表撞上 StatCan 的握手断连(根因同日修:请求改走 TLS 1.2 封顶,见 functions 文件头)→
exit 1 → 链尾 city 从 09-22 起一轮没跑,city_macro 停在 09-22。上面「一步失败中止本轮」「exit 1 钉末尾」两条从此只剩
排序习惯,原文保留作沿革。同日 naics 进默认链(见 TOOLS 沿革),上一行「不进定时链」作废。
同日稍后(Frank「推广」)run_steps 纯移动进 door 叶,各域门共用;本门只剩一行 return。
⚡ 同日晚再改判(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」「一单元一容器」):
一条链一个 ping,「其余照跑」把哪步坏了藏进了日志 —— 撤回照跑,door 叶改回一步失败即中止;本域拆成 2 个调度单元
(UNITS:statcan = npr_share → tr_prov → cubes → city、statcan_naics = naics),一单元一容器一 ping,
容器跑 `--only <单元名>`。SCHEDULED 不再是调度真相,只剩手动全跑;调度声明从 META 改为 __init__ 的 METAS(一单元一条)。
    python etl/statcan/main.py --only statcan   # 跑一个单元(容器就是这么跑的)
"""
import sys
from itertools import chain
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from statcan.functions import (scrape_statcan_city, scrape_statcan_cubes, scrape_statcan_naics, scrape_statcan_npr,
                               scrape_statcan_tr_prov)

UNITS = {
    "statcan": [("npr_share", scrape_statcan_npr), ("tr_prov", scrape_statcan_tr_prov),
                ("cubes", scrape_statcan_cubes), ("city", scrape_statcan_city)],
    "statcan_naics": [("naics", scrape_statcan_naics)],
}
"""调度单元(调度真相,2026-09-26 晚立;Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」
「一单元一容器」,pnp 同批同形)。一单元 = 一个容器(SOURCE = 单元名)= 一个 healthchecks 检查项;
容器跑 `python etl/statcan/main.py --only <单元>`,单元内按序跑、**一步失败即中止**(door 叶),哪个单元坏了哪个 ping 红。
声明(role / interval / ping)在 __init__ 的 METAS。
切法:npr_share / tr_prov / cubes / city 四步是按期发布的宏观 / 城市刻度,一单元;naics 是分类标准类目表
(五年一修,2026-09-26 才进链),另成一单元 —— 换版时它自校失败只红它自己的 ping,不连带宏观表。"""

SCHEDULED = list(chain.from_iterable(UNITS.values()))
"""默认链(不带参数跑 = 各单元的步按 UNITS 顺序拼成一串;一步失败即中止)。
2026-09-26 晚改判:容器不再跑这条链(每个容器只跑自己那个单元,见 UNITS);它只剩「手动全跑一遍」这个用途,
步序与改判前逐项相同(npr_share → tr_prov → cubes → city → naics),下面原文保留 —— 只是分进了各单元。
原文:默认链(调度真相):按序执行,一步抛错即中止本轮。逐步说明:

  scrape_statcan_npr      NPR 占总人口比(联邦「临时人口降到 5%」目标的唯一可核验刻度)
  scrape_statcan_tr_prov  分省临时居民存量(IRCC 年末存量停在 2024 后的唯一分省刻度)

↓ 自校失败会 exit 1 的步骤钉在最后:排前面会把后面的一起拖掉。

  scrape_statcan_cubes    四张宏观表(人口 / 临时居民 / GDP / 失业率)→ raw/statcan/<pid>.json
  scrape_statcan_city     城市刻度(CSD 人口 + CMA 失业率;2026-09-11 城市段批二)→ city_macro.json
  scrape_statcan_naics    NAICS 类目表 → raw/statcan/naics.json(2026-09-26 进链,理由见 TOOLS 沿革)
"""

TOOLS = {
    "npr_share": scrape_statcan_npr,
    "tr_prov": scrape_statcan_tr_prov,
    "cubes": scrape_statcan_cubes,
    "city": scrape_statcan_city,
    "naics": scrape_statcan_naics,
}
"""全部可 --only 点名的步。前四步与默认链同一份;naics(2026-09-18 雇主分类批二:NAICS 类目表 → raw/statcan/naics.json)
只在这里 —— 分类标准五年一修(2022 v1.0,下一版 2027),不值得每轮重抓,换版时手动点名。
2026-09-26 改判进默认链(Frank 定保鲜标准「我现在职位是小时更新。其他最次也是日更」):naics.json 在 raw/statcan/*.json
保鲜通配里,不进链就只能靠人手点名续期(停在 09-18);一天一发 CSV GET,量可忽略。换版时自校会拦(条数 / 译名表对不上
即抛、保留旧表),比手动点名更早发现。"""


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
