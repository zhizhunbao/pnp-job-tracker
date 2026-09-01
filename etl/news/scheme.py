"""news.scheme — news 域的形状(一参令 XxxIn / 单返回值 / 库形状 Protocol 自声明)。

2026-08-30 立(随母框架从 fetch 迁回);批C 子源溶解时补 LLM 层的三只入参形与
Protocol(照 fetch.scheme 先例:只声明真用的格,不 import httpx —— 叶子零依赖,
装配点用真实对象直接喂,cast 只住装配点)。
SOURCE 子源契约仍是 dict(母框架按契约键读,parse 函数当值挂;pydantic 化留待 lead 拍板)。
"""
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


@dataclass
class RunIn:
    """run() 入参。"""

    sources: list[dict]
    """子源清单(SOURCE 契约 dict,见 news.functions 文件头)。"""

    out_file: Path
    """落盘路径(raw/news/news.json)。"""


class LlmResponseLike(Protocol):
    """LLM 响应形状(翻译/打分只用这两门)。"""

    def raise_for_status(self) -> object:
        """非 2xx 即抛(httpx 同名方法)。"""

    def json(self) -> dict:
        """响应体 JSON。"""


class LlmClientLike(Protocol):
    """LLM 客户端形状(只用 JSON body 的 post 一门)。"""

    def post(self, url: str, json: dict) -> LlmResponseLike:
        """POST 一发 JSON(参数名由 httpx 定死,外部规定)。"""


@dataclass
class LlmConfig:
    """LLM 后端配置(进程内一次读环境,三段共用)。"""

    base: str
    """局域网 Ollama 基址;空串 = 走 Anthropic 兜底。"""

    local_model: str
    """局域网模型名(base 为空时不用)。"""

    api_key: str
    """Anthropic key;空串 = 没配。"""


@dataclass
class MakeLlmClientIn:
    """make_llm_client() 入参。"""

    cfg: LlmConfig
    """后端配置(决定基址与认证头)。"""

    timeout_s: float
    """单发超时秒数(翻译长稿与打分各有各的档)。"""


@dataclass
class CallLlmIn:
    """call_llm() 入参(单轮生成:Ollama /api/generate 或 Anthropic /v1/messages)。"""

    client: LlmClientLike
    """已构造的客户端。"""

    cfg: LlmConfig
    """后端配置。"""

    prompt: str
    """整段提示词。"""

    tokens: int
    """生成上限(num_predict / max_tokens 同值)。"""


@dataclass
class CallTitleIn:
    """call_title_llm() 入参(标题灰注:Ollama /api/chat,不落 Anthropic 兜底)。"""

    client: LlmClientLike
    """已构造的客户端(局域网盒)。"""

    cfg: LlmConfig
    """后端配置(取 local_model)。"""

    prompt: str
    """整段提示词。"""


@dataclass
class TitleCheckIn:
    """title_ok() 入参。"""

    out: str
    """LLM 吐回的标题译文(已剥壳)。"""

    source: str
    """英文原标题(长度上限的基准)。"""


@dataclass
class NumberedIn:
    """parse_numbered_body() 入参。"""

    body: str
    """哨兵行之后的逐段译文。"""

    total: int
    """原文段数(缺一段即判失败)。"""


@dataclass
class TranslateTask:
    """待翻队列的一项:(条目, 目标语)对。"""

    item: dict
    """news 行(就地补 summary/body 两格)。"""

    lang: str
    """目标语(LANG_ZH / LANG_KO)。"""


@dataclass
class TranslateOneIn:
    """translate_one() 入参。"""

    client: LlmClientLike
    """已构造的客户端。"""

    cfg: LlmConfig
    """后端配置。"""

    task: TranslateTask
    """这一条一语的活。"""


class NbBoxLike(Protocol):
    """bs4 节点形(NB 新站警示框解析用,2026-08-31 换址重锚;Protocol 自声明只真用的格
    —— 叶子律下 scheme 不 import bs4,方法签名库定死,一参令例外)。"""

    def find(self, *args: object, **kwargs: object) -> "NbBoxLike | None":
        """找子节点(命中同形节点,缺 None)。"""
        ...

    def get(self, *args: object, **kwargs: object) -> object:
        """读属性。"""
        ...

    def get_text(self, *args: object, **kwargs: object) -> str:
        """压平文本。"""
        ...

    def find_next_siblings(self) -> list:
        """同级后继元素清单。"""
        ...

    def find_previous(self, *args: object, **kwargs: object) -> "NbBoxLike | None":
        """文档序上最近的前驱节点(缺 None)。"""
        ...

