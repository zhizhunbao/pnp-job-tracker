"""
mart/rank 子域形状(一参令 XxxIn / 单返回值 XxxOut;同 mart/scheme.py 的方言)。

@author Frank
@time 2026-10-12 16:40:00
"""
import unittest
from dataclasses import dataclass, field
from datetime import date

# =========================================================================
# 1. 上游行的键与值
# =========================================================================


@dataclass
class DrawRankIn:
    """draw_rank_of() 入参:上游四张 mart 表的行 + 今天(今年 / 距今都按它算)。"""

    draws: list
    """pnp_draws 行(含联邦 FED 行)。"""

    ops: list
    """pnp_ops_stats 行。"""

    pathways: list
    """pathways 行。"""

    macro: list
    """macro_series 行(取联邦 EE 永居目标)。"""

    today: date
    """统计日(汇装当天)。"""


# =========================================================================
# 2. 抽选节奏卡
# =========================================================================


@dataclass
class Card:
    """一张卡的全部格子(两种卡共用;配额卡不填节奏格,节奏卡不填配额格)。score / rank 由排名段回填。"""

    key: str
    """卡片稳定键(通道键 / 省码:流名族 / ee-类别键 / 省码)。"""

    kind: str
    """卡种(quota / cadence)。"""

    province: str
    """省码(联邦 = FED)。"""

    label: str
    """联邦类别键(前端按它查 ee.* 词条出中 / 韩名);省卡与通道卡为空串。"""

    name_en: str
    """英文名(通道官方名 / 抽选流名族 / EE 官方类别名;配额卡为空串,前端按省码出省名)。"""

    name_zh: str
    """中文名(空串 = 没有;合卡时为空,看 covers)。"""

    name_ko: str
    """韩文名(同上)。"""

    covers: list
    """一次抽选覆盖的几条通道 [{en, zh, ko}](只有合卡才有;单条通道 / 联邦 / 配额卡为空)。"""

    streams: list
    """这张卡统计的抽选流名(原值;前端点卡片按它筛事件流)。"""

    scale: str
    """最近一期的分制(WEOI / SIRS / CRS …;空串 = 无)。"""

    last_date: str
    """最近一期抽选日期(到日;只到月的 NS 写月)。"""

    avg_gap_days: int | None
    """平均间隔天数(None = 只有一期到日的抽选,算不出)。"""

    status: str
    """节奏状态(ok / late / idle;按统计日判)。"""

    draws_ytd: int
    """今年抽选次数(按日期去重)。"""

    invitations_ytd: int | None
    """今年邀请人数(None = 今年的抽选都没公布人数,或今年没抽过)。"""

    invite_unit: str
    """人数口径(invitation / selection / application)。"""

    nominations_ytd: int | None
    """今年已发提名(None = 官方没公布或本站未收录;联邦没有提名这一步,恒为 None)。"""

    allocation: int | None
    """配额卡:2026 配额 / 联邦永居目标(None = 本站未收录);节奏卡恒为 None。"""

    allocation_kind: str
    """配额口径(quota / prTarget;节奏卡为空串)。"""

    since: int | None
    """最近一期距统计日几天(排名用,不落盘;只到月 = None)。"""

    act: float
    """活跃分(排名用,不落盘)。"""

    score: float = 0.0
    """综合分(排名段回填)。"""

    rank: int = 0
    """名次(1 起;排名段回填)。"""


@dataclass
class CardStatsIn:
    """card_stats_of() 入参:一张卡名下的抽选行 + 统计日。"""

    rows: list
    """抽选行(已按卡筛好)。"""

    today: date
    """统计日。"""


@dataclass
class CardStats:
    """card_stats_of() 返回:一组抽选行的节奏统计。"""

    last_date: str
    """最近一期日期。"""

    gap: int | None
    """平均间隔天数。"""

    since: int | None
    """距今天数。"""

    draws_ytd: int
    """今年抽选次数。"""

    inv_ytd: int | None
    """今年邀请人数。"""

    unit: str
    """人数口径。"""

    scale: str
    """分制。"""

    streams: list
    """抽选流名(去重排序)。"""

    status: str
    """节奏状态。"""

    act: float
    """活跃分。"""

    latest: dict = field(default_factory=dict)
    """最近一期那一行(取中文灰注 / 流名族用)。"""


@dataclass
class StatusIn:
    """status_of() 入参。"""

    since: int
    """距今天数。"""

    gap: int | None
    """平均间隔天数(None 时按 GAP_FALLBACK_DAYS 判)。"""


@dataclass
class RowsOfIn:
    """rows_of() 入参:按省 + 流名集合筛抽选行。"""

    draws: list
    """抽选行(只含 kind = draw)。"""

    province: str
    """省码。"""

    streams: set
    """流名集合。"""


@dataclass
class PathwayCardIn:
    """pathway_card_of() 入参:一组共用同一批抽选流的通道。"""

    province: str
    """省码。"""

    pathways: list
    """这组通道(按通道表顺序;一条 = 单卡,多条 = 合卡)。"""

    rows: list
    """这组的抽选行。"""

    ops: list
    """运营统计行(取通道级已发提名)。"""

    today: date
    """统计日。"""


@dataclass
class StripIn:
    """strip_prov_of() 入参。"""

    text: str
    """带省码前缀的白话名。"""

    province: str
    """省码。"""


@dataclass
class StreamNomIn:
    """stream_nominations_of() 入参。"""

    ops: list
    """运营统计行。"""

    quota_key: str
    """通道键(= 运营统计 streamKey)。"""

    year: str
    """今年。"""


@dataclass
class YearIn:
    """is_this_year() 入参。"""

    row: dict
    """运营统计行。"""

    year: str
    """今年。"""


@dataclass
class OrphansIn:
    """orphan_cards_of() 入参。"""

    draws: list
    """抽选行(只含 kind = draw)。"""

    linked: set
    """已挂在通道上的 (省码, 流名)。"""

    today: date
    """统计日。"""


@dataclass
class OrphanCardIn:
    """orphan_card_of() 入参:没挂上任何通道的一族抽选。"""

    province: str
    """省码。"""

    family: str
    """流名族(末尾括号剥掉后的流名)。"""

    rows: list
    """这族的抽选行。"""

    today: date
    """统计日。"""


@dataclass
class EeCardsIn:
    """ee_cards_of() 入参。"""

    draws: list
    """抽选行(只含 kind = draw)。"""

    today: date
    """统计日。"""


@dataclass
class EeCardIn:
    """ee_card_of() 入参:联邦一个 EE 类别。"""

    label: str
    """类别键。"""

    rows: list
    """这个类别的抽选行。"""

    today: date
    """统计日。"""


@dataclass
class CadenceCardIn:
    """to_cadence_card() 入参:节奏卡的身份格 + 统计。"""

    key: str
    """卡片键。"""

    province: str
    """省码。"""

    label: str
    """联邦类别键(省卡空串)。"""

    name_en: str
    """英文名。"""

    name_zh: str
    """中文名。"""

    name_ko: str
    """韩文名。"""

    covers: list
    """合卡覆盖的通道。"""

    stats: CardStats
    """节奏统计。"""

    nominations: int | None
    """今年已发提名。"""


# =========================================================================
# 3. 综合排名
# =========================================================================


@dataclass
class QuotaActIn:
    """quota_act_of() 入参。"""

    since: int | None
    """最近一次到日抽选距今天数(None = 没有)。"""


# =========================================================================
# 4. 配额卡
# =========================================================================


@dataclass
class ProvMetricIn:
    """prov_metric_of() 入参:取一省今年的全省口径指标。"""

    ops: list
    """运营统计行。"""

    province: str
    """省码。"""

    metrics: list
    """按优先顺序试的指标名(先命中先用)。"""

    year: str
    """今年。"""


@dataclass
class RowsByProvIn:
    """rows_by_prov() 入参。"""

    draws: list
    """抽选行。"""

    province: str
    """省码(联邦 = FED)。"""


@dataclass
class EeTargetIn:
    """ee_target_of() 入参。"""

    macro: list
    """宏观序列行。"""

    year: str
    """今年。"""


@dataclass
class QuotaCardIn:
    """to_quota_card() 入参。"""

    province: str
    """省码(联邦 = FED)。"""

    allocation: int | None
    """2026 配额 / 永居目标。"""

    allocation_kind: str
    """配额口径。"""

    stats: CardStats
    """这个省今年的抽选统计(邀请人数 / 口径 / 距今)。"""

    nominations: int | None
    """今年已发提名。"""


@dataclass
class CoverIn:
    """to_cover() 入参。"""

    pathway: dict
    """通道行。"""

    province: str
    """省码。"""


@dataclass
class RankRowIn:
    """to_draw_rank_row() 入参。"""

    card: Card
    """排好名的卡。"""

    as_of: str
    """统计日 ISO。"""


# =========================================================================
# 5. 自测(mart 门 `--only test` 一并跑;数据在用例里现造,不读仓内文件)
# =========================================================================


class RankMonthOnlyTest(unittest.TestCase):
    """抽选页排名自测(2026-10-12 立):只到月的抽选不进间隔与距今(规则自 cms fetchTimeline 下沉,原 2026-09-26 lead 定);
    状态三档的金标与「至少晚 7 天」下限;合卡与省提名专场;邀请人数多的排前(性质 + 变异探针)。"""

    def test_month_only(self) -> None:
        """NS 按月公布:最近一期照写月,间隔 / 距今算不出(None),活跃分给中间值;探针:同样的行换成到日就进统计。"""
        from mart.rank.functions import card_stats_of
        rows = [{"drawDate": "2026-07", "stream": "S", "invitations": 671, "unit": "selection"},
                {"drawDate": "2026-06", "stream": "S", "invitations": 531, "unit": "selection"}]
        st = card_stats_of(CardStatsIn(rows=rows, today=date(2026, 10, 12)))
        self.assertEqual((st.last_date, st.gap, st.since, st.draws_ytd, st.inv_ytd, st.unit),
                         ("2026-07", None, None, 2, 1202, "selection"))
        self.assertEqual(st.act, 0.5)
        probe = [{"drawDate": "2026-07-15", "stream": "S", "invitations": 671},
                 {"drawDate": "2026-06-15", "stream": "S", "invitations": 531}]
        st2 = card_stats_of(CardStatsIn(rows=probe, today=date(2026, 10, 12)))
        self.assertEqual((st2.last_date, st2.gap, st2.since), ("2026-07-15", 30, 89))

    def test_status(self) -> None:
        """金标(10-12 真数据):AB 平均 3 天距今 5 天 = 正常(晚不到 7 天);AB 医护 15 / 33 = 比平常晚;ON 13 / 165 = 久未抽选;
        算不出间隔按 90 天判。"""
        from mart.rank.functions import status_of
        self.assertEqual(status_of(StatusIn(since=5, gap=3)), "ok")
        self.assertEqual(status_of(StatusIn(since=33, gap=15)), "late")
        self.assertEqual(status_of(StatusIn(since=165, gap=13)), "idle")
        self.assertEqual(status_of(StatusIn(since=100, gap=None)), "ok")
        self.assertEqual(status_of(StatusIn(since=280, gap=None)), "idle")

    def test_cards(self) -> None:
        """两条通道挂同一批抽选流 = 一张合卡(列出两条);联邦省提名专场不出卡;没挂上通道的同族流合一张。"""
        from mart.rank.functions import draw_rank_of
        draws = [
            {"province": "PE", "kind": "draw", "drawDate": "2026-09-17", "stream": "Labour & Express Entry", "invitations": 100},
            {"province": "FED", "kind": "draw", "drawDate": "2026-09-28", "stream": "PNP", "label": "pnp", "invitations": 500},
            {"province": "FED", "kind": "draw", "drawDate": "2026-09-29", "stream": "CEC", "label": "cec", "invitations": 3000},
            {"province": "AB", "kind": "draw", "drawDate": "2026-10-07", "stream": "X – Priority Sectors (Aviation)",
             "invitations": 22},
            {"province": "AB", "kind": "draw", "drawDate": "2026-09-15", "stream": "X – Priority Sectors (Agriculture)",
             "invitations": 50},
        ]
        pathways = [
            {"key": "pe-a", "province": "PE", "officialName": "A", "plainZh": "PE 甲", "plainKo": "", "status": "open",
             "drawStreams": ["Labour & Express Entry"]},
            {"key": "pe-b", "province": "PE", "officialName": "B", "plainZh": "PE 乙", "plainKo": "", "status": "open",
             "drawStreams": ["Labour & Express Entry"]},
        ]
        rows = draw_rank_of(DrawRankIn(draws=draws, ops=[], pathways=pathways, macro=[], today=date(2026, 10, 12)))
        cad = {}
        for r in rows:
            if r["kind"] == "cadence":
                cad[r["key"]] = r
        self.assertEqual(sorted(cad), ["AB:X – Priority Sectors", "ee-cec", "pe-a"])
        self.assertEqual(cad["pe-a"]["covers"], [{"en": "A", "zh": "甲", "ko": ""}, {"en": "B", "zh": "乙", "ko": ""}])
        self.assertEqual(cad["AB:X – Priority Sectors"]["drawsYtd"], 2)
        self.assertEqual(cad["AB:X – Priority Sectors"]["invitationsYtd"], 72)

    def test_rank_by_invitations(self) -> None:
        """性质:两张卡别的都一样,邀请人数多的排前;变异探针:人数对调,名次跟着对调。"""
        from mart.rank.functions import draw_rank_of

        def make(inv_a: int, inv_b: int) -> list:
            """两条通道各一期同日抽选,只差人数。"""
            draws = [
                {"province": "MB", "kind": "draw", "drawDate": "2026-10-01", "stream": "SA", "invitations": inv_a},
                {"province": "MB", "kind": "draw", "drawDate": "2026-10-01", "stream": "SB", "invitations": inv_b},
            ]
            pathways = [
                {"key": "a", "province": "MB", "officialName": "A", "plainZh": "", "plainKo": "", "status": "open",
                 "drawStreams": ["SA"]},
                {"key": "b", "province": "MB", "officialName": "B", "plainZh": "", "plainKo": "", "status": "open",
                 "drawStreams": ["SB"]},
            ]
            out = []
            for r in draw_rank_of(DrawRankIn(draws=draws, ops=[], pathways=pathways, macro=[], today=date(2026, 10, 12))):
                if r["kind"] == "cadence":
                    out.append(r["key"])
            return out

        self.assertEqual(make(900, 100), ["a", "b"])
        self.assertEqual(make(100, 900), ["b", "a"])
