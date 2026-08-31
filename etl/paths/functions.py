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
from contextlib import contextmanager
from pathlib import Path
from typing import IO, Iterator

from paths.constants import (ENC_UTF8, JSON_COMPACT_SEPS, LOCK_OPEN_MODE, LOCK_POLL_S,
                             LOCK_SEED, OS_WINDOWS, RETRY_BACKOFF, RETRY_DELAY_S,
                             RETRY_MAX, TMP_SUFFIX)
from paths.scheme import WriteJsonIn


def dumped_of(x: WriteJsonIn) -> str:
    """按三格档位序列化(compact 档紧凑分隔零缩进;否则按 indent;sort_keys 独立叠加)。"""
    if x.compact:
        return json.dumps(x.payload, ensure_ascii=False, sort_keys=x.sort_keys,
                          separators=JSON_COMPACT_SEPS)
    return json.dumps(x.payload, ensure_ascii=False, sort_keys=x.sort_keys, indent=x.indent)


def write_json(x: WriteJsonIn) -> None:
    """原子写 JSON:临时文件 + os.replace,OSError 重试 RETRY_MAX 次退避(RETRY_DELAY_S 起翻倍)。

    只重试 OSError(卷抖动);TypeError 等序列化错误照抛 —— 那是代码病不是环境病。
    """
    tmp = x.path.with_suffix(x.path.suffix + TMP_SUFFIX)
    text = dumped_of(x)
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


def lock_fd(file_obj: IO[bytes]) -> None:
    """对已打开的锁文件加独占锁(Windows 走 msvcrt 轮询,Unix 走 flock 阻塞;
    平台模块函数内懒导入 —— 对侧平台模块压根不存在,顶部导入会炸)。"""
    if os.name == OS_WINDOWS:
        import msvcrt
        file_obj.seek(0)
        while True:
            try:
                msvcrt.locking(file_obj.fileno(), msvcrt.LK_NBLCK, 1)
                return
            except OSError:
                time.sleep(LOCK_POLL_S)
    else:
        import fcntl
        fcntl.flock(file_obj.fileno(), fcntl.LOCK_EX)  # pyrefly: ignore[missing-attribute] — Unix 分支,Windows 上 fcntl 空桩


def unlock_fd(file_obj: IO[bytes]) -> None:
    """解锁(与 lock_fd 平台对称)。"""
    file_obj.seek(0)
    if os.name == OS_WINDOWS:
        import msvcrt
        msvcrt.locking(file_obj.fileno(), msvcrt.LK_UNLCK, 1)
    else:
        import fcntl
        fcntl.flock(file_obj.fileno(), fcntl.LOCK_UN)  # pyrefly: ignore[missing-attribute] — 同上


@contextmanager
def jobbank_store_lock(lock_path: Path) -> Iterator[None]:
    """持有 Job Bank 仓锁直到被守护的事务结束(2026-08-31 批F 自 sources/_jobbank_lock 收编;
    调用方一律传 paths.JOBBANK_STORE_LOCK —— 原默认参形随一参令禁默认值退役,测试可传
    临时路径)。生产者与 build 消费者跨容器共享绑定卷,内核锁保证「汇装看到的是一份
    稳定的 postings.json」;进程亡锁自释。"""
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open(LOCK_OPEN_MODE) as lock_file:
        if lock_file.tell() == 0:
            lock_file.write(LOCK_SEED)
            lock_file.flush()
        lock_fd(lock_file)
        try:
            yield
        finally:
            unlock_fd(lock_file)
