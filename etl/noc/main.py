"""
noc 域唯一入口(一域一门;2026-08-31 批C 全溶,门直调函数 —— 全溶域的门形,
样张 etl/company/main.py)。

本域是**手动域**:SCHEDULED 为空(官方 NOC 分类一年不动几次,不进定时链;
调度语义见 __init__ docstring),全部步骤走 TOOLS 手动点名。
2026-08-31 批H2 clean/ 横切层清算:三件译名件(原 clean/04f_translate_noc_titles、
04g_short_noc_titles、04g_city_names)零调度零 import,验过产出仍被 09 汇装读(活的),
按「谁的数据谁管」归户进来。2026-08-31 批I3 溶进 functions.py 成段,本域步骤文件清零,
五步全是段函数直调(cities 件当日 Frank 拍板迁 mart 域段20 —— 城市译名是维度装配的料,
批H2 挂的「归属存疑」牌就此结案)。
一律从仓库根执行:
    python etl/noc/main.py --only structure                    # 官方层级 + 三语人话名
    python etl/noc/main.py --only structure --limit 5          # 只翻前 5 条(调试)
    python etl/noc/main.py --only structure --retranslate      # 全部重翻
    python etl/noc/main.py --only descriptions                 # 官方职业名 + 主要职责
    python etl/noc/main.py --only audit                        # 本站分类体检(控制台 + TSV)
    python etl/noc/main.py --only audit --all                  # 体检 + 全量逐条打印
    python etl/noc/main.py --only titles [--limit N]           # NOC 职业名中/韩译名
    python etl/noc/main.py --only short [--lang zh,ko,en]      # NOC 职业名三语窄位短名
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from noc.functions import (
    audit_noc_classes, build_descriptions, build_structure,
    shorten_noc_titles, translate_noc_titles,
)

SCHEDULED = []
"""默认链(调度真相):空 —— 手动域,步骤官方改版/查账才重跑,全在 TOOLS。"""

TOOLS = {
    "structure": build_structure,
    "descriptions": build_descriptions,
    "audit": audit_noc_classes,
    "titles": translate_noc_titles,
    "short": shorten_noc_titles,
}
"""全部可 --only 点名的步(本域只有手动件):
  structure     官方层级三级表 + 三语人话名(qwen 逐条翻,FIX/UI_FIX 手写档;撞车只报不改)
  descriptions  516 个 5 位 NOC 的官方名 + 主要职责 + 任职要求(职位弹框数据源)
  audit         逐职业体检本站分类 vs 官方组(2026-08-31 批D 从 ops 拆入;只读,产 TSV)
  titles        NOC 官方职业名 → 中/韩译名(本地 qwen 逐条翻,不过校验留空;原 clean/04f)
  short         NOC 职业名 → 中/韩/英窄位短名,补进同一张 i18n 表(原 clean/04g_short_noc_titles)
titles/short 两件 2026-08-31 批H2 从 clean/ 归户、批I3 溶成 functions 段6/7,产出被 09 汇装读
(noc_titles_i18n.json),不进定时链 —— 官方参考集翻一次永久复用,重跑=手动点名。
(cities 件曾同批归户,2026-08-31 Frank 拍板迁 mart 域 —— 城市译名不是 NOC 的东西。)
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
