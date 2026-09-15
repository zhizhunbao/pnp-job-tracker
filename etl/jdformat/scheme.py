"""
jdformat 域行形状(照 company 三件套样张:边界行形状 = pydantic BaseModel,域内接线形状 = dataclass,
库类型用 Protocol 只声明真用的格;import 两个洞:标准库 / pydantic + 本域 constants)。
"""
from dataclasses import dataclass
from typing import Protocol

from pydantic import BaseModel, ConfigDict

from jdformat.constants import ST_FAIL

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""边界模型统一配置:多余键忽略、按字段名构造照常、逐格裸字符串 docstring 直接成为字段 description。"""


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的格。"""

    status_code: int
    """HTTP 状态码。"""

    is_success: bool
    """2xx 判定。"""

    def json(self) -> object:
        """响应体按 JSON 解析(Ollama 回包)。"""
        ...


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的格:只有 post。Pyrefly 对 Protocol 实参判定保守,不认 httpx.Client 的
    结构等价 —— 装配点用 typing.cast 喂真客户端(断言只住装配点)。"""

    def post(self, url: str, *, json: object) -> HttpResponseLike:
        """POST JSON 体(关键字参是库形状特批)。"""
        ...


class FormatRecord(BaseModel):
    """formatted.json 的值:一岗一份整理记录(对外文件契约,mart 汇装直读)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    status: str = ST_FAIL
    """ok / fail。"""

    formatted: str = ""
    """五节整理版(节标记已顶到行首;fail 为空串)。"""

    term: str = ""
    """模型从帖里抽的就业性质(permanent / term / casual / seasonal;抽不到或不合法空串)。"""

    hrs: str = ""
    """模型从帖里抽的工时类型(full / part;抽不到或不合法空串)。"""

    model: str = ""
    """生成用的模型名。"""

    at: str = ""
    """生成时刻(ISO,UTC)。"""

    note: str = ""
    """失败由头(marks / len / digits / empty / http N / 异常类名);ok 为空串。"""

    src_len: int = 0
    """喂给模型的原文长度(报数与复盘用)。"""


@dataclass
class LlmCfg:
    """模型接线(读环境一次)。"""

    base: str
    """Ollama 基址;空串 = 没配。"""

    model: str
    """模型名。"""


@dataclass
class PruneIn:
    """prune_cache() 入参。"""

    cache: dict[str, FormatRecord]
    """externalId → 记录(原地剪)。"""

    jobs: dict[str, dict]
    """externalId → 当前 mart 在招岗行。"""


@dataclass
class PickIn:
    """pick_todo() 入参。"""

    jobs: dict[str, dict]
    """externalId → 当前 mart 在招岗行(有正文)。"""

    cache: dict[str, FormatRecord]
    """externalId → 上轮记录。"""

    limit: int
    """本轮上限。"""


@dataclass
class FormatOneIn:
    """format_one() 入参。"""

    client: HttpClientLike
    """复用的 httpx 客户端。"""

    cfg: LlmCfg
    """模型接线。"""

    src: str
    """岗位原文(全文;校验按全文比数字,喂模型按 BODY_MAX_LEN 截)。"""


@dataclass
class LlmCallIn:
    """call_llm() 入参。"""

    client: HttpClientLike
    """复用的 httpx 客户端。"""

    cfg: LlmCfg
    """模型接线。"""

    prompt: str
    """提示词全文。"""


@dataclass
class Draft:
    """draft_of() 出参:剥掉尾部字段行的正文 + 两个抽出的枚举词(镜像 cms JdDraft)。"""

    out: str
    """整理版正文(未顶行首)。"""

    term: str
    """[TERM]= 抽出的词(小写;抽不到空串)。"""

    hrs: str
    """[HRS]= 抽出的词(小写;抽不到空串)。"""


@dataclass
class ValidateIn:
    """validate_note_of() 入参:输出与原文必须分开比(镜像 cms validateJdFormatted 的两参)。"""

    out: str
    """模型输出(已剥尾部字段行)。"""

    src: str
    """岗位原文全文。"""
