"""pte.scheme — 形状(题型分组 Group / 整库装配入参 BankIn)。

2026-09-01 立域。抓取客户端形状复用 fetch 域的 HttpClientLike(叶子零依赖,
装配点直喂真 httpx 客户端);本域只声明自己的产出形状。全 dataclass(属性访问,
json 键只在 functions 的 to_* 行构造器里出现)。
"""
from dataclasses import dataclass

import httpx
from datetime import date
from pathlib import Path
from typing import Protocol


class HttpHeadersLike(Protocol):
    """响应头形状(pte 只用 get 一门:X-WP-TotalPages 分页计数)。"""

    def get(self, name: str) -> str | None:
        """按头名取值;缺席 None(调用方显式判,不静默)。"""


class HttpRespLike(Protocol):
    """HTTP 响应形状(本域真用的格自声明,照 fetch.scheme 同律 —— 不跨域借形)。"""

    status_code: int
    """状态码(200/401 判定)。"""

    text: str
    """响应正文(raw 快照落盘)。"""

    content: bytes
    """响应字节(mp3 资产落盘)。"""

    headers: HttpHeadersLike
    """响应头(分页计数)。"""

    def json(self) -> object:
        """正文解析成 JSON 值。"""


class HttpClientLike(Protocol):
    """HTTP 客户端形状(pte 只用 get 一门;装配点直喂真 httpx 客户端,鸭子类型)。"""

    def get(self, url: str) -> HttpRespLike:
        """GET 一发。"""


@dataclass
class Group:
    """一个题型分组(bundle 里一个 `const r=[…]` 数据模块的解析结果)。"""

    label: str
    """best-effort 人话标签;拿不准 = 空串(靠 signature + array_index 人工核)。"""

    signature: str
    """字段签名 = 首题排序键名 join(题型指纹)。"""

    array_index: int
    """bundle 内数组序号(标签留空时定位用)。"""

    questions: list
    """本组题目(原样 dict,私有研究不做二次清洗)。"""


@dataclass
class BankIn:
    """to_bank() 入参(整库产物装配)。"""

    bundle_url: str
    """bundle 地址(出处)。"""

    fetched: str
    """抓取日期(ISO)。"""

    groups: list
    """全部分组(Group 清单)。"""


@dataclass
class CloseIn:
    """close_index_of() 入参(bracket 配平)。"""

    src: str
    """bundle 全文。"""

    start: int
    """起始 `[` 的下标。"""


@dataclass
class GroupIn:
    """group_of() 入参(一个数据模块 → Group)。"""

    array_index: int
    """bundle 内数组序号。"""

    questions: list
    """已解析的题目清单(非空,run 已滤空)。"""


@dataclass
class SnapshotIn:
    """snapshot_bundle() 入参(bundle 原文留痕)。"""

    url: str
    """bundle 地址(抽 hash 命名)。"""

    text: str
    """bundle 原文。"""


@dataclass
class DiffIn:
    """diff_of() 入参(本轮 vs 上轮,按题型签名 + 题 id 比对)。"""

    prev_groups: list
    """上一轮分组清单(基准)。"""

    cur_groups: list
    """本轮分组清单。"""


@dataclass
class RadarIn:
    """radar() 入参(机经雷达一轮:读旧库当基准 → diff → 写 prev/changes)。
    2026-09-01 路径入参化:ptebank 第二源接入,ynwac/ptebank 共用一个 radar 实现(行为不复制)。"""

    cur_payload: dict
    """本轮整库产物(to_bank/to_pb_bank 出品;写盘前先过雷达)。"""

    bank: Path
    """现行库(旧库 = diff 基准;不存在 = 首轮建档)。"""

    prev: Path
    """基准落盘位(写新库前旧库挪这)。"""

    changes: Path
    """变更落盘位(新题/消失题清单)。"""


@dataclass
class VoteGetIn:
    """vote_get() 入参(登录态一发 GET)。"""

    client: HttpClientLike
    """带 Authorization 头的客户端(装配点 cast 真 httpx,本域只 .get)。"""

    url: str
    """目标 API 地址。"""


@dataclass
class CollectIn:
    """collect_code() 入参(一个题型代码从 id=1 探到头)。"""

    client: HttpClientLike
    """带鉴权头的客户端(装配点 cast 真 httpx)。"""

    code: str
    """题型代码(候选表里的一个)。"""


@dataclass
class PbRowIn:
    """to_pb_row() 入参(一条 WP 帖 → 洗净 row;ptebank 第二源)。"""

    post: dict
    """WP 帖原始对象(_fields 收窄后的格)。"""

    cats: dict
    """分类映射 {id: {slug, name}}(id 换译 slug 用)。"""


@dataclass
class PbGroupsIn:
    """pb_groups_of() 入参(全部 row → 按分类 slug 集分组)。"""

    rows: list
    """洗净 row 清单(to_pb_row 出品)。"""

    cats: dict
    """分类映射 {id: {slug, name}}(组 label 取人话名用)。"""


@dataclass
class PbBankIn:
    """to_pb_bank() 入参(ptebank 整库产物装配)。"""

    fetched: str
    """抓取日期(ISO)。"""

    groups: list
    """全部分组(pb_groups_of 出品的组 dict 清单)。"""


class DkPageLike(Protocol):
    """浏览器页形状(duoink 渲染态只用两门:导航 + 跑 JS;装配点 cast 真 playwright Page)。"""

    def goto(self, url: str, wait_until: str, timeout: int) -> object:
        """导航到 url,按 wait_until 条件等到 timeout 毫秒。"""

    def evaluate(self, script: str) -> object:
        """在页内跑一段 JS,返回其 JSON 值。"""


@dataclass
class DkPageIn:
    """dk_list_of() 入参(一个题型的列表页 → Vuex items)。"""

    page: DkPageLike
    """已登录 profile 起的页。"""

    part: str
    """站内题型键。"""


@dataclass
class DkEntryIn:
    """dk_entry_of() 入参(一道题的题页 → 正文 + 题图)。"""

    page: DkPageLike
    """已登录 profile 起的页。"""

    part: str
    """站内题型键。"""

    eid: str
    """题 id(ObjectId)。"""


@dataclass
class DkImagesIn:
    """dk_images_fetch() 入参(一题的题图清单 → 落盘)。"""

    client: HttpClientLike
    """公开直链客户端(装配点 cast 真 httpx)。"""

    urls: list
    """题图地址清单(已剔头像)。"""


class XjPageLike(Protocol):
    """浏览器页形状(猩际用四门:当前地址 / 导航 / 页内跑带参 JS / 挂请求监听;装配点 cast crawl 域
    get_browser_page 给的 async playwright Page —— 猩际必须走 crawl 域浏览器,见 constants §15 ⑥)。"""

    url: str
    """当前地址(站点自跳后从中读题号)。"""

    async def goto(self, url: str, wait_until: str, timeout: int) -> object:
        """导航到 url,按 wait_until 条件等到 timeout 毫秒。"""

    async def evaluate(self, script: str, arg: object) -> object:
        """在页内跑一段 JS(arg 作实参),返回其 JSON 值。"""

    def on(self, event: str, handler: object) -> None:
        """挂页面事件监听(request:截页面自发的接口地址)。"""


@dataclass
class XjListIn:
    """xj_list_of() 入参(一个题型 → 沿 next_num 链走完预测清单)。"""

    page: XjPageLike
    """已登录 profile 起的页。"""

    model: str
    """站内题型键。"""

    urls: list
    """本页发出的请求地址收集槽(request 监听往里 append;每型开页前清空)。"""


@dataclass
class XjUrlIn:
    """xj_url_with_num() 入参(截到的接口地址 + 目标题号 → 只换 num 的地址)。"""

    seed: str
    """页面自发的 single_num_v2 完整地址(鉴权/过滤参数齐)。"""

    num: int
    """要请求的题号。"""


@dataclass
class XjExamIn:
    """xj_exam_pull() 入参(截到的流地址 + 停机线 → 新条目)。"""

    page: XjPageLike
    """已登录 profile 起的页(页内 fetch)。"""

    seed: str
    """页面自发的 comments/exam 完整地址(鉴权参数齐;去 commentable_id/filter 后成全站流)。"""

    known_id: int
    """上次已存的最大评论 id(0 = 首轮)。"""

    cutoff: str
    """回溯深度线(YYYY-MM-DD;本页最新提交早于它即停)。"""


@dataclass
class XjExamUrlIn:
    """xj_exam_url_of() 入参(流地址 + 页码 → 本页地址)。"""

    seed: str
    """页面自发的 comments/exam 完整地址。"""

    page: int
    """页码(1 起)。"""


@dataclass
class XjGroupIn:
    """xj_group_of() 入参(一个题型的预测清单 + 该型考试记录 → bank 分组)。"""

    model: str
    """站内题型键。"""

    predicted: list
    """列表步的明文行(id / exam_count …)。"""

    dates: dict
    """{题号: [exam_date …]}(流步产物按该型筛出)。"""


@dataclass
class XjSignalsIn:
    """xj_signals_of() 入参(bank → 信号表;未来日期按 today 剔)。"""

    today: date
    """基准日。"""


@dataclass
class XjRowIn:
    """xj_row_of() 入参(一次 single_num_v2 响应 → 一题明文行)。"""

    num: int
    """本次请求的题号(= 题 id)。"""

    resp: object
    """接口返回的 JSON 值(形状不对 = None 行,由上层断链留痕)。"""


@dataclass
class PteQuestionIn:
    """to_pte_question_row() 入参(一条索引行 + 三张查表 → 一行 mart 题行)。"""

    row: dict
    """索引行(type / source / id / title / flags / audio)。"""

    banks: dict
    """{源: {(型, id 串): 库内题 dict}}(题面/答案从这取)。"""

    signals: dict
    """{(源, 型, id 串): recent 四格}。"""

    media: dict
    """{(源, 型, id 串, 种类): (url, 本地文件或 None)}。"""

    fetched: str
    """出表日期。"""


@dataclass
class QuestionTextIn:
    """question_text_of() / question_answer_of() / question_num_of() 入参(源 + 型 + 库内题 → 一格)。"""

    source: str
    """来源(ynwac / duoink)。"""

    qtype: str
    """标准题型码。"""

    q: dict
    """库内题 dict(各源原形)。"""


@dataclass
class DkSegmentIn:
    """dk_segment_of() 入参(duoink 一词一行正文 → 标记之间的一段拼成句)。"""

    text: str
    """题页整段正文。"""

    mark: str
    """起点标记(标记行之后开始)。"""


@dataclass
class RecentRowIn:
    """recent_row_of() 入参(一条索引行 + 该题的回忆信号 → 带四格的行)。"""

    row: dict
    """索引行(source/type/id/title/flags/audio)。"""

    signal: dict | None
    """回忆信号 {seen, seen_n, freq, votes};None = 该源没这题的记录(四格全 null)。"""


@dataclass
class RecentSummaryIn:
    """recent_summary_of() 入参(全部行 → 分源分型窗口盘点)。"""

    rows: list
    """带四格的行清单。"""

    today: date
    """窗口计算基准日(抓取日)。"""


@dataclass
class DaysIn:
    """days_since() 入参(回忆日期 → 距基准日天数)。"""

    seen: str
    """回忆日期(YYYY-MM-DD)。"""

    today: date
    """基准日。"""


@dataclass
class MediaRowIn:
    """media_row_of() 入参(一条媒体 URL → 映射行;file 有无由 local 落盘现状定)。"""

    source: str
    """来源(ynwac/ptebank)。"""

    qid: object
    """题目 id(两库 id 类型不一,原样携带)。"""

    qtype: str
    """标准题型码(签名/分类换译后)。"""

    kind: str
    """媒体种类(image/audio)。"""

    url: str
    """媒体源地址(绝对)。"""

    local: Path
    """预期落盘位(存在 → 相对路径进 file;不存在 → file=null 留痕)。"""


@dataclass(frozen=True)
class TtsOneIn:
    """tts_one() 入参(一题 → 一个音频文件 + 一条索引行)。"""

    voice: object
    """piper 声音(PiperVoice 实例;可选依赖,形状不在本域声明)。"""

    text: str
    """要读的英文题面。"""

    qid: str
    """题键(文件名由它派生)。"""

    mp3: bool
    """ffmpeg 在(转 mp3 删 wav);不在留 wav。"""


@dataclass(frozen=True)
class DictRowIn:
    """dict_row_of() 入参(一条词典命中 → 一行 mart)。"""

    hit: dict
    """本词在 ECDICT 里的行(phonetic / translation / exchange / word)。"""

    base: dict
    """原形表(原形 → 其 ECDICT 行),屈折形借释义用。"""


class WnWord(Protocol):
    """WordNet 词条(wn.Word)在本域只读的三格。"""

    pos: str
    """词性码(n / v / a / s / r)。"""

    def lemma(self) -> str:
        """词形。"""
        ...

    def senses(self) -> list:
        """各义项。"""
        ...


class WnSense(Protocol):
    """WordNet 义项(wn.Sense)在本域只用的两格。"""

    def get_related(self, *args: str) -> list:
        """按关系名取关联义项。"""
        ...

    def word(self) -> WnWord:
        """义项所属词条。"""
        ...


class WnLexicon(Protocol):
    """WordNet 词库(wn.Wordnet)在本域只用的一格。"""

    def words(self, form: str) -> list:
        """按词形查词条。"""
        ...


@dataclass
class FamilyIn:
    """family_of() 入参(一词 → 派生词族)。"""

    lexicon: WnLexicon
    """WordNet 词库实例(自声明 Protocol,可选依赖的形状不进本域)。"""

    word: str
    """本词(小写)。"""

    lemma: str
    """原形;空串 = 本身就是原形。"""


@dataclass
class TranslateIn:
    """translate_batch() 入参(一批句子 → 一批译文)。"""

    client: httpx.Client
    """复用的 HTTP 客户端。"""

    sentences: list
    """英文句子清单。"""


@dataclass
class SentenceRowsIn:
    """sentence_rows_of() 入参(题行 + 翻译缓存 → 句表行)。"""

    rows: list
    """mart 题行。"""

    cache: dict
    """翻译缓存 {sha1: {en, zh}}。"""


@dataclass
class SnippetTitleIn:
    """索引标题是不是题面片段的判定入参。"""

    title: str
    """索引标题。"""

    text: str
    """mart 题面。"""
