"""
eligibility 域形状 —— quote-anchored 规则引擎的入参/出参 dataclass(照 aip 三件套样张;段横幅与 constants /
functions 同名同序镜像)。段 2-4 三个试点共用段 1 的形状:引擎只认 ProgramSpec,不认试点名。

沿革:2026-09-06 立域。PageOut / PageEntryIn / RequirementIn / RulesDocIn 从 aip 域 scheme 第 3 段整段搬入
(字段与 docstring 逐字未改);ProgramSpec / MissingIn 新增 —— 原 aip 段把规则表、页表、产物路径写死成模块常量,
一个域装三个试点后必须作为入参喂给引擎。
"""
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

# =========================================================================
# 1. 引擎词汇(三段共用:页、规则行、产出文档、试点规格)
# =========================================================================


class SoupNodeLike(Protocol):
    """bs4 节点的最小接口(只用 get_text;pyrefly 对 bs4 的 find 返回 PageElement | None,cast 到这个协议)。"""

    def get_text(self, separator: str, strip: bool) -> str:
        """节点全文。"""
        ...


@dataclass
class ProgramSpec:
    """一个试点的规则抓取规格:引擎按它取页、核引用、落文件(三个试点各造一份,常量住 constants 各段)。"""

    program: str
    """产出文档的 program 字段(AIP / RCIP / FCIP)。"""

    slug: str
    """crawl 种子名(缓存缺页时提示先跑哪个种子)。"""

    index_url: str
    """产出文档的 url 字段(Who can apply 索引页)。"""

    page_urls: dict
    """页键 → 官方 URL(规则行的 page 指的就是这里的键)。"""

    rules: list
    """规则表(人抄的结构化行,quote 必须逐字在 page 所指页面)。"""

    out: Path
    """产物路径(raw/ircc/<program>_rules.json)。"""

    note: str
    """产出文档的 note 字段。"""


@dataclass
class LoadIn:
    """load() 的入参:要取的页 + 它所属 crawl 种子名(缺页提示用)。"""

    url: str
    """官方 URL。"""

    slug: str
    """crawl 种子名。"""


@dataclass
class PageOut:
    """load() 的出参:一页正文(归一化后)+ 缓存抓取日。"""

    text: str
    """main 标签全文,已 norm()。"""

    fetched: str
    """crawl 缓存的抓取日(YYYY-MM-DD)。"""


@dataclass
class PageEntryIn:
    """to_page_entry 的入参:一页的三格。"""

    url: str
    """官方 URL。"""

    fetched: str
    """抓取日。"""

    text: str
    """归一化正文。"""


@dataclass
class RequirementIn:
    """to_requirement 的入参:一条规则 + 它所属页的记录。"""

    rule: dict
    """规则行(constants 各段 *_RULES 的一项)。"""

    page: dict
    """页记录(to_page_entry 产)。"""


@dataclass
class RulesDocIn:
    """to_rules_doc 的入参:试点规格 + 已核验的门槛行。"""

    spec: ProgramSpec
    """试点规格(program / index_url / note 进文档头)。"""

    requirements: list
    """门槛行清单。"""


@dataclass
class MissingIn:
    """report_missing 的入参:引用消失的行与全表规模。"""

    missing: list
    """引用在页面上消失的规则行。"""

    total: int
    """规则表总行数。"""
