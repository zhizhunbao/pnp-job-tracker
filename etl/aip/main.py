"""
aip 域唯一入口(一域一门;全溶域的门形,样张 etl/company/main.py、etl/noc/main.py)。

SCHEDULED = 本域默认链的步骤真相 —— **顺序即语义,一步失败中止本轮**:
  employers  AIP 指定雇主(NL/NB/NS;PE 走 Wayback 快照)
rules 与 flag 不进默认链,在 TOOLS 里:rules 随 crawl 缓存轮次手动重跑(引用核验未过即
exit 1);flag 是 **load 建表链上的一步**(它要排在岗位抓取之后、建表之前,顺序归那条链
排,不能在本域自己的定时轮里抢跑)—— 2026-08-31 批H2 从 clean/05c 归户进来,链上那行由
lead 收口改成 `("python", "etl/aip/main.py", "--only", "flag")`。
本门直调步骤文件的 run(),不是全溶域那种直调 functions.py 段函数(flag 是搬家批迁入件,
方言全溶留后续滚动批;同形先例 etl/ats/main.py)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/aip/main.py                        # 默认链(一步)
    python etl/aip/main.py --only rules           # 单步调试 / 手动工具(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from aip.flag_aip_jobs import run as flag_aip_jobs
from aip.functions import build_aip_rules, scrape_aip_employers

SCHEDULED = [
    ("employers", scrape_aip_employers),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮(原 pilot 链的第一步,批E 拆域后独立成链)。"""

TOOLS = {
    "employers": scrape_aip_employers,
    "rules": build_aip_rules,
    "flag": flag_aip_jobs,
}
"""全部可 --only 点名的步(含两个不进默认链的件):
  employers  AIP 四省官方指定雇主名录 → raw/aip/aip-designated-employers.{json,md}
  rules      AIP 申请人门槛库(引用核验未过即 exit 1)→ raw/ircc/aip_rules.json
             (原 pilot 域 TOOLS 键叫 aip_rules,批E 拆域后域名已说 AIP,键收成 rules)
  flag       employers 名单 × 岗位雇主名 → 就地写回 postings.json / ATS jobs.json 的 aip
             (原 clean/05c_flag_aip.py,2026-08-31 批H2 归户;归 load 建表链排序,不进本域默认链)
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
