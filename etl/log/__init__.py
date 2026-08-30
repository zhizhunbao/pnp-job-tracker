"""
log 域:域内日志唯一出口(基础设施叶,2026-08-30 由 _log.py 目录化)。

正门 = from log.functions import say, err(件套以包名被引)。
本 __init__ 零 import:auto_update 域发现会 import 每个 etl/*/__init__ ——
log.functions 带「import 即重配 sink」副作用,轻门把它挡在域发现之外。
"""
