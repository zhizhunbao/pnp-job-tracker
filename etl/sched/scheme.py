"""
sched.scheme — 调度域形状(一参令 XxxIn / 单元 dataclass / 库形状 Protocol)。

2026-08-31 批K:旧 auto_update 的裸 dict 单元(name/steps/interval/seed/after/ping
再临时插 next/consumed 两格)收成 Unit dataclass —— 「一个单元有几格状态」一眼数清,
键从 functions 里消失(方言律⑩:json/契约键只许住 to_* 行构造器)。
只 import 标准库与 typing:loguru 的 logger 形状按⑥号律自声明 Protocol,
装配点(logger.bind)用 cast 收窄,不把库类型拉进本文件。
"""
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

# =========================================================================
# 1. 单元发现(域 META/METAS 扫描)
# =========================================================================


@dataclass
class MetaHit:
    """扫到的一条役声明(域名 + 它的 META/METAS 条目原文)。"""

    dom: str
    """域名(= 目录名)。"""

    meta: dict
    """役声明原文(键见 constants 的 K_ 词族;只在 to_unit 里被拆)。"""


@dataclass
class ToUnitIn:
    """to_unit() 入参。"""

    dom: str
    """域名(name 缺省时用它,入口路径也用它拼)。"""

    meta: dict
    """役声明原文。"""


@dataclass
class Unit:
    """一个调度单元(= 一个域役):节奏声明 + 循环里的计时状态。

    计时两格(next_at/consumed_at)是循环的本地状态,随进程生灭,不落盘;
    落盘的只有 data/.rounds/<name>.done 的 mtime。"""

    name: str
    """单元名(METAS 多役时各自不同;单役 = 域名)。"""

    steps: list[list[str]]
    """本单元一轮要跑的步骤 argv 清单(域即役后恒为一步:域门 [--only 役])。"""

    interval_s: int
    """一轮的间隔秒。"""

    seed: bool
    """本轮成功后要不要灌库(仅 build 角色)。"""

    after: list[str] | None
    """上游单元名清单;None = 不是消费者,纯按 interval 计时。"""

    ping: bool
    """本单元持不持心跳权(每角色只授一只)。"""

    next_at: float
    """下次到点的时刻(epoch 秒);0 = 启动即到点(容器一起来先跑一轮)。"""

    consumed_at: float
    """已消费的上游最新 mtime(消费者判「有没有新轮次」用)。"""


# =========================================================================
# 3. 单步执行(子进程 + loguru 前缀截获)
# =========================================================================


class LogLike(Protocol):
    """日志面形状(只用这三门;loguru 的 Logger 经 cast 在装配点喂入 ——
    ⑥号律:库形状自声明只真用的格,检查器判不动时 cast 只住装配点)。"""

    def info(self, msg: str) -> None:
        """普通一行。"""

    def error(self, msg: str) -> None:
        """告警一行。"""

    def log(self, level: str, msg: str) -> None:
        """按级名打一行(子进程输出按行首前缀分级用)。"""


@dataclass
class RunStepIn:
    """run_step() 入参。"""

    step: list[str]
    """步骤 argv。"""

    log: LogLike
    """本单元的日志面(前缀 = 角色·单元)。"""


# =========================================================================
# 4. 轮次收尾(seed / alerts / ping)
# =========================================================================


@dataclass
class FreshStampIn:
    """fresh_stamp_of() 入参:一个契约文件 + 取戳键(2026-08-31 批O 保鲜闸随迁,
    原 pnp 段37 的 StampIn 同形)。"""

    path: Path
    """契约文件(data/ 下)。"""

    key: str
    """取戳键(fetched/checkedAt,或 mtime 兜底)。"""
