"""
aip 域形状(照 company/noc/pnp 样张;2026-08-31 批E 从 pilot 拆出,纯移动)。

全是域内接线形状(XxxIn / XxxOut)= dataclass:一参令下多入参收编的口袋、单返回值令下
多返回值收编的口袋,不是外来数据,校验加不了值。边界(官方 PDF / Wayback 快照 /
crawl 缓存页 / 既有 raw json)一律 dict 直读,键词汇住 constants 的 K_ 词族与 to_* 行构造器体内。
段横幅与 constants/functions 同名同序镜像;第 1 段无形状,占位横幅保留镜像编号。

批E 拆分改动:只有段号重编(原 pilot 的第 2/6 段 → 本域第 2/3 段),
dataclass 名、字段名、每条 docstring 逐字未改。
"""
from dataclasses import dataclass

# =========================================================================
# 1. 共享词汇(纯常量段,无形状 —— 镜像占位)
# =========================================================================

# =========================================================================
# 2. employers 步(AIP 官方指定雇主名录)
# =========================================================================

@dataclass
class PdfBulletsIn:
    """parse_pdf_bullets 的入参:一省的官方名录 PDF。"""

    prov: str
    """省码(NB/NS;地点尾巴只在 NS 剥)。"""

    url: str
    """官方 PDF 直链。"""


@dataclass
class PdfRowIn:
    """to_pdf_row 的入参:PDF 一条 bullet 洗净后的三格。"""

    prov: str
    """省码。"""

    name: str
    """雇主名(已剥地点尾巴)。"""

    location: str
    """地点(只有 NS 名单带,其余空串)。"""


@dataclass
class NlRowIn:
    """to_nl_row 的入参:NL 一份雇主档洗净后的三格。"""

    name: str
    """雇主名(已剥站点后缀)。"""

    location: str
    """地点(md 里的 Location 行,缺则空串)。"""

    tech: bool
    """是否科技相关(NL 走 NOC 精确判定 + 公司名兜底)。"""


@dataclass
class PeRowIn:
    """to_pe_row 的入参:PE 快照里的一个名字。"""

    name: str
    """雇主名。"""

    ts: str
    """快照时间戳前缀(YYYYMMDD;落进行的 asOf)。"""


@dataclass
class GuardIn:
    """guard 的入参:一省本轮解析结果过塌方护栏。"""

    prov: str
    """省码。"""

    parsed: list
    """本轮解析出来的行(可能是空的)。"""


@dataclass
class MdRowIn:
    """md_summary_row 的入参:md 汇总表的一省。"""

    prov: str
    """省码。"""

    rows: list
    """该省本轮落盘的全部行(空 = 未抓到/无源)。"""


# =========================================================================
# 3. aip_rules 步(AIP 申请人门槛库)
# =========================================================================

@dataclass
class PageOut:
    """load 的出参:一页官方正文 + 它的 crawl 轮次日期。"""

    text: str
    """归一化后的 <main> 纯文本(引用核对的底本)。"""

    fetched: str
    """该页被 crawl 取回的日期(不是脚本跑的今天)。"""


@dataclass
class PageEntryIn:
    """to_page_entry 的入参:一页在 pages 表里的三格。"""

    url: str
    """官方 URL。"""

    fetched: str
    """crawl 轮次日期。"""

    text: str
    """归一化正文。"""


@dataclass
class RequirementIn:
    """to_requirement 的入参:一条规则 + 它所属页的记录。"""

    rule: dict
    """RULES 里的一条(键词汇只在行构造器体内出现)。"""

    page: dict
    """该规则 page 键对应的 pages 记录(给 url/fetched)。"""


@dataclass
class RulesDocIn:
    """to_rules_doc 的入参:落盘文档的变量格。"""

    requirements: list
    """核验通过的全部门槛行。"""
