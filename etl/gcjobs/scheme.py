"""
gcjobs 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 careerbeacon/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types)。
本域形状三档:
① **事实行 JobFact** = dataclass —— 岗位页正文经 to_job_fact 归一;落 raw jobs.json 时由 asdict 转回 wire 字典,
  建仓时由 to_posting_row 转成 Job Bank 仓同形的行;
② **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体;
③ **库形状 Protocol** —— httpx 客户端/响应只声明本域真用的格(本域每次 GET 带头,所以 get 收 headers)。
import 只有标准库(叶子律:形状本域自声明,零跨域)。
§7 自测(2026-09-27 Frank 勾「ATS 工时、雇佣期、薪资和小修」随地点小修立):unittest 用例集 ——「不用 class」的外部库例外,
先例 ats.scheme / indexing.scheme,跑法 `python etl/gcjobs/main.py --only test`;被测的 gcjobs.functions 在用例体内现取
(functions 反过来 import 本文件,顶部 import 会成环)。

@author Frank
@time 2026-09-13
"""
import re
import unittest
from dataclasses import dataclass
from typing import Protocol


# =========================================================================
# 1. 共享词汇(HTTP 库形状 + 会话)
# =========================================================================


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的两格。"""

    text: str
    """响应体文本(壳 / 正文 HTML)。"""

    def raise_for_status(self) -> object:
        """非 2xx 抛错(单页失败按跳过留痕)。"""
        ...


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的一门(cookie 会话由客户端自己持)。"""

    def get(self, url: str, headers: dict) -> HttpResponseLike:
        """GET 一发,带本域的两个头(语言 / XHR 标)。"""
        ...


@dataclass
class Session:
    """一次会话:客户端 + 壳页里取到的会话 id(路径要嵌它)。"""

    client: HttpClientLike
    """已构造并已 GET 过壳页的客户端。"""

    sid: str
    """jsessionid。"""


# =========================================================================
# 2. 搜索分页枚举
# =========================================================================


@dataclass
class PageIn:
    """fetch_page() 入参(翻到第 n 页并取正文)。"""

    session: Session
    """当前会话。"""

    n: int
    """目标页号(1 = 首页,走首拉查询串)。"""


@dataclass
class ListRow:
    """列表里的一帖(六格原文;空串 = 没给)。"""

    title: str
    """标题。"""

    closing: str
    """截止(列表行 ISO 日期)。"""

    org: str
    """机构。"""

    location: str
    """地点原文。"""

    language: str
    """语言要求原文。"""

    salary: str
    """薪资原文。"""


@dataclass
class PagesOut:
    """collect_rows() 出参。"""

    rows: dict
    """帖号 → ListRow 的 wire 字典。"""

    pages: int
    """翻过的页数。"""


# =========================================================================
# 3. 岗位页抓取
# =========================================================================


@dataclass
class DetailBatchIn:
    """fetch_details() 入参(本轮要抓的帖号清单)。"""

    session: Session
    """当前会话。"""

    pids: list
    """待抓帖号(已剔缓存过的,已按本轮上限截断)。"""


@dataclass
class DetailBatchOut:
    """fetch_details() 出参。"""

    done: int
    """成功入缓存的张数。"""

    failed: int
    """正文两种判词都没有(会话失效 / 页改版)跳过的张数。"""


# =========================================================================
# 4. 岗位页解析
# =========================================================================


@dataclass
class JobFact:
    """一条帖子的原始事实(岗位页归一后;空串 = 页上没给)。"""

    posting_id: str
    """帖号。"""

    url: str
    """公开岗位页地址。"""

    external_url: str
    """站外跳转帖的雇主外链(站内帖空串)。"""

    title: str
    """标题。"""

    employer: str
    """机构。"""

    division: str
    """部门(机构行「 - 」后段)。"""

    location: str
    """地点原文(多地点全留)。"""

    city: str
    """城市(第一处地点;多地不定留空)。"""

    province: str
    """省码(第一处地点;认不出留空)。"""

    salary: str
    """薪资原文(岗位页字段格;站外帖用列表行的)。"""

    level: str
    """职级。"""

    who: str
    """谁能投。"""

    tenure: str
    """雇佣期文本(学生岗才有)。"""

    language: str
    """语言要求(列表行)。"""

    closing: str
    """截止日(ISO;认不出留空串)。"""

    description: str
    """正文各节纯文本(站外帖空串)。"""

    first_seen: str
    """本站首次解析到这帖的日期(ISO;站上不给发布日,拿它当发布日)。"""


@dataclass
class DetailIn:
    """to_job_fact() 入参(一张岗位页原文 + 列表行 + 帖号 + 解析日)。"""

    posting_id: str
    """帖号。"""

    html: str
    """岗位页正文原文。"""

    row: ListRow
    """列表行(站外帖的薪资 / 截止 / 地点从这来)。"""

    seen: str
    """解析日(ISO)。"""


@dataclass
class MatchIn:
    """match_text_of() 入参(一条正则 + 原文)。"""

    rx: re.Pattern
    """已编译正则(组 1 = 要的文本)。"""

    html: str
    """原文。"""


@dataclass
class Location:
    """地点归一结果。"""

    city: str
    """城市(认不出留空串)。"""

    province: str
    """省码(认不出留空串)。"""


@dataclass
class ParseTally:
    """parse_gcjobs_details() 的计数器。"""

    parsed: int
    """本轮新解析的张数。"""

    skipped: int
    """已解析过跳过的张数。"""

    missing: int
    """在列但缓存里没有原文的张数。"""


# =========================================================================
# 5. 站外正文
# =========================================================================


@dataclass
class ExternalFetchIn:
    """fetch_external() 入参(一张外站页)。"""

    client: HttpClientLike
    """礼貌档客户端(外站证书五花八门,verify 关)。"""

    url: str
    """外站地址(已修坏前缀、已解实体)。"""


@dataclass
class ExternalTally:
    """scrape_gcjobs_external() 的计数器。"""

    fetched: int
    """本轮取回(含缓存命中)的页数。"""

    extracted: int
    """抽到正文(≥ EXTERNAL_MIN_LEN)的页数。"""

    thin: int
    """取回了但抽不出正文的页数(JS 壳 / 机器人验证页)。"""

    failed: int
    """网络失败的页数(不记账,下轮再拉)。"""


# =========================================================================
# 6. postings 仓
# =========================================================================


@dataclass
class PostingRowIn:
    """to_posting_row() 入参(一条事实 + 本轮时刻)。"""

    fact: JobFact
    """归一后的事实。"""

    seen_at: str
    """本轮建仓时刻(ISO Z)。"""

    external_text: str
    """站外正文(external.json 里这一帖抽到的);空串 = 没有,照 GC Jobs 页的描述。"""


@dataclass
class StoreTally:
    """build_gcjobs_postings() 的计数器。"""

    rows: int
    """入仓行数。"""

    gone: int
    """事实表里有、本轮列表已不在列的帖数。"""

    expired: int
    """已过截止日的帖数。"""

    blank: int
    """无标题(解析残缺)的帖数。"""


# =========================================================================
# 7. 自测(用例住 scheme)
# =========================================================================


class GcLocationTest(unittest.TestCase):
    """地点归一自测(2026-09-27 Frank 勾「ATS 工时、雇佣期、薪资和小修」):location_of 的「City (Province)」主路与
    「City, Province / City, XX」退路金标(原文取自 raw 事实里的真帖)+ 全省名省码穷举性质 + 尾随说明不改结果。
    只喂字符串,不联网、不读仓内文件。"""

    golden = [
        ("Wabush (Newfoundland and Labrador)", "Wabush", "NL"),
        ("Regina (Saskatchewan) ⚠️Applicants are encouraged to apply ONLY if they are able to relocate", "Regina", "SK"),
        ("Cambridge Bay (Nunavut), Iqaluit (Nunavut), Rankin Inlet (Nunavut) *In the Spirit of the Nunavut Agreement",
         "Cambridge Bay", "NU"),
        ("National Capital Region - Other locations (Ontario)", "", "ON"),
        ("Ottawa (Ontario), Gatineau, Quebec", "Ottawa", "ON"),
        ("Tsuut'ina, Alberta", "Tsuut'ina", "AB"),
        ("Regina, Saskatchewan *Applicants are encouraged to apply ONLY if they are able to relocate or commute to the "
         "advertised location of work.", "Regina", "SK"),
        ("Radium Hot Springs, BC or Field, BC or Lake Louise, AB depending on the position being filled", "Radium Hot Springs", "BC"),
        ("Lake Louise-Yoho Operating Area (Lake Louise, AB)", "Lake Louise", "AB"),
        ("Pê Sâkâstêw Center (Mâskwâcîs, Alberta), Kwìkwèxwelhp Healing Village (Harrison Mills, British Colombia)",
         "Mâskwâcîs", "AB"),
        ("501 Tollgate Rd E, Cornwall, ON", "Cornwall", "ON"),
        ("Ottawa, Ontario (Canada)", "Ottawa", "ON"),
        ("Québec, Québec", "Québec", "QC"),
        ("Various Locations", "", ""),
        ("Various locations across Canada. Recruits are trained at the Canada Border Services College in Rigaud, Quebec.",
         "", ""),
        ("Montréal - Other locations, Québec", "", ""),
        ("Successful applicants who are accepted as a cadet with the RCMP, will begin an extensive 26-week training program "
         "at Depot, the RCMP Academy in Regina, SK. *** Note that Regina will be the choice of work location", "", ""),
        ("Charlottetown, PEI", "", ""),
        ("Iqaluit, on a rotational basis", "", ""),
        ("Iqaluit, ON-call rotation", "", ""),
        ("Jobs are located in Nunavut: Iqaluit, Cambridge Bay, Rankin Inlet, Pangnirtung, Pond Inlet, and other locations "
         "in Nunavut", "", ""),
        ("Nova Scotia", "", ""),
        ("Fundy National Park", "", ""),
        ("⭐", "", ""),
        ("", "", ""),
    ]
    """(地点原文, 城, 省码) 金标:前五条是括号主路(含尾随 ⚠ / * 说明、Other locations 只留省、括号优先于后面的逗号写法);
    中间八条是逗号退路认回的(Tsuut'ina / Regina / Radium Hot Springs / Lake Louise / Mâskwâcîs 是在列真帖,Cornwall 已下架);
    后面全留空:Various、Other locations、叙述句(RCMP 那句的「Regina, SK」前面是「the RCMP Academy in」)、
    非标准缩写 PEI、小写 on、ON-call、多地清单、光省名、公园名、表情、空串。"""

    names = {
        "Alberta": "AB", "British Columbia": "BC", "Colombie-Britannique": "BC", "Manitoba": "MB",
        "New Brunswick": "NB", "Nouveau-Brunswick": "NB", "Newfoundland and Labrador": "NL",
        "Terre-Neuve-et-Labrador": "NL", "Nova Scotia": "NS", "Nouvelle-Écosse": "NS",
        "Northwest Territories": "NT", "Territoires du Nord-Ouest": "NT", "Nunavut": "NU", "Ontario": "ON",
        "Prince Edward Island": "PE", "Île-du-Prince-Édouard": "PE", "Quebec": "QC", "Québec": "QC",
        "Saskatchewan": "SK", "Yukon": "YT",
    }
    """独立对照尺:省名(英法)→ 省码,在用例里现写,不经被测模块的表。"""

    def test_location_golden(self) -> None:
        """地点原文 → (城, 省码) 金标。"""
        from gcjobs import functions as fn
        for text, city, province in self.golden:
            with self.subTest(text=text):
                loc = fn.location_of(text)
                self.assertEqual((loc.city, loc.province), (city, province))

    def test_every_province_both_forms(self) -> None:
        """穷举性质:每个省名 × 有无尾随说明(`*…` / `⚠️…`)——「Townsville (省名)」「Townsville, 省名」「Townsville, 省码」
        都取回 (Townsville, 码);省码小写、省码后接字母(PEI 式)或连字符(ON-call 式)都不认,城省留空。"""
        from gcjobs import functions as fn
        for name, code in self.names.items():
            for tail in ("", " *Applicants are encouraged to apply", " ⚠️Note: relocation required"):
                for text in ("Townsville (" + name + ")" + tail, "Townsville, " + name + tail, "Townsville, " + code + tail):
                    loc = fn.location_of(text)
                    self.assertEqual((loc.city, loc.province), ("Townsville", code), text)
            for text in ("Townsville, " + code.lower(), "Townsville, " + code + "I", "Townsville, " + code + "-call"):
                loc = fn.location_of(text)
                self.assertEqual((loc.city, loc.province), ("", ""), text)

    def test_footnote_never_changes(self) -> None:
        """性质:金标每条原文后面再接一段 `*…` 或 `⚠️…` 说明(说明里夹着一个干净的「Note: 城市, 省」,不截断就会被逗号退路认走),
        结果不变;城有值时省必有值。"""
        from gcjobs import functions as fn
        for text, city, province in self.golden:
            for tail in (" *Note: Halifax, Nova Scotia", " ⚠️Note: Halifax, NS"):
                with self.subTest(text=text, tail=tail):
                    loc = fn.location_of(text + tail)
                    self.assertEqual((loc.city, loc.province), (city, province))
                    if loc.city != "":
                        self.assertNotEqual(loc.province, "")
