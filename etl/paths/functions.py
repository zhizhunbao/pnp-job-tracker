"""paths.functions — 原子写盘(2026-08-30 由 _paths.py 目录化,行为纯移动)。

写盘惯例(2026-08-30 立,样张 pnp/build_ab.py):原子 + Errno 22 有界重试。
起因:Windows 绑定卷间歇 OSError[Errno 22](48h 实测 12 次),叠加「一步失败中止本轮
+ 失败照睡满周期」把 16/64 个源拖成 15-25 天陈账。写盘住这:paths 本就是
data/ 布局唯一真相,每个脚本都已 import,不添新边。
(⚠ 行走裸 print 是历史形态 —— 本域批C 全就范时随一参令一起收;log 域不可引:
本模块被 auto_update 进程内消费,同 load 域「零日志依赖」判据。)
"""
import json
import os
import time


def write_json(path, payload, *, indent=2):
    """原子写 JSON:临时文件 + os.replace,OSError 重试 5 次退避(0.5s 起翻倍)。

    只重试 OSError(卷抖动);TypeError 等序列化错误照抛 —— 那是代码病不是环境病。
    """
    tmp = path.with_suffix(path.suffix + ".tmp")
    text = json.dumps(payload, ensure_ascii=False, indent=indent)
    delay = 0.5
    for attempt in range(5):
        try:
            tmp.write_text(text, encoding="utf-8")
            os.replace(tmp, path)
            return
        except OSError as e:
            if attempt == 4:
                raise
            print(f"⚠ 写盘 {path.name} 第 {attempt + 1} 次失败({e}),{delay}s 后重试", flush=True)
            time.sleep(delay)
            delay *= 2
