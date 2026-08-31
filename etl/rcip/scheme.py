"""
rcip 域形状(照 company/noc/pnp 样张;2026-08-31 批E 从 pilot 拆出)。

全是域内接线形状(XxxIn / XxxOut)= dataclass:一参令下多入参收编的口袋、单返回值令下
多返回值收编的口袋,不是外来数据,校验加不了值。边界(crawl manifest / 抽取器出参 /
既有 raw json)一律 dict 直读,键词汇住 constants 的 K_ 词族与 to_* 行构造器体内。
段横幅与 constants/functions 同名同序镜像;第 1 段无形状,占位横幅保留镜像编号。

批E 拆分改动:段号重编(原 pilot 第 3/4/5 段 → 本域第 2/3/4 段);
ParseCommIn 去掉 franco_end 一格(本域只解析 Rural 那一节,Francophone h3 只当段终点,
FCIP 段起点归 fcip.scheme 的同名形状)。其余 dataclass 名、字段名、docstring 逐字未改。
"""
import re
from dataclasses import dataclass
from pathlib import Path

# =========================================================================
# 1. 共享词汇(纯常量段,无形状 —— 镜像占位)
# =========================================================================

# =========================================================================
# 2. details 步(社区指定雇主/职业清单自动刷新)
# =========================================================================


@dataclass
class CommunityIn:
    """refresh_one_community 的入参:一个社区跑一轮抽取要的全部上下文。"""

    name: str
    """社区官方名。"""

    comms: dict
    """社区索引(名 → pilot-communities.json 的行)。"""

    prev_emp: dict
    """上一版雇主行索引(社区名 → 行清单;塌方保旧的底本)。"""

    prev_occ: dict
    """上一版职业行索引(同上)。"""


@dataclass
class CommunityOut:
    """refresh_one_community 的出参:该社区本轮的两份行 + 有没有真刷新。"""

    emp_rows: list
    """雇主行(刷新成功=新抽的,塌方=上一版的)。"""

    occ_rows: list
    """职业行(同上)。"""

    ok: bool
    """两份里至少一份刷新成功(决定这社区记进「刷新」还是「保旧」)。"""


@dataclass
class DetailRowIn:
    """to_emp_row / to_occ_row 的入参:抽取器给的一条原始行 + 它的社区上下文。"""

    community: str
    """社区官方名。"""

    province: str
    """省码。"""

    ctype: str
    """试点类型兜底值(抽取器没给 type 时用)。"""

    raw: dict
    """抽取器给的原始行(键词汇只在行构造器体内出现)。"""

    url: str
    """该清单的官方出处。"""


@dataclass
class EmpPartIn:
    """community_emp_rows 的入参:一个社区的雇主那一半。"""

    name: str
    """社区官方名。"""

    province: str
    """省码。"""

    ctype: str
    """试点类型兜底值。"""

    got: dict | None
    """抽取器出参(None = 没注册或抽取抛异常)。"""

    n: int
    """本轮抽到的雇主行数。"""

    base: int
    """该社区的批B 雇主基线(0 = 官方待公示,不设下限)。"""

    ok: bool
    """过没过塌方哨兵(True = 用新抽的,False = 保旧)。"""

    prev: dict
    """上一版雇主行索引。"""


@dataclass
class OccPartIn:
    """community_occ_rows 的入参:一个社区的职业那一半。"""

    name: str
    """社区官方名。"""

    province: str
    """省码。"""

    ctype: str
    """试点类型兜底值。"""

    got: dict | None
    """抽取器出参(None = 没注册或抽取抛异常)。"""

    n: int
    """本轮抽到的职业行数。"""

    ok: bool
    """过没过塌方哨兵。"""

    prev: dict
    """上一版职业行索引。"""


@dataclass
class DetailDocIn:
    """to_emp_doc / to_occ_doc 的入参:落盘文档的两个变量格。"""

    fetched: str
    """本轮日期(两份产物同一个,不许跨午夜各算各的)。"""

    rows: list
    """全部行。"""


@dataclass
class WriteDetailsIn:
    """write_details 的入参:两份行 + 本轮刷新/保旧的社区名单。"""

    emp_rows: list
    """全部雇主行。"""

    occ_rows: list
    """全部职业行。"""

    refreshed: list
    """本轮真刷新的社区名。"""

    kept: list
    """本轮保旧的社区名。"""


# =========================================================================
# 3. quota 步(RCIP 社区名额状态)
# =========================================================================


@dataclass
class WindowIn:
    """window 的入参:从一句话里取匹配点周围的窗口作 quote。"""

    sent: str
    """整句(有些社区页整页没标点,一「句」上千字)。"""

    m: re.Match
    """匹配对象(窗口以 m.start() 为锚,不取句首)。"""


@dataclass
class ProvIn:
    """province_of 的入参:在社区对表里查一个社区的省码。"""

    known: dict
    """社区对表(名 → pilot-communities.json 的行)。"""

    name: str
    """社区官方名。"""


@dataclass
class ScanIn:
    """scan_slug 的入参:扫一个 crawl slug 的全部缓存页。"""

    slug: str
    """crawl 目录名(rcip-* / fcip-*)。"""

    community: str
    """社区官方名。"""

    province: str
    """省码。"""


@dataclass
class ScanOut:
    """scan_slug 的出参:该社区的职业满额行 + 社区级名额状态。"""

    occupations: list
    """职业满额行(空 ≠ 没有限额,只是官网没写)。"""

    community: dict
    """社区级名额状态(空 = 官网没写)。"""


@dataclass
class ScanPageIn:
    """scan_page 的入参:扫一个缓存页(结果原地累进 occ_rows / comm)。"""

    item: dict
    """manifest 里的一条页记录。"""

    root: Path
    """该 slug 的缓存根目录。"""

    community: str
    """社区官方名。"""

    province: str
    """省码。"""

    fetched: str
    """该轮 crawl 的日期(行的 asOf)。"""

    occ_rows: dict
    """职业满额行累加器(NOC → 行;首次命中即定,后面的不覆盖)。"""

    comm: dict
    """社区级状态累加器(首次命中即定,后面的不覆盖)。"""


@dataclass
class ScanSentIn:
    """scan_sentence 的入参:一句话过四条抽取规则(结果原地累进)。"""

    sent: str
    """待判的句子。"""

    url: str
    """该句所在页的 URL(落进 quote 的出处)。"""

    community: str
    """社区官方名。"""

    province: str
    """省码。"""

    fetched: str
    """该轮 crawl 的日期。"""

    occ_rows: dict
    """职业满额行累加器。"""

    comm: dict
    """社区级状态累加器。"""


@dataclass
class QuotaOccIn:
    """to_quota_occ_row 的入参:一条职业满额行的全部格。"""

    community: str
    """社区官方名。"""

    province: str
    """省码。"""

    noc: str
    """五位 NOC 码。"""

    fetched: str
    """证据日期。"""

    url: str
    """出处 URL。"""

    quote: str
    """官网原句窗口。"""


@dataclass
class LiveOut:
    """直连补抓函数的出参:社区级状态 + 职业行(本版两个社区都不产职业行)。"""

    community: dict
    """社区级名额状态(抓不到给空 dict)。"""

    occupations: list
    """职业满额行(本版恒空,形状对齐缓存那一路)。"""


@dataclass
class FetchLiveOut:
    """fetch_live 的出参:最终 URL(跟完重定向)+ 纯文本。"""

    url: str
    """跟完重定向后的最终 URL。"""

    text: str
    """去 tag、压空白后的纯文本。"""


@dataclass
class FlagsIn:
    """quota_flags 的入参:一个社区本轮扫出来的东西,拼成一行人话。"""

    occupations: list
    """该社区的职业满额行。"""

    community: dict
    """该社区的社区级状态。"""


@dataclass
class LiveScanIn:
    """scan_live 的入参:直连补抓要往里累加的结果集。"""

    known: dict
    """社区对表(查省码)。"""

    communities: list
    """社区级行累加器(原地追加)。"""

    occupations: list
    """职业满额行累加器(原地追加)。"""


@dataclass
class MergeLiveIn:
    """merge_live 的入参:一个直连社区的结果并进结果集。"""

    name: str
    """社区官方名。"""

    province: str
    """省码。"""

    today: str
    """直连当天(直连行的 asOf,与缓存行的 crawl 轮次日期不是一回事)。"""

    out: LiveOut
    """该社区的直连抽取结果。"""

    by_name: dict
    """社区名 → 已产出的社区级行(判该并还是该追加)。"""

    communities: list
    """社区级行累加器。"""

    occupations: list
    """职业满额行累加器。"""


@dataclass
class WriteQuotaIn:
    """write_quota / to_quota_doc 的入参:落盘文档的两个变量格。"""

    communities: list
    """全部社区级行。"""

    occupations: list
    """全部职业满额行。"""


# =========================================================================
# 4. communities 步(RCIP 试点社区名单)
# =========================================================================


@dataclass
class ParseCommIn:
    """parse_community_rows 的入参:官方名单页正文 + 两个 h3 标题锚的位置。

    批E 拆分改动:原第四格 franco_end(FCIP 段起点)随 Francophone 节的解析移去 fcip 域;
    本域只切 rural_end → franco_start 这一段。
    """

    html: str
    """官方名单页全文。"""

    rural_end: int
    """「Rural communities」h3 的结束位(RCIP 段起点)。"""

    franco_start: int
    """「Francophone communities」h3 的起始位(RCIP 段终点)。"""


@dataclass
class SegmentIn:
    """parse_segment 的入参:一段正文 + 它对应的试点类型(结果原地累进)。"""

    segment: str
    """该类型的名单区正文。"""

    ctype: str
    """试点类型(RCIP / FCIP)。"""

    rows: list
    """产出行累加器。"""

    seen: set
    """已收的 (社区名, 类型) 去重集。"""


@dataclass
class CommRowIn:
    """to_community_row 的入参:一个社区的四格。"""

    name: str
    """社区官方名(压过空白的显示名)。"""

    province: str
    """省码。"""

    ctype: str
    """试点类型。"""

    url: str
    """社区官方站 URL。"""


@dataclass
class CountTypeIn:
    """count_type 的入参:数某一试点类型的行数(哨兵用)。"""

    rows: list
    """全部社区行。"""

    ctype: str
    """要数的试点类型。"""


@dataclass
class CommDocIn:
    """to_communities_doc 的入参:落盘文档的两个变量格。"""

    source: str
    """官方名单页 URL。"""

    rows: list
    """全部社区行。"""
