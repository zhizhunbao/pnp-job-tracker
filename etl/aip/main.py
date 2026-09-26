"""
aip 域唯一入口(一域一门;全溶域的门形,样张 etl/company/main.py、etl/noc/main.py)。

SCHEDULED = 本域默认链的步骤真相 —— **顺序即语义,一步失败中止本轮**:
  employers  AIP 指定雇主(NL/NB/NS;PE 走 Wayback 快照)
flag 不进默认链(rules 原同此,2026-08-31 批O 收编进链,理由见 SCHEDULED docstring;
原案「随 crawl 缓存轮次手动重跑,引用核验未过即 exit 1」的核验语义保留);
flag 是 **load 建表链上的一步**(它要排在岗位抓取之后、建表之前,顺序归那条链
排,不能在本域自己的定时轮里抢跑)—— 2026-08-31 批H2 从 clean/05c 归户进来,链上那行由
lead 收口改成 `("python", "etl/aip/main.py", "--only", "flag")`。
2026-08-31 批I3:flag 溶进 functions.py 段4,本域步骤文件清零,三步全是段函数直调
(全溶域的门形)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/aip/main.py                        # 默认链(一步)
    python etl/aip/main.py --only rules           # 单步调试 / 手动工具(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from aip.functions import flag_aip_jobs, scrape_aip_employers

SCHEDULED = [
    ("employers", scrape_aip_employers),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮(原 pilot 链的第一步,批E 拆域后独立成链)。

rules 2026-08-31 批O 收编进链(原「随 crawl 缓存轮次手动重跑」—— 保鲜闸上线后手动件
= 每 4 天一次人工闹钟,实测 aip_rules.json 停 23 天没人跑;它只读 crawl 缓存零网络开销,
入链即免人工。引用核验未过 → 保留旧表 + SystemExit(1) 中止本轮 → 扣 ping 转红,报警
语义与手动时代一字不差,只是不再依赖人记得跑)。
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
同日晚改判回一步失败即中止(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):门叶改回 fail-fast,本门一字不改;互不相干的步拆成各自的调度单元(各自容器、各自 ping)。
"""

TOOLS = {
    "employers": scrape_aip_employers,
    "flag": flag_aip_jobs,
}
"""全部可 --only 点名的步(含两个不进默认链的件):
  employers  AIP 四省官方指定雇主名录 → raw/aip/aip-designated-employers.{json,md}
  (rules     AIP 申请人门槛库 2026-09-06 整段搬去 eligibility 域 —— Frank「这种不同省的规则也需要一个
             单独模块维护吧」;产物 raw/ircc/aip_rules.json 路径不变,入口 python etl/eligibility/main.py --only aip)
  flag       employers 名单 × 岗位雇主名 → 就地写回 postings.json / ATS jobs.json 的 aip
             (原 clean/05c_flag_aip.py,2026-08-31 批H2 归户、批I3 溶成 functions 段4;
             归 load 建表链排序,不进本域默认链)
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
    return run_steps(todo)


if __name__ == "__main__":
    sys.exit(main())
