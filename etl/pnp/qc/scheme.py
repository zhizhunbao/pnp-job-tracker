"""
pnp/qc 子域行形状(一参令 XxxIn / 单返回值 XxxOut;同 pnp/scheme.py 的方言)。

只放魁省自己的形状;跨省共用的形状(CachedDrawsIn / PutDrawsIn …)住 pnp/scheme.py,functions 直接从那里取。

@author Frank
@time 2026-09-29 20:01:04
"""
from dataclasses import dataclass

# =========================================================================
# 1. PSTQ 邀请轮次(2026-09-29 自 pnp/scheme.py 原样搬来,一字未改)
# =========================================================================


@dataclass
class QcDrawIn:
    """qc_draw_of() 入参:QC 一轮一个 stream 的折叠块 → 一行抽选(2026-09-26)。"""

    date: str
    """ISO 邀请日(两天一轮取后一天)。"""

    stream: str
    """所在 stream 段的标题原文(「Stream 1: Highly qualified and specialized skills」)。"""

    body: str
    """折叠块正文(已折空白;不换行空格的千分位已折成普通空格)。"""
