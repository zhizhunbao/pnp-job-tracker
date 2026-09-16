"""
classify 域行形状(照 jdformat 样张:边界行形状 = pydantic BaseModel,域内接线形状 = dataclass,
库类型用 Protocol 只声明真用的格;import 两个洞:标准库 / pydantic + 本域 constants)。
"""
from dataclasses import dataclass
from typing import Protocol

from pydantic import BaseModel, ConfigDict

from classify.constants import FIELD_NONE, ST_FAIL

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""边界模型统一配置:多余键忽略、按字段名构造照常、逐格裸字符串 docstring 直接成为字段 description。"""

# =========================================================================
# 1. 库形状(只声明本域真用的格)
# =========================================================================


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的格。"""

    is_success: bool
    """2xx 判定。"""

    status_code: int
    """HTTP 状态码。"""

    def json(self) -> object:
        """响应体按 JSON 解析(Ollama 回包)。"""
        ...


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的格:只有 post。Pyrefly 对 Protocol 实参判定保守,不认 httpx.Client 的
    结构等价 —— 装配点用 typing.cast 喂真客户端(断言只住装配点)。"""

    def post(self, url: str, *, json: object) -> HttpResponseLike:
        """POST JSON 体(关键字参是库形状特批)。"""
        ...


# =========================================================================
# 2. 产物记录(对外文件契约,mart 汇装直读)
# =========================================================================


class LabelRecord(BaseModel):
    """jobs.json 的值:一岗一份分类记录。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    status: str = ST_FAIL
    """ok / fail(fail 含弃权 —— 结果都是留空,由头看 note)。"""

    noc: str = FIELD_NONE
    """判出的五位职业码(fail 为空串)。"""

    method: str = FIELD_NONE
    """判法:model = 候选检索 + 模型选择。"""

    cands: list[str] = []
    """给过模型的候选码(留痕:复核时看真码在不在候选里 —— 不在就是检索层的锅,在就是判定层的锅)。"""

    model: str = FIELD_NONE
    """判定用的模型名。"""

    v: int = 0
    """判定口径版本号(CLASSIFY_V;版本不对当没判过)。"""

    at: str = FIELD_NONE
    """判定时刻(ISO)。"""

    note: str = FIELD_NONE
    """失败 / 弃权由头(abstain / off-list code / empty answer / 异常类名)。"""


# =========================================================================
# 3. 岗位与语料行
# =========================================================================


@dataclass
class JobDoc:
    """一条待判岗位(mart 行洗净后的形:值级清洗全在读取门做完,后面函数入参一律已有效)。"""

    ext: str
    """externalId(记录键)。"""

    title: str
    """职位标题。"""

    body: str
    """岗位正文(已截断;没有正文就是空串)。"""

    noc: str
    """mart 里已有的职业码(非空 = 源带码或规则已判,本域不碰它,只拿它剪记录与挑待判)。"""

    origin: str
    """渠道(试点分层抽样用)。"""

    city: str
    """城市(只进核对表)。"""

    date_posted: str
    """发布日(排队序)。"""

    title_en: str = ""
    """英译标题(只有检索太弱的法语帖才会翻;空 = 没翻过,检索与提示词都用原标题)。"""


@dataclass
class NocDoc:
    """一条官方职业(候选检索的语料行)。"""

    noc: str
    """五位码。"""

    title: str
    """官方类名。"""

    duties: str
    """职责摘要(进候选表给模型看的那几条)。"""

    text: str
    """进嵌入的整段语料(类名 + 示例职称 + 职责)。"""


@dataclass
class CandScore:
    """一个候选:码 + 与岗位的相似度。"""

    noc: str
    """五位码。"""

    score: float
    """余弦相似度(向量已归一,点积即余弦)。"""


# =========================================================================
# 4. 接线入参(一函数一参,XxxIn 形)
# =========================================================================


@dataclass
class LlmCfg:
    """盒子接线:判定与嵌入共用一个基址,两个模型名。"""

    base: str
    """Ollama 基址(末尾斜杠已削)。"""

    model: str
    """判定模型名。"""

    embed_model: str
    """嵌入模型名。"""


@dataclass
class EmbedIn:
    """embed_texts 的入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    cfg: LlmCfg
    """盒子接线。"""

    texts: list[str]
    """待编码文本(一批)。"""


@dataclass
class PickTodoIn:
    """pick_todo 的入参。"""

    jobs: list[JobDoc]
    """未分类的在招岗(已按发布日新→旧排序)。"""

    cache: dict[str, LabelRecord]
    """上轮产出的记录表。"""

    limit: int
    """本轮上限。"""


@dataclass
class CandsIn:
    """cands_of 的入参。"""

    vec: list[float]
    """岗位向量(标题 + 正文,已归一)。"""

    vec_title: list[float]
    """标题单独一次的向量(已归一);每个码取两次里的最好成绩,补正文稀释标题的漏。"""

    docs: list[NocDoc]
    """语料行(与 mat 同序)。"""

    mat: list[list[float]]
    """语料向量表(已归一)。"""


@dataclass
class CandsOut:
    """cands_of 的出参:候选表 + 纯标题那一路的最高分。"""

    cands: list["CandScore"]
    """候选(按两路取高后的相似度降序)。"""

    title_top: float
    """**纯标题**查询的最高分 —— 判「这条帖的语言跟英文语料对不上」只能看它:
    正文那一路分数普遍不低(法语帖也能凑到 0.5),用合并后的分数当闸,补救路一次都不会触发(实撞)。"""


@dataclass
class CandsAllOut:
    """cands_all_of 的出参:一轮所有岗的候选与纯标题最高分(与 todo 同序)。"""

    cands_all: list[list["CandScore"]]
    """每条岗的候选。"""

    title_tops: list[float]
    """每条岗纯标题那一路的最高分。"""


@dataclass
class TitleEnIn:
    """title_en_of 的入参:把一个标题翻成英文。"""

    client: "HttpClientLike"
    """HTTP 客户端。"""

    cfg: "LlmCfg"
    """盒子接线。"""

    title: str
    """原标题(可能是法语)。"""


@dataclass
class CandsAllIn:
    """cands_all_of 的入参:一轮里所有岗的候选一次算完。"""

    todo: list[JobDoc]
    """本轮的岗。"""

    vecs: list[list[float]]
    """岗位向量(一岗 QUERIES_PER_JOB 条,成对排列)。"""

    docs: list[NocDoc]
    """语料行。"""

    mat: list[list[float]]
    """语料向量表。"""


@dataclass
class FixWeakIn:
    """fixed_weak_cands 的入参:把检索太弱的那批翻成英文重查。"""

    client: "HttpClientLike"
    """HTTP 客户端。"""

    cfg: "LlmCfg"
    """盒子接线。"""

    todo: list[JobDoc]
    """本轮的岗。"""

    cands_all: list[list["CandScore"]]
    """第一次检索的候选(与 todo 同序;弱的那几条会被原地换掉)。"""

    title_tops: list[float]
    """每条岗纯标题那一路的最高分(判谁要走补救路)。"""

    docs: list[NocDoc]
    """语料行。"""

    mat: list[list[float]]
    """语料向量表。"""


@dataclass
class DotIn:
    """dot_of 的入参:一个查询向量与一条语料向量。"""

    vec: list[float]
    """查询向量(已归一)。"""

    row: list[float]
    """语料向量(已归一)。"""


@dataclass
class ClassifyOneIn:
    """classify_one 的入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    cfg: LlmCfg
    """盒子接线。"""

    job: JobDoc
    """待判岗位。"""

    cands: list[CandScore]
    """候选(按相似度降序)。"""

    doc_of: dict[str, NocDoc]
    """码 → 语料行(拼候选表要官方类名与职责)。"""


@dataclass
class LlmCallIn:
    """call_llm 的入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    cfg: LlmCfg
    """盒子接线。"""

    prompt: str
    """提示词。"""

    tokens: int
    """本次生成的 token 上限(选码只要一个码,翻标题要宽一点)。"""


@dataclass
class RoundIn:
    """run_round 的入参(一轮的全部接线)。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    cfg: LlmCfg
    """盒子接线。"""

    todo: list[JobDoc]
    """本轮要判的岗。"""

    cache: dict[str, LabelRecord]
    """记录表(原地写,按 FLUSH_N 落盘)。"""


@dataclass
class RoundOut:
    """run_round 的出参:一轮的三个计数与中止由头。"""

    ok: int
    """判出码的条数。"""

    abstain: int
    """模型弃权的条数。"""

    fail: int
    """其余失败的条数。"""

    abort: str
    """整轮中止的由头(空串 = 没中止)。"""


# =========================================================================
# 5. 试点(人工核对一轮;不是数据链的一部分)
# =========================================================================


@dataclass
class TallyIn:
    """add_tally 的入参:累加器 + 这条记录归的档。"""

    got: "RoundOut"
    """本轮计数(原地累加)。"""

    bucket: str
    """档名:ST_OK / NOTE_ABSTAIN / ST_FAIL。"""


@dataclass
class SaveIn:
    """run_and_save 的入参(两个入口共用的收尾:客户端在收尾里才真造,这里只带接线与料)。"""

    cfg: LlmCfg
    """盒子接线。"""

    todo: list[JobDoc]
    """本轮要判的岗。"""

    cache: dict[str, LabelRecord]
    """记录表(原地写)。"""


@dataclass
class PilotRowIn:
    """pilot_row_of 的入参:核对表的一行。"""

    job: JobDoc
    """这一行的岗。"""

    cache: dict[str, LabelRecord]
    """判定记录表。"""

    doc_of: dict[str, NocDoc]
    """码 → 语料行(取官方类名)。"""


@dataclass
class SampleIn:
    """sample_jobs 的入参。"""

    jobs: list[JobDoc]
    """全部未分类在招岗。"""

    n: int
    """抽样总量。"""

    seed: int
    """随机种子(定死,便于复跑对齐)。"""


@dataclass
class PickByExtsIn:
    """picked_by_exts 的入参:按钉死的清单从池子里取岗。"""

    jobs: list[JobDoc]
    """当前的未分类在招岗。"""

    exts: list[str]
    """钉死的 externalId 清单(上次抽样的结果)。"""


@dataclass
class WritePilotIn:
    """write_pilot 的入参。"""

    jobs: list[JobDoc]
    """抽样到的岗(核对表按这个序写)。"""

    cache: dict[str, LabelRecord]
    """判定记录表。"""

    doc_of: dict[str, NocDoc]
    """码 → 语料行(核对表要官方类名)。"""
