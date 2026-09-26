"""
crawl 域唯一入口(一域一门;2026-08-30 全溶,门直调 functions 不再 subprocess ——
company 全溶门形)。

默认链 = 全种子探索(政策雷达,1h 一轮)+ urls 哨兵(官方 URL 活性实测,批Q);
ee_categories 是回退工具(ee 域 bs4 直解失效时的浏览器版,手动跑),不进默认链。
一律从仓库根执行:
    python etl/crawl/main.py                       # 默认链(discover 全种子)
    python etl/crawl/main.py --only ee_categories  # 回退工具
    python etl/crawl/main.py --only attended       # 本机:只跑要人点验证的种子(PE),有头、撞验证手点
    python etl/crawl/main.py --only test           # 读门对照自测(新索引读门 vs 旧实现金标;2026-09-26)

⚡ 2026-09-26 晚改判(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」「一单元一容器」):
默认链两步拆成两个调度单元(UNITS:crawl = discover、crawl_urls = urls),一单元一容器一 ping,
容器跑 `--only <单元名>`,单元内一步失败即中止(door 叶)。SCHEDULED 不再是调度真相,只剩手动全跑;
调度声明从 META 改为 __init__ 的 METAS(一单元一条)。
    python etl/crawl/main.py --only crawl_urls      # 跑一个单元(容器就是这么跑的)
"""
import sys
from itertools import chain
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from crawl.functions import check_official_urls, discover_all, discover_attended, run_ee_categories, run_tests

UNITS = {
    "crawl": [("discover", discover_all)],
    "crawl_urls": [("urls", check_official_urls)],
}
"""调度单元(调度真相,2026-09-26 晚立;Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」
「一单元一容器」,pnp 同批同形)。一单元 = 一个容器(SOURCE = 单元名)= 一个 healthchecks 检查项;
容器跑 `python etl/crawl/main.py --only <单元>`,单元内按序跑、**一步失败即中止**(door 叶),哪个单元坏了哪个 ping 红。
声明(role / interval / ping)在 __init__ 的 METAS。
切法:discover(全种子探索 + diff 政策雷达)与 urls(各域 constants 里的官方 URL 活性实测)互不依赖,各成一单元;
手动件 attended / ee_categories / test 不进任何单元。"""

SCHEDULED = list(chain.from_iterable(UNITS.values()))
"""默认链(不带参数跑 = 各单元的步按 UNITS 顺序拼成一串;一步失败即中止)。
2026-09-26 晚改判:容器不再跑这条链(每个容器只跑自己那个单元,见 UNITS);它只剩「手动全跑一遍」这个用途,
步序与改判前逐项相同(discover → urls),下面原文保留 —— 只是分进了各单元。
原文:默认链(调度真相):全种子探索 + diff 政策雷达 → urls 哨兵钉链尾(2026-08-31 批Q:
各域 constants 里的官方 URL 逐条实测,404/410/跨站跳 = 硬红扣 ping;判据见
constants.URLS_DOC —— NB 迁版三周没人发现的答案)。
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
同日晚改判回一步失败即中止(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):门叶改回 fail-fast,本门一字不改;互不相干的步拆成各自的调度单元(各自容器、各自 ping)。
"""

TOOLS = {
    "attended": discover_attended,
    "discover": discover_all,
    "ee_categories": run_ee_categories,
    "urls": check_official_urls,
    "test": run_tests,
}
"""全部可 --only 点名的步(含回退工具)。
attended:只跑要人点验证的种子(PE),**本机**有头浏览器、撞上验证 Frank 手点(2026-09-24;容器里的默认链跳过这类种子)。
test:读门 get_cached_page 对照自测(2026-09-26 提速同批;临时树 + 真 data/crawl 抽样,只读不联网),不进默认链。"""


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
