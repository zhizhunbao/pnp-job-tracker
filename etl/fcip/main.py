"""
fcip 域唯一入口(一域一门;全溶域的门形,样张 etl/company/main.py、etl/noc/main.py)。

SCHEDULED = 本域默认链的步骤真相 —— **顺序即语义,一步失败中止本轮**:
  details    法语社区指定雇主/职业清单自动刷新(E6-11 批C;整步永远 exit 0 不拦役)
  quota      FCIP 名额状态:读 crawl 缓存不外连,四站实测全文不提名额 → 稳定产 0 行
             (「官方没写」不是「我们没抓」);永远 exit 0 不拦役
communities 不进默认链:它仍作为 build 管线步骤跑(05f 旗标读两域并集,本域不重复调度,
见 __init__ docstring),在 TOOLS 里。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/fcip/main.py                        # 默认链(两步)
    python etl/fcip/main.py --only communities     # 单步调试 / 手动工具(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from fcip.functions import build_pilot_communities, build_pilot_details, build_pilot_quota

SCHEDULED = [
    ("details", build_pilot_details),
    ("quota", build_pilot_quota),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮(与 rcip 域同序,批E 拆域后各跑各的)。"""

TOOLS = {
    "details": build_pilot_details,
    "quota": build_pilot_quota,
    "communities": build_pilot_communities,
}
"""全部可 --only 点名的步(含一个不进默认链的手动件):
  details      纯法语四社区指定雇主/职业清单自动刷新 → raw/fcip/fcip-{employers,occupations}.json
  quota        FCIP 社区名额状态(quote-anchored)→ raw/fcip/fcip-quota.json
  communities  FCIP 试点社区名单(6 行,含双身份的 Sudbury/Timmins)→ raw/fcip/fcip-communities.json
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
