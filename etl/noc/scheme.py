"""
noc 域形状(照 pnp/company 样张;2026-08-31 并域批C)。

全是域内接线形状(XxxIn)= dataclass:一参令下多入参收编的口袋,不是外来数据,
校验加不了值。边界(StatCan CSV / structure.json)是 dict 直读,键词汇住 constants
的 K_ 词族与 to_* 行构造器体内。段横幅与 constants/functions 同名同序镜像;
第 2/4 段无形状,占位横幅保留镜像编号。
2026-08-31 批I3 溶段:批H2 归户进来的步骤文件(translate_noc_titles / shorten_noc_titles)
溶成段6/7(build_city_names 曾同批溶成段8,2026-08-31 迁 mart 域段20,占位横幅随迁摘除),
本段起的形状全是新增。`import re` 是标准库(叶子律允许):
段7 的三语规格表带编译好的正则,ShortSpec 要给它一个真类型,裸 object 让检查器判不动。
"""
import re
from dataclasses import dataclass

# =========================================================================
# 1. 分类库(NOC → TEER/大类/中类/小类)
# =========================================================================


@dataclass
class LabelIn:
    """label_of 的入参:查官方类别名。"""

    code: str
    """层级码(1 位大类 / 3 位中类 / 4 位小类)。"""

    lang: str
    """语言码(zh/ko/en/enShort)。"""


@dataclass
class BroadI18nIn:
    """broad_i18n 的入参:大类的英/韩名。"""

    noc: str | None
    """5 位 NOC(可缺,缺即未分类)。"""

    lang: str
    """语言码(ko 取韩文,其余取英文)。"""


@dataclass
class MidIn:
    """mid_of 的入参:中类人话桶名。"""

    noc: str | None
    """5 位 NOC(可缺,缺即未分类)。"""

    lang: str
    """语言码(zh 取桶名本名,其余查 I18N)。"""


@dataclass
class FineIn:
    """fine_of 的入参:小类官方人话名。"""

    noc: str | None
    """5 位 NOC(可缺,缺即未分类)。"""

    lang: str
    """语言码(决定取 zhUi/koUi/enUi 哪格)。"""


# =========================================================================
# 2. 浏览分类桶(纯常量段,无形状 —— 镜像占位)
# =========================================================================

# =========================================================================
# 3. structure 步(官方层级 + 三语人话名)
# =========================================================================


@dataclass
class ParseIn:
    """parse_structure_rows 的入参:CSV 全文 + 旧译文表。"""

    text: str
    """官方层级 CSV 全文(缓存或现下载)。"""

    old: dict
    """旧 structure.json 的 levels(增量续跑种子;--retranslate 时给空 dict)。"""


@dataclass
class LevelSeedIn:
    """to_level_entry 的入参:一行官方层级 + 旧译文。"""

    lvl: int
    """官方层级(1=大类 3=中类 4=小类)。"""

    code: str
    """层级码。"""

    title: str
    """官方英文全名(引用依据,永不改)。"""

    prev: dict
    """旧 structure.json 里同码条目(增量续跑:已翻的沿用;没有给空 dict)。"""


@dataclass
class FillIn:
    """fill_translations 的入参:待补翻的层级表与节奏开关。"""

    levels: dict
    """层级表(原地补格)。"""

    limit: int
    """只翻前 N 条(0 = 不限;--limit 调试用)。"""


@dataclass
class TranslateIn:
    """translate 的入参:单条类别名过本地模型。"""

    title: str
    """英文短名(已剥套话前缀)。"""

    lang: str
    """目标语言码(zh/ko/en)。"""

    ui: bool
    """True = 出人话名(招聘网站口吻),False = 官方名直译。"""


@dataclass
class CheckIn:
    """translation_ok 的入参:模型产出过校验。"""

    text: str
    """清洗后的模型产出(剥引号、取末行)。"""

    lang: str
    """目标语言码(zh 查汉字/拉丁混杂,ko 查谚文)。"""

    ui: bool
    """True = 人话名(更短上限 + 套话/括号补语退回)。"""


@dataclass
class OllamaIn:
    """to_ollama_payload 的入参:模型名 + 完整提示词。"""

    model: str
    """Ollama 模型名。"""

    prompt: str
    """已 format 好的提示词全文。"""


# =========================================================================
# 4. descriptions 步(官方职业名 + 主要职责)
# =========================================================================


@dataclass
class DescSeedIn:
    """to_desc_rec 的入参:一个 5 位 NOC 的名字种子。"""

    noc: str
    """5 位 NOC 码。"""

    title: str
    """官方职业名(Class title)。"""


@dataclass
class ElementRow:
    """Elements CSV 一行的洗净形(to_element_row 产;缺格全折空串)。"""

    level: str
    """层级(只要 5)。"""

    noc: str
    """NOC 码。"""

    title: str
    """官方职业名。"""

    etype: str
    """元素类型(Main duties / Employment requirements / 其他)。"""

    desc: str
    """元素内容。"""


# =========================================================================
# 5. audit 步(逐职业体检 大类/中类/小类)
# =========================================================================


@dataclass
class AuditSeedIn:
    """to_audit_row 的入参:一行 stats + 该 NOC 的名字行。"""

    stat: dict
    """mart/stats_occupation 的一行(province=all 那批)。"""

    desc: dict
    """mart/noc_descriptions 里同码那行(缺席给空 dict)。"""


@dataclass
class AuditRow:
    """一个职业的体检行(to_audit_row 产;报告与 TSV 共用)。"""

    noc: str
    """5 位 NOC 码。"""

    teer: int | None
    """TEER 档(非法码 None,照原脚本原样打印)。"""

    broad: str
    """本站大类。"""

    mid: str
    """本站中类(人话桶)。"""

    fine: str
    """本站小类。"""

    zh: str
    """中文职业名(stats 优先,退 descriptions;都没有留空)。"""

    en: str
    """官方英文职业名。"""

    open_jobs: int
    """在招量(全国汇总行)。"""

    by_hand: bool
    """有没有被桶表覆盖(硬检查:必须全覆盖)。"""

    official: str
    """官方第 1 位的组(对照用)。"""

    no_fine: bool
    """小类 == 中类:等于没分小类。"""


@dataclass
class SmellHit:
    """③ 段的一条线索:名字像另一个大类的职业行。"""

    row: AuditRow
    """命中的体检行。"""

    expect: str
    """关键词指向的大类(是线索不是判决)。"""


# =========================================================================
# 6. titles 步(NOC 官方职业名的中/韩译名)
# =========================================================================


@dataclass
class ChatIn:
    """ask_chat() 入参:已排好版的提示词 + 输出上限。

    段6/段7 原本各抄一份逐字相同的 /api/chat 调用,**唯一差异是 num_predict**(60 / 40)——
    收拢时把它收成本格(超集 = 参数化),别再各写一份。
    """

    prompt: str
    """喂给模型的整段提示词。"""

    num_predict: int
    """输出上限 token 数。"""


@dataclass
class AskTitleIn:
    """ask_title() 入参:一条官方职业名 + 要翻成哪门语言。"""

    title: str
    """官方英文职业名。"""

    lang: str
    """语言码(zh / ko)。"""


@dataclass
class TitlesTodoIn:
    """titles_todo() 入参:官方名清单 + 产出表当前态 + 本轮上限。"""

    rows: list
    """官方职业名清单(mart/noc_descriptions.json 读来的行)。"""

    done: dict
    """产出表当前态。"""

    limit: int
    """本轮最多翻几条(0 = 不限)。"""


@dataclass
class TranslateTodoIn:
    """translate_todo() 入参:待翻清单 + 就地补格的产出表。"""

    todo: list
    """待翻的官方名行。"""

    done: dict
    """产出表当前态(就地补 zh/ko 两格)。"""


@dataclass
class AskCountOut:
    """translate_todo() 出参:本轮成功与留空计数(原 print 直接取两个局部变量)。"""

    n_ok: int
    """写进表的译名条数。"""

    n_skip: int
    """未过校验、留空回退的条数。"""


@dataclass
class TitleOkIn:
    """title_ok() 入参:模型给的译名 + 原文 + 语言码。"""

    text: str
    """模型输出。"""

    src: str
    """官方英文名(判「是不是把英文原样吐回来」)。"""

    lang: str
    """语言码。"""


# =========================================================================
# 7. short 步(NOC 职业名的窄位短名,中/韩/英三语)
# =========================================================================


@dataclass
class ShortSpec:
    """三语规格表的一行(属性访问形;字典键只许住 to_short_spec 体内)。"""

    field: str
    """短名落在产出表的哪一列(zhShort / koShort / enShort)。"""

    src: str
    """原料取哪一格(zh / ko / en)。"""

    max_len: int
    """短名长度上限。"""

    charset: re.Pattern
    """短名必须含的字符类。"""

    prompt: str
    """该语言的提示词模板。"""

    strip: re.Pattern
    """要剥掉的标点类。"""


@dataclass
class ShortTodo:
    """一条待压缩(原三元组 `(noc, en, src)` 的形状化)。"""

    noc: str
    """5 位 NOC 码。"""

    en: str
    """官方英文名。"""

    src: str
    """要压缩的完整名(zh/ko 取译名,en 取官方名)。"""


@dataclass
class ShortSrcIn:
    """short_src_of() 入参:取一条的压缩原料要的四格。"""

    lang: str
    """语言码。"""

    noc: str
    """5 位 NOC 码。"""

    en_of: dict
    """noc → 官方英文名。"""

    done: dict
    """产出表当前态(zh/ko 的原料从这里取)。"""


@dataclass
class AskShortIn:
    """ask_short() 入参:语言码 + 官方英文名 + 完整名。"""

    lang: str
    """语言码。"""

    en: str
    """官方英文名。"""

    src: str
    """完整名(空则喂占位)。"""


@dataclass
class ShortOkIn:
    """short_ok() 入参:模型给的短名 + 原料 + 语言码。"""

    lang: str
    """语言码。"""

    text: str
    """已剥标点的模型输出。"""

    src: str
    """压缩前的完整名(没压缩就不算数)。"""


@dataclass
class ShortLangIn:
    """shorten_lang() / short_todo() 入参:压一门语言要的全部上下文。"""

    lang: str
    """语言码。"""

    rows: dict
    """官方职业名清单(mart/noc_descriptions.json 读来的行)。"""

    done: dict
    """产出表当前态(就地补列)。"""

    en_of: dict
    """noc → 官方英文名。"""

    limit: int
    """本轮最多压几条(0 = 不限)。"""

    force: bool
    """已有短名也重压。"""


@dataclass
class DupReportIn:
    """report_short_dups() 入参:要查撞车的语言 + 产出表当前态。"""

    langs: list
    """本轮跑过的语言。"""

    done: dict
    """产出表当前态。"""
