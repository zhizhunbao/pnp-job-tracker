"""log.functions — 域内日志的唯一出口(原 etl/_log.py,2026-08-30 目录化)。

cms「console.log 只住 lib/log.ts 一处」的 Python 落法:域里不再裸 print,一律
say()/err() —— 出口唯一,将来加 sink(错误行落文件等)只动这里。
⚠️ import 即重配 loguru sink(remove + 纯 message 档):常驻调度器 auto_update 有自己的
时间戳 sink,严禁进程内 import 本模块(load 域为此设计了纯返回 + 回调注入,见其头注)。
error 叶暂不立(判据:造错点稀少、判错消费者为零 —— 没数出重复不抽公共;
哪天 fetch 层要按「被墙/改版」分流重试,当场立)。
"""
import sys

from loguru import logger

from log.constants import ERR_TPL, SINK_FORMAT

logger.remove()
logger.add(sys.stdout, format=SINK_FORMAT, colorize=False)


def say(msg: str) -> None:
    """报数/进度一行(域内 print 的唯一替身)。"""
    logger.info(msg)


def err(where: object, e: BaseException) -> None:
    """错误留痕一行:出事对象 + 异常类名 + 详情(不打断流程的 catch 必调)。"""
    logger.error(ERR_TPL.format(where=where, name=type(e).__name__, detail=e))
