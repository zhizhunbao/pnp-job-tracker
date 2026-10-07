"""
statcan/cip 子域行形状(一参令 XxxIn;方言同 statcan/scheme.py)+ 自测用例(unittest 是「不用 class」的外部库例外,
先例 gcjobs.scheme / pnp.qc.scheme;被测的 statcan.cip.functions / noc 在用例体内现取 —— functions 反过来 import 本文件,
顶部 import 会成环)。

import 只有标准库(叶子律:形状本子域自声明,零跨域)。

@author Frank
@time 2026-10-04 02:14:05
"""
import json
import unittest
from dataclasses import dataclass
from typing import Protocol
from unittest import mock

# =========================================================================
# 1. 结构表(cip2021 步)
# =========================================================================


@dataclass
class CipRowIn:
    """to_cip_row() 入参:官方结构表的一行 + 全表父码索引。"""

    row: dict
    """csv.DictReader 的一行(表头已 strip,键 = 官方列名)。"""

    parent_of: dict
    """代码 → 父码(全表各层;顺父链爬 primary grouping 用)。"""


@dataclass
class CipRootIn:
    """cip_root_of() 入参。"""

    code: str
    """起点代码(class)。"""

    parent_of: dict
    """代码 → 父码(全表各层)。"""


# =========================================================================
# 2. 中韩名(cip_i18n 步)
# =========================================================================


@dataclass
class CipTodoIn:
    """cip_todo_of() 入参:一门语言的待译清单。"""

    rows: list
    """cip2021.json 的 class 行。"""

    done: dict
    """译名缓存 {code: {v, zh, ko}}(已滤掉旧版本)。"""

    lang: str
    """缓存格键(zh / ko)。"""


class HttpJsonResponseLike(Protocol):
    """POST 的响应里真用的一格(照 noc.scheme 同名形状,本域自声明)。"""

    def json(self) -> object:
        """响应体解析(真身是 dict,收窄住 cip_translate)。"""
        ...


class HttpJsonClientLike(Protocol):
    """httpx 客户端里译名段真用的一门(POST JSON 体)。"""

    def post(self, url: str, json: dict) -> HttpJsonResponseLike:
        """POST 一个 JSON 体(库定死签名:json 是关键字参数)。"""
        ...


@dataclass
class CipBatchIn:
    """cip_translate() / cip_translate_split() 入参(一批英文专业名)。"""

    client: HttpJsonClientLike
    """已构造的客户端(POST Ollama)。"""

    titles: list
    """待译英文名(≤ CIP_TRANS_BATCH 条,顺序即编号)。"""

    lang: str
    """目标语言的缓存格键(zh / ko)。"""


@dataclass
class CipNameIn:
    """cip_name_ok() 入参:一条译名过闸。"""

    text: str
    """模型给的译名。"""

    src: str
    """英文原名(原样吐回 = 没译)。"""

    lang: str
    """目标语言的缓存格键(zh / ko)。"""


# =========================================================================
# 3. 汇装件(cip_programs 步)
# =========================================================================


@dataclass
class CipProgramIn:
    """to_cip_program_row() 入参:一个 class 的三样料。"""

    row: dict
    """cip2021.json 的一行。"""

    names: dict
    """这个码的译名缓存格({v, zh, ko};没译过是空表)。"""

    rank: int | None
    """热门名次(CIP_POPULAR 下标 + 1);不在热门清单 = None。"""

    places: list
    """这个码的选择器位置清单(cip_places_of 的一格;不进选择器的 = [];2026-10-05 掌上高考版加)。"""


@dataclass
class CipLocalIn:
    """cip_local_name_of() 入参:一个 class 一门语言的上架名。"""

    code: str
    """class 码(查人工定名)。"""

    src: str
    """官方英文名(术语校正看它含不含某词、「其他」归一看它是不是 ', other' 结尾)。"""

    names: dict
    """这个码的译名缓存格({v, zh, ko};没译过是空表)。"""

    lang: str
    """缓存格键(zh / ko)。"""


@dataclass
class CipOtherIn:
    """cip_other_of() 入参:一条「其他」兜底类的译名。"""

    text: str
    """译名(已过术语校正)。"""

    lang: str
    """缓存格键(zh / ko)。"""


# =========================================================================
# 4. 选择器位置(places:左栏大类 → 专业类 → 专业)
# =========================================================================


@dataclass
class CipPlacesIn:
    """cip_places_of() 入参:全表 class 行 + 热门名次。"""

    rows: list
    """cip2021.json 的 class 行(含不进选择器的 series,函数里自己跳)。"""

    rank: dict
    """class 码 → 热门名次(CIP_POPULAR 下标 + 1;不在热门清单的码不在表里)。"""


@dataclass
class CipGroupIn:
    """cip_group_of() 入参:一个专业在一个大类里落哪个专业类。
    2026-10-05 起 cip_single_to_of() 也收它(人工并类表按同一对「大类 + 码」查)。"""

    cat: str
    """大类键(自定专业类只在所在大类里生效)。"""

    code: str
    """class 码。"""


@dataclass
class CipPlacesCheckIn:
    """check_cip_places() 入参:分桶的结果。"""

    lost: list
    """落不到任何大类的 class 码(该是空的)。"""

    buckets: dict
    """大类键 → {专业类键 → 成员 class 码}。"""

    rows: list
    """cip2021.json 的 class 行(查 CIP_CAT_OF 死键用:键要是至少一个进选择器的码的前缀;2026-10-05 审查加)。"""


@dataclass
class CipPrefixIn:
    """is_cip_prefix_hit() 入参:一个码前缀 + 待查的码清单(2026-10-05 审查加,死键查用)。"""

    prefix: str
    """码前缀(2 位 series / 5 位 subseries / 7 位 class)。"""

    codes: list
    """class 码清单。"""


@dataclass
class CipFoldIn:
    """cip_cat_folded_of() / cip_single_moves_of() / cip_pinned_moves_of() 入参:一个大类的分桶(2026-10-05 单列并类加)。"""

    cat: str
    """大类键(人工并类表按大类查;交叉学科类 / 其他专业类的键由它拼)。"""

    groups: dict
    """专业类键 → 成员 class 码(分桶序;函数不改它)。"""


@dataclass
class CipSeriesIn:
    """cip_general_of() 入参:一个大类的分桶 + 一个 series(2026-10-05 单列并类加)。"""

    groups: dict
    """专业类键 → 成员 class 码。"""

    series: str
    """2 位 series 码(52)。"""


@dataclass
class CipNearIn:
    """cip_nearest_of() 入参:给一个单列专业找同 series 码最近的折叠类(2026-10-05 单列并类加)。"""

    cat: str
    """大类键(找不到时拼其他专业类键)。"""

    groups: dict
    """专业类键 → 成员 class 码(并类前三步并完的样子)。"""

    code: str
    """单列专业的 class 码。"""


@dataclass
class CipMoveIn:
    """cip_moved_of() 入参:分桶 + 并类表(2026-10-05 单列并类加)。"""

    groups: dict
    """专业类键 → 成员 class 码。"""

    moves: dict
    """单列类键 → 并进的专业类键。"""


@dataclass
class CipFoldCheckIn:
    """check_cip_folded() 入参:并类前后的分桶(2026-10-05 单列并类加)。"""

    buckets: dict
    """并类前:大类键 → {专业类键 → 成员 class 码}(查人工并类表的键命中了单列专业没有、目标是不是本大类原有的类)。"""

    folded: dict
    """并类后(同形;查用到的专业类名全不全)。"""


@dataclass
class CipCatIn:
    """cip_cat_places_of() 入参:一个大类的全部专业类。"""

    cat: str
    """大类键。"""

    order: int
    """大类在左栏的序号(1 起)。"""

    groups: dict
    """专业类键 → 成员 class 码(分桶序,未排)。"""

    rank: dict
    """class 码 → 热门名次。"""


@dataclass
class CipRankIn:
    """cip_major_key_of() / cip_single_key_of() 入参:一个专业的排序料。"""

    code: str
    """class 码。"""

    rank: dict
    """class 码 → 热门名次。"""


@dataclass
class CipRanksIn:
    """cip_group_key_of() / cip_codes_ordered_of() 入参:一个专业类的成员。"""

    codes: list
    """成员 class 码。"""

    rank: dict
    """class 码 → 热门名次。"""


@dataclass
class CipPlaceIn:
    """to_cip_place() 入参:一处位置的键与序号(名字由函数查表补)。"""

    cat: str
    """大类键。"""

    cat_order: int
    """大类序号(1..16)。"""

    group: str
    """专业类键(subseries 码或自定键)。"""

    group_order: int
    """专业类在大类里的序号(1 起)。"""

    order: int
    """专业在专业类里的序号(1 起)。"""

    single: bool
    """这个专业类在这个大类里只装这一个专业。"""


# =========================================================================
# 5. 显示名(titleEnShort 英文短名 / titleZh 中文清洗名)
# =========================================================================


@dataclass
class CipEnIn:
    """cip_en_short_of() / cip_en_other_of() 入参。"""

    code: str
    """class 码(查人工定名、判兜底类)。"""

    src: str
    """英文名(cip_en_short_of 收官方原名;转给 cip_en_other_of 时已剥括注)。"""


@dataclass
class CipZhIn:
    """cip_zh_show_of() 入参。"""

    code: str
    """class 码(查人工定名、判兜底类)。"""

    text: str | None
    """中文机翻定稿(cip_local_name_of 的产物;没译成 = None)。"""


# =========================================================================
# 6. 自测(cip2021 / cip_i18n / cip_programs 三步 + noc 的专业 → 大类对照)
# =========================================================================


class StatcanCipTest(unittest.TestCase):
    """CIP 2021 专业表自测(2026-10-04 访客四题第 2 题立;跑法 `python etl/statcan/main.py --only test_cip`):
    ① 结构表解析金标(手写迷你表:series 30 的 class 落在第 3 层、重复码先到先得、表头 'Parent ' 带尾随空格);
    ② 真表金标(读 raw/statcan/cip2021.json,没抓过就跳过):条数、样例码 52.0203 的英文名、零重复、热门码全在;
    ③ 专业 → 大类对照表(noc 的 MAJOR_SERIES_BROADS):值域 ⊂ BROADS、最细的键先命中、真表每个 class 都落得到大类、
       变异探针(塞一个不存在的大类 / 删一整系,问题清单必须喊);
    ④ 译名闸与编号解析(HTTP 替身,不联网)。
    被测的 statcan.cip.functions / noc 在用例体内现取(functions 反过来 import 本文件,顶部 import 会成环)。"""

    mini = (
        "Level/Niveau,Hierarchical structure,Structure hiérarchique,Code,Parent ,Class title,Titres de classes\n"
        "1,Primary groupings,Regroupements principaux,05,,\"Business, management\",Commerce\n"
        "2,Series,Séries,52.,05,Business,Commerce\n"
        "3,Subseries,Sous-séries,52.02,52.,Business administration,Administration\n"
        "4,Class,Classe,52.0203,52.02,\"Logistics, materials, and supply chain management\",Logistique\n"
        "4,Class,Classe,52.0203,52.02,Duplicate row,Doublon\n"
        "1,Primary groupings,Regroupements principaux,07,,Mathematics,Mathématiques\n"
        "2,Subseries,Sous-séries,30.71,07,Data analytics,Analytique de données\n"
        "3,Class,Classe,30.7101,30.71,\"Data analytics, general\",Analytique de données (général)\n"
    )
    """手写迷你结构表:两个根组、一条走标准四层(52.0203)、一条走 series 30 的三层(30.7101)、一行重复码。"""

    def test_parse_golden(self) -> None:
        """迷你表 → 两行:按 Hierarchical structure 认 class(第 3 层的 30.7101 不漏)、重复码先到先得、父链爬到根组。"""
        from statcan.cip import functions as fn
        got = []
        for r in fn.cip_rows_of(self.mini):
            got.append((r["code"], r["titleEn"], r["titleFr"], r["series"], r["subseries"], r["grouping"]))
        self.assertEqual(got, [
            ("52.0203", "Logistics, materials, and supply chain management", "Logistique", "52", "52.02", "05"),
            ("30.7101", "Data analytics, general", "Analytique de données (général)", "30", "30.71", "07"),
        ])

    def test_real_table(self) -> None:
        """真表:2,119 个 class、码零重复、52.0203 英文名逐字、每行根组在 13 个之内、热门 16 码全在。"""
        from statcan.cip.constants import CIP_CLASSES_N, CIP_GROUPINGS, CIP_POPULAR, OUT_CIP
        if OUT_CIP.exists() is False:
            self.skipTest("raw/statcan/cip2021.json 还没抓(python etl/statcan/main.py --only cip2021)")
        rows = json.loads(OUT_CIP.read_text(encoding="utf-8"))["rows"]
        by = {}
        for r in rows:
            by[r["code"]] = r
            self.assertIn(r["grouping"], CIP_GROUPINGS)
        self.assertEqual(len(rows), CIP_CLASSES_N)
        self.assertEqual(len(by), len(rows))
        self.assertEqual(by["52.0203"]["titleEn"], "Logistics, materials, and supply chain management")
        self.assertEqual(by["52.0203"]["grouping"], "05")
        self.assertEqual(by["30.7101"]["subseries"], "30.71")
        self.assertEqual(len(set(CIP_POPULAR)), len(CIP_POPULAR))
        for code in CIP_POPULAR:
            self.assertIn(code, by)

    def test_broads_range(self) -> None:
        """对照表每一行:非空、无重复、每个值都在 BROADS 里;键只许 series(2 位)/ subseries(5 位)/ class(7 位)三种写法。"""
        from noc.constants import BROADS, MAJOR_SERIES_BROADS
        for key, broads in MAJOR_SERIES_BROADS.items():
            with self.subTest(key=key):
                self.assertIn(len(key), (2, 5, 7))
                self.assertGreater(len(broads), 0)
                self.assertEqual(len(set(broads)), len(broads))
                for b in broads:
                    self.assertIn(b, BROADS)

    def test_broads_lookup(self) -> None:
        """最细的键先命中:class → subseries → series;series 30 没有整系一行,逐 subseries 判;查无给空清单。"""
        from noc.functions import major_broads_of
        self.assertEqual(major_broads_of("11.0701"), ["IT"])
        self.assertEqual(major_broads_of("51.3801"), ["医疗"])
        self.assertIn("IT", major_broads_of("30.7101"))
        self.assertIn("科研", major_broads_of("30.1801"))
        self.assertIn("酒店旅游", major_broads_of("52.0901"))
        self.assertIn("运输物流", major_broads_of("52.0203"))
        self.assertNotIn("酒店旅游", major_broads_of("52.0301"))
        self.assertIn("财会金融", major_broads_of("52.0301"))
        self.assertEqual(major_broads_of("30.9999"), major_broads_of("30.99"))
        self.assertEqual(major_broads_of("99.9999"), [])
        self.assertEqual(major_broads_of(""), [])

    def test_broads_on_target(self) -> None:
        """只列对口大类(2026-10-04 收口审查金标):量大的旁类并进来会把对口职业挤到清单尾巴 ——
        工科 / 工程技术不并机修技工与制造、会计与工商管理不并零售销售、厨师不并生活服务、汽修不并建筑、焊工不并建筑,
        计算机类工科要有 IT、数据分析只给 IT。"""
        from noc.functions import major_broads_of
        self.assertEqual(major_broads_of("15.0805"), ["工程"])
        self.assertEqual(major_broads_of("14.1901"), ["工程"])
        self.assertEqual(major_broads_of("14.0903"), ["IT"])
        self.assertIn("IT", major_broads_of("14.0901"))
        self.assertIn("IT", major_broads_of("15.1202"))
        self.assertEqual(major_broads_of("52.0301"), ["财会金融"])
        self.assertNotIn("零售销售", major_broads_of("52.0201"))
        self.assertIn("IT", major_broads_of("52.1201"))
        self.assertIn("建筑", major_broads_of("52.2001"))
        self.assertEqual(major_broads_of("12.0503"), ["餐饮"])
        self.assertEqual(major_broads_of("12.0401"), ["生活服务"])
        self.assertEqual(major_broads_of("47.0604"), ["机修技工"])
        self.assertNotIn("建筑", major_broads_of("48.0508"))
        self.assertIn("制造", major_broads_of("48.0508"))
        self.assertEqual(major_broads_of("30.7101"), ["IT"])
        self.assertEqual(major_broads_of("45.1101"), ["公共服务"])
        self.assertIn("财会金融", major_broads_of("45.0601"))
        self.assertIn("生活服务", major_broads_of("19.0709"))
        self.assertIn("制造", major_broads_of("10.0307"))
        self.assertIn("医疗", major_broads_of("01.8001"))

    def test_broads_cover_real(self) -> None:
        """真表每个 class 都落得到大类(问题清单为空);变异探针:塞一个不存在的大类、删掉一整系,清单必须喊。"""
        from statcan.cip.constants import OUT_CIP
        from noc import constants as nc
        from noc.functions import major_broads_problems
        if OUT_CIP.exists() is False:
            self.skipTest("raw/statcan/cip2021.json 还没抓")
        codes = []
        for r in json.loads(OUT_CIP.read_text(encoding="utf-8"))["rows"]:
            codes.append(r["code"])
        self.assertEqual(major_broads_problems(codes), [])
        with mock.patch.dict(nc.MAJOR_SERIES_BROADS, {"11": ["不存在的大类"]}):
            self.assertNotEqual(major_broads_problems(codes), [])
        kept = dict(nc.MAJOR_SERIES_BROADS)
        del kept["13"]
        with mock.patch.dict(nc.MAJOR_SERIES_BROADS, kept, clear=True):
            self.assertNotEqual(major_broads_problems(codes), [])

    def test_local_names(self) -> None:
        """上架名定稿(手写料,不读真表):人工定名整格盖过机翻;术语校正只在英文名含那个词时换;
        「其他」兜底类四种写法归一成「正文 + 括号后缀」、叠写剥净,英文不以 ', other' 结尾的不碰;没译成给 None。"""
        from statcan.cip import functions as fn
        lp, rp, cm = "（", "）", "，"

        def name(code: str, src: str, names: dict, lang: str) -> str | None:
            """一参令外的测试便道:四个料拼成 CipLocalIn。"""
            return fn.cip_local_name_of(CipLocalIn(code=code, src=src, names=names, lang=lang))

        self.assertEqual(name("52.1304", "Actuarial science", {"ko": "정량경제학"}, "ko"), "보험계리학")
        self.assertEqual(name("51.0401", "Dentistry (DDS, DMD)", {}, "zh"), "牙医学")
        self.assertIsNone(name("99.0001", "Nothing", {}, "zh"))
        self.assertEqual(name("99.0001", "Cardiovascular technology/technologist", {"ko": "심혈관 기술사"}, "ko"),
                         "심혈관 기술자")
        self.assertEqual(name("99.0001", "Ophthalmic technician/technologist", {"ko": "안과 기술자/기술사"}, "ko"),
                         "안과 기술자")
        self.assertEqual(name("99.0001", "History of science and technology", {"ko": "과학기술사"}, "ko"), "과학기술사")
        self.assertEqual(name("99.0001", "Pharmacy residency/fellowship programs", {"ko": "약학 페로우십"}, "ko"),
                         "약학 펠로우십")
        self.assertEqual(name("99.0001", "Security services, other", {"zh": "安全服务" + cm + "其他"}, "zh"),
                         "安全服务" + lp + "其他" + rp)
        self.assertEqual(name("99.0001", "Genetics, other", {"zh": "其他遗传学"}, "zh"), "遗传学" + lp + "其他" + rp)
        self.assertEqual(name("99.0001", "East Asian languages, other", {"zh": "东亚语言文学及其他"}, "zh"),
                         "东亚语言文学" + lp + "其他" + rp)
        self.assertEqual(name("99.0001", "Physics, other", {"zh": "物理学" + lp + "其他" + rp}, "zh"),
                         "物理学" + lp + "其他" + rp)
        self.assertEqual(name("99.0001", "Diploma programs, other", {"ko": "졸업장 프로그램, 기타(기타)"}, "ko"),
                         "졸업장 프로그램 (기타)")
        self.assertEqual(name("99.0001", "Allied health, other", {"ko": "기타 의료 보조 서비스 (기타)"}, "ko"),
                         "의료 보조 서비스 (기타)")
        self.assertEqual(name("99.0001", "Basic skills, other (not for credit)",
                              {"zh": "基础技能" + lp + "其他" + rp + lp + "不计学分" + rp}, "zh"),
                         "基础技能" + lp + "其他" + rp + lp + "不计学分" + rp)
        self.assertEqual(name("99.0001", "Guitar, other", {"ko": "기타"}, "ko"), "기타")

    def test_local_names_real(self) -> None:
        """真表 + 真译名缓存过一遍定稿:中 / 韩名零重名(搜索下拉不出两条一模一样)、technician 类韩文不带「기술사」、
        不带「페로우」、', other' 结尾的全是统一后缀;人工定名的码全在表里。没抓 / 没译就跳过。"""
        from statcan.cip import functions as fn
        from statcan.cip.constants import CIP_NAME_FIX, CIP_OTHER_MARK, OUT_CIP, OUT_CIP_I18N
        if OUT_CIP.exists() is False or OUT_CIP_I18N.exists() is False:
            self.skipTest("cip2021.json / cip_i18n.json 还没产出")
        rows = fn.load_cip_rows()
        names = fn.load_cip_i18n()
        seen: dict = {"zh": {}, "ko": {}}
        codes = set()
        for r in rows:
            codes.add(r["code"])
            got = fn.to_cip_program_row(CipProgramIn(row=r, names=names.get(r["code"], {}), rank=None, places=[]))
            for lang, key in (("zh", "titleZh"), ("ko", "titleKo")):
                text = got[key]
                if text is None:
                    continue
                with self.subTest(code=r["code"], lang=lang):
                    self.assertNotIn(text, seen[lang], seen[lang].get(text))
                    seen[lang][text] = r["code"]
                    if r["titleEn"].lower().endswith(", other"):
                        self.assertTrue(text.endswith(CIP_OTHER_MARK[lang]))
            self.assertNotIn("페로우", got["titleKo"] or "")
            if "technician" in r["titleEn"].lower() or "technologist" in r["titleEn"].lower():
                self.assertNotIn("기술사", got["titleKo"] or "")
        for code in CIP_NAME_FIX:
            self.assertIn(code, codes)

    def test_name_gate(self) -> None:
        """译名闸:目标语言的字必须出现、不许原样吐回英文、不许空、不许超长;中文拉丁字母不许多过汉字(韩文不管);
        英文没有 other 就不许冒出「其他 / 기타」。"""
        from statcan.cip import functions as fn
        self.assertTrue(fn.cip_name_ok(CipNameIn(text="会计", src="Accounting", lang="zh")))
        self.assertTrue(fn.cip_name_ok(CipNameIn(text="注册护士(RN)", src="Registered nursing", lang="zh")))
        self.assertTrue(fn.cip_name_ok(CipNameIn(text="회계학", src="Accounting", lang="ko")))
        self.assertFalse(fn.cip_name_ok(CipNameIn(text="Accounting", src="Accounting", lang="zh")))
        self.assertFalse(fn.cip_name_ok(CipNameIn(text="회계학", src="Accounting", lang="zh")))
        self.assertFalse(fn.cip_name_ok(CipNameIn(text="会计", src="Accounting", lang="ko")))
        self.assertFalse(fn.cip_name_ok(CipNameIn(text="", src="Accounting", lang="zh")))
        self.assertFalse(fn.cip_name_ok(CipNameIn(text="会" * 61, src="Accounting", lang="zh")))
        self.assertFalse(fn.cip_name_ok(CipNameIn(text="workforce development and training(不计学分)",
                                                  src="Workforce development and training (not for credit)", lang="zh")))
        self.assertFalse(fn.cip_name_ok(CipNameIn(text="法律助理/ paralegal", src="Paralegal", lang="zh")))
        self.assertTrue(fn.cip_name_ok(CipNameIn(text="社区学院及普通和职业学院(CEGEP)管理", src="CEGEP", lang="zh")))
        self.assertTrue(fn.cip_name_ok(CipNameIn(text="Workforce 개발 및 교육", src="Workforce development", lang="ko")))
        self.assertFalse(fn.cip_name_ok(CipNameIn(text="牙医学(其他)", src="Dentistry (DDS, DMD)", lang="zh")))
        self.assertFalse(fn.cip_name_ok(CipNameIn(text="치의학 (기타)", src="Dentistry (DDS, DMD)", lang="ko")))
        self.assertTrue(fn.cip_name_ok(CipNameIn(text="工商管理(其他)", src="Business administration, other", lang="zh")))

    def test_batch_parse(self) -> None:
        """编号解析:乱序回来按编号对位;少一条 / 有一条没过闸 = 整批空清单(调用方二分重试);二分到单条仍不行给空串。"""
        from statcan.cip import functions as fn

        class Resp:
            """HTTP 响应替身。"""

            def __init__(self, text: str) -> None:
                self.text = text

            def json(self) -> object:
                """Ollama /api/generate 的响应形。"""
                return {"response": self.text}

        class Client:
            """HTTP 客户端替身:提示词里有第 2 行编号回 multi,只有 1 行回 single。"""

            def __init__(self, multi: str, single: str) -> None:
                self.multi = multi
                self.single = single

            def post(self, url: str, json: dict) -> Resp:
                """看提示词里有几行编号决定回哪份。"""
                if "\n2. " in json["prompt"]:
                    return Resp(self.multi)
                return Resp(self.single)

        two = ["Business administration", "Accounting"]
        ok = fn.cip_translate(CipBatchIn(client=Client("2. 会计\n1. 工商管理\n", ""), titles=two, lang="zh"))
        self.assertEqual(ok, ["工商管理", "会计"])
        short = fn.cip_translate(CipBatchIn(client=Client("1. 工商管理\n", ""), titles=two, lang="zh"))
        self.assertEqual(short, [])
        english = fn.cip_translate(CipBatchIn(client=Client("1. 工商管理\n2. Accounting\n", ""), titles=two, lang="zh"))
        self.assertEqual(english, [])
        split = fn.cip_translate_split(CipBatchIn(client=Client("1. 工商管理\n", "1. 商科\n"), titles=two, lang="zh"))
        self.assertEqual(split, ["商科", "商科"])
        dead = fn.cip_translate_split(CipBatchIn(client=Client("", ""), titles=two, lang="zh"))
        self.assertEqual(dead, ["", ""])


class StatcanCipPlacesTest(unittest.TestCase):
    """选择器位置与显示名自测(2026-10-05 掌上高考版立,Frank「可以,做吧」;`--only test_cip` 与 StatcanCipTest 一起跑):
    ① 对照表自洽(手写断言,不读真表):大类键形、对照表 / 自定专业类的值域与前缀写法、专业类名不空不带斜杠、角色表长的在前;
    ② 分桶与排序金标(手写料):最细的键先命中、自定专业类最长前缀赢且只在所在大类生效、折叠类在前单列类殿后、
       类里热门在前兜底类殿后;
    ③ 显示名规则金标(手写料,期望值即效果图 taxonomy.json 的同码产物):英文去括注 / 去 general / 兜底类 / 角色后缀 /
       同根两词 / 斜杠链,中文去角色尾巴 / 斜杠改写 / 兜底类派生 / 人工定名;
    ④ 真表全量(读 raw/statcan/cip2021.json + 译名缓存,没产出就跳过):非沉底专业至少一处、沉底的 [];位置格名字不空;
       序号按大类 / 专业类 1..n 连续;single == 专业类只装一个;中文显示名不带「/」、英文短名不空;键序 = DDL 列序;
       关键专业落点(52.0203 商科 + 交通物流、52.0901 餐饮酒店 + 商科、会计类排财会金融第一、机械类排工程第一……);
    ⑤ 变异探针:删一个系的大类对照 / 删一个专业类名 / 自定专业类挂错大类,自校必须抛。
    被测的 statcan.cip.functions 在用例体内现取(同 StatcanCipTest:functions 反过来 import 本文件)。
    2026-10-05 审查改判:③ 里职业名 / 大小写 / 不计学分几条金标、② 里单列兜底类的序不再等于效果图(各用例 docstring
    写明);⑤ 补三张对照表的死键探针。"""

    programs: list | None = None
    """真表全量算一遍的 cip_programs 行(setUpClass 填;没产出 = None,用到的用例各自跳过)。"""

    raw_rows: list = []
    """cip2021.json 的 class 行(变异探针用;没产出 = 空)。"""

    rank: dict = {}
    """热门名次 code → 名次(CIP_POPULAR 下标 + 1)。"""

    @classmethod
    def setUpClass(cls) -> None:
        """真表全量只算一遍(照 build_statcan_cip_programs 的拼法,不落盘)。"""
        from statcan.cip import functions as fn
        from statcan.cip.constants import CIP_POPULAR, OUT_CIP, OUT_CIP_I18N
        rank = {}
        for i, code in enumerate(CIP_POPULAR):
            rank[code] = i + 1
        cls.rank = rank
        if OUT_CIP.exists() is False or OUT_CIP_I18N.exists() is False:
            return
        rows = fn.load_cip_rows()
        names = fn.load_cip_i18n()
        places = fn.cip_places_of(CipPlacesIn(rows=rows, rank=rank))
        out = []
        for r in rows:
            out.append(fn.to_cip_program_row(CipProgramIn(row=r, names=names.get(r["code"], {}),
                                                          rank=rank.get(r["code"]), places=places.get(r["code"], []))))
        cls.raw_rows = rows
        cls.programs = out

    def real(self) -> list:
        """真表全量行;没产出就跳过本用例。"""
        if self.programs is None:
            self.skipTest("cip2021.json / cip_i18n.json 还没产出")
        return self.programs

    def test_tables_consistent(self) -> None:
        """对照表自洽:16 个大类键形 /^[a-z]{2,8}$/、三语名不空;CIP_CAT_OF 键只许 2 / 5 / 7 位、值域 ⊂ CIP_CATS、
        不收沉底 series;自定专业类挂在已有大类、键以「大类.」开头、成员前缀 5 / 7 位、都有名字;并类目标有名字;
        专业类三语名不空、不带斜杠;两张角色表长的在前(同长保持登记序)。"""
        from statcan.cip import constants as c
        self.assertEqual(len(c.CIP_CATS), 16)
        for key, names in c.CIP_CATS.items():
            self.assertRegex(key, r"^[a-z]{2,8}$")
            for name in names:
                self.assertNotEqual(name, "")
        for key, cats in c.CIP_CAT_OF.items():
            with self.subTest(key=key):
                self.assertIn(len(key), (2, 5, 7))
                self.assertNotIn(key[:2], c.CIP_SINK_SERIES)
                self.assertGreater(len(cats), 0)
                for cat in cats:
                    self.assertIn(cat, c.CIP_CATS)
        for cat in c.CIP_CAT_SERIES30.values():
            self.assertIn(cat, c.CIP_CATS)
        for key, (cat, members) in c.CIP_CUSTOM_GROUPS.items():
            with self.subTest(group=key):
                self.assertIn(cat, c.CIP_CATS)
                self.assertTrue(key.startswith(cat + "."))
                self.assertIn(key, c.CIP_GROUP_NAMES)
                self.assertGreater(len(members), 0)
                for prefix in members:
                    self.assertRegex(prefix, r"^\d\d\.\d\d(\d\d)?$")
        for group in c.CIP_GROUP_FOLD.values():
            self.assertIn(group, c.CIP_GROUP_NAMES)
        for key, names in c.CIP_GROUP_NAMES.items():
            with self.subTest(group=key):
                self.assertEqual(len(names), 3)
                for name in names:
                    self.assertNotEqual(name, "")
                    self.assertNotIn("/", name)
        self.assertEqual(c.CIP_EN_ROLES, tuple(sorted(c.CIP_EN_ROLES, key=len, reverse=True)))
        self.assertEqual(c.CIP_ZH_ROLES, tuple(sorted(c.CIP_ZH_ROLES, key=len, reverse=True)))

    def test_single_to_consistent(self) -> None:
        """单列并类的表自洽(2026-10-05 单列并类立,手写断言不读真表):人工并类表(CIP_SINGLE_TO)的大类键在 CIP_CATS、
        前缀只许 2 / 5 / 7 位、目标有名字;交叉学科类 / 其他专业类的名字键是「大类键 + 键尾」、同名同译。"""
        from statcan.cip import constants as c
        for cat, table in c.CIP_SINGLE_TO.items():
            self.assertIn(cat, c.CIP_CATS)
            for prefix, group in table.items():
                with self.subTest(cat=cat, prefix=prefix):
                    self.assertRegex(prefix, r"^\d\d(\.\d\d(\d\d)?)?$")
                    self.assertIn(group, c.CIP_GROUP_NAMES)
        tails = {c.CIP_CROSS_TAIL: ("Interdisciplinary", "交叉学科类", "학제 간"),
                 c.CIP_MISC_TAIL: ("Other majors", "其他专业类", "기타 전공")}
        for key, names in c.CIP_GROUP_NAMES.items():
            for tail, want in tails.items():
                if key.endswith(tail):
                    self.assertIn(key[:-len(tail)], c.CIP_CATS, key)
                    self.assertEqual(names, want, key)

    def test_cats_of(self) -> None:
        """最细的键先命中:52.0203 挂商科 + 交通物流(class 键盖过 52 整系)、52.0301 只在财会金融(subseries 键)、
        12 系个人服务进其他而 12.05 烹饪进餐饮酒店、31.01 休闲研究进餐饮酒店、31.0601 户外教育进教育、
        series 30 没点名的按 primary grouping 落、查无给空清单。"""
        from statcan.cip import functions as fn

        def cats(code: str, grouping: str) -> list:
            """一参令外的测试便道:码 + 根组拼成 class 行。"""
            return fn.cip_cats_of({"code": code, "series": code[:2], "grouping": grouping})

        self.assertEqual(cats("52.0203", "05"), ["biz", "logi"])
        self.assertEqual(cats("52.0201", "05"), ["biz"])
        self.assertEqual(cats("52.0301", "05"), ["fin"])
        self.assertEqual(cats("52.0901", "05"), ["hosp", "biz"])
        self.assertEqual(cats("12.0401", "11"), ["other"])
        self.assertEqual(cats("12.0503", "11"), ["hosp"])
        self.assertEqual(cats("31.0101", "10"), ["hosp"])
        self.assertEqual(cats("31.0601", "10"), ["edu"])
        self.assertEqual(cats("31.0505", "10"), ["health"])
        self.assertEqual(cats("30.7101", "07"), ["it"])
        self.assertEqual(cats("30.2501", "04"), ["social"])
        self.assertEqual(cats("99.0101", "99"), [])

    def test_group_of(self) -> None:
        """专业类:自定专业类只在所在大类生效、最长前缀赢(15.1102 测绘拎出 15.11)、没点名的是自己的 subseries;
        并类先于自定专业类。"""
        from statcan.cip import functions as fn

        def group(cat: str, code: str) -> str:
            """一参令外的测试便道。"""
            return fn.cip_group_of(CipGroupIn(cat=cat, code=code))

        self.assertEqual(group("eng", "15.0805"), "eng.mech")
        self.assertEqual(group("eng", "14.1901"), "eng.mech")
        self.assertEqual(group("eng", "15.1102"), "eng.survey")
        self.assertEqual(group("eng", "15.1103"), "eng.mech")
        self.assertEqual(group("eng", "15.1199"), "eng.general")
        self.assertEqual(group("eng", "14.0301"), "14.03")
        self.assertEqual(group("biz", "52.0203"), "52.02")
        self.assertEqual(group("logi", "52.0203"), "logi.mgmt")
        self.assertEqual(group("logi", "49.0102"), "49.01")
        self.assertEqual(group("other", "53.0201"), "other.hs")
        self.assertEqual(group("health", "31.9999"), "31.05")
        self.assertEqual(group("fin", "52.0301"), "52.03")

    def test_cat_order(self) -> None:
        """一个大类里的排序(手写料):折叠类按「最靠前的热门名次 → 专业多的在前 → 最小码」,单列类殿后按「热门名次 → 码」
        (兜底类单列也按码,照效果图);类里热门在前、兜底类殿后、其余按码;single 只在单列类为真;位置格键序同 DDL 样例。
        2026-10-05 单列卡兜底类殿后(契约):单列类改按「热门名次 → 兜底类殿后 → 码」—— 补一个码比 52.1601 小的
        单列兜底类 52.0999,断言它排在 52.1601 之后。"""
        from statcan.cip import functions as fn
        groups = {"52.08": ["52.0801", "52.0899", "52.0803"], "52.03": ["52.0399", "52.0302", "52.0301"],
                  "52.06": ["52.0601", "52.0699"], "52.16": ["52.1601"], "30.16": ["30.1601"], "52.17": ["52.1799"],
                  "52.09": ["52.0999"]}
        got = fn.cip_cat_places_of(CipCatIn(cat="fin", order=2, groups=groups, rank={"52.0301": 2}))
        rows = []
        for code, place in got:
            rows.append((code, place["group"], place["groupOrder"], place["order"], place["single"]))
        self.assertEqual(rows, [
            ("52.0301", "52.03", 1, 1, False), ("52.0302", "52.03", 1, 2, False), ("52.0399", "52.03", 1, 3, False),
            ("52.0801", "52.08", 2, 1, False), ("52.0803", "52.08", 2, 2, False), ("52.0899", "52.08", 2, 3, False),
            ("52.0601", "52.06", 3, 1, False), ("52.0699", "52.06", 3, 2, False),
            ("30.1601", "30.16", 4, 1, True), ("52.1601", "52.16", 5, 1, True), ("52.0999", "52.09", 6, 1, True),
            ("52.1799", "52.17", 7, 1, True),
        ])
        first = got[0][1]
        self.assertEqual((first["cat"], first["catOrder"], first["catEn"], first["catZh"], first["catKo"]),
                         ("fin", 2, "Finance", "财会金融", "재무금융"))
        self.assertEqual((first["groupEn"], first["groupZh"], first["groupKo"]), ("Accounting", "会计类", "회계"))
        self.assertEqual(list(first), ["cat", "catOrder", "catEn", "catZh", "catKo", "group", "groupEn", "groupZh",
                                       "groupKo", "groupOrder", "order", "single"])

    def test_fold_rules(self) -> None:
        """单列并类四步金标(手写料;2026-10-05 Frank「这下面怎么还有一些单蹦的专业」立;人工表用替身,不依赖真表的登记):
        ① 人工表最长前缀赢(28.0801 的 class 键盖过 28 的 series 键;52.16 → 工商管理类);② series 30 单列 → 交叉学科类;
        ③ 同 series 通用类:XX.00 先于 XX.01(46.01 进 46.00)、通用类自己单列也收(52.11 / 52.99 并进单列的 52.01);
        ④ 通用类就是自己且没人并进来的 → 同 series 码最近的折叠类(31.01 → 31.03),一样近取号小的(39.04 → 39.03 不进 39.05),
        没有同 series 折叠类的 → 其他专业类(29.05,只剩它一个时仍单列);装两个以上的类原样不动;
        只剩一个专业的交叉学科类挪进其他专业类(第二份料)。"""
        from statcan.cip import constants as c
        from statcan.cip import functions as fn

        def fold(groups: dict) -> dict:
            """一参令外的测试便道:跑一个大类(fin),成员排序后比较。"""
            out = {}
            for key, codes in fn.cip_cat_folded_of(CipFoldIn(cat="fin", groups=groups)).items():
                out[key] = sorted(codes)
            return out

        groups = {
            "52.02": ["52.0201", "52.0203"], "52.01": ["52.0101"], "52.11": ["52.1101"], "52.99": ["52.9999"],
            "52.16": ["52.1601"], "46.00": ["46.0000", "46.0001"], "46.01": ["46.0101"], "46.04": ["46.0401", "46.0402"],
            "31.03": ["31.0301", "31.0302"], "31.01": ["31.0101"], "39.03": ["39.0301", "39.0302"],
            "39.05": ["39.0501", "39.0502"], "39.04": ["39.0401"], "30.08": ["30.0801"], "30.30": ["30.3001"],
            "28.08": ["28.0801"], "28.09": ["28.0901"], "29.05": ["29.0501"],
        }
        table = {"fin": {"52.16": "52.02", "28": "46.04", "28.0801": "31.03"}}
        with mock.patch.dict(c.CIP_SINGLE_TO, table):
            got = fold(groups)
            lone = fold({"52.02": ["52.0201", "52.0203"], "30.08": ["30.0801"], "29.05": ["29.0501"]})
        self.assertEqual(got, {
            "52.02": ["52.0201", "52.0203", "52.1601"], "52.01": ["52.0101", "52.1101", "52.9999"],
            "46.00": ["46.0000", "46.0001", "46.0101"], "46.04": ["28.0901", "46.0401", "46.0402"],
            "31.03": ["28.0801", "31.0101", "31.0301", "31.0302"], "39.03": ["39.0301", "39.0302", "39.0401"],
            "39.05": ["39.0501", "39.0502"], "fin.cross": ["30.0801", "30.3001"], "fin.misc": ["29.0501"],
        })
        self.assertEqual(lone, {"52.02": ["52.0201", "52.0203"], "fin.misc": ["29.0501", "30.0801"]})
        self.assertEqual(groups["52.01"], ["52.0101"])

    def test_fold_order(self) -> None:
        """其他专业类殿后(2026-10-05 单列并类立):哪怕它装着热门第一、专业比谁都多,groupOrder 也是本大类最后一个;
        交叉学科类照折叠类的键排(不殿后);只剩一个专业的其他专业类 single 为真(无处可并的唯一一种单列)。"""
        from statcan.cip import constants as c
        from statcan.cip import functions as fn
        names = {"fin.misc": ("Other majors", "其他专业类", "기타 전공"),
                 "fin.cross": ("Interdisciplinary", "交叉学科类", "학제 간")}
        groups = {"fin.misc": ["29.0501", "28.0801", "21.0101"], "52.03": ["52.0301", "52.0302"],
                  "fin.cross": ["30.0801", "30.3001", "30.4901"]}
        with mock.patch.dict(c.CIP_GROUP_NAMES, names):
            got = fn.cip_cat_places_of(CipCatIn(cat="fin", order=2, groups=groups, rank={"29.0501": 1}))
            alone = fn.cip_cat_places_of(CipCatIn(cat="fin", order=2, groups={"fin.misc": ["29.0501"],
                                                                              "52.03": ["52.0301", "52.0302"]},
                                                  rank={}))
        orders = {}
        for code, place in got:
            orders[code] = (place["group"], place["groupOrder"], place["order"], place["single"])
        self.assertEqual(orders["30.0801"][:2], ("fin.cross", 1))
        self.assertEqual(orders["52.0301"][:2], ("52.03", 2))
        self.assertEqual(orders["29.0501"], ("fin.misc", 3, 1, False))
        self.assertEqual(orders["21.0101"], ("fin.misc", 3, 2, False))
        self.assertEqual(alone[-1][0], "29.0501")
        self.assertEqual((alone[-1][1]["groupOrder"], alone[-1][1]["single"]), (2, True))

    def test_en_short(self) -> None:
        """英文短名金标(期望值 = 效果图 taxonomy.json 同码的 en_short):人工定名盖过;去括注 + 角色后缀;兜底类拿专业类名
        (.99 类直接用类名、专名首词不改小写);同根两词留长的(一样长留左边);斜杠链改 and;去 ', general';
        不进选择器的兜底类拿正文派生。
        2026-10-05 审查改判的金标(期望值不再是效果图的同码产物):斜杠后的职业名剥掉(48.0508 Welding technology)、
        同根两词右边是职业名的留左边(therapy/therapist)、留右边时首字母照左边大写(Biological sciences)、
        不计学分课补回 (not for credit)、人工定名补的 51.0907。"""
        from statcan.cip import functions as fn

        def en(code: str, src: str) -> str:
            """一参令外的测试便道。"""
            return fn.cip_en_short_of(CipEnIn(code=code, src=src))

        self.assertEqual(en("52.0201", "Business administration and management, general"), "Business administration")
        self.assertEqual(en("51.0904", "Emergency medical technology/technician (EMT paramedic)"),
                         "Emergency medical technology")
        self.assertEqual(en("52.0299", "Business administration, management and operations, other"), "Other management")
        self.assertEqual(en("52.9999", "Business, management, marketing and related support services, other"),
                         "Other business")
        self.assertEqual(en("16.0399", "East Asian languages, literatures and linguistics, other"),
                         "Other East Asian languages")
        self.assertEqual(en("12.0505", "Food preparation/professional cooking/kitchen assistant"),
                         "Food preparation and professional cooking")
        self.assertEqual(en("12.0501", "Baking and pastry arts/baker/pastry chef"), "Baking and pastry arts")
        self.assertEqual(en("47.0604", "Automobile/automotive mechanics technology/technician"),
                         "Automobile mechanics technology")
        self.assertEqual(en("01.8301", "Veterinary/animal health technology/technician and veterinary assistant"),
                         "Veterinary and animal health technology and veterinary assistant")
        self.assertEqual(en("52.0202", "Purchasing, procurement/acquisitions and contracts management"),
                         "Purchasing, procurement and acquisitions and contracts management")
        self.assertEqual(en("23.0101", "English language and literature, general"), "English language and literature")
        self.assertEqual(en("48.0508", "Welding technology/welder"), "Welding technology")
        self.assertEqual(en("22.0303", "Court reporting and captioning/court reporter"), "Court reporting and captioning")
        self.assertEqual(en("51.2308", "Physical therapy/therapist"), "Physical therapy")
        self.assertEqual(en("12.0401", "Cosmetology/cosmetologist, general"), "Cosmetology")
        self.assertEqual(en("26.0101", "Biology/biological sciences, general"), "Biological sciences")
        self.assertEqual(en("38.0201", "Religion/religious studies, general"), "Religious studies")
        self.assertEqual(en("51.0907", "Radiation therapist/therapeutic radiographer"), "Radiation therapy")
        self.assertEqual(en("36.0115", "Music (not for credit)"), "Music (not for credit)")
        self.assertEqual(en("32.0199", "Basic skills, other (not for credit)"), "Other basic skills (not for credit)")
        self.assertEqual(en("31.9999", "Parks, recreation, leisure, fitness, and kinesiology, other"),
                         "Other recreation and fitness")
        self.assertEqual(en("60.0199", "Dental residency/fellowship programs, other"),
                         "Other dental residency and fellowship programs")

    def test_zh_show(self) -> None:
        """中文显示名金标(期望值 = 效果图 taxonomy.json 同码的 zh):人工定名盖过;没译成给 None;两段斜杠改「与」、
        一段是另一段开头的留长的、已有「与」的改顿号;去角色尾巴;去纯拉丁括注;兜底类拿专业类名派生(去「类」、
        .99 类直接用类名);不进选择器的兜底类不派生(没有类名),只做斜杠改写。
        2026-10-05 审查改判的金标:长的只多一个职业尾字的留短的学科名(12.0402 理发、物理治疗)、多的不是职业尾字的
        照旧留长的(宗教学)、斜杠后的职业名剥掉(焊接技术)。"""
        from statcan.cip import functions as fn

        def zh(code: str, text: str | None) -> str | None:
            """一参令外的测试便道。"""
            return fn.cip_zh_show_of(CipZhIn(code=code, text=text))

        self.assertEqual(zh("14.0401", "建筑工程学"), "建筑工程")
        self.assertIsNone(zh("26.0101", None))
        self.assertEqual(zh("26.0101", "生物学/生物科学"), "生物学与生物科学")
        self.assertEqual(zh("12.0402", "理发/理发师"), "理发")
        self.assertEqual(zh("51.2308", "物理治疗/物理治疗师"), "物理治疗")
        self.assertEqual(zh("38.0201", "宗教/宗教学"), "宗教学")
        self.assertEqual(zh("48.0508", "焊接技术/焊工"), "焊接技术")
        self.assertEqual(zh("01.8301", "兽医/动物健康技术/技师和兽医助理"), "兽医与动物健康技术和兽医助理")
        self.assertEqual(zh("15.0303", "电气、电子与通信工程技术/技术员"), "电气、电子与通信工程技术")
        self.assertEqual(zh("12.0501", "烘焙与糕点艺术/面包师/糕点师"), "烘焙与糕点艺术")
        self.assertEqual(zh("12.0505", "食品制作/专业烹饪/厨房助理"), "食品制作与专业烹饪")
        self.assertEqual(zh("99.0001", "甲/乙与丙"), "甲、乙与丙")
        self.assertEqual(zh("99.0001", "注册护士（RN, BSN）"), "注册护士")
        self.assertEqual(zh("52.0299", "工商管理、管理与运营（其他）"), "工商管理（其他）")
        self.assertEqual(zh("52.9999", "商业、管理、营销及相关支持服务（其他）"), "商科（其他）")
        self.assertEqual(zh("16.0399", "东亚语言文学（其他）"), "东亚语言（其他）")
        self.assertEqual(zh("60.0199", "牙科住院医师/进修项目（其他）"), "牙科住院医师与进修项目（其他）")

    def test_real_places(self) -> None:
        """真表全量:非沉底专业至少一处、沉底的 [];每处的大类序号对得上 CIP_CATS、三语名不空;序号按大类 / 专业类
        1..n 连续、同类各格同序号同名字;single == 专业类只装一个;单列类排在折叠类之后;热门专业都挂上了。"""
        from statcan.cip import constants as c
        rows = self.real()
        cat_keys = list(c.CIP_CATS)
        group_orders: dict = {}
        members: dict = {}
        for r in rows:
            with self.subTest(code=r["code"]):
                if r["series"] in c.CIP_SINK_SERIES:
                    self.assertEqual(r["places"], [])
                    continue
                self.assertGreater(len(r["places"]), 0)
                for p in r["places"]:
                    self.assertEqual(p["catOrder"], cat_keys.index(p["cat"]) + 1)
                    for key in ("catEn", "catZh", "catKo", "groupEn", "groupZh", "groupKo"):
                        self.assertNotEqual(p[key], "")
                    group_orders.setdefault(p["cat"], {}).setdefault(p["group"], set()).add(
                        (p["groupOrder"], p["single"], p["groupEn"], p["groupZh"], p["groupKo"]))
                    members.setdefault((p["cat"], p["group"]), []).append(p["order"])
        self.assertEqual(set(group_orders), set(cat_keys))
        for cat, groups in group_orders.items():
            orders = []
            last_multi = 0
            first_single = 10 ** 6
            for group, seen in groups.items():
                self.assertEqual(len(seen), 1, (cat, group, seen))
                order, single = list(seen)[0][:2]
                orders.append(order)
                self.assertEqual(single, len(members[(cat, group)]) == 1, (cat, group))
                if single:
                    first_single = min(first_single, order)
                else:
                    last_multi = max(last_multi, order)
                self.assertEqual(sorted(members[(cat, group)]), list(range(1, len(members[(cat, group)]) + 1)))
            self.assertEqual(sorted(orders), list(range(1, len(orders) + 1)), cat)
            self.assertLess(last_multi, first_single, cat)
        by = {}
        for r in rows:
            by[r["code"]] = r
        for code in c.CIP_POPULAR:
            self.assertGreater(len(by[code]["places"]), 0, code)

    def test_real_key_majors(self) -> None:
        """关键专业落点(效果图金标):52.0203 商科(工商管理类)+ 交通物流(物流管理类)、52.0901 商科 + 餐饮酒店、
        12.0503 餐饮酒店、51.3801 医疗健康、11.0701 计算机、31.0601 户外教育进教育;会计类排财会金融第一且会计排类里第一;
        机械类排工程第一;几个大类点开的第一类各是谁。
        2026-10-05 单列并类改判两条金标(原先各自单列):11.0701 计算机科学并进计算机综合类(11.01)、31.0601 户外教育
        并进教育学（通用）(13.01);同批补:27.0601 应用统计学进统计学类(27.05,人工表)、计算机大类的八个 series 30 专业
        全在交叉学科类、30.1601 财会金融进会计类而计算机进交叉学科类、52.1101 国际商务进商科（通用）、46.0101 砌筑进
        建筑工种（通用）(XX.00 先于 XX.01)。"""
        rows = self.real()
        by = {}
        first = {}
        for r in rows:
            by[r["code"]] = r
            for p in r["places"]:
                if p["groupOrder"] == 1:
                    first[p["cat"]] = p["group"]

        def where(code: str) -> list:
            """一个码挂在哪:[(大类, 专业类)]。"""
            out = []
            for p in by[code]["places"]:
                out.append((p["cat"], p["group"]))
            return out

        self.assertEqual(where("52.0203"), [("biz", "52.02"), ("logi", "logi.mgmt")])
        self.assertEqual(where("52.0901"), [("biz", "52.09"), ("hosp", "52.09")])
        self.assertEqual(where("12.0503"), [("hosp", "12.05")])
        self.assertEqual(where("51.3801"), [("health", "51.38")])
        self.assertEqual(where("11.0701"), [("it", "11.01")])
        self.assertEqual(where("31.0601"), [("edu", "13.01")])
        self.assertEqual(where("27.0601"), [("it", "27.05")])
        self.assertEqual(where("30.1601"), [("fin", "52.03"), ("it", "it.cross")])
        self.assertEqual(where("52.1101"), [("biz", "52.01")])
        self.assertEqual(where("46.0101"), [("build", "46.00")])
        cross = []
        for r in rows:
            for p in r["places"]:
                if (p["cat"], p["group"]) == ("it", "it.cross"):
                    cross.append(r["code"])
        self.assertEqual(sorted(cross), ["30.0601", "30.0801", "30.1601", "30.3001", "30.3101", "30.3901", "30.4801",
                                         "30.4901"])
        self.assertEqual(where("52.0301"), [("fin", "52.03")])
        fin = by["52.0301"]["places"][0]
        self.assertEqual((fin["groupOrder"], fin["order"]), (1, 1))
        self.assertEqual(first["fin"], "52.03")
        self.assertEqual(first["eng"], "eng.mech")
        self.assertEqual(first["biz"], "52.02")
        self.assertEqual(first["hosp"], "52.09")

    def test_real_folded(self) -> None:
        """真表单列并类(2026-10-05 Frank「这下面怎么还有一些单蹦的专业」立):全表一个单列类都没有(single 全 false、
        每个专业类至少装两个专业 —— 无处可并的单列只可能是其他专业类,真表也该是 0);交叉学科类 / 其他专业类只挂在
        自己键里写的那个大类;其他专业类的 groupOrder 是本大类最大的。"""
        from statcan.cip import constants as c
        rows = self.real()
        size: dict = {}
        last: dict = {}
        misc: dict = {}
        for r in rows:
            for p in r["places"]:
                with self.subTest(code=r["code"], cat=p["cat"]):
                    self.assertFalse(p["single"])
                    for tail in (c.CIP_CROSS_TAIL, c.CIP_MISC_TAIL):
                        if p["group"].endswith(tail):
                            self.assertEqual(p["group"], p["cat"] + tail)
                key = (p["cat"], p["group"])
                size[key] = size.get(key, 0) + 1
                last[p["cat"]] = max(last.get(p["cat"], 0), p["groupOrder"])
                if p["group"].endswith(c.CIP_MISC_TAIL):
                    misc[p["cat"]] = p["groupOrder"]
        for key, n in size.items():
            self.assertGreater(n, 1, key)
        for cat, order in misc.items():
            self.assertEqual(order, last[cat], cat)

    def test_real_names(self) -> None:
        """真表全量显示名:中文显示名不带「/」、英文短名不空不带「/」;没译成的中文显示名也是 None;
        键序 = DDL 列序(code … popular、titleEnShort、places)+ 殿后的 titleZhRaw。
        2026-10-05 审查补两条:进选择器的英文短名不许小写开头(同根两词留右边那个词时实撞 26 行);英文短名全表零重名
        (中韩名早有 test_local_names_real 守着,英文没人守,实撞 Music / Remote aircraft pilot 两组)。"""
        rows = self.real()
        keys = ["code", "titleEn", "titleZh", "titleKo", "series", "grouping", "broads", "popular", "titleEnShort",
                "places", "titleZhRaw"]
        seen: dict = {}
        for r in rows:
            with self.subTest(code=r["code"]):
                self.assertEqual(list(r), keys)
                self.assertNotEqual(r["titleEnShort"], "")
                self.assertNotIn("/", r["titleEnShort"])
                self.assertNotIn(r["titleEnShort"], seen, seen.get(r["titleEnShort"]))
                seen[r["titleEnShort"]] = r["code"]
                if len(r["places"]) > 0:
                    self.assertFalse(r["titleEnShort"][:1].islower(), r["code"])
                if r["titleZh"] is not None:
                    self.assertNotIn("/", r["titleZh"])
                if r["titleZhRaw"] is None:
                    self.assertIsNone(r["titleZh"])

    def test_probes(self) -> None:
        """变异探针(真表):删掉 13 系的大类对照 → 落不到大类即抛;删掉会计类的名字 → 专业类缺名即抛;
        自定专业类挂到不存在的大类 → 大类键即抛。原表照旧不抛。
        2026-10-05 审查补三个死键探针(写错一位原先只会悄悄失效):自定专业类成员前缀 15.1102 写成 15.1192、
        并类码写成不存在的 31.9998、大类对照多一个不存在的 class 键 52.9998,都要抛且报错里点名那个键。
        2026-10-05 单列并类补四个探针:人工并类表的前缀没命中单列专业(11.02 是折叠类)、目标专业类不在本大类(52.03 不在
        计算机)、大类键写错,都要抛且点名;删掉 27.06 那条,应用统计学就照通用类规则落回数学类(27.01)。"""
        from statcan.cip import constants as c
        from statcan.cip import functions as fn
        self.real()
        rows = self.raw_rows
        fn.cip_places_of(CipPlacesIn(rows=rows, rank=self.rank))
        kept = dict(c.CIP_CAT_OF)
        del kept["13"]
        with mock.patch.dict(c.CIP_CAT_OF, kept, clear=True):
            with self.assertRaises(RuntimeError):
                fn.cip_places_of(CipPlacesIn(rows=rows, rank=self.rank))
        names = dict(c.CIP_GROUP_NAMES)
        del names["52.03"]
        with mock.patch.dict(c.CIP_GROUP_NAMES, names, clear=True):
            with self.assertRaises(RuntimeError):
                fn.cip_places_of(CipPlacesIn(rows=rows, rank=self.rank))
        with mock.patch.dict(c.CIP_CUSTOM_GROUPS, {"logi.mgmt": ("nope", ("52.0203",))}):
            with self.assertRaises(RuntimeError):
                fn.cip_places_of(CipPlacesIn(rows=rows, rank=self.rank))
        with mock.patch.dict(c.CIP_CUSTOM_GROUPS, {"eng.survey": ("eng", ("14.38", "15.1192"))}):
            with self.assertRaisesRegex(RuntimeError, r"15\.1192"):
                fn.cip_places_of(CipPlacesIn(rows=rows, rank=self.rank))
        with mock.patch.dict(c.CIP_GROUP_FOLD, {"31.9998": "31.05"}):
            with self.assertRaisesRegex(RuntimeError, r"31\.9998"):
                fn.cip_places_of(CipPlacesIn(rows=rows, rank=self.rank))
        with mock.patch.dict(c.CIP_CAT_OF, {"52.9998": ("biz",)}):
            with self.assertRaisesRegex(RuntimeError, r"52\.9998"):
                fn.cip_places_of(CipPlacesIn(rows=rows, rank=self.rank))
        for table, hit in (({"it": {"27.06": "27.05", "11.02": "11.01"}}, r"11\.02"),
                           ({"it": {"27.06": "52.03"}}, r"27\.06"), ({"nope": {"27.06": "27.05"}}, r"nope")):
            with self.subTest(hit=hit), mock.patch.dict(c.CIP_SINGLE_TO, table):
                with self.assertRaisesRegex(RuntimeError, hit):
                    fn.cip_places_of(CipPlacesIn(rows=rows, rank=self.rank))
        with mock.patch.dict(c.CIP_SINGLE_TO, {"it": {}}):
            got = fn.cip_places_of(CipPlacesIn(rows=rows, rank=self.rank))
        self.assertEqual(got["27.0601"][0]["group"], "27.01")
