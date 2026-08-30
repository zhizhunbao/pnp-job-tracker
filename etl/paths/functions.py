"""paths.functions — 原子写盘(2026-08-30 目录化,同日全就范:一参令/零字符串/去 print)。

写盘惯例(2026-08-30 立,样张 pnp/build_ab.py):原子 + Errno 22 有界重试。
起因:Windows 绑定卷间歇 OSError[Errno 22](48h 实测 12 次),叠加「一步失败中止本轮
+ 失败照睡满周期」把 16/64 个源拖成 15-25 天陈账。写盘住这:paths 本就是
data/ 布局唯一真相,每个脚本都已 import,不添新边。
重试过程静默(原 ⚠ print 行 2026-08-30 随 Frank 咬裸 print退役 —— 它的观测使命已完成:
12 次/48h 频率已实测归档;第 RETRY_MAX 次仍失败照抛,由域门 err 留痕,不吞);
本模块被 auto_update 进程内消费,不得引 log 域(sink 重配劫持,load 域同判据)。
"""
import json
import os
import time

from paths.constants import ENC_UTF8, RETRY_BACKOFF, RETRY_DELAY_S, RETRY_MAX, TMP_SUFFIX
from paths.scheme import WriteJsonIn


def write_json(x: WriteJsonIn) -> None:
    """原子写 JSON:临时文件 + os.replace,OSError 重试 RETRY_MAX 次退避(RETRY_DELAY_S 起翻倍)。

    只重试 OSError(卷抖动);TypeError 等序列化错误照抛 —— 那是代码病不是环境病。
    """
    tmp = x.path.with_suffix(x.path.suffix + TMP_SUFFIX)
    text = json.dumps(x.payload, ensure_ascii=False, indent=x.indent)
    delay = RETRY_DELAY_S
    for attempt in range(RETRY_MAX):
        try:
            tmp.write_text(text, encoding=ENC_UTF8)
            os.replace(tmp, x.path)
            return
        except OSError:
            if attempt == RETRY_MAX - 1:
                raise
            time.sleep(delay)
            delay *= RETRY_BACKOFF
