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
    python etl/ircc/main.py                # 默认链(6 步)
    python etl/ircc/main.py --only fees    # 单步调试(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from ircc.functions import (
    build_ircc_difficulty, build_ircc_fees, build_ircc_pgwp_rules, scrape_ircc_stats,
    scrape_statcan_npr, scrape_statcan_tr_prov,
)

SCHEDULED = [
    ("stats", scrape_ircc_stats),
    ("npr", scrape_statcan_npr),
    ("tr_prov", scrape_statcan_tr_prov),
    ("difficulty", build_ircc_difficulty),
    ("pgwp", build_ircc_pgwp_rules),
    ("fees", build_ircc_fees),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。逐步沿革与排序理由(原 STEPS 行内注释
2026-08-30 批C 逐字搬进本 docstring —— 方言律「注释只许 docstring」):

  scrape_ircc_stats       IRCC 官方 XLSX:学签/工签年末存量 + PNP 登陆数 + 新发学签流量
  scrape_statcan_npr      NPR 占总人口比(联邦「临时人口降到 5%」目标的唯一可核验刻度)
  scrape_statcan_tr_prov  StatCan 分省临时居民存量(IRCC 年末存量停在 2024 后的唯一分省刻度)
  build_ircc_difficulty   重算九省移民难度因子(纯算件,消费上面三步的 raw + pnp draws)

↓ 自校失败会 exit 1 的步骤钉在最后:本域是「一步失败就中止本轮」,排前面会把后面的一起拖掉。

  build_ircc_pgwp_rules   联邦 PGWP 规则库(quote-anchored;引用消失即保留旧表 exit 1)
  build_ircc_fees         G8:联邦段官方规费(段落定位+交叉自校硬闸;拆中介报价的原料)
"""

TOOLS = {
    "stats": scrape_ircc_stats,
    "npr": scrape_statcan_npr,
    "tr_prov": scrape_statcan_tr_prov,
    "difficulty": build_ircc_difficulty,
    "pgwp": build_ircc_pgwp_rules,
    "fees": build_ircc_fees,
}
"""全部可 --only 点名的步(与默认链同一份六步,本域没有不进链的手动件)。"""


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
