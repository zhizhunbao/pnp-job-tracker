"""
sched 域唯一入口(一域一门;2026-08-31 批K 立域全溶,门直调函数 —— 全溶域的门形,
样张 etl/noc/main.py 与 etl/load/main.py)。

**默认链 = 守护循环**(语义 = 原 etl/auto_update.py 的 main:读 SOURCE 环境变量,
按域 META/METAS 发现本角色的单元,各自计时常驻跑到天荒地老);TOOLS 只有一件
`now` = 原 etl/run_now.py 的手动一轮。本域自己**不被自己调度**(__init__ 无 META):
调度器不是役。
一律从仓库根执行:
    python etl/sched/main.py                              # 默认链 = 守护循环(容器 CMD)
    SOURCE=pnp python etl/sched/main.py                   # 换角色(容器靠 env 分工)
    python etl/sched/main.py --only now                   # 手动一轮全链(默认六役)
    python etl/sched/main.py --only now jobbank build     # 手动一轮只跑点名的役/域

sink 重配住门(functions 只调用不配置):守护档「时间 | 级别 | 源 | 消息」走 stderr,
手动档纯 message 走 stdout —— 后者与旧 run_now 的裸 print 逐行一字不差。
🔴 两档都不 import log.functions:那个模块 import 即 remove+add 纯 message 档,
会当场劫持守护档的时间戳前缀(log/paths/load 三处头注都为此立过判据)。
控制台强制 UTF-8(照 load/news 门形):Windows 控制台默认 cp1252,吐中文直接
UnicodeEncodeError —— 原 run_now 的 main 里那段 reconfigure 移到门上。
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    # pyrefly: ignore[missing-attribute] — typeshed 把 sys.stdout 标成 TextIO,运行时是 TextIOWrapper(带 reconfigure)
    sys.stdout.reconfigure(encoding="utf-8")

from loguru import logger

from sched.constants import (ARG_ONLY, DAEMON_SINK_FORMAT, DEFAULT_SOURCE, ENV_SOURCE,
                             K_SOURCE, MANUAL_SINK_FORMAT)
from sched.functions import run_now, watch

SCHEDULED = [("watch", watch)]
"""默认链(调度真相):常驻守护循环一件 —— 容器 CMD 直起本门不带参即是它。
它不返回(while True),门尾的收口行只在手动档才会印出来。"""

TOOLS = {
    "now": run_now,
}
"""全部可 --only 点名的步:
  now  手动跑一轮(#119):尾参给役/域名按序跑,不跟 = 默认六役全链
       `python etl/sched/main.py --only now jobbank build`
"""


def say(msg: str) -> None:
    """本域的进度出口(门自己配 sink 自己出口,不 import log.functions —— 见文件头判据)。"""
    logger.info(msg)


def err(where: object, e: BaseException) -> None:
    """错误留痕一行(与 log.functions.err 同形:✗ 前缀 = 告警通道)。"""
    logger.error(f"✗ {where} {type(e).__name__}: {e}")


def setup_daemon_sink() -> None:
    """守护档 sink:统一格式「时间 | 级别 | 源 | 消息」走 stderr(容器日志无 TTY,不上色)。
    extra[source] 先按角色配一份兜底,逐单元再 bind 覆盖成「角色·单元」。"""
    logger.configure(extra={K_SOURCE: os.environ.get(ENV_SOURCE, DEFAULT_SOURCE)})
    logger.remove()
    logger.add(sys.stderr, colorize=False, format=DAEMON_SINK_FORMAT)


def setup_manual_sink() -> None:
    """手动档 sink:只打消息本身走 stdout(旧 run_now 的裸 print 等价物)。"""
    logger.remove()
    logger.add(sys.stdout, format=MANUAL_SINK_FORMAT)


def main() -> int:
    """跑默认链(守护循环)或 --only 点名的单步;返回进程退出码。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == ARG_ONLY:
        setup_manual_sink()
        picked = []
        for k, f in TOOLS.items():
            if args[1] in k:
                picked.append((k, f))
        if len(picked) == 0:
            say(f"✗ --only {args[1]} 没命中(可选:{'/'.join(TOOLS)})")
            return 1
        todo = picked
    else:
        setup_daemon_sink()
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
