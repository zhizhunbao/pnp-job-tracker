"""
jdformat 域行形状(照 company 三件套样张:边界行形状 = pydantic BaseModel,域内接线形状 = dataclass,
库类型用 Protocol 只声明真用的格;import 两个洞:标准库 / pydantic + 本域 constants)。
2026-10-04 加自测用例(unittest 是「不用 class」的外部库例外,先例 statcan.cip.scheme / gcjobs.scheme;
被测的 jdformat.functions 在用例体内现取 —— functions 反过来 import 本文件,顶部 import 会成环)。
"""
import unittest
from dataclasses import dataclass
from typing import Protocol

from pydantic import BaseModel, ConfigDict

from jdformat.constants import PII_MASK, ST_FAIL, ST_OK

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


class JdformatScrubTest(unittest.TestCase):
    """整理版抹联系方式(2026-10-04 付费闭环 B1 收口):写盘前抹、存量复洗,镜像 cms scrubPii。"""

    def test_scrub_golden(self) -> None:
        """金标:生产实撞的那条 [APPLY] 节(岗 79059478),邮箱与电话都换成占位,其余字不动。"""
        from jdformat.functions import scrub_pii_of
        src = "[APPLY]\nContact Dave Landry at 902-345-2229 or davidlandry@hotmail.ca"
        want = "[APPLY]\nContact Dave Landry at " + PII_MASK + " or " + PII_MASK
        self.assertEqual(scrub_pii_of(src), want)

    def test_scrub_shapes(self) -> None:
        """性质:常见邮箱 / 电话写法全抹(带国家码、括号区号、点分、分机);抹完再抹不变(幂等)。"""
        from jdformat.functions import scrub_pii_of
        samples = [
            "Email jobs@acme-foods.ca today",
            "Call +1 (416) 555-0199 ext. 23",
            "Phone 1-800-555-0100 or 613.555.0142",
            "Send to hr.team+ottawa@example.co.uk",
            "Tél. 514 555 0123 poste 4",
        ]
        for one in samples:
            once = scrub_pii_of(one)
            self.assertNotIn("@", once)
            self.assertIn(PII_MASK, once)
            self.assertEqual(scrub_pii_of(once), once)

    def test_scrub_keeps_other_numbers(self) -> None:
        """反例:薪资、工时、NOC 码、邮编、日期这类数字不是联系方式,一个字不动(数字防幻觉校验也靠它们)。"""
        from jdformat.functions import scrub_pii_of
        samples = [
            "[PAY]\n$25.00 to $30.00 hourly (to be negotiated)",
            "[WORKHOURS]\n40 hours per week, 2026-10-04 start",
            "NOC 63200, TEER 3, K2K 3G4",
            "Salary 52,000 - 61,000 per year",
        ]
        for one in samples:
            self.assertEqual(scrub_pii_of(one), one)

    def test_scrub_cache(self) -> None:
        """存量复洗:ok 记录里带联系方式的改写并计数,干净的与 fail 的不动;再洗一遍计 0。"""
        from jdformat.functions import scrub_cache
        dirty = FormatRecord(status=ST_OK, formatted="[APPLY]\nEmail a@b.ca")
        clean = FormatRecord(status=ST_OK, formatted="[APPLY]\nApply online")
        failed = FormatRecord(status=ST_FAIL, formatted="")
        cache = {"jb:1": dirty, "jb:2": clean, "jb:3": failed}
        self.assertEqual(scrub_cache(cache), 1)
        self.assertEqual(cache["jb:1"].formatted, "[APPLY]\nEmail " + PII_MASK)
        self.assertEqual(cache["jb:2"].formatted, "[APPLY]\nApply online")
        self.assertEqual(cache["jb:3"].status, ST_FAIL)
        self.assertEqual(scrub_cache(cache), 0)
