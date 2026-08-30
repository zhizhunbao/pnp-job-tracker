"""load.scheme — 灌库层形状(一参令 XxxIn / 单返回值 Out)。

functions 纯静默(日志不写在域里):进度打点经 say 回调注入(方案A 同款 ——
调用方是谁就用谁的日志面;auto_update 常驻进程尤其不能被 _log 的 sink 重配劫持),
触发类返回 CallOut 由调用方决定怎么打、怎么算成败。
"""
from dataclasses import dataclass
from typing import Callable, Protocol

SayFn = Callable[[str], object]
"""进度打点回调形(一行文本一调;门注 _log.say,auto_update 注 ulog.info)。"""


class HttpRespLike(Protocol):
    """HTTP 响应形状(成功判定只用这四格)。"""

    is_success: bool
    """2xx 与否。"""

    status_code: int
    """状态码。"""

    text: str
    """响应体文本。"""

    def json(self) -> dict:
        """响应体 JSON(HTML 体会抛,由判定函数兜)。"""


class HttpPostLike(Protocol):
    """上传客户端形状(只用 post 一门)。"""

    def post(self, url: str, content: bytes, headers: dict) -> HttpRespLike:
        """gzip 字节一发。"""



@dataclass
class CallOut:
    """一次端点触发的结果(seed / alerts 共用)。"""

    ok: bool
    """成功 = 2xx 且响应体 ok:true;网络错/超时/非 2xx/HTML 响应一律 False。"""

    status: int
    """HTTP 状态码;没打通(网络错)= 0。"""

    body: str
    """响应体前段或异常摘要(调用方打日志用)。"""


@dataclass
class UploadIn:
    """upload_mart() 入参。"""

    say: SayFn
    """进度打点回调(一行文本一调;门注 _log.say,别的调用方注自己的)。"""


@dataclass
class BackupIn:
    """backup_db() 入参。"""

    say: SayFn
    """进度打点回调(同 UploadIn)。"""


@dataclass
class PostTableIn:
    """_post_table()(单表/单片上传)入参 —— 原内嵌闭包出户的显式上下文。"""

    client: HttpPostLike
    """上传客户端(httpx.Client 经装配点 cast 喂入)。"""

    base: str
    """站点根(https://…,从 SEED_URL 反推)。"""

    headers: dict
    """鉴权 + gzip 内容类型头。"""

    name: str
    """端点表名(stem / stem__partK / stem__meta)。"""

    body: bytes
    """未压缩 JSON 字节(体内 gzip)。"""

    label: str
    """进度标签(文件名/分片序)。"""

    say: SayFn
    """进度打点回调。"""
