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
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from statcan.functions import (scrape_statcan_city, scrape_statcan_cubes, scrape_statcan_naics, scrape_statcan_npr,
                               scrape_statcan_tr_prov)

SCHEDULED = [
    ("npr_share", scrape_statcan_npr),
    ("tr_prov", scrape_statcan_tr_prov),
    ("cubes", scrape_statcan_cubes),
    ("city", scrape_statcan_city),
    ("naics", scrape_statcan_naics),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。逐步说明:

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
    return run_steps(todo)


if __name__ == "__main__":
    sys.exit(main())
