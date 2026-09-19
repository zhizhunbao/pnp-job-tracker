"""
explore 域行形状(照 jdformat 样张:域内接线形状 = dataclass,库类型用 Protocol 只声明真用的格;
import 两个洞:标准库 + 本域 constants)。
"""
from dataclasses import dataclass
from typing import Protocol

from explore.constants import FIELD_NONE, ST_FAIL


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的格。"""

    status_code: int
    """HTTP 状态码。"""

    is_success: bool
    """2xx 判定。"""

    def json(self) -> object:
        """响应体按 JSON 解析。"""
        ...


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的格:get(取活)与 post(交活 / 打盒子)。Pyrefly 对 Protocol 实参判定保守,
    装配点用 typing.cast 喂真客户端(断言只住装配点)。"""

    def get(self, url: str, *, params: dict, headers: dict) -> HttpResponseLike:
        """GET(关键字参是库形状特批)。"""
        ...

    def post(self, url: str, *, json: object, headers: dict) -> HttpResponseLike:
        """POST JSON 体(关键字参是库形状特批)。"""
        ...


@dataclass
class LlmCfg:
    """盒子接线。"""

    base: str
    """Ollama 基址(空串 = 没配)。"""

    model: str
    """模型名。"""


@dataclass
class SiteCfg:
    """cms 接线。"""

    base: str
    """站点根(空串 = 没配)。"""

    headers: dict
    """带钥匙的请求头(空 = 没配钥匙)。"""


@dataclass
class Todo:
    """一条待办。"""

    key: str
    """池主键。"""

    name: str
    """雇主名。"""

    broads: list
    """在招岗的大类(岗多的在前;旁证,可能为空)。"""


@dataclass
class Result:
    """一条结果(交活时转成线格式)。"""

    key: str
    """池主键。"""

    status: str = ST_FAIL
    """状态(done / skip / fail)。"""

    alias_zh: str = FIELD_NONE
    """中文译名。"""

    alias_ko: str = FIELD_NONE
    """韩文译名。"""

    industry: str = FIELD_NONE
    """公司大类键(本站大类之一;模型判不出 / 答了名单外的词 = 空)。"""

    note: str = FIELD_NONE
    """备注(跳过 / 失败的由头;盒子掉线时是异常类名)。"""


@dataclass
class TakeIn:
    """take_todos() 入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    site: SiteCfg
    """cms 接线。"""

    limit: int
    """取多少条。"""


@dataclass
class HandIn:
    """hand_in() 入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    site: SiteCfg
    """cms 接线。"""

    results: list
    """这一批结果。"""


@dataclass
class TranslateIn:
    """translate_one() 入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    cfg: LlmCfg
    """盒子接线。"""

    todo: Todo
    """这一条待办。"""


@dataclass
class LlmCallIn:
    """call_llm() 入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    cfg: LlmCfg
    """盒子接线。"""

    prompt: str
    """提示词全文。"""


@dataclass
class AliasIn:
    """alias_ok_of() 入参。"""

    text: str
    """模型给的译名。"""

    name: str
    """原雇主名。"""

    ko: bool
    """True = 韩文(要有韩文音节),False = 中文(要有汉字)。"""
