"""
mart/rank 子域函数 —— 抽选页排名表 draw_rank 的拼法(方言同 mart/functions.py:零字符串令、显式循环令、一参令)。

入口 draw_rank_of:吃上游四张 mart 表的行,出 draw_rank 整表(配额卡在前、节奏卡在后,各自按名次排)。
依赖单向:本文件 → 本子域 constants / scheme;mart 共用段只调用入口,不被本文件 import。

@author Frank
@time 2026-10-12 16:40:00
"""
from datetime import date

from mart.rank.constants import (
    ACT_BY_STATUS, ACT_MONTH_ONLY, ALLOC_PR_TARGET, ALLOC_QUOTA, CAD_W_ACT, CAD_W_COUNT, CAD_W_FREQ, CAD_W_INV,
    CARD_CADENCE, CARD_QUOTA, DATE_FULL_LEN, EE_KEY_TPL, EE_LABEL_PNP, EE_NAME_EN, FAMILY_TAIL_RE, GAP_FALLBACK_DAYS,
    GEO_CA, IDLE_RATIO, K_AS_OF, K_DRAW_DATE, K_DRAW_STREAMS, K_GEO, K_INVITATIONS, K_KEY, K_KIND, K_LABEL, K_METRIC,
    K_OFFICIAL_NAME, K_PERIOD, K_PLAIN_KO, K_PLAIN_ZH, K_PROVINCE, K_QUOTA_KEY, K_SCALE, K_SCOPE_KIND, K_STATUS,
    K_STREAM, K_STREAM_KEY, K_STREAM_ZH, K_UNIT, K_VALUE, KIND_DRAW, LATE_MIN_DAYS, LATE_RATIO, MACRO_EE_TARGET,
    METRIC_ALLOCATION, METRIC_ISSUED, METRIC_NOMINATIONS_YTD, ORPHAN_CLOSED, ORPHAN_HIDDEN, ORPHAN_KEY_TPL, ORPHAN_NAMES, PATHWAY_CLOSED,
    PLAIN_PREFIX_TPL, PROV_FED, QUOTA_ACT_FRESH, QUOTA_ACT_NONE, QUOTA_ACT_OLD, QUOTA_ACT_STALE, QUOTA_FRESH_DAYS,
    QUOTA_STALE_DAYS, QUOTA_W_ACT, QUOTA_W_ALLOC, QUOTA_W_INV, SCOPE_PROVINCE, SCOPE_STREAM, SCORE_DIGITS,
    STATUS_IDLE, STATUS_LATE, STATUS_OK, UNIT_INVITATION, YEAR_LEN,
)
from mart.rank.scheme import (
    Card, CadenceCardIn, CardStats, CardStatsIn, CoverIn, DrawRankIn, EeCardIn, EeCardsIn, EeTargetIn, OrphanCardIn,
    OrphansIn, PathwayCardIn, ProvMetricIn, QuotaActIn, QuotaCardIn, RankRowIn, RowsByProvIn, RowsOfIn, StatusIn,
    StreamNomIn, StripIn, YearIn,
)

# =========================================================================
# 1. 入口
# =========================================================================


def draw_rank_of(x: DrawRankIn) -> list:
    """上游四张 mart 表 → draw_rank 整表:配额卡(联邦 + 各省)与抽选节奏卡(一条通道一张),各自综合排名。

    @param x 抽选 / 运营统计 / 通道 / 宏观序列四表的行与统计日。
    @returns draw_rank 行清单(配额卡在前,节奏卡在后,各按名次)。
    """
    cadence = cadence_cards_of(x)
    rank_cards(cadence)
    quota = quota_cards_of(x)
    rank_cards(quota)
    out: list = []
    for card in quota + cadence:
        out.append(to_draw_rank_row(RankRowIn(card=card, as_of=x.today.isoformat())))
    return out


def draws_only(rows: list) -> list:
    """抽选行里只留真抽选(改制通告不进统计)。"""
    out: list = []
    for r in rows:
        if r.get(K_KIND) == KIND_DRAW:
            out.append(r)
    return out


# =========================================================================
# 2. 抽选节奏卡
# =========================================================================


def cadence_cards_of(x: DrawRankIn) -> list:
    """节奏卡:通道表挂了抽选流的通道一组一张(同一批流的合一张)→ 没挂上的抽选流按流名族各一张 → 联邦 EE 类别各一张
    (省提名专场不出)。没有抽选行的组不出卡。"""
    draws = draws_only(x.draws)
    linked: set = set()
    groups: dict = {}
    for p in x.pathways:
        prov = p.get(K_PROVINCE) or SCOPE_PROVINCE
        streams = p.get(K_DRAW_STREAMS) or []
        if prov == PROV_FED or len(streams) == 0:
            continue
        for s in streams:
            linked.add((prov, s))
        if p.get(K_STATUS) == PATHWAY_CLOSED:
            continue
        groups.setdefault((prov, tuple(sorted(streams))), []).append(p)
    cards: list = []
    for (prov, streams), ps in groups.items():
        rows = rows_of(RowsOfIn(draws=draws, province=prov, streams=set(streams)))
        if len(rows) == 0:
            continue
        cards.append(pathway_card_of(PathwayCardIn(province=prov, pathways=ps, rows=rows, ops=x.ops, today=x.today)))
    for card in orphan_cards_of(OrphansIn(draws=draws, linked=linked, today=x.today)):
        cards.append(card)
    for card in ee_cards_of(EeCardsIn(draws=draws, today=x.today)):
        cards.append(card)
    return cards


def rows_of(x: RowsOfIn) -> list:
    """一省名下流名在集合里的抽选行。"""
    out: list = []
    for r in x.draws:
        if r.get(K_PROVINCE) == x.province and r.get(K_STREAM) in x.streams:
            out.append(r)
    return out


def pathway_card_of(x: PathwayCardIn) -> Card:
    """一组通道 → 一张节奏卡:一条通道 = 通道官方名 + 白话名;几条通道共用一批抽选 = 抽选流名 + 覆盖清单。"""
    stats = card_stats_of(CardStatsIn(rows=x.rows, today=x.today))
    first = x.pathways[0]
    if len(x.pathways) == 1:
        quota_key = first.get(K_QUOTA_KEY) or SCOPE_PROVINCE
        nominations = None
        if quota_key != SCOPE_PROVINCE:
            nominations = stream_nominations_of(StreamNomIn(ops=x.ops, quota_key=quota_key, year=str(x.today.year)))
        return to_cadence_card(CadenceCardIn(
            key=first.get(K_KEY) or SCOPE_PROVINCE, province=x.province, label=SCOPE_PROVINCE,
            name_en=first.get(K_OFFICIAL_NAME) or SCOPE_PROVINCE,
            name_zh=strip_prov_of(StripIn(text=first.get(K_PLAIN_ZH) or SCOPE_PROVINCE, province=x.province)),
            name_ko=strip_prov_of(StripIn(text=first.get(K_PLAIN_KO) or SCOPE_PROVINCE, province=x.province)),
            covers=[], stats=stats, nominations=nominations))
    covers: list = []
    for p in x.pathways:
        covers.append(to_cover(CoverIn(pathway=p, province=x.province)))
    return to_cadence_card(CadenceCardIn(
        key=first.get(K_KEY) or SCOPE_PROVINCE, province=x.province, label=SCOPE_PROVINCE,
        name_en=stats.streams[0], name_zh=SCOPE_PROVINCE, name_ko=SCOPE_PROVINCE,
        covers=covers, stats=stats, nominations=None))


def strip_prov_of(x: StripIn) -> str:
    """白话名去掉省码前缀(「AB 机会通道」→「机会通道」;卡片左边已有省码胶囊)。"""
    prefix = PLAIN_PREFIX_TPL.format(prov=x.province)
    if x.text.startswith(prefix):
        return x.text[len(prefix):]
    return x.text


def stream_nominations_of(x: StreamNomIn) -> int | None:
    """一条通道今年已发提名(运营统计通道级行;先认 issued 再认 nominations_ytd,取截至日最新的一行)。"""
    for metric in (METRIC_ISSUED, METRIC_NOMINATIONS_YTD):
        best = None
        for r in x.ops:
            if r.get(K_METRIC) != metric or r.get(K_SCOPE_KIND) != SCOPE_STREAM:
                continue
            if r.get(K_STREAM_KEY) != x.quota_key or r.get(K_VALUE) is None:
                continue
            if is_this_year(YearIn(row=r, year=x.year)) is False:
                continue
            if best is None or (r.get(K_AS_OF) or SCOPE_PROVINCE) > (best.get(K_AS_OF) or SCOPE_PROVINCE):
                best = r
        if best is not None:
            return int(best.get(K_VALUE) or 0)
    return None


def is_this_year(x: YearIn) -> bool:
    """运营统计行是不是今年的(统计期或截至日以今年开头;同 cms PNP_OPS_QUOTA 的口径)。"""
    period = str(x.row.get(K_PERIOD) or SCOPE_PROVINCE)
    as_of = str(x.row.get(K_AS_OF) or SCOPE_PROVINCE)
    return period.startswith(x.year) or as_of.startswith(x.year)


def orphan_cards_of(x: OrphansIn) -> list:
    """没挂上任何通道的省级抽选流:按流名族(末尾括号剥掉)合卡,一族一张;官网已关停的(ORPHAN_CLOSED)与拍板不出的(ORPHAN_HIDDEN)不出卡。"""
    groups: dict = {}
    for r in x.draws:
        prov = r.get(K_PROVINCE) or SCOPE_PROVINCE
        stream = r.get(K_STREAM) or SCOPE_PROVINCE
        if prov == PROV_FED or (prov, stream) in x.linked:
            continue
        family = family_of(stream)
        if (prov, family) in ORPHAN_CLOSED or (prov, family) in ORPHAN_HIDDEN:
            continue
        groups.setdefault((prov, family), []).append(r)
    cards: list = []
    for (prov, family), rows in groups.items():
        cards.append(orphan_card_of(OrphanCardIn(province=prov, family=family, rows=rows, today=x.today)))
    return cards


def family_of(stream: str) -> str:
    """抽选流名 → 流名族(末尾括号剥掉:「… Priority Sectors (Aviation)」→「… Priority Sectors」)。"""
    return FAMILY_TAIL_RE.sub(SCOPE_PROVINCE, stream)


def orphan_card_of(x: OrphanCardIn) -> Card:
    """一族没挂上通道的抽选 → 一张节奏卡(中 / 韩名先查 ORPHAN_NAMES,表外取最近一期的中文灰注)。"""
    stats = card_stats_of(CardStatsIn(rows=x.rows, today=x.today))
    names = ORPHAN_NAMES.get(x.family)
    name_zh = stats.latest.get(K_STREAM_ZH) or SCOPE_PROVINCE
    name_ko = SCOPE_PROVINCE
    if names is not None:
        name_zh = names[0]
        name_ko = names[1]
    return to_cadence_card(CadenceCardIn(
        key=ORPHAN_KEY_TPL.format(prov=x.province, family=x.family), province=x.province, label=SCOPE_PROVINCE,
        name_en=x.family, name_zh=name_zh, name_ko=name_ko, covers=[], stats=stats, nominations=None))


def ee_cards_of(x: EeCardsIn) -> list:
    """联邦 EE 类别各一张(省提名专场 label = pnp 不出:只收已拿省提名的人,人数在省那边已算过)。"""
    groups: dict = {}
    for r in x.draws:
        label = r.get(K_LABEL) or SCOPE_PROVINCE
        if r.get(K_PROVINCE) != PROV_FED or label == EE_LABEL_PNP or label == SCOPE_PROVINCE:
            continue
        groups.setdefault(label, []).append(r)
    cards: list = []
    for label, rows in groups.items():
        cards.append(ee_card_of(EeCardIn(label=label, rows=rows, today=x.today)))
    return cards


def ee_card_of(x: EeCardIn) -> Card:
    """一个 EE 类别 → 一张节奏卡(英文名取官方类别名;中 / 韩名前端按类别键查 i18n)。"""
    stats = card_stats_of(CardStatsIn(rows=x.rows, today=x.today))
    name_en = EE_NAME_EN.get(x.label) or family_of(stats.latest.get(K_STREAM) or SCOPE_PROVINCE)
    return to_cadence_card(CadenceCardIn(
        key=EE_KEY_TPL.format(label=x.label), province=PROV_FED, label=x.label, name_en=name_en,
        name_zh=SCOPE_PROVINCE, name_ko=SCOPE_PROVINCE, covers=[], stats=stats, nominations=None))


def card_stats_of(x: CardStatsIn) -> CardStats:
    """一组抽选行的节奏统计:最近一期 / 平均间隔 / 距今 / 今年次数与人数 / 状态。只到月的日期不进间隔与距今。"""
    year = str(x.today.year)
    full: set = set()
    ytd_dates: set = set()
    streams: set = set()
    latest: dict = {}
    inv = 0
    inv_seen = False
    for r in x.rows:
        d = r.get(K_DRAW_DATE) or SCOPE_PROVINCE
        streams.add(r.get(K_STREAM) or SCOPE_PROVINCE)
        if len(d) == DATE_FULL_LEN:
            full.add(d)
        if len(latest) == 0 or d > (latest.get(K_DRAW_DATE) or SCOPE_PROVINCE):
            latest = r
        if d[:YEAR_LEN] != year:
            continue
        ytd_dates.add(d)
        if r.get(K_INVITATIONS) is not None:
            inv += int(r.get(K_INVITATIONS) or 0)
            inv_seen = True
    days = sorted(full)
    gap = None
    since = None
    last = latest.get(K_DRAW_DATE) or SCOPE_PROVINCE
    if len(days) > 0:
        last = days[-1]
        since = (x.today - date.fromisoformat(days[-1])).days
    if len(days) > 1:
        span = (date.fromisoformat(days[-1]) - date.fromisoformat(days[0])).days
        gap = round(span / (len(days) - 1))
    status = STATUS_OK
    act = ACT_MONTH_ONLY
    if since is not None:
        status = status_of(StatusIn(since=since, gap=gap))
        act = ACT_BY_STATUS[status]
    inv_ytd = None
    if inv_seen:
        inv_ytd = inv
    return CardStats(last_date=last, gap=gap, since=since, draws_ytd=len(ytd_dates), inv_ytd=inv_ytd,
                     unit=latest.get(K_UNIT) or UNIT_INVITATION, scale=latest.get(K_SCALE) or SCOPE_PROVINCE,
                     streams=sorted(streams), status=status, act=act, latest=latest)


def status_of(x: StatusIn) -> str:
    """节奏状态:比平均间隔多晚不到 7 天一律正常;超过 3 倍 = 久未抽选,超过 1.5 倍 = 比平常晚。"""
    g = x.gap
    if g is None:
        g = GAP_FALLBACK_DAYS
    if x.since - g < LATE_MIN_DAYS:
        return STATUS_OK
    if x.since > IDLE_RATIO * g:
        return STATUS_IDLE
    if x.since > LATE_RATIO * g:
        return STATUS_LATE
    return STATUS_OK


# =========================================================================
# 3. 综合排名
# =========================================================================


def rank_cards(cards: list) -> None:
    """一种卡就地打分排名(节奏卡:邀请 / 次数 / 频率三项分位 + 活跃;配额卡:邀请 / 配额两项分位 + 活跃),
    分高在前,同分按卡片键,名次从 1 起。"""
    if len(cards) == 0:
        return
    inv: list = []
    second: list = []
    third: list = []
    for c in cards:
        inv.append(c.invitations_ytd or 0)
        if c.kind == CARD_QUOTA:
            second.append(c.allocation or 0)
            continue
        second.append(c.draws_ytd)
        third.append(1 / (c.avg_gap_days or GAP_FALLBACK_DAYS))
    p_inv = pct_of(inv)
    p_second = pct_of(second)
    p_third = pct_of(third)
    for i, c in enumerate(cards):
        if c.kind == CARD_QUOTA:
            c.score = QUOTA_W_INV * p_inv[i] + QUOTA_W_ALLOC * p_second[i] + QUOTA_W_ACT * c.act
        else:
            c.score = CAD_W_INV * p_inv[i] + CAD_W_COUNT * p_second[i] + CAD_W_FREQ * p_third[i] + CAD_W_ACT * c.act
        c.score = round(c.score, SCORE_DIGITS)
    cards.sort(key=score_key_of)
    for i, c in enumerate(cards):
        c.rank = i + 1


def score_key_of(card: Card) -> tuple:
    """排序键:分高在前,同分按卡片键(稳定)。"""
    return (-card.score, card.key)


def pct_of(values: list) -> list:
    """一列数 → 各自的分位(0 到 1;并列取同一个分位;不足两个数一律 1)。"""
    n = len(values)
    out: list = []
    if n < 2:
        for _ in values:
            out.append(1.0)
        return out
    srt = sorted(values)
    for v in values:
        out.append(srt.index(v) / (n - 1))
    return out


def quota_act_of(x: QuotaActIn) -> float:
    """配额卡活跃分:最近一次到日抽选 30 天内满分,90 天内半分,更久 0.1,没有 0。"""
    if x.since is None:
        return QUOTA_ACT_NONE
    if x.since <= QUOTA_FRESH_DAYS:
        return QUOTA_ACT_FRESH
    if x.since <= QUOTA_STALE_DAYS:
        return QUOTA_ACT_STALE
    return QUOTA_ACT_OLD


# =========================================================================
# 4. 配额卡
# =========================================================================


def quota_cards_of(x: DrawRankIn) -> list:
    """配额卡:联邦一张(永居目标 + 今年 EE 邀请总数)+ 抽选或配额里出现过的每个省一张(配额 / 今年邀请 / 今年提名)。
    三格全空的省不出卡。"""
    year = str(x.today.year)
    draws = draws_only(x.draws)
    provs: set = set()
    for r in draws:
        provs.add(r.get(K_PROVINCE) or SCOPE_PROVINCE)
    for r in x.ops:
        if r.get(K_METRIC) == METRIC_ALLOCATION:
            provs.add(r.get(K_PROVINCE) or SCOPE_PROVINCE)
    provs.discard(SCOPE_PROVINCE)
    provs.discard(PROV_FED)
    cards: list = []
    fed_rows = rows_by_prov(RowsByProvIn(draws=draws, province=PROV_FED))
    cards.append(to_quota_card(QuotaCardIn(
        province=PROV_FED, allocation=ee_target_of(EeTargetIn(macro=x.macro, year=year)), allocation_kind=ALLOC_PR_TARGET,
        stats=card_stats_of(CardStatsIn(rows=fed_rows, today=x.today)), nominations=None)))
    for prov in sorted(provs):
        alloc = prov_metric_of(ProvMetricIn(ops=x.ops, province=prov, metrics=[METRIC_ALLOCATION], year=year))
        noms = prov_metric_of(ProvMetricIn(ops=x.ops, province=prov,
                                           metrics=[METRIC_ISSUED, METRIC_NOMINATIONS_YTD], year=year))
        stats = card_stats_of(CardStatsIn(rows=rows_by_prov(RowsByProvIn(draws=draws, province=prov)), today=x.today))
        if alloc is None and noms is None and stats.inv_ytd is None:
            continue
        cards.append(to_quota_card(QuotaCardIn(province=prov, allocation=alloc, allocation_kind=ALLOC_QUOTA,
                                               stats=stats, nominations=noms)))
    return cards


def rows_by_prov(x: RowsByProvIn) -> list:
    """一省(或联邦)的全部抽选行。"""
    out: list = []
    for r in x.draws:
        if r.get(K_PROVINCE) == x.province:
            out.append(r)
    return out


def ee_target_of(x: EeTargetIn) -> int | None:
    """联邦今年的 EE 永居目标(宏观序列 eeTarget,全国,统计期 = 今年;没登 = None)。"""
    for r in x.macro:
        if r.get(K_KEY) == MACRO_EE_TARGET and r.get(K_GEO) == GEO_CA and str(r.get(K_PERIOD)) == x.year:
            if r.get(K_VALUE) is not None:
                return int(r.get(K_VALUE) or 0)
    return None


def prov_metric_of(x: ProvMetricIn) -> int | None:
    """一省今年的全省口径指标:按 metrics 顺序试,先命中先用;同一指标多行取截至日最新的。"""
    for metric in x.metrics:
        best = None
        for r in x.ops:
            if r.get(K_PROVINCE) != x.province or r.get(K_METRIC) != metric:
                continue
            if (r.get(K_SCOPE_KIND) or SCOPE_PROVINCE) != SCOPE_PROVINCE or r.get(K_VALUE) is None:
                continue
            if is_this_year(YearIn(row=r, year=x.year)) is False:
                continue
            if best is None or str(r.get(K_AS_OF) or SCOPE_PROVINCE) > str(best.get(K_AS_OF) or SCOPE_PROVINCE):
                best = r
        if best is not None:
            return int(best.get(K_VALUE) or 0)
    return None


# =========================================================================
# 5. 行构造器
# =========================================================================


def to_cover(x: CoverIn) -> dict:
    """合卡覆盖的一条通道 → {en, zh, ko}(中 / 韩名去掉省码前缀)。"""
    return {
        "en": x.pathway.get("officialName") or "",
        "zh": strip_prov_of(StripIn(text=x.pathway.get("plainZh") or "", province=x.province)),
        "ko": strip_prov_of(StripIn(text=x.pathway.get("plainKo") or "", province=x.province)),
    }


def to_cadence_card(x: CadenceCardIn) -> Card:
    """节奏卡的身份格 + 统计 → Card(score / rank 待排名段回填)。"""
    s = x.stats
    return Card(key=x.key, kind=CARD_CADENCE, province=x.province, label=x.label, name_en=x.name_en,
                name_zh=x.name_zh, name_ko=x.name_ko, covers=x.covers, streams=s.streams, scale=s.scale,
                last_date=s.last_date, avg_gap_days=s.gap, status=s.status, draws_ytd=s.draws_ytd,
                invitations_ytd=s.inv_ytd, invite_unit=s.unit, nominations_ytd=x.nominations, allocation=None,
                allocation_kind=SCOPE_PROVINCE, since=s.since, act=s.act)


def to_quota_card(x: QuotaCardIn) -> Card:
    """配额卡 → Card(名字前端按省码出;活跃分按最近一次到日抽选距今)。"""
    s = x.stats
    return Card(key=x.province, kind=CARD_QUOTA, province=x.province, label=SCOPE_PROVINCE, name_en=SCOPE_PROVINCE,
                name_zh=SCOPE_PROVINCE, name_ko=SCOPE_PROVINCE, covers=[], streams=[], scale=SCOPE_PROVINCE,
                last_date=s.last_date, avg_gap_days=None, status=STATUS_OK, draws_ytd=s.draws_ytd,
                invitations_ytd=s.inv_ytd, invite_unit=s.unit, nominations_ytd=x.nominations,
                allocation=x.allocation, allocation_kind=x.allocation_kind, since=s.since,
                act=quota_act_of(QuotaActIn(since=s.since)))


def to_draw_rank_row(x: RankRowIn) -> dict:
    """排好名的卡 → draw_rank 一行(键对齐 cms lib/mart 的 toDrawRank)。"""
    c = x.card
    return {
        "key": c.key, "kind": c.kind, "rank": c.rank, "score": c.score, "province": c.province, "label": c.label,
        "nameEn": c.name_en, "nameZh": c.name_zh, "nameKo": c.name_ko, "covers": c.covers, "streams": c.streams,
        "scale": c.scale, "lastDate": c.last_date, "avgGapDays": c.avg_gap_days, "status": c.status,
        "drawsYtd": c.draws_ytd, "invitationsYtd": c.invitations_ytd, "inviteUnit": c.invite_unit,
        "nominationsYtd": c.nominations_ytd, "allocation": c.allocation, "allocationKind": c.allocation_kind,
        "asOf": x.as_of,
    }
