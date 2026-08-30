"""
_log — 域内日志的唯一出口(批A 地基件,2026-08-30 Frank 两拍:「我也需要 log 域」
「log 用 loguru 的库」)。

cms「console.log 只住 lib/log.ts 一处」的 Python 落法:域里不再裸 print,一律
say()/err() —— 出口唯一,将来加 sink(错误行落文件等)只动这里。
内核 = loguru,但 sink 格式**只有消息本身**:域是子进程,auto_update 截获 stdout
逐行再套「时间|级别|源」前缀 —— 这里再带时间戳就双前缀了;手动跑时也是干净一行。
✗ 前缀 = 截获层升 ERROR 级的信号,保持不变。
error 叶暂不立(判据:造错点稀少、判错消费者为零 —— 没数出重复不抽公共;
哪天 fetch 层要按「被墙/改版」分流重试,当场立)。
"""
import sys

from loguru import logger

ERR_TPL = "✗ {where} {name}: {detail}"
"""吞而不哑的错误行(永不吞异常令,2026-08-30 Frank):不打断流程的 catch 也必须打;
✗ 前缀 = 调度层升 ERROR 级的信号。where=出事对象(url/域名/文件/时刻串)。"""

logger.remove()
logger.add(sys.stdout, format="{message}", colorize=False)


def say(msg: str) -> None:
    """报数/进度一行(域内 print 的唯一替身)。"""
    logger.info(msg)


def err(where: object, e: BaseException) -> None:
    """错误留痕一行:出事对象 + 异常类名 + 详情(不打断流程的 catch 必调)。"""
    logger.error(ERR_TPL.format(where=where, name=type(e).__name__, detail=e))
