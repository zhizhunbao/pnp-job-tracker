/**
 * start 域(/start 就业把脉首页)的函数:服务端取数与派生、展示派生、洗展示行、
 * 列组与取值器、类名预算、手柄工厂。零 JSX 零 hook —— 排版归各 tsx,状态归 hooks.ts,
 * 死值归 constants.ts。
 *
 * 🔴 本文件**浏览器也要打包得动**(pulse.tsx 一族在消费它),所以一个 `/server` 门都不许 import:
 * 取数走方案 A —— 连接池与 payload 由页面门取好注进来(这里只调注进来那个对象的 query/find,
 * 不 import 池);要连库的那几条(命中率证据 / 省卡 / 橱窗 / 职业统计 / 抓取时刻)住 lib 各域
 * 的 server 门,由页面门直接调,结果原样喂给这里的纯函数 `homeCoreOf` 组装。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { drawStreamNote, eeKeyDisplay, streamDisplay } from '@/lib/jobs'
import { numOrNull, text } from '@/lib/db'
import { makeT } from '@/lib/i18n'
import { PROV_NAME } from '@/lib/stats'
import { track } from '@/lib/track'
import { ymd } from '@/lib/time'
import { btnClsOf } from '@/components/button'
import { cssOf } from '@/components/css'
import { shortOcc } from '@/components/quiz'
import {
  ANCHOR_HEAD, BROAD_ALL, CARD_GAP,
  CLS_CARD_HOVER, CLS_SEP, COL_DEAD, COL_HOT,
  COL_MOM, COL_NOC, COL_OCC, COL_OPEN, COL_PNP_PROVS, COL_PROV,
  COL_SAL, COL_SPONSOR_RATE, COL_TEER, DASH_MARK,
  DEAD_PROV_ORDER, DIFF_EASY, DIFF_MID, DIFF_TIGHT, EV_SCROLL,
  HOME_TTL_MS, ID_BOARDS, ID_PROV, ID_PR_BAND, ID_SE, KEY_PROV_HEAD,
  KEY_PR_HEAD, KEY_SEP, LABEL_NOC,
  LANG_EN, LANG_KO, LANG_ZH, MID_ALL, MOM_FLAT, NAV_IDS, NAV_TOP_LINE,
  NOC_HEAD, NUM_LOCALE, PCT_MARK, PCT_SCALE,
  PNP_SORT_SCALE, PROV_ALL_LOWER,
  RATE_DIGITS, RATE_MAX, RATE_OVER_TEXT,
  SEP_LIST, SHORT_PROV, SIGN_MINUS, SIGN_PLUS, TEER_HEAD, TEXT_NONE,
  TIER_BOTH, TIER_FED, TRACK_CARD, TRACK_CTA, TRACK_SEC, TRACK_SUBNAV, TRACK_SERIES, TRACK_PROP_KEY, URL_MACRO_API,
  TRACK_OCC, URL_HOME, URL_HOME_PNP, URL_HOME_Q_HEAD, URL_SPONSORS_API,
  COL_EMP, ID_CITY, ID_TREND, IND_BROADS, IND_KEYS,
  KEY_IND_HEAD, SEC_TOP_OPEN, SEC_TOP_WAGE, TRACK_EMP, TREND_AREA_OPACITY, TREND_COLOR, TREND_H_MAIN,
  TREND_H_SMALL, TREND_MIN_POINTS, TREND_PAD_MAIN, TREND_PAD_SMALL, URL_HOME_CITY_HEAD, WAGE_MIN_OPEN,
  CITY_KIND_DLI, CITY_KIND_IND, CITY_KIND_MAIN, CITY_KIND_PILOT,
  CITY_UTM_TAIL, COL_CITY, COL_CITY_POP, COL_CITY_UNEMP, COL_COMM, COL_COMM_TYPE,
  COL_DLI_GRAD, COL_DLI_N,
  COL_CITY_WAGE, COL_DLI_PUB, ID_CITY_DLI, ID_CITY_IND, ID_CITY_MAIN, ID_CITY_PILOT, PILOT_NAME_SEP, TRACK_CITY,
  URL_CITY_API,
  AXIS_CATEGORY, AXIS_VALUE, CHART_TRIGGER_AXIS, SERIES_LINE_TYPE, TREND_LINE_WIDTH, WAGE_K,
  WAGE_K_MARK, WAGE_RANGE_SEP, WAGE_SIGN,
  HIST_WINDOW, HIST_MIN_N, TAG_FED, PROV_FED, COL_DATE, COL_PROG, COL_STREAM, COL_SCORE, COL_INV, COL_READ, W_DATE,
  W_PROG, W_STREAM, W_SCORE, W_INV, W_READ,
  COL_ACT, COL_HIRING_OCC, COL_LMIA_2Q, COL_VERDICT,
  HIRING_OCC_MAX, ID_NOWP, ID_PGWP, KEY_ID_HEAD, KEY_VERDICT_FACTOR_HEAD, KEY_VERDICT_HEAD,
  PULSE_CEC, PULSE_CHECK, PULSE_OK, PULSE_RANK, PULSE_SHORT, TEER_PNP_MAX, URL_COMPANY_HEAD, VERDICT_MET,
  VERDICT_PUBLIC, VERDICT_SHORT, MINI_BTN_KIND, W_EMP_ACT, CARD_PAGE_SIZE, COL_SECTOR, KEY_SECTOR_HEAD,
  SECTOR_FEDERAL, SECTOR_GOVERNMENT, SECTOR_PRIVATE, SECTOR_PUBLIC,
  COL_BIZ, PILOT_FCIP, PILOT_RCIP, KEY_PILOT_HEAD, PILOT_KEYS, PILOT_KEY_AIP, PILOT_KEY_RCIP, TABLE_PILOT,
  SPACE_SEP, ACRONYM_MAX, CORP_SUFFIXES, NON_LETTER_RE, BRIEF_TAG_RE, BRIEF_TAG_WHAT,
  KEY_CHAIN, KEY_CHAIN_TIP, URL_AIP_TAIL, URL_PILOT_TAIL, PILOT_NONE, PILOT_KEY_FCIP, SUB_ID_SEP,
  ID_PROV_JOBS, GEO_CA, KEY_MACRO_HEAD, KEY_MON_HEAD,
  MACRO_MORE, FREQ_Q,
  FREQ_M,
  PERIOD_JAN_TAIL, PERIOD_DEC_TAIL, YEAR_LEN, MONTH_START, MONTH_END, MACRO_RECENT, CARD_YEARS, MK_ALLOC, MR_ISSUED,
  MK_PR_ALL, MK_PNP_TARGET, MK_WORK_ONLY, MR_WORK, PR_ROW_KEYS, PR_LEAD_KEYS, PR_CA_EXTRA_KEYS, PR_FOLD,
  MR_REMAINING, MACRO_SUB_ROWS, OPS_ISSUED_CAL_METRICS,
  OPS_ISSUED_METRICS, OPS_REMAINING, PCT_DIGITS, CURRENCY_MARK, COL_JOBS_OPEN,
  COL_JOBS_NEW7, COL_JOBS_WAGE, W_MACRO_KEY, COL_MACRO_KEY, OPS_YEAR_RE,
  MACRO_CA_ONLY_ROWS, MACRO_NA_ROWS, MACRO_UNPUBLISHED, MK_COMP, RATIO_DIGITS, RATIO_TAIL,
  COL_YOY, ID_IND_HEAD, IND_ORDER, KEY_IND_SHORT_HEAD, MACRO_BAD_UP_KEYS, MACRO_PCT_KEYS, MR_USE_RATE, YOY_FLAT_PCT,
  COL_REC, IND_GEO_ORDER, REC_KEYS, REC_LOWER_BETTER,
  REC_HALF, FORMULA_KEY, MK_ALLOC_INCL,
  YOY_YEAR_TAIL,
} from './constants'
import { DeadCell } from './deadcell'
import { EmpActCell } from './empactcell'
import { EmpBriefCell } from './empbriefcell'
import { EmpNameCell } from './empnamecell'
import { EmpHiringCell } from './emphiringcell'
import { OccActCell } from './occactcell'
import { HotCell } from './hotcell'
import { MomCell } from './momcell'
import { OccNameCell } from './occnamecell'
import { PnpCell } from './pnpcell'
import { ProgCell } from './progcell'
import { MacroKeyCell } from './macrokeycell'
import { makeMacroYearCell } from './macroyearcell'
import { MacroYoyCell } from './macroyoycell'
import { MacroRecCell } from './macroreccell'
import { ProvNameCell } from './provnamecell'
import { ReadCell } from './readcell'
import { StreamCell } from './streamcell'
import { CityNameCell } from './citynamecell'
import { CityPilotTypeCell } from './citypilottypecell'
import type { ChartOption } from '@/components/stats'
import type { CityRow, DailyRow, DliCityRow } from '@/lib/stats'
import { CACHE } from './variables'
import type {
  BandClsIn, CleanupFn,
  ClickFn,
  HomeCoreIn, HomeStats, HomeStatsCore, HomeStatsOfIn, HotPillsIn, LabelFn,
  MomClsIn,
  MarketIn, NatOccIn, NavLinkClsIn, NavWatchIn,
  NocCat, NocCatOfIn, NocProvsIn, NocProvsMap,
  GapClsIn, NavItem, NavItemsIn, NumCardRow, NumCardsIn, OccCellRow, OccCellRowIn,
  OccCellRowsIn, OccColsIn,
  OccNameIn, OccRowList, OccRowOne,
  PlaceholderClsIn, ProvExtraMap, ProvLabelOfIn, ProvLocaleIn, ProvsOfOccIn,
  PulseScalars, PulseScalarsIn, SecHeadClsIn, SponsorFullProbe, SponsorGroup, SponsorLoadIn,
  SponsorRowList, StartCol, StartPill,
  StatRowList,
  StreamLabelIn, TierClsIn,
  CityNameIn, DateSum, EmpCellRow, EmpCellRowIn, EmpColsIn, EmpSec, EmpSecsIn, IndOfIn,
  HiringMoreIn, IndRowsIn, LineOptionIn, OccSec, OccSecsIn, SeriesIn, SponsorBoards, TrendOfIn, TrendPanel, TrendSeries,
  EmpKind, HiringOccIn, KindChip, KindPickFn, KindPickIn, NocInfo, NocInfoIn, NocInfoMap, PulseIn2,
  AliasIn, BriefOfIn, BriefTextOut, BriefsIn, CompanyBrief, SeedGroupIn, SponsorSeedIn, EmpExtra,
  CityColsIn, CityData, CityDliRow, CityDliRowsIn, CityIndColsIn, CityIndRow, CityIndTable,
  CityIndTablesIn,
  CityLoadIn, CityMainRow, CityMainRowsIn, CityPilotRow, CityPilotRowsIn,
  CityStatsProbe,
  NocCatMap, DesignatedIn, InPilotIn, PilotNamesIn, PilotSecsIn,
  Teer03In, VerdictTextIn,
  TrendSmallIn, ValuableIn,
  EmptyQueryResult, PulseDraw, DrawDbRow, DrawHist, DrawHistIn, DrawsIn, PulseDrawIn, DrawCellRow, DrawCellRowIn,
  DrawCellRowsIn, DrawColsIn, DrawRowClsIn, DrawLang,
  TFn,
  PilotPickIn, PilotCellsIn, ChainTextIn, NavSubItemsIn, SubIdIn,
  MacroDbRow, MacroPoint, OpsDbRow, OpsPoint, MacroGeosIn,
  MacroMissingIn, MacroRowApplyIn, MacroRowIn, GeoPoints, GeoPointsIn, IndBase, IndGeoIn, IndRowIn,
  PrGeosIn, PrRowIn, PrRegionGeoIn, AllocTargetRowIn, CardPair,
  WithFoldParentIn, FoldRowsIn, HasFoldChildIn, MakeFoldFlipIn, WithFoldToggleIn, FoldFlippedIn,
  AllocCellsIn, RecLabelIn, RecOut, RecRankIn, RecRankOfIn, RecRowsIn, UseRateIn, WithRecIn, YearColLabelIn, YearNoteIn,
  YearNotesIn, YoyCellIn, YoyClsIn, YoyLabelIn, YoyTextIn,
  YoyYearIn, MacroRow, MacroGeo, MacroCell,
  CellsOfKeyIn, MacroCellIn, MonTextIn, PointYear, YearOfPointIn, OpsCellIn, MaybeOpsCell, OpsCellsIn,
  RemainingIn,
  MacroColsIn, SeriesWords, GeoNameIn, GeoLocaleIn, JobsRow, JobsRowsIn, JobsRowIn,
  JobsColsIn, MacroKeyClsIn, MacroSeriesIn, MacroSeriesSpec, MacroData, MacroLoadIn, MacroStatsProbe,
} from './types'
import css from './start.module.css'


/**
 * 首页聚合的进程内缓存读口。手法照 jobs/page.tsx 的 getDimsCached:命中就给上一份,
 * 过期或没拉过给 null(由页面门现查再存)。这个判断 2026-08-27 从渲染函数体里搬出来 ——
 * 渲染函数里读写模块级缓存、调 Date.now() 正是 react-hooks 的 globals 与 purity 两条闸的靶子。
 *
 * @returns 还新鲜的那份聚合;没有则 null。
 */
export function cachedHomeOf(): HomeStatsCore | null {
  const hit = CACHE.home
  if (hit == null) {
    return null
  }
  if (Date.now() - hit.ts >= HOME_TTL_MS) {
    return null
  }
  return hit.v
}

/**
 * 把新查的那份聚合写进进程内缓存。
 *
 * @param v 这一份聚合。
 * @returns 原样交回(调用点一行写完「存下并用它」)。
 */
export function putHomeCache(v: HomeStatsCore): HomeStatsCore {
  CACHE.home = { v, ts: Date.now() }
  return v
}

/**
 * 命中率证据查询挂了的空值(整块证据没有 = 体量卡与命中率卡都不出)。
 *
 * @returns 没有。
 */
export function nullProof(): null {
  return null
}

/**
 * 省卡增补查询挂了的空表。
 *
 * @returns 空表。
 */
export function emptyProvExtra(): ProvExtraMap {
  return {}
}

/**
 * 橱窗事实行查询挂了的空清单(挂了只丢橱窗)。
 *
 * @returns 空清单。
 */
export function emptySponsorRows(): SponsorRowList {
  return []
}

/**
 * 职业统计行查询挂了的空清单(挂了只丢中间两卡与分类联动,页面照常)。
 *
 * @returns 空清单。
 */
export function emptyOccRows(): OccRowList {
  return []
}

/**
 * 抓取时刻查询挂了的空串。
 *
 * @returns 空串。
 */
export function emptyText(): string {
  return TEXT_NONE
}


/**
 * 首页聚合的组装(纯函数;进程内缓存存的就是它的返回)。
 * 2026-09-04 重构:抽选 / 政策 / 职业筛字典三块撤,加逐日在招量透传。
 *
 * @param x 页面门并发取好的原料。
 * @returns 与用户无关的那份聚合。
 */
export function homeCoreOf(x: HomeCoreIn): HomeStatsCore {
  let total: number | null = null
  let named: number | null = null
  if (x.proof != null && x.proof.total > 0) {
    total = x.proof.total
  }
  if (x.proof != null && x.proof.named > 0) {
    named = x.proof.named
  }
  const natOccMaybe = natOccOf({ occ: x.occRows })
  let natOcc: OccRowList = []
  if (natOccMaybe != null) {
    natOcc = natOccMaybe
  }
  const nocCat = nocCatOf({ occ: x.occRows, sponsorRows: x.sponsorRows })
  const rcipNames = pilotNamesOf({ rows: x.pilotRows, sponsorRows: x.sponsorRows, pilot: PILOT_RCIP })
  const fcipNames = pilotNamesOf({ rows: x.pilotRows, sponsorRows: x.sponsorRows, pilot: PILOT_FCIP })
  const briefs = briefsOf({ rows: x.briefRows, sponsorRows: x.sponsorRows })
  const extra: EmpExtra = {
    rcip: new Set(rcipNames), fcip: new Set(fcipNames), briefs: new Map(Object.entries(briefs)),
  }
  return {
    total,
    named,
    sponsor: sponsorSeedOf({ boards: x.boards, nocCat, natOcc, extra }),
    pulse: pulseScalarsOf({ occ: x.occRows }),
    nocCat,
    daily: x.dailyRows,
    draws: toDrawsWithHistory({ rows: x.drawRows, limit: x.drawsLimit }),
    rcipNames,
    fcipNames,
    briefs,
    provExtra: x.provExtra,
    natOcc,
    nocProvs: Object.fromEntries(nocProvsOf({ occ: x.occRows })),
  }
}

/**
 * 缓存里那份聚合 + 逐用户两格 → 整份 SSR 契约。
 *
 * @param x 聚合、预选省与抓取时刻。
 * @returns SSR 契约。
 */
export function homeStatsOf(x: HomeStatsOfIn): HomeStats {
  return {
    total: x.core.total,
    named: x.core.named,
    sponsor: x.core.sponsor,
    pulse: x.core.pulse,
    nocCat: x.core.nocCat,
    daily: x.core.daily,
    draws: x.core.draws,
    rcipNames: x.core.rcipNames,
    fcipNames: x.core.fcipNames,
    briefs: x.core.briefs,
    provExtra: x.core.provExtra,
    natOcc: x.core.natOcc,
    nocProvs: x.core.nocProvs,
    checkedAt: x.checkedAt,
  }
}

/**
 * #313(LCP 7.15s 真因):三表全量(16,430 行)序列化进 RSC payload 把 SSR 文档撑到 6.92MB
 * ——「全量可翻页」拍板不动,只换运输方式:SSR 只带种子 + total,挂载后 Pulse 拉
 * `/api/employers/sponsors` 换全量。种子 2026-09-05 从「每分表前 50 行」改成「每张行业表 × 两档身份
 * + 三试点表各自的第一页」(Frank「为什么会空白很长时间」:原种子按分表切,行业表在 SSR 里大多是空的);
 * 用与挂载后同一套 empSecsOf / pilotSecsOf 挑行,英文 t 只为排序不进文案,第一页与最终一致不闪。
 *
 * @param x 三分表全量、分类、全国职业行与试点集合。
 * @returns 只留各表第一页的三分表(total 照旧)。
 */
export function sponsorSeedOf(x: SponsorSeedIn): SponsorBoards {
  const t = makeT(LANG_EN)
  const nocCat: NocCatMap = new Map(Object.entries(x.nocCat))
  const nocInfo = nocInfoOf({ natOcc: x.natOcc, lang: LANG_EN })
  const keep = new Set<string>()
  const kinds: EmpKind[] = [ID_NOWP, ID_PGWP]
  for (const kind of kinds) {
    const secs = empSecsOf({ t, sponsor: x.boards, nocCat, nocInfo, extra: x.extra, kind, lang: LANG_EN })
    for (const sec of secs) {
      for (const r of sec.rows.slice(0, CARD_PAGE_SIZE)) {
        keep.add(r.key)
      }
    }
  }
  for (const sec of pilotSecsOf({ t, sponsor: x.boards, nocCat, nocInfo, extra: x.extra, lang: LANG_EN })) {
    for (const r of sec.rows.slice(0, CARD_PAGE_SIZE)) {
      keep.add(r.key)
    }
  }
  return {
    lmia: seedGroupOf({ group: x.boards.lmia, keep }),
    named: seedGroupOf({ group: x.boards.named, keep }),
    aip: seedGroupOf({ group: x.boards.aip, keep }),
    pilot: seedGroupOf({ group: x.boards.pilot, keep }),
  }
}

/**
 * 一张分表只留名在 keep 里的行(total 照旧,分页数不变)。
 *
 * @param x 分表与要留的名集。
 * @returns 切好的分表。
 */
function seedGroupOf(x: SeedGroupIn): SponsorGroup {
  const top: SponsorRowList = []
  for (const r of x.group.top) {
    if (x.keep.has(r.name)) {
      top.push(r)
    }
  }
  return { top, total: x.group.total }
}

/**
 * S1 中间两卡:全国行聚合成两个标量。2026-08-09 下沉 SSR 消刷新闪占位
 * (此前吃挂载后才到的 market.occ,每次刷新闪一次骨架占位,Frank「中间两个数为什么会闪」);
 * 缺列 / 缺数 = null,卡整张不出(契约 v3)。
 *
 * @param x 职业统计行(全量)。
 * @returns 两个标量。
 */
export function pulseScalarsOf(x: PulseScalarsIn): PulseScalars {
  const nat: OccRowList = []
  for (const o of x.occ) {
    if (isAllProv(o.province)) {
      nat.push(o)
    }
  }
  return { new14: pulseNew14Of(nat), days: pulseDaysOf(nat) }
}

/**
 * 近 14 天新发:全国行逐职业相加;一行都没算出来就给 null(卡整张不出,绝不显示 0)。
 *
 * @param nat 全国行。
 * @returns 近 14 天新发;没有则 null。
 */
function pulseNew14Of(nat: OccRowList): number | null {
  let sum = 0
  let n = 0
  for (const o of nat) {
    if (o.new14d != null) {
      sum += o.new14d
      n += 1
    }
  }
  if (n === 0) {
    return null
  }
  return sum
}

/**
 * 平均在架天数:按在架量加权(职业间直接平均会让 3 个岗的小职业和 3000 个岗的大职业等权)。
 *
 * @param nat 全国行。
 * @returns 平均在架天数;没有则 null。
 */
function pulseDaysOf(nat: OccRowList): number | null {
  let top = 0
  let bottom = 0
  for (const o of nat) {
    if (o.avgDaysOpen != null && o.openJobs != null && o.openJobs > 0) {
      top += o.avgDaysOpen * o.openJobs
      bottom += o.openJobs
    }
  }
  if (bottom === 0) {
    return null
  }
  return Math.round(top / bottom)
}

/**
 * 三分表职业筛联动 noc → 大/中/小类(2026-08-08 Frank「大类种类小类联动过滤要加上」):
 * 只带橱窗行真出现过的 NOC 下去(occ 全表仍不进 HTML)。2026-08-09 改吃 SSR 这一份 ——
 * 此前吃挂载后才到的 market.occ,中类下拉每次刷新闪一次空选项。
 *
 * @param x 职业统计行与橱窗事实行。
 * @returns noc → 分类三级。
 */
export function nocCatOf(x: NocCatOfIn): Record<string, NocCat> {
  const wanted = new Set<string>()
  for (const r of x.sponsorRows) {
    for (const n of r.nocs) {
      wanted.add(n)
    }
  }
  const out: Record<string, NocCat> = {}
  for (const o of x.occ) {
    if (o.broad !== TEXT_NONE && wanted.has(o.noc) && out[o.noc] == null) {
      out[o.noc] = { broad: o.broad, mid: o.mid, fine: o.fine }
    }
  }
  return out
}


/**
 * 数字的千分位显示。
 *
 * @param n 数。
 * @returns 显示串。
 */
export function numOf(n: number): string {
  return n.toLocaleString(NUM_LOCALE)
}

/**
 * 数值格 → 显示串;没有给横杠(它表示**本站没有这一项**,不是 0)。
 *
 * @param n 数;null = 没算出来。
 * @returns 显示串。
 */
function numTextOf(n: number | null): string {
  if (n == null) {
    return DASH_MARK
  }
  return numOf(n)
}

/**
 * 环比(mom14d 是比值:近 14 天新发 ÷ 前 14 天新发 − 1)→ 百分数;
 * 不做四舍五入以外的加工。
 *
 * @param ratio 比值。
 * @returns 带符号的百分数。
 */
export function pctSignedOf(ratio: number): string {
  let sign = TEXT_NONE
  if (ratio > MOM_FLAT) {
    sign = SIGN_PLUS
  }
  if (ratio < MOM_FLAT) {
    sign = SIGN_MINUS
  }
  return sign + String(Math.abs(Math.round(ratio * PCT_SCALE))) + PCT_MARK
}

/**
 * 是不是全国行(E13-02 若改出 'ALL' 大写也吃得下,不因大小写掉数据)。
 *
 * @param p 省字段值。
 * @returns 是不是。
 */
export function isAllProv(p: string): boolean {
  return p.toLowerCase() === PROV_ALL_LOWER
}

/**
 * 职业名主文案(#309 主次对调:人话名主文案 + 官方名灰注,站规)——
 * zh/ko 界面主文案 = 界面语言人话名(zh 走 shortOcc 砍分类学尾巴);
 * en 界面主文案 = 官方英文名;缺译名的行回退官方名。
 *
 * @param x 这一行与界面语言。
 * @returns 主文案。
 */
export function occMainOf(x: OccNameIn): string {
  if (x.lang === LANG_ZH) {
    let s = x.o.titleZhShort
    if (s === TEXT_NONE) {
      s = x.o.titleZh
    }
    if (s !== TEXT_NONE) {
      return shortOcc(s)
    }
  }
  if (x.lang === LANG_KO && x.o.titleKo !== TEXT_NONE) {
    return x.o.titleKo
  }
  if (x.o.titleEn !== TEXT_NONE) {
    return x.o.titleEn
  }
  if (x.o.titleZh !== TEXT_NONE) {
    return x.o.titleZh
  }
  return x.o.noc
}

/**
 * 职业名灰注 = NOC 官方英文名(引用依据);en 界面不出,与主文案同文时也不出
 * (不双份堆叠)。
 *
 * @param x 这一行与界面语言。
 * @returns 灰注;不出时空串。
 */
export function occNoteOf(x: OccNameIn): string {
  if (x.lang === LANG_EN) {
    return TEXT_NONE
  }
  if (x.o.titleEn !== TEXT_NONE && x.o.titleEn !== occMainOf(x)) {
    return x.o.titleEn
  }
  return TEXT_NONE
}

/**
 * 省下拉里的省名:只显本语言全名(Frank 2026-08-08「全部省那么宽吗」—— 双语并排把控件
 * 撑到 460px,单语即窄);词表缺这一省就退回英文全名,再缺退省码。
 *
 * @param x 取词函数与省码。
 * @returns 省名。
 */
export function provLabelOf(x: ProvLabelOfIn): string {
  const key = KEY_PROV_HEAD + x.code
  const loc = x.t(key)
  if (loc !== TEXT_NONE && loc !== key) {
    return loc
  }
  return provFullOf(x.code)
}

/**
 * 省 chips 与省卡上的省名:通行短名优先(#146 站规:英文在前,中韩括注译名;
 * NL 用通行短名)。
 *
 * @param code 两位省码。
 * @returns 显示名。
 */
export function provShortOf(code: string): string {
  const short = SHORT_PROV[code]
  if (short != null) {
    return short
  }
  return provFullOf(code)
}

/**
 * 省全名(排序键、切省下拉的选项、短名表未命中时的显示都用它;词表缺就用省码)。
 *
 * @param code 两位省码。
 * @returns 省全名。
 */
export function provFullOf(code: string): string {
  const en = PROV_NAME[code]
  if (en != null) {
    return en
  }
  return code
}

/**
 * 省份译名灰注;英文界面不出(主文案已是英文,再挂一遍就是一行两遍)。
 *
 * @param x 取词函数、界面语言与省码。
 * @returns 译名;不出时空串。
 */
export function provLocaleOf(x: ProvLocaleIn): string {
  if (x.lang === LANG_EN) {
    return TEXT_NONE
  }
  return x.t(KEY_PR_HEAD + x.code)
}

/**
 * 按 NOC 筛过的职位板地址(每行可溯源)。
 *
 * @param noc NOC 码。
 * @returns 地址。
 */
export function occHrefOf(noc: string): string {
  return URL_HOME_Q_HEAD + noc
}

/**
 * 二级导航的五项(顺序即页面上的顺序;#312:短词,与分区 h2 措辞差异化)。
 * 2026-09-04 重排:职业 → 雇主 → 省份 → 城市 → 趋势(LMIA 段 09-05 并回雇主段)。
 *
 * @param x 取词函数。
 * @returns 五项。
 */
export function navItemsOf(x: NavItemsIn): NavItem[] {
  return [
    { id: ID_BOARDS, label: x.t('pulse.nav.occ') },
    { id: ID_SE, label: x.t('pulse.nav.se') },
    { id: ID_PROV, label: x.t('pulse.nav.prov') },
    { id: ID_PR_BAND, label: x.t('pulse.nav.pr') },
    { id: ID_CITY, label: x.t('pulse.nav.city') },
    { id: ID_TREND, label: x.t('pulse.nav.trend') },
  ]
}

/**
 * 导航当前分区:还没滚到任何分区('')时当作第一段职业(2026-09-06 Frank「默认在哪个部位,就把子项显示出来吧」),
 * 主项高亮与子项行都按它。
 *
 * @param navSec 滚动跟随给的分区 id;'' = 还没滚到。
 * @returns 用来高亮与出子项的分区 id。
 */
export function navSecOrFirstOf(navSec: string): string {
  if (navSec === TEXT_NONE) {
    return ID_BOARDS
  }
  return navSec
}

/**
 * 二级导航当前分区的子项(2026-09-06 Frank「这个应该加子项,要不然手机端没法跳转」):
 * 职业 = 两榜 + 8 行业;雇主 = 8 行业 + 三试点;省份 = 分省概览 / 省内职业榜;城市、趋势没有分表给空。
 *
 * @param x 取词函数与当前分区。
 * @returns 子项清单(空 = 不出子项行)。
 */
export function navSubItemsOf(x: NavSubItemsIn): NavItem[] {
  if (x.navSec === ID_BOARDS) {
    return boardSubsOf(x.t)
  }
  if (x.navSec === ID_SE) {
    return empSubsOf(x.t)
  }
  if (x.navSec === ID_PROV) {
    return indSubsOf(x.t)
  }
  if (x.navSec === ID_PR_BAND) {
    return prSubsOf(x.t)
  }
  if (x.navSec === ID_CITY) {
    return citySubsOf(x.t)
  }
  return []
}

/**
 * 城市段的子项:主要城市 + 八行业组各一项 + 试点社区 + 留学城市(2026-09-11 重设计批;
 * 当晚 Frank「改成具体的分类 多个分类」:原「行业对比」一项拆成一业一项,照职业/雇主段形,
 * 锚点 = ID_CITY_IND 打头的分表锚)。
 *
 * @param t 取词函数。
 * @returns 子项清单。
 */
function citySubsOf(t: TFn): NavItem[] {
  const out: NavItem[] = [{ id: ID_CITY_MAIN, label: t('pulse.city.main') }]
  for (const key of IND_KEYS) {
    out.push({ id: subIdOf({ band: ID_CITY_IND, key }), label: t(KEY_IND_HEAD + key) })
  }
  out.push({ id: ID_CITY_PILOT, label: t('pulse.city.pilot') })
  out.push({ id: ID_CITY_DLI, label: t('pulse.city.dli') })
  return out
}

/**
 * PR 段的子项:配额 / EE 两张指标表 + 全国 + 九省(各自表的锚点;2026-09-10 PR 自省份段拆出成段,
 * 配额与 EE 随后迁入)。
 *
 * @param t 取词函数。
 * @returns 子项清单。
 */
function prSubsOf(t: TFn): NavItem[] {
  const out: NavItem[] = [{ id: prAnchorOf(GEO_CA), label: prGeoNameOf({ code: GEO_CA, t }) }]
  for (const key of PR_LEAD_KEYS) {
    out.push({ id: ID_IND_HEAD + key, label: t(KEY_IND_SHORT_HEAD + key) })
  }
  for (const code of IND_GEO_ORDER) {
    if (code === GEO_CA) {
      continue
    }
    out.push({ id: prAnchorOf(code), label: prGeoNameOf({ code, t }) })
  }
  return out
}

/**
 * 省份段「按指标」视图的子项:九个指标短名 + 招聘对比。
 *
 * @param t 取词函数。
 * @returns 子项清单。
 */
function indSubsOf(t: TFn): NavItem[] {
  const out: NavItem[] = []
  for (const key of IND_ORDER) {
    out.push({ id: ID_IND_HEAD + key, label: t(KEY_IND_SHORT_HEAD + key) })
  }
  out.push({ id: ID_PROV_JOBS, label: t('pulse.s4j') })
  return out
}

/**
 * 职业段的子项:最多岗位、最高工资两榜 + 8 个行业表。
 *
 * @param t 取词函数。
 * @returns 子项清单。
 */
function boardSubsOf(t: TFn): NavItem[] {
  const out: NavItem[] = [
    { id: subIdOf({ band: ID_BOARDS, key: SEC_TOP_OPEN }), label: t('pulse.top.open') },
    { id: subIdOf({ band: ID_BOARDS, key: SEC_TOP_WAGE }), label: t('pulse.top.wage') },
  ]
  for (const key of IND_KEYS) {
    out.push({ id: subIdOf({ band: ID_BOARDS, key }), label: t(KEY_IND_HEAD + key) })
  }
  return out
}

/**
 * 雇主段的子项:8 个行业表 + AIP / RCIP / FCIP 三试点表(试点用制度名本身,三语同形)。
 *
 * @param t 取词函数。
 * @returns 子项清单。
 */
function empSubsOf(t: TFn): NavItem[] {
  const out: NavItem[] = []
  for (const key of IND_KEYS) {
    out.push({ id: subIdOf({ band: ID_SE, key }), label: t(KEY_IND_HEAD + key) })
  }
  for (const key of PILOT_KEYS) {
    out.push({ id: subIdOf({ band: ID_SE, key }), label: key.toUpperCase() })
  }
  return out
}

/**
 * 分表锚点 id:分区 id + 连接符 + 分表键(分表挂它,子项跳它)。
 *
 * @param x 分区 id 与分表键。
 * @returns 锚点 id。
 */
export function subIdOf(x: SubIdIn): string {
  return x.band + SUB_ID_SEP + x.key
}

/**
 * 分区锚点的地址。
 *
 * @param id 分区 id。
 * @returns 锚点地址。
 */
export function anchorOf(id: string): string {
  return ANCHOR_HEAD + id
}


/**
 * 洗一整榜职业。
 *
 * @param x 本榜的统计行、取词函数、界面语言、可提名省份表与环比配色开关。
 * @returns 展示行。
 */
export function toOccCellRows(x: OccCellRowsIn): OccCellRow[] {
  const out: OccCellRow[] = []
  for (const o of x.rows) {
    out.push(toOccCellRow({ o, t: x.t, lang: x.lang, nocProvs: x.nocProvs, flatDelta: x.flatDelta }))
  }
  return out
}

/**
 * 洗一行职业:名字三态、四个数值列、两组胶囊、可提名省份的压缩形态,一次算清。
 *
 * @param x 这一行与洗行要的上下文。
 * @returns 展示行。
 */
export function toOccCellRow(x: OccCellRowIn): OccCellRow {
  const name: OccNameIn = { o: x.o, lang: x.lang }
  const provs = provsOfOcc({ o: x.o, nocProvs: x.nocProvs })
  return {
    key: x.o.noc,
    href: occHrefOf(x.o.noc),
    main: occMainOf(name),
    note: occNoteOf(name),
    openText: numTextOf(x.o.openJobs),
    openSort: x.o.openJobs,
    openLabel: occOpenLabelOf(x),
    momText: occMomTextOf(x.o.mom14d),
    momCls: momClsOf({ mom: x.o.mom14d, flatDelta: x.flatDelta }),
    momSort: x.o.mom14d,
    salText: occSalTextOf(x.o),
    salSort: x.o.wageHighAnnual,
    noc: x.o.noc,
    nocChip: NOC_HEAD + x.o.noc,
    teerText: occTeerTextOf(x.o),
    teerChip: occTeerChipOf(x.o),
    teerSort: x.o.teer,
    deadText: occDeadTextOf(x),
    deadSort: splitCountOf(x.o.deadProvs),
    onView: trackOccClick,
    actJobsText: x.t('pulse.act.jobs'),
    actBtnCls: actBtnClsOf(),
    hotPills: hotPillsOf({ o: x.o, t: x.t, provs }),
    hotNoneText: x.t('pulse.provs.none'),
    hotSort: provs.length,
    pnpText: occPnpTextOf(x),
    pnpMissing: occPnpMissingOf(x),
    pnpSort: occPnpSortOf(x.o),
    rateText: occRateTextOf(x.o),
    rateChip: occRateChipOf(x),
    rateSort: x.o.sponsorRate,
  }
}

/**
 * 该职业哪些省的清单命中在架岗(省行 namedJobs>0 即算)—— Frank 2026-08-06
 * 「直接告诉用户哪些省能提名,百分比谁能看懂」,S2/S3/S4 榜共用。
 *
 * @param x 这一行与可提名省份表。
 * @returns 省码清单。
 */
function provsOfOcc(x: ProvsOfOccIn): string[] {
  const hit = x.nocProvs.get(x.o.noc)
  if (hit == null) {
    return []
  }
  return hit
}

/**
 * 手机卡上「在招 N」那一格;没算出来整格不出。
 *
 * @param x 这一行与取词函数。
 * @returns 那一格文案;不出时空串。
 */
function occOpenLabelOf(x: OccCellRowIn): string {
  if (x.o.openJobs == null) {
    return TEXT_NONE
  }
  return x.t('pulse.col.open') + CARD_GAP + numOf(x.o.openJobs)
}

/**
 * 环比百分数;这一行没算出来就空串(单元格显横杠)。
 *
 * @param mom 14 天新发环比。
 * @returns 百分数;没有则空串。
 */
function occMomTextOf(mom: number | null): string {
  if (mom == null) {
    return TEXT_NONE
  }
  return pctSignedOf(mom)
}

/**
 * ESDC 官方薪资区间年化(Frank 2026-08-06 二改「不如换成薪资区间」);缺任一端给横杠。
 *
 * @param o 这一行。
 * @returns 区间文案。
 */
function occSalTextOf(o: OccRowOne): string {
  if (o.wageLowAnnual == null || o.wageHighAnnual == null) {
    return DASH_MARK
  }
  const low = WAGE_SIGN + String(Math.round(o.wageLowAnnual / WAGE_K)) + WAGE_K_MARK
  const high = WAGE_SIGN + String(Math.round(o.wageHighAnnual / WAGE_K)) + WAGE_K_MARK
  return low + WAGE_RANGE_SEP + high
}

/**
 * TEER 单元格:直接写「TEER 2」(Frank 2026-08-06:裸数字像个数据值,带前缀自明);
 * 未分类给横杠。
 *
 * @param o 这一行。
 * @returns 单元格文案。
 */
function occTeerTextOf(o: OccRowOne): string {
  if (o.teer == null) {
    return DASH_MARK
  }
  return TEER_HEAD + String(o.teer)
}

/**
 * 手机卡上的 TEER 胶囊(Frank 2026-08-08「手机端改成胶囊」「teer 也需要」);
 * 未分类不出胶囊。
 *
 * @param o 这一行。
 * @returns 胶囊文案;不出时空串。
 */
function occTeerChipOf(o: OccRowOne): string {
  if (o.teer == null) {
    return TEXT_NONE
  }
  return TEER_HEAD + String(o.teer)
}

/**
 * 完全无路可走的省(E13-08;判定 = ETL any_pr_path 四通道全无才判死,锚官方原句)。
 * 单元格自带「无通道」后缀 —— 表头滚出视野后裸省码不自明。
 *
 * @param x 这一行与取词函数。
 * @returns 单元格文案;这一行没有死路省时空串。
 */
function occDeadTextOf(x: OccCellRowIn): string {
  if (x.o.deadProvs == null || x.o.deadProvs === TEXT_NONE) {
    return TEXT_NONE
  }
  return x.t('pulse.dead.cell', { provs: x.o.deadProvs })
}

/**
 * 顿号分隔的省码串里有几个省(排序键用)。
 *
 * @param s 省码串;null / 空串 = 一个也没有。
 * @returns 省数。
 */
function splitCountOf(s: string | null): number {
  if (s == null) {
    return 0
  }
  return splitListOf(s).length
}

/**
 * 顿号分隔的省码串 → 省码清单(空段丢掉)。
 *
 * @param s 省码串。
 * @returns 省码清单。
 */
function splitListOf(s: string): string[] {
  const out: string[] = []
  for (const p of s.split(SEP_LIST)) {
    if (p !== TEXT_NONE) {
      out.push(p)
    }
  }
  return out
}

/**
 * 紧缺胶囊排(Frank 2026-08-08 走查连拍:值胶囊化 —— 省紧缺具体到省码「MB 紧缺」
 * (多省多胶囊)+ 联邦紧缺单独一粒,省紧缺绿 / 联邦青,与通道档同色系)。
 *
 * @param x 这一行、取词函数与该职业命中的省码。
 * @returns 胶囊排;空排 = 显示「无」。
 */
export function hotPillsOf(x: HotPillsIn): StartPill[] {
  const out: StartPill[] = []
  for (const p of x.provs) {
    out.push({ key: p, text: x.t('pulse.tier.provOne', { p }), cls: pillClsOf(cssOf(css.pillProv)) })
  }
  if (x.o.channelTier === TIER_FED || x.o.channelTier === TIER_BOTH) {
    const text = x.t('pulse.tier.fedOne')
    out.push({ key: text, text, cls: pillClsOf(cssOf(css.pillFed)) })
  }
  return out
}

/**
 * 可提名省份的压缩主行(Frank 2026-08-08 拍 A 方案:全码直陈退役 —— 翻案后行行 8-9 省
 * = 没区分度,且全是雇主锚定通道;压缩成「N 省可走」+ 只标例外)。
 * 「先省内工作 6 个月」的五省灰行 08-08 Frank 拍删(细则归 PNP 弹框 whyCond,榜上只留可走面)。
 *
 * @param x 这一行与取词函数。
 * @returns 主行文案;直可与有条件都没有时空串(单元格显横杠)。
 */
function occPnpTextOf(x: OccCellRowIn): string {
  const ok = pnpOkSetOf(x.o)
  if (ok.size === 0) {
    return TEXT_NONE
  }
  return x.t('pulse.provs.n', { n: ok.size })
}

/**
 * 可提名省份里走不了的那几省(措辞与雷区榜同源「{provs} 无通道」)。
 *
 * @param x 这一行与取词函数。
 * @returns 红字文案;一个不缺时空串。
 */
function occPnpMissingOf(x: OccCellRowIn): string {
  const ok = pnpOkSetOf(x.o)
  if (ok.size === 0) {
    return TEXT_NONE
  }
  const missing: string[] = []
  for (const p of DEAD_PROV_ORDER) {
    if (ok.has(p) === false) {
      missing.push(p)
    }
  }
  if (missing.length === 0) {
    return TEXT_NONE
  }
  return x.t('pulse.dead.cell', { provs: missing.join(SEP_LIST) })
}

/**
 * 直可提名与有条件可提名并起来的省集。
 *
 * @param o 这一行。
 * @returns 省集。
 */
function pnpOkSetOf(o: OccRowOne): Set<string> {
  const ok = new Set<string>()
  if (o.pnpProvs != null) {
    for (const p of splitListOf(o.pnpProvs)) {
      ok.add(p)
    }
  }
  if (o.pnpProvsCond != null) {
    for (const p of splitListOf(o.pnpProvsCond)) {
      ok.add(p)
    }
  }
  return ok
}

/**
 * 可提名省份的排序键:直可省数主键,有条件省数副键。
 *
 * @param o 这一行。
 * @returns 排序键。
 */
function occPnpSortOf(o: OccRowOne): number {
  return splitCountOf(o.pnpProvs) * PNP_SORT_SCALE + splitCountOf(o.pnpProvsCond)
}

/**
 * E14-02 担保率:分子 = 担保侧观测量 / 分母 = StatCan JVWS 官方空缺;
 * >1 是已知方法论偏差(见 E14-01 §7.4 农业案例,非 bug),照实标出来不截断。
 *
 * @param o 这一行。
 * @returns 单元格文案;没落库给横杠。
 */
function occRateTextOf(o: OccRowOne): string {
  if (o.sponsorRate == null) {
    return DASH_MARK
  }
  if (o.sponsorRate > RATE_MAX) {
    return RATE_OVER_TEXT
  }
  return (o.sponsorRate * PCT_SCALE).toFixed(RATE_DIGITS) + PCT_MARK
}

/**
 * 手机卡上的担保率胶囊(与桌面「担保率」列同一份数据,带列名前缀);没落库不出胶囊。
 *
 * @param x 这一行与取词函数。
 * @returns 胶囊文案;不出时空串。
 */
function occRateChipOf(x: OccCellRowIn): string {
  if (x.o.sponsorRate == null) {
    return TEXT_NONE
  }
  return x.t('pulse.col.sponsorRate') + CARD_GAP + occRateTextOf(x.o)
}

/**
 * S1 四张脉象卡(契约 v3):体量 / 近 14 天新发 / 平均在架天数 / PNP 命中率。
 * 逐卡 null 守卫 —— 缺数的卡整张不出。净值卡(在架存量差)本批**不做**:
 * 7-25 起验尸排水清了 2.7 万死帖,存量下跌是数据清洗不是市场收缩,上线 = 撒谎(后置 E13-04)。
 * 体量卡打头是 Frank 2026-08-06「还有就是整个加拿大的就业体量」(与职位板 proof 同源同口径);
 * 环比副行 2026-08-07 Frank 拍板删(「那个绿字没用」),只留主数字。
 *
 * @param x 取词函数与四个数。
 * @returns 该出的那几张卡。
 */
export function numCardsOf(x: NumCardsIn): NumCardRow[] {
  const out: NumCardRow[] = []
  if (x.total != null && x.total > 0) {
    out.push({
      label: x.t('pulse.card.total'), value: numOf(x.total), tip: x.t('pulse.card.total.tip'), href: URL_HOME,
    })
  }
  if (x.pulse.new14 != null) {
    out.push({
      label: x.t('pulse.card.new14'), value: numOf(x.pulse.new14), tip: x.t('pulse.card.new14.tip'), href: URL_HOME,
    })
  }
  if (x.pulse.days != null) {
    out.push({
      label: x.t('pulse.card.days'),
      value: x.t('pulse.unit.days', { n: x.pulse.days }),
      tip: x.t('pulse.card.days.tip'),
      href: URL_HOME,
    })
  }
  if (x.total != null && x.total > 0 && x.named != null) {
    out.push({
      label: x.t('pulse.card.pnp'), value: numOf(x.named), tip: x.t('pulse.card.pnp.tip'), href: URL_HOME_PNP,
    })
  }
  return out
}


/**
 * 全国行(province='all')。
 *
 * @param x 主图四份数据。
 * @returns 全国行;数据还没到则 null。
 */
export function natOccOf(x: NatOccIn): OccRowList | null {
  if (x.occ == null) {
    return null
  }
  const out: OccRowList = []
  for (const o of x.occ) {
    if (isAllProv(o.province)) {
      out.push(o)
    }
  }
  return out
}

/**
 * NOC → 可提名省份清单(该职业哪些省的清单命中在架岗;省行 namedJobs>0 即算)。
 *
 * @param x 主图四份数据。
 * @returns 映射表(数据还没到给空表)。
 */
export function nocProvsOf(x: NocProvsIn): NocProvsMap {
  const m: NocProvsMap = new Map()
  if (x.occ == null) {
    return m
  }
  for (const o of x.occ) {
    if (isAllProv(o.province) === false && o.namedJobs != null && o.namedJobs > 0) {
      const arr = m.get(o.noc)
      if (arr == null) {
        m.set(o.noc, [o.province])
      } else {
        arr.push(o.province)
      }
    }
  }
  return m
}

/**
 * 在架量(排序用;没算出来当 0)。
 *
 * @param o 这一行。
 * @returns 在架量。
 */
function openOf(o: OccRowOne): number {
  if (o.openJobs == null) {
    return 0
  }
  return o.openJobs
}

/**
 * 按在架量降序(中介推得最凶的先看到)。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 比较结果。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死(宪法钦定的豁免形态)
function byOpenDesc(a: OccRowOne, b: OccRowOne): number {
  return openOf(b) - openOf(a)
}

/**
 * 分省概览的行:只取省 × 大类汇总行(旧行未落 mid 列时读取层回填 'all')。
 *
 * @param x 主图四份数据。
 * @returns 汇总行(数据还没到给空清单)。
 */
export function provRowsOf(x: MarketIn): StatRowList {
  const out: StatRowList = []
  if (x.market == null) {
    return out
  }
  for (const r of x.market.rows) {
    if (r.broad === BROAD_ALL && (r.mid === MID_ALL || r.mid === TEXT_NONE)) {
      out.push(r)
    }
  }
  return out
}



/**
 * 职业榜的列组。2026-08-08 Frank 走查连拍:三个数字列(在招 / 14 天环比 / 薪资区间)
 * 紧跟职业列,代码列(NOC/TEER)后移;紧缺列列名「紧缺清单省份」→「紧缺」且值胶囊化;
 * E13-07 通道档 pill 列 08-08 三轮退役(榜A 也全员「仅雇主担保」= 常量,通道信息归各榜自己那一列);
 * E13-08 雷区榜 08-08 砍成一列:「有移民通道的省」全员 ~8 省 = 常量列删,只留死路列。
 * 容缺三闸:环比 / 可提名省份 / 担保率任一整榜全 null,那一列压根不进列组
 * (降级成在架 / 命中率 / 薪资能撑的版本,绝不拿 0 顶包)。
 *
 * @param x 取词函数与三个容缺开关、两个列形开关。
 * @returns 列组。
 */
export function occColsOf(x: OccColsIn): StartCol<OccCellRow>[] {
  const cols: StartCol<OccCellRow>[] = [
    { key: COL_OCC, label: x.t('pulse.col.occ'), sort: occMainSortOf, render: OccNameCell },
    { key: COL_OPEN, label: x.t('pulse.col.open'), nowrap: true, sort: occOpenSortOf, render: occOpenTextOf },
  ]
  if (x.hasMom) {
    cols.push({ key: COL_MOM, label: x.t('pulse.col.mom'), nowrap: true, sort: occMomSortOf, render: MomCell })
  }
  cols.push({ key: COL_SAL, label: x.t('pulse.col.range'), nowrap: true, sort: occSalSortOf, render: occSalOf })
  cols.push({ key: COL_NOC, label: LABEL_NOC, nowrap: true, sort: occNocSortOf, render: occNocOf })
  cols.push({ key: COL_TEER, label: x.t('pulse.col.teer'), nowrap: true, sort: occTeerSortOf, render: occTeerOf })
  const tail = occTailColOf(x)
  if (tail != null) {
    cols.push(tail)
  }
  if (x.showProvs === false && x.hasSponsorRate) {
    cols.push({
      key: COL_SPONSOR_RATE,
      label: x.t('pulse.col.sponsorRate'),
      nowrap: true,
      sort: occRateSortOf,
      render: occRateOf,
    })
  }
  cols.push({ key: COL_ACT, label: x.t('col.actions'), nowrap: true, render: OccActCell })
  return cols
}

/**
 * 三选一的那一列:死路省 / 紧缺 / 可提名省份(三者互斥,语义不同不并列;
 * 列内允许自然折行 —— 死路最多 9 个省码,可提名全码直陈也到 8-9 个)。
 *
 * @param x 同 `occColsOf`。
 * @returns 那一列;三条都不成立时 null。
 */
function occTailColOf(x: OccColsIn): StartCol<OccCellRow> | null {
  if (x.deadCol) {
    return { key: COL_DEAD, label: x.t('pulse.col.dead'), sort: occDeadSortOf, render: DeadCell }
  }
  if (x.showProvs) {
    return { key: COL_HOT, label: x.t('pulse.col.hot'), sort: occHotSortOf, render: HotCell }
  }
  if (x.hasPnpProvs) {
    return { key: COL_PNP_PROVS, label: x.t('pulse.col.pnpProvs'), sort: occPnpSortKeyOf, render: PnpCell }
  }
  return null
}

/**
 * 职业名的排序键。
 *
 * @param r 这一行。
 * @returns 主文案。
 */
export function occMainSortOf(r: OccCellRow): string {
  return r.main
}

/**
 * 在招岗数的排序键。
 *
 * @param r 这一行。
 * @returns 在招岗数。
 */
export function occOpenSortOf(r: OccCellRow): number | null {
  return r.openSort
}

/**
 * 在招岗数单元格。
 *
 * @param r 这一行。
 * @returns 数值文案。
 */
export function occOpenTextOf(r: OccCellRow): string {
  return r.openText
}

/**
 * 环比的排序键。
 *
 * @param r 这一行。
 * @returns 环比。
 */
export function occMomSortOf(r: OccCellRow): number | null {
  return r.momSort
}

/**
 * 薪资区间的排序键(按高位)。
 *
 * @param r 这一行。
 * @returns 高位年薪。
 */
export function occSalSortOf(r: OccCellRow): number | null {
  return r.salSort
}

/**
 * 薪资区间单元格。
 *
 * @param r 这一行。
 * @returns 区间文案。
 */
export function occSalOf(r: OccCellRow): string {
  return r.salText
}

/**
 * NOC 码的排序键。
 *
 * @param r 这一行。
 * @returns NOC 码。
 */
export function occNocSortOf(r: OccCellRow): string {
  return r.noc
}

/**
 * NOC 码单元格(Frank 2026-08-06 二改「代码单独弄一个列」;手机卡片仍在胶囊里)。
 *
 * @param r 这一行。
 * @returns NOC 码。
 */
export function occNocOf(r: OccCellRow): string {
  return r.noc
}

/**
 * TEER 的排序键。
 *
 * @param r 这一行。
 * @returns TEER。
 */
export function occTeerSortOf(r: OccCellRow): number | null {
  return r.teerSort
}

/**
 * TEER 单元格(Frank 2026-08-06 拍板加:无清单职业还剩什么路,先看 TEER
 * —— 0-3 有联邦 EE,4-5 没有)。
 *
 * @param r 这一行。
 * @returns TEER 文案。
 */
export function occTeerOf(r: OccCellRow): string {
  return r.teerText
}

/**
 * 死路省数的排序键。
 *
 * @param r 这一行。
 * @returns 死路省数。
 */
export function occDeadSortOf(r: OccCellRow): number {
  return r.deadSort
}

/**
 * 紧缺省数的排序键。
 *
 * @param r 这一行。
 * @returns 紧缺省数。
 */
export function occHotSortOf(r: OccCellRow): number {
  return r.hotSort
}

/**
 * 可提名省份的排序键。
 *
 * @param r 这一行。
 * @returns 排序键。
 */
export function occPnpSortKeyOf(r: OccCellRow): number {
  return r.pnpSort
}

/**
 * 担保率的排序键。
 *
 * @param r 这一行。
 * @returns 担保率。
 */
export function occRateSortOf(r: OccCellRow): number | null {
  return r.rateSort
}

/**
 * 担保率单元格。
 *
 * @param r 这一行。
 * @returns 担保率文案。
 */
export function occRateOf(r: OccCellRow): string {
  return r.rateText
}

/**
 * 职业榜的行身份。
 *
 * @param r 这一行。
 * @returns 行键。
 */
export function occRowKeyOf(r: OccCellRow): string {
  return r.key
}


/**
 * 把几个类拼成一个 className(HTML 的 class 属性按空白切词)。
 *
 * @param cls 各类。
 * @returns 拼好的 className。
 */
function joinCls(cls: string[]): string {
  return cls.join(CLS_SEP)
}

/**
 * 色带的类:基座 + hero 档 + CTA 档(2026-09-04 Frank「把脉页面背景都改成一样的吧」:灰白交替撤,全页一色)。
 *
 * @param x 两个档位开关。
 * @returns className。
 */
export function bandClsOf(x: BandClsIn): string {
  const cls = [cssOf(css.band)]
  if (x.hero) {
    cls.push(cssOf(css.hero))
  }
  if (x.cta) {
    cls.push(cssOf(css.ctaBand))
  }
  return joinCls(cls)
}

/**
 * 整榜有没有一行算出了 14 天新发环比。全 null(列没落库)时环比列**整列不渲染**,
 * 降级成在架 / 薪资撑得住的版本 —— 绝不拿 0 顶包(契约 v3 的容缺红线)。
 *
 * @param rows 本榜的职业统计行。
 * @returns 有没有。
 */
export function someMomOf(rows: OccRowList): boolean {
  for (const o of rows) {
    if (o.mom14d != null) {
      return true
    }
  }
  return false
}

/**
 * 整榜有没有一行落了可提名省份列(E13-05 榜 A 专用列 —— 真口径可提名省份 pnp_provs,
 * 含排除式省 / 雇主担保类,与「紧缺清单省份」列语义不同、互斥出现)。
 *
 * @param rows 本榜的职业统计行。
 * @returns 有没有。
 */
export function somePnpProvsOf(rows: OccRowList): boolean {
  for (const o of rows) {
    if (o.pnpProvs != null) {
      return true
    }
  }
  return false
}

/**
 * 整榜有没有一行落了担保率列(E14-02 榜 A 独有 —— 分子 / 分母任一没落库都是
 * sponsorRate=null,整列不渲;同 someMomOf / somePnpProvsOf 的容缺先例)。
 *
 * @param rows 本榜的职业统计行。
 * @returns 有没有。
 */
export function someSponsorRateOf(rows: OccRowList): boolean {
  for (const o of rows) {
    if (o.sponsorRate != null) {
      return true
    }
  }
  return false
}

/**
 * 分区标题的类:基座 + 子标题档。
 *
 * @param x 子标题开关。
 * @returns className。
 */
export function secHeadClsOf(x: SecHeadClsIn): string {
  const cls = [cssOf(css.secHead)]
  if (x.sub) {
    cls.push(cssOf(css.secHeadSub))
  }
  return joinCls(cls)
}

/**
 * 加载占位块的类:基座 + 高度档(档位 → 类是查表不是比较;完整性由
 * `Record<PlaceholderSize, string>` 注解管着)。
 *
 * @param x 高度档。
 * @returns className。
 */
export function placeholderClsOf(x: PlaceholderClsIn): string {
  const bySize: Record<PlaceholderClsIn['size'], string> = {
    320: cssOf(css.ph320),
    380: cssOf(css.ph380),
    420: cssOf(css.ph420),
    480: cssOf(css.ph480),
  }
  return joinCls([cssOf(css.ph), bySize[x.size]])
}

/**
 * 一粒胶囊的类:形状基座 + 配色档。
 *
 * @param tone 配色档的类。
 * @returns className。
 */
export function pillClsOf(tone: string): string {
  return joinCls([cssOf(css.pill), tone])
}

/**
 * 难度档胶囊的类(easy 绿 / mid 黄 / tight 红,与 jobs/Advisor 的 DIFF_TAG 及原 /stats
 * 索引页省卡同值);没算出来给空串(单元格改渲横杠,不渲胶囊)。
 *
 * @param x 难度档。
 * @returns className;没有则空串。
 */
export function diffClsOf(x: TierClsIn): string {
  if (x.tier === DIFF_EASY) {
    return pillClsOf(cssOf(css.pillEasy))
  }
  if (x.tier === DIFF_MID) {
    return pillClsOf(cssOf(css.pillMid))
  }
  if (x.tier === DIFF_TIGHT) {
    return pillClsOf(cssOf(css.pillTight))
  }
  return TEXT_NONE
}

/**
 * 省卡上那粒难度档胶囊的类:比表格里多一格「推到最右且不被压缩」。
 *
 * @param x 难度档。
 * @returns className;没有则空串。
 */
export function diffCardClsOf(x: TierClsIn): string {
  const base = diffClsOf(x)
  if (base === TEXT_NONE) {
    return TEXT_NONE
  }
  return joinCls([base, cssOf(css.pillRight)])
}

/**
 * 环比单元格的配色类:跌红 / 涨绿 / 持平灰;雷区榜关掉红绿走近黑
 * (2026-08-09 Frank:雷区榜上绿色语义是反的 —— 涨 = 更多人被吸进一个在那些省根本
 * 没通道的岗,那不是好消息。只这一榜关掉;别的榜「涨=好」的直觉是对的,照旧)。
 *
 * @param x 环比与配色开关。
 * @returns className。
 */
export function momClsOf(x: MomClsIn): string {
  if (x.flatDelta) {
    return cssOf(css.momPlain)
  }
  if (x.mom == null) {
    return cssOf(css.momFlat)
  }
  if (x.mom < MOM_FLAT) {
    return cssOf(css.momDown)
  }
  if (x.mom > MOM_FLAT) {
    return cssOf(css.momUp)
  }
  return cssOf(css.momFlat)
}

/**
 * 二级导航项的类:基座 + 当前档(蓝 + 加粗 —— 蓝色只有一个语义:你现在在哪)。
 *
 * @param x 是不是当前分区。
 * @returns className。
 */
export function navLinkClsOf(x: NavLinkClsIn): string {
  const cls = [cssOf(css.navLink)]
  if (x.on) {
    cls.push(cssOf(css.navLinkOn))
  }
  return joinCls(cls)
}

/**
 * 橱窗第二张起的表与上一张的间距。
 *
 * @param x 留不留间距。
 * @returns className;不留时空串。
 */
export function sponsorGapClsOf(x: GapClsIn): string {
  if (x.gap) {
    return cssOf(css.grpGap)
  }
  return TEXT_NONE
}

/**
 * 职业榜第二张起的分榜与上一张的间距。
 *
 * @param x 留不留间距。
 * @returns className;不留时空串。
 */
export function boardGapClsOf(x: GapClsIn): string {
  if (x.gap) {
    return cssOf(css.boardGap)
  }
  return TEXT_NONE
}

/**
 * 指标块外层类:标题行贴表(2026-09-10「左边 title 也要紧贴表格」)+ 非首块的块间距。
 *
 * @param x 块间距开关。
 * @returns 类名串。
 */
export function macroWrapClsOf(x: GapClsIn): string {
  const out = [cssOf(css.macroTight)]
  if (x.gap) {
    out.push(cssOf(css.boardGap))
  }
  return out.join(CLS_SEP)
}

/**
 * 通道筛下拉的显示名函数(数据层中文 label → 界面语言短名)。
 *
 * @param x 取词函数。
 * @returns 显示名函数。
 */
export function makeStreamLabel(x: StreamLabelIn): LabelFn {
  return function streamLabel(label: string): string {
    return streamDisplay({ t: x.t, label })
  }
}

/**
 * 逐日在招量查询挂了时的兜底:空清单(趋势段整块不渲,不显示 0)。
 *
 * @returns 空清单。
 */
export function emptyDailyRows(): DailyRow[] {
  return []
}

/**
 * 一张脉象卡的类(hover 高亮走全局 .cardHover 跨页规范)。
 *
 * @returns className。
 */
export function numCardClsOf(): string {
  return CLS_CARD_HOVER
}

/**
 * CTA 大钮的类:基座 + 主色档。
 *
 * @returns className。
 */
export function ctaBtnClsOf(): string {
  return joinCls([cssOf(css.btn), cssOf(css.ctaBtn)])
}


/**
 * #313:橱窗三分表挂载后拉全量换掉 SSR 那几十行(手法照 occ 大表的 /api/stats/market);
 * 拉挂 / 拉到空表就继续用 SSR 那几十行,不闪不塌。
 *
 * @param x 全量到手后的落格。
 * @returns effect 的本体(交回清理函数)。
 */
export function makeSponsorLoad(x: SponsorLoadIn): () => CleanupFn {
  return function run(): CleanupFn {
    const ctrl = new AbortController()
    async function pull(): Promise<void> {
      try {
        const res = await fetch(URL_SPONSORS_API, { signal: ctrl.signal })
        if (res.ok === false) {
          return
        }
        const j: SponsorFullProbe = await res.json()
        if (j == null || j.lmia == null || j.lmia.top.length === 0) {
          return
        }
        x.setSponsorFull({
          lmia: j.lmia, named: groupOrEmpty(j.named), aip: groupOrEmpty(j.aip), pilot: groupOrEmpty(j.pilot),
        })
      } catch {
        return
      }
    }
    void pull()
    return function abort(): void {
      ctrl.abort()
    }
  }
}

/**
 * 宏观两份的挂载后拉取工厂(2026-09-10 SSR 瘦身:形照 makeSponsorLoad;拉挂 / 空表落空份,
 * 两段渲空不渲错;行构造 toMacroPoints/toOpsPoints 在这里做完,消费端只见点)。
 *
 * @param x 两份到手后的落格。
 * @returns effect 的本体(交回清理函数)。
 */
export function makeMacroLoad(x: MacroLoadIn): () => CleanupFn {
  return function run(): CleanupFn {
    const ctrl = new AbortController()
    async function pull(): Promise<void> {
      try {
        const res = await fetch(URL_MACRO_API, { signal: ctrl.signal })
        if (res.ok === false) {
          x.setMacroData({ macro: [], ops: [] })
          return
        }
        const j: MacroStatsProbe = await res.json()
        x.setMacroData({ macro: toMacroPoints(macroRowsOrEmpty(j.macro)), ops: toOpsPoints(opsRowsOrEmpty(j.ops)) })
      } catch {
        if (ctrl.signal.aborted === false) {
          x.setMacroData({ macro: [], ops: [] })
        }
      }
    }
    void pull()
    return function abort(): void {
      ctrl.abort()
    }
  }
}

/**
 * 拉回来的宏观点;还在路上给空清单(两段先渲占位)。
 *
 * @param d 两份点;null = 加载中。
 * @returns 宏观点。
 */
export function macroPointsOf(d: MacroData | null): MacroPoint[] {
  if (d == null) {
    return []
  }
  return d.macro
}

/**
 * 拉回来的运营点;还在路上给空清单。
 *
 * @param d 两份点;null = 加载中。
 * @returns 运营点。
 */
export function opsPointsOf(d: MacroData | null): OpsPoint[] {
  if (d == null) {
    return []
  }
  return d.ops
}

/**
 * 接口给的宏观行清单;没给就当空清单(不闪不塌)。
 *
 * @param rows 行清单;null = 接口没给。
 * @returns 行清单。
 */
function macroRowsOrEmpty(rows: MacroDbRow[] | null): MacroDbRow[] {
  if (rows == null) {
    return []
  }
  return rows
}

/**
 * 接口给的运营行清单;没给就当空清单。
 *
 * @param rows 行清单;null = 接口没给。
 * @returns 行清单。
 */
function opsRowsOrEmpty(rows: OpsDbRow[] | null): OpsDbRow[] {
  if (rows == null) {
    return []
  }
  return rows
}

/**
 * 接口回来的某一张表;没有就当空表(不闪不塌)。
 *
 * @param g 那张表;null = 接口没给。
 * @returns 那张表或空表。
 */
function groupOrEmpty(g: SponsorGroup | null): SponsorGroup {
  if (g == null) {
    return { top: [], total: 0 }
  }
  return g
}

/**
 * 二级导航的滚动跟随(2026-08-09 Frank「这个地方的高亮也不对啊」:原先五个锚点永远灰、
 * 属主永远蓝 = 看着像永远停在第一项)。当前分区 = 顶部粘条下沿(~96px)以上最后一个分区标题;
 * scroll 监听 + rAF 节流;分区可能条件不渲(榜全空),getElementById 空安全。
 *
 * @param x 当前分区的落格。
 * @returns effect 的本体(交回清理函数)。
 */
export function makeNavWatch(x: NavWatchIn): () => CleanupFn {
  return function run(): CleanupFn {
    let raf = 0
    function pick(): void {
      raf = 0
      let cur = TEXT_NONE
      for (const id of NAV_IDS) {
        const el = document.getElementById(id)
        if (el != null && el.getBoundingClientRect().top <= NAV_TOP_LINE) {
          cur = id
        }
      }
      x.setNavSec(cur)
    }
    function onScroll(): void {
      if (raf === 0) {
        raf = requestAnimationFrame(pick)
      }
    }
    window.addEventListener(EV_SCROLL, onScroll, { passive: true })
    pick()
    return function off(): void {
      window.removeEventListener(EV_SCROLL, onScroll)
      if (raf !== 0) {
        cancelAnimationFrame(raf)
      }
    }
  }
}

/**
 * 埋点:点了一张脉象卡。
 *
 * @returns 无。
 */
export function trackNumCard(): void {
  track(TRACK_CARD)
}

/**
 * 埋点:点了榜上的一个职业名。
 *
 * @returns 无。
 */
export function trackOccClick(): void {
  track(TRACK_OCC)
}

/**
 * 埋点:点了 S6 的职位板入口大钮。
 *
 * @returns 无。
 */
export function trackCtaClick(): void {
  track(TRACK_CTA)
}

/**
 * 埋点:滚到了某一段(useNavSec 的分区跟随变化时打;kind = 段锚点 id)。
 *
 * @param id 段锚点 id。
 * @returns 无。
 */
export function trackSecView(id: string): void {
  track(TRACK_SEC, { [TRACK_PROP_KEY]: id })
}

/**
 * 二级导航子项胶囊的点击埋点工厂(kind = 目标锚点 id;工厂体内的内嵌函数是宪法豁免形)。
 *
 * @param id 目标锚点 id。
 * @returns 点击回调。
 */
export function makeSubnavTrack(id: string): ClickFn {
  return function onSubnav() {
    track(TRACK_SUBNAV, { [TRACK_PROP_KEY]: id })
  }
}

/**
 * 序列表视图 / 年窗切换的埋点(喂通用表格的 onSwitch 回调;kind = table / chart / recent / more / all)。
 *
 * @param kind 切到的档。
 * @returns 无。
 */
export function seriesSwitchTrack(kind: string): void {
  track(TRACK_SERIES, { [TRACK_PROP_KEY]: kind })
}



/**
 * 职业段的分表:最多岗位、最高工资两张全职业榜,再按 IND_KEYS 序每个行业组一张(凑不出一行的组不出)。
 * 每表全量(2026-09-04 Frank「显示所示条目,加上分页」),排序在这里做完,视图分页。
 *
 * @param x 取词函数与全国行。
 * @returns 分表清单。
 */
export function occSecsOf(x: OccSecsIn): OccSec[] {
  const out: OccSec[] = [
    { key: SEC_TOP_OPEN, title: x.t('pulse.top.open'), rows: topOpenOf(x.natOcc) },
    { key: SEC_TOP_WAGE, title: x.t('pulse.top.wage'), rows: topWageOf(x.natOcc) },
  ]
  for (const key of IND_KEYS) {
    const rows = indRowsOf({ natOcc: x.natOcc, key })
    if (rows.length > 0) {
      out.push({ key, title: x.t(KEY_IND_HEAD + key), rows })
    }
  }
  return out
}

/**
 * 最多岗位榜:全部职业按在招降序。
 *
 * @param natOcc 全国行。
 * @returns 排好序的全部行。
 */
function topOpenOf(natOcc: OccRowList): OccRowList {
  const rows = natOcc.slice()
  rows.sort(byOpenDesc)
  return rows
}

/**
 * 最高工资榜:在招 ≥ WAGE_MIN_OPEN 且有官方中位年薪的职业,按中位年薪降序。
 *
 * @param natOcc 全国行。
 * @returns 排好序的全部行。
 */
function topWageOf(natOcc: OccRowList): OccRowList {
  const rows: OccRowList = []
  for (const o of natOcc) {
    if (o.openJobs != null && o.openJobs >= WAGE_MIN_OPEN && o.medianWageAnnual != null) {
      rows.push(o)
    }
  }
  rows.sort(byWageDesc)
  return rows
}

/**
 * 一个行业组的职业:大类落在该组的行,按在招降序。
 *
 * @param x 全国行与行业组键。
 * @returns 排好序的全部行。
 */
function indRowsOf(x: IndRowsIn): OccRowList {
  const broads = IND_BROADS[x.key]
  const rows: OccRowList = []
  if (broads == null) {
    return rows
  }
  for (const o of x.natOcc) {
    if (broads.includes(o.broad)) {
      rows.push(o)
    }
  }
  rows.sort(byOpenDesc)
  return rows
}

/**
 * 中位年薪(null 当 0,只用于排序)。
 *
 * @param o 一行。
 * @returns 中位年薪。
 */
function wageOf(o: OccRowOne): number {
  if (o.medianWageAnnual == null) {
    return 0
  }
  return o.medianWageAnnual
}

/**
 * 按中位年薪降序。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 比较结果。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byWageDesc(a: OccRowOne, b: OccRowOne): number {
  return wageOf(b) - wageOf(a)
}



/**
 * 城市段五份的挂载后拉取工厂(2026-09-11 重设计批,照 makeMacroLoad 的形;
 * 拉挂给五份全空 —— 段渲空态不渲占位死等)。
 *
 * @param x 落数回调。
 * @returns 启动函数(返回中止清理)。
 */
export function makeCityLoad(x: CityLoadIn): () => CleanupFn {
  return function run(): CleanupFn {
    const ctrl = new AbortController()
    async function pull(): Promise<void> {
      try {
        const res = await fetch(URL_CITY_API, { signal: ctrl.signal })
        if (res.ok === false) {
          x.setCityData(cityListsOf({}))
          return
        }
        const j: CityStatsProbe = await res.json()
        x.setCityData(cityListsOf(j))
      } catch {
        if (ctrl.signal.aborted === false) {
          x.setCityData(cityListsOf({}))
        }
      }
    }
    void pull()
    return function abort(): void {
      ctrl.abort()
    }
  }
}

/**
 * 拉回的探针 → 五份齐整(缺键给空清单;每份独立,缺一份只丢那张表)。
 *
 * @param j 拉回的 json 探针。
 * @returns 五份数据。
 */
function cityListsOf(j: CityStatsProbe): CityData {
  const out: CityData = { cities: [], industry: [], pilots: [], dli: [] }
  if (j.cities != null) {
    out.cities = j.cities
  }
  if (j.industry != null) {
    out.industry = j.industry
  }
  if (j.pilots != null) {
    out.pilots = j.pilots
  }
  if (j.dli != null) {
    out.dli = j.dli
  }
  return out
}

/**
 * 城市段落职位板的地址(按城市筛 + 来源标记)。
 *
 * @param city 城市英文名。
 * @returns 地址。
 */
function cityHrefOf(city: string): string {
  return URL_HOME_CITY_HEAD + encodeURIComponent(city) + CITY_UTM_TAIL
}

/**
 * 城市段点击埋点的手柄工厂(city-open,kind 按表;工厂体内的内嵌函数是宪法豁免形)。
 *
 * @param kind 从哪张表走的(main / industry / pilot / dli / search)。
 * @returns 点击回调。
 */
export function makeCityTrack(kind: string): ClickFn {
  return function onCityOpen() {
    track(TRACK_CITY, { [TRACK_PROP_KEY]: kind })
  }
}

/**
 * 城市名的灰注:主文案是译名时给「英文名 + 省码」,主文案就是英文时只剩省码。
 *
 * @param x 城市行与语言。
 * @returns 灰注。
 */
function cityNoteOf(x: CityNameIn): string {
  if (cityNameOf(x) === x.r.city) {
    return x.r.province
  }
  return x.r.city + SPACE_SEP + x.r.province
}

/**
 * 城市全量榜 → 表 1(主要城市)展示行(值级清洗全在这里;行序 = 服务端在招降序)。
 *
 * @param x 城市行、取词函数与语言。
 * @returns 展示行。
 */
export function toCityMainRows(x: CityMainRowsIn): CityMainRow[] {
  const onOpen = makeCityTrack(CITY_KIND_MAIN)
  const out: CityMainRow[] = []
  for (const r of x.rows) {
    out.push({
      key: r.city + KEY_SEP + r.province,
      name: cityNameOf({ r, lang: x.lang }),
      note: cityNoteOf({ r, lang: x.lang }),
      href: cityHrefOf(r.city),
      onOpen,
      open: r.openJobs,
      openText: numOrDashOf(r.openJobs),
      new7: r.new7d,
      new7Text: numOrDashOf(r.new7d),
      wage: r.medianWageAnnual,
      wageText: wageOrDashOf(r.medianWageAnnual),
      pop: r.population,
      popText: numOrDashOf(r.population),
      unemp: r.unempRate,
      unempText: pctOrDashOf(r.unempRate),
    })
  }
  return out
}

/**
 * 表 1 的列(城市 / 在招 / 近 7 天 / 中位年薪;近 7 天手机档藏)。
 * 2026-09-11 Frank「专属通道怎么是空的」:通道列撤出表 1 —— 试点全在小城长尾,首页前十城整列显杠
 * 读作坏了;试点信号归表 3,搜索建议带试点绿标(搜到 Kelowna 可见 FCIP)。
 *
 * @param x 取词函数。
 * @returns 列声明。
 */
export function cityMainColsOf(x: CityColsIn): StartCol<CityMainRow>[] {
  return [
    { key: COL_CITY, label: x.t('pulse.city.name'), sort: cityNameSortOf, render: CityNameCell },
    { key: COL_JOBS_OPEN, label: x.t('pulse.city.open'), nowrap: true, sort: cityOpenSortOf, render: cityOpenTextOf },
    {
      key: COL_JOBS_NEW7,
      label: x.t('stats.new7d'),
      nowrap: true,
      sort: cityNew7SortOf,
      render: cityNew7TextOf,
      className: cssOf(css.cityWide),
    },
    { key: COL_CITY_WAGE, label: x.t('pulse.city.wage'), nowrap: true, sort: cityWageSortOf, render: cityWageTextOf },
    { key: COL_CITY_POP, label: x.t('pulse.city.pop'), nowrap: true, sort: cityPopSortOf, render: cityPopTextOf },
    {
      key: COL_CITY_UNEMP,
      label: x.t('pulse.city.unemp'),
      nowrap: true,
      sort: cityUnempSortOf,
      render: cityUnempTextOf,
      className: cssOf(css.cityWide),
    },
  ]
}

/**
 * 表 1 人口排序键(2026-09-11 批二:StatCan CSD 年度估计)。
 *
 * @param r 一行。
 * @returns 人口。
 */
export function cityPopSortOf(r: CityMainRow): number | null {
  return r.pop
}

/**
 * 表 1 人口格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
export function cityPopTextOf(r: CityMainRow): string {
  return r.popText
}

/**
 * 表 1 都会区失业率排序键(CMA 口径,列名已标都会区)。
 *
 * @param r 一行。
 * @returns 失业率。
 */
export function cityUnempSortOf(r: CityMainRow): number | null {
  return r.unemp
}

/**
 * 表 1 都会区失业率格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
export function cityUnempTextOf(r: CityMainRow): string {
  return r.unempText
}

/**
 * 表 1 城市名排序键(主文案)。
 *
 * @param r 一行。
 * @returns 主文案。
 */
export function cityNameSortOf(r: CityMainRow): string {
  return r.name
}

/**
 * 表 1 在招排序键。
 *
 * @param r 一行。
 * @returns 在招数。
 */
export function cityOpenSortOf(r: CityMainRow): number | null {
  return r.open
}

/**
 * 表 1 在招格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
export function cityOpenTextOf(r: CityMainRow): string {
  return r.openText
}

/**
 * 表 1 近 7 天排序键。
 *
 * @param r 一行。
 * @returns 近 7 天数。
 */
export function cityNew7SortOf(r: CityMainRow): number | null {
  return r.new7
}

/**
 * 表 1 近 7 天格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
export function cityNew7TextOf(r: CityMainRow): string {
  return r.new7Text
}

/**
 * 表 1 中位年薪排序键。
 *
 * @param r 一行。
 * @returns 中位年薪。
 */
export function cityWageSortOf(r: CityMainRow): number | null {
  return r.wage
}

/**
 * 表 1 中位年薪格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
export function cityWageTextOf(r: CityMainRow): string {
  return r.wageText
}

/**
 * 城 × 大类计数行 → 行业对比的表清单(2026-09-11 Frank「这个应该每个行业一个表吧」+
 * 「要和雇主的那个行业保持一致吧」:一组一张小表照雇主板形,组 = 全站八行业组
 * (IND_KEYS / IND_BROADS,职业/雇主/LMIA/趋势四段同一份),表题同词(KEY_IND_HEAD);
 * 行 = 该组有在招的城,组内大类求和,按在招降序;「未分类」不属任何组自然不出)。
 *
 * @param x 计数行、城市榜、取词函数与语言。
 * @returns 表清单(空组不出)。
 */
export function cityIndTablesOf(x: CityIndTablesIn): CityIndTable[] {
  const onOpen = makeCityTrack(CITY_KIND_IND)
  const byCity = new Map<string, CityRow>()
  for (const c of x.cities) {
    byCity.set(c.city + KEY_SEP + c.province, c)
  }
  const out: CityIndTable[] = []
  for (const key of IND_KEYS) {
    const broads = IND_BROADS[key]
    if (broads == null) {
      continue
    }
    const sums = new Map<string, number>()
    for (const r of x.rows) {
      if (broads.includes(r.broad) === false) {
        continue
      }
      const ck = r.city + KEY_SEP + r.province
      let s = sums.get(ck)
      if (s == null) {
        s = 0
      }
      sums.set(ck, s + r.n)
    }
    const rows: CityIndRow[] = []
    for (const [ck, n] of sums) {
      const c = byCity.get(ck)
      if (c == null) {
        continue
      }
      rows.push({
        key: ck,
        name: cityNameOf({ r: c, lang: x.lang }),
        note: cityNoteOf({ r: c, lang: x.lang }),
        href: cityHrefOf(c.city),
        onOpen,
        n,
      })
    }
    rows.sort(byIndOpenDesc)
    if (rows.length > 0) {
      out.push({ key, label: x.t(KEY_IND_HEAD + key), rows })
    }
  }
  return out
}

/**
 * 行业小表的行序:在招降序。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 比较值。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byIndOpenDesc(a: CityIndRow, b: CityIndRow): number {
  return b.n - a.n
}

/**
 * 行业小表的列(城市 + 在招;每业一张,列头词条与表 1 同源)。
 *
 * @param x 取词函数。
 * @returns 列声明。
 */
export function cityIndColsOf(x: CityIndColsIn): StartCol<CityIndRow>[] {
  return [
    { key: COL_CITY, label: x.t('pulse.city.name'), sort: indNameSortOf, render: CityNameCell },
    { key: COL_JOBS_OPEN, label: x.t('pulse.city.open'), nowrap: true, sort: indOpenSortOf, render: indOpenTextOf },
  ]
}

/**
 * 行业小表城市名排序键。
 *
 * @param r 一行。
 * @returns 主文案。
 */
export function indNameSortOf(r: CityIndRow): string {
  return r.name
}

/**
 * 行业小表在招列排序键。
 *
 * @param r 一行。
 * @returns 在招数。
 */
function indOpenSortOf(r: CityIndRow): number {
  return r.n
}

/**
 * 行业小表在招列文案。
 *
 * @param r 一行。
 * @returns 千分位数字。
 */
function indOpenTextOf(r: CityIndRow): string {
  return numOf(r.n)
}

/**
 * 试点社区名去省尾巴('Sudbury, ON' → 'Sudbury';join 键仍用全名)。
 *
 * @param name 社区官方名。
 * @returns 短名。
 */
function pilotShortNameOf(name: string): string {
  const at = name.indexOf(PILOT_NAME_SEP)
  if (at < 0) {
    return name
  }
  return name.slice(0, at)
}

/**
 * 试点社区行 → 表 3 展示行。社区短名与城市榜同名时借译名并给落板链接;
 * 对不上名的(社区 ≠ 单一城市,如 Pictou County)不给链接 —— 落到空职位板比不链更糟。
 *
 * @param x 试点行、城市榜、取词函数与语言。
 * @returns 展示行。
 */
export function toCityPilotRows(x: CityPilotRowsIn): CityPilotRow[] {
  const onOpen = makeCityTrack(CITY_KIND_PILOT)
  const byCity = new Map<string, CityRow>()
  for (const c of x.cities) {
    byCity.set(c.city + KEY_SEP + c.province, c)
  }
  const out: CityPilotRow[] = []
  for (const p of x.pilots) {
    const short = pilotShortNameOf(p.name)
    const hit = byCity.get(short + KEY_SEP + p.province)
    let name = short
    let note = p.province
    let href = TEXT_NONE
    if (hit != null) {
      name = cityNameOf({ r: hit, lang: x.lang })
      note = cityNoteOf({ r: hit, lang: x.lang })
      href = cityHrefOf(hit.city)
    }
    out.push({
      key: p.name + KEY_SEP + p.type,
      name,
note,
href,
onOpen,
      typeText: p.type + SPACE_SEP + x.t('pulse.city.pilotTag'),
      open: p.openJobs,
openText: numOf(p.openJobs),
    })
  }
  return out
}

/**
 * 表 3 的列(社区 / 省 / 通道 / 在招;省列手机档藏 —— 省码已在灰注里)。
 *
 * @param x 取词函数。
 * @returns 列声明。
 */
export function cityPilotColsOf(x: CityColsIn): StartCol<CityPilotRow>[] {
  return [
    { key: COL_COMM, label: x.t('pulse.city.comm'), sort: pilotNameSortOf, render: CityNameCell },
    {
      key: COL_PROV,
      label: x.t('pulse.s4.prov'),
      nowrap: true,
      sort: pilotProvSortOf,
      render: pilotProvTextOf,
      className: cssOf(css.cityWide),
    },
    {
      key: COL_COMM_TYPE,
      label: x.t('pulse.city.channel'),
      nowrap: true,
      sort: pilotTypeSortOf,
      render: CityPilotTypeCell,
    },
    { key: COL_JOBS_OPEN, label: x.t('pulse.city.open'), nowrap: true, sort: pilotOpenSortOf, render: pilotOpenTextOf },
  ]
}

/**
 * 表 3 社区名排序键。
 *
 * @param r 一行。
 * @returns 主文案。
 */
export function pilotNameSortOf(r: CityPilotRow): string {
  return r.name
}

/**
 * 表 3 省列排序键与文案(灰注最后一段即省码;单独存列免得排序键混译名)。
 *
 * @param r 一行。
 * @returns 省码。
 */
export function pilotProvSortOf(r: CityPilotRow): string {
  return pilotProvTextOf(r)
}

/**
 * 表 3 省格文案(灰注尾段的省码)。
 *
 * @param r 一行。
 * @returns 省码。
 */
export function pilotProvTextOf(r: CityPilotRow): string {
  const at = r.note.lastIndexOf(SPACE_SEP)
  if (at < 0) {
    return r.note
  }
  return r.note.slice(at + 1)
}

/**
 * 表 3 通道排序键。
 *
 * @param r 一行。
 * @returns 通道文案。
 */
export function pilotTypeSortOf(r: CityPilotRow): string {
  return r.typeText
}

/**
 * 表 3 在招排序键。
 *
 * @param r 一行。
 * @returns 在招数。
 */
export function pilotOpenSortOf(r: CityPilotRow): number {
  return r.open
}

/**
 * 表 3 在招格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
export function pilotOpenTextOf(r: CityPilotRow): string {
  return r.openText
}

/**
 * 城市 DLI 行 → 表 4(留学城市)展示行。
 *
 * @param x DLI 行与语言。
 * @returns 展示行。
 */
export function toCityDliRows(x: CityDliRowsIn): CityDliRow[] {
  const onOpen = makeCityTrack(CITY_KIND_DLI)
  const out: CityDliRow[] = []
  for (const r of x.rows) {
    const link: CityNameIn = { r: dliAsCityRowOf(r), lang: x.lang }
    out.push({
      key: r.city + KEY_SEP + r.province,
      name: cityNameOf(link),
      note: cityNoteOf(link),
      href: cityHrefOf(r.city),
      onOpen,
      n: r.n,
pub: r.publicN,
grad: r.gradN,
    })
  }
  return out
}

/**
 * DLI 行借城市名取值器的形(cityNameOf 只读名字五格;数字格喂 null 不参与)。
 *
 * @param r DLI 行。
 * @returns 名字五格齐整的城市行。
 */
function dliAsCityRowOf(r: DliCityRow): CityRow {
  return {
    city: r.city,
    cityZh: r.cityZh,
    cityKo: r.cityKo,
    province: r.province,
    openJobs: null,
    new7d: null,
    medianWageAnnual: null,
    medianSalaryAnnual: null,
    salaryN: null,
    namedJobs: null,
    pilot: null,
    population: null,
    unempRate: null,
  }
}

/**
 * 表 4 的列(城市 / DLI 院校 / 其中公立 / 可申工签;公立列手机档藏)。
 *
 * @param x 取词函数。
 * @returns 列声明。
 */
export function cityDliColsOf(x: CityColsIn): StartCol<CityDliRow>[] {
  return [
    { key: COL_CITY, label: x.t('pulse.city.name'), sort: dliNameSortOf, render: CityNameCell },
    { key: COL_DLI_N, label: x.t('pulse.city.dliN'), nowrap: true, sort: dliNSortOf, render: dliNTextOf },
    {
      key: COL_DLI_PUB,
      label: x.t('pulse.city.dliPub'),
      nowrap: true,
      sort: dliPubSortOf,
      render: dliPubTextOf,
      className: cssOf(css.cityWide),
    },
    { key: COL_DLI_GRAD, label: x.t('pulse.city.dliGrad'), nowrap: true, sort: dliGradSortOf, render: dliGradTextOf },
  ]
}

/**
 * 表 4 城市名排序键。
 *
 * @param r 一行。
 * @returns 主文案。
 */
export function dliNameSortOf(r: CityDliRow): string {
  return r.name
}

/**
 * 表 4 院校数排序键。
 *
 * @param r 一行。
 * @returns 院校数。
 */
export function dliNSortOf(r: CityDliRow): number {
  return r.n
}

/**
 * 表 4 院校数格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
export function dliNTextOf(r: CityDliRow): string {
  return numOf(r.n)
}

/**
 * 表 4 公立数排序键。
 *
 * @param r 一行。
 * @returns 公立数。
 */
export function dliPubSortOf(r: CityDliRow): number {
  return r.pub
}

/**
 * 表 4 公立数格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
export function dliPubTextOf(r: CityDliRow): string {
  return numOf(r.pub)
}

/**
 * 表 4 可申工签数排序键。
 *
 * @param r 一行。
 * @returns 可申工签院校数。
 */
export function dliGradSortOf(r: CityDliRow): number {
  return r.grad
}

/**
 * 表 4 可申工签数格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
export function dliGradTextOf(r: CityDliRow): string {
  return numOf(r.grad)
}

/**
 * 表 1 行身份。
 *
 * @param r 一行。
 * @returns 城市 + 省。
 */
export function cityRowKeyOf(r: CityMainRow): string {
  return r.key
}

/**
 * 表 2 行身份。
 *
 * @param r 一行。
 * @returns 城市 + 省。
 */
export function indRowKeyOf(r: CityIndRow): string {
  return r.key
}

/**
 * 表 3 行身份。
 *
 * @param r 一行。
 * @returns 社区 + 类型。
 */
export function pilotRowKeyOf(r: CityPilotRow): string {
  return r.key
}

/**
 * 表 4 行身份。
 *
 * @param r 一行。
 * @returns 城市 + 省。
 */
export function dliRowKeyOf(r: CityDliRow): string {
  return r.key
}

/**
 * 城市名:界面语言有译名用译名(48 个主要城市有),否则英文原名。
 *
 * @param x 城市行与语言。
 * @returns 城市名。
 */
function cityNameOf(x: CityNameIn): string {
  if (x.lang === LANG_ZH && x.r.cityZh !== TEXT_NONE) {
    return x.r.cityZh
  }
  if (x.lang === LANG_KO && x.r.cityKo !== TEXT_NONE) {
    return x.r.cityKo
  }
  return x.r.city
}

/**
 * 可空数 → 千分位文案;null 给 DASH_MARK(官方没数就画杠,不编 0)。
 *
 * @param n 可空数。
 * @returns 文案。
 */
function numOrDashOf(n: number | null): string {
  if (n == null) {
    return DASH_MARK
  }
  return numOf(n)
}

/**
 * 可空年薪 → 带币种的千分位文案;null 给 DASH_MARK。
 *
 * @param n 可空年薪。
 * @returns 文案。
 */
function wageOrDashOf(n: number | null): string {
  if (n == null) {
    return DASH_MARK
  }
  return WAGE_SIGN + numOf(n)
}

/**
 * 可空失业率 → 百分号文案;null 给 DASH_MARK(不在 CMA 的城市不编数)。
 *
 * @param n 可空百分点。
 * @returns 文案。
 */
function pctOrDashOf(n: number | null): string {
  if (n == null) {
    return DASH_MARK
  }
  return String(n) + PCT_MARK
}

/**
 * 趋势段的数据:全国线(stats_daily 的 'all' 汇总行按日加总)+ 每个行业组一条线(组内大类按日加总)。
 * 全国线点数不足 TREND_MIN_POINTS 整段不出(给 null);点数不足的行业组只丢它自己。
 *
 * @param x 取词函数与逐日 × 大类在招量。
 * @returns 趋势面板或 null。
 */
export function trendOf(x: TrendOfIn): TrendPanel | null {
  const nat = seriesOf({ daily: x.daily, broads: [BROAD_ALL], key: BROAD_ALL, title: x.t('pulse.trend.nat') })
  if (nat == null) {
    return null
  }
  const inds: TrendSeries[] = []
  for (const key of IND_KEYS) {
    const broads = IND_BROADS[key]
    if (broads == null) {
      continue
    }
    const s = seriesOf({ daily: x.daily, broads, key, title: x.t(KEY_IND_HEAD + key) })
    if (s != null) {
      inds.push(s)
    }
  }
  return { nat, inds }
}

/**
 * 一条线:把清单里的大类按日期加总,日期升序;点数不足给 null。
 *
 * @param x 逐日行、大类清单、键与标题。
 * @returns 一条线或 null。
 */
function seriesOf(x: SeriesIn): TrendSeries | null {
  const sum: DateSum = new Map()
  for (const d of x.daily) {
    if (x.broads.includes(d.broad) === false) {
      continue
    }
    const cur = sum.get(d.date)
    if (cur == null) {
      sum.set(d.date, d.openJobs)
    } else {
      sum.set(d.date, cur + d.openJobs)
    }
  }
  const dates = Array.from(sum.keys())
  dates.sort()
  if (dates.length < TREND_MIN_POINTS) {
    return null
  }
  const values: number[] = []
  for (const d of dates) {
    const v = sum.get(d)
    if (v != null) {
      values.push(v)
    }
  }
  const last = values[values.length - 1]
  let lastText = DASH_MARK
  if (last != null) {
    lastText = numOf(last)
  }
  return { key: x.key, title: x.title, dates, values, lastText }
}

/**
 * 一条线的 echarts 配置:单序列平滑线 + 淡填充;主图带坐标轴与轴触发提示,小图只有线。
 *
 * @param x 这条线与是否小图。
 * @returns echarts 配置。
 */
export function lineOptionOf(x: LineOptionIn): ChartOption {
  let pad = TREND_PAD_MAIN
  if (x.small) {
    pad = TREND_PAD_SMALL
  }
  return {
    animation: false,
    grid: { left: pad, right: pad, top: pad, bottom: pad, containLabel: x.small === false },
    tooltip: { trigger: CHART_TRIGGER_AXIS, show: x.small === false },
    xAxis: { type: AXIS_CATEGORY, data: x.s.dates, show: x.small === false, boundaryGap: false },
    yAxis: { type: AXIS_VALUE, scale: true, show: x.small === false },
    series: [{
      type: SERIES_LINE_TYPE,
      data: x.s.values,
      showSymbol: false,
      smooth: true,
      lineStyle: { width: TREND_LINE_WIDTH, color: TREND_COLOR },
      itemStyle: { color: TREND_COLOR },
      areaStyle: { color: TREND_COLOR, opacity: TREND_AREA_OPACITY },
    }],
  }
}

/**
 * 趋势卡的类:主图与小图共一个底,主图不进网格。
 *
 * @param x 是否小图。
 * @returns 类名。
 */
export function trendCardClsOf(x: TrendSmallIn): string {
  const cls = [cssOf(css.trendCard)]
  if (x.small === false) {
    cls.push(cssOf(css.trendCardMain))
  }
  return joinCls(cls)
}

/**
 * 趋势图高度(px)。
 *
 * @param x 是否小图。
 * @returns 高度。
 */
export function trendHeightOf(x: TrendSmallIn): number {
  if (x.small) {
    return TREND_H_SMALL
  }
  return TREND_H_MAIN
}

/**
 * 抽选与政策动态那一行链接的类。
 *
 * @returns 类名。
 */
export function drawsLinkClsOf(): string {
  return cssOf(css.drawsLink)
}

/**
 * 查询挂了的空结果面。每项独立兜空:一张表缺 / 查询挂只丢它自己那块,页面照常
 * —— 宁可留空,绝不显示 0。
 *
 * @returns 零行的结果面。
 */
export function emptyQueryResult(): EmptyQueryResult {
  return { rows: [] }
}

/**
 * 抽选表 + 冷解读三标量。冷解读的口径(设计 §4):当期分数线 vs **近 12 期同通道**的区间
 * —— 在服务端算完只带三个标量下去(histN/histMin/histMax),而不是把 400 行抽选史塞进 HTML。
 *
 * @param x 抽选原始行与下发条数上限。
 * @returns 前 N 期(每期挂好三标量)。
 */
export function toDrawsWithHistory(x: DrawsIn): PulseDraw[] {
  const groups = new Map<string, DrawDbRow[]>()
  for (const r of x.rows) {
    const k = drawGroupKeyOf(r)
    const g = groups.get(k)
    if (g == null) {
      groups.set(k, [r])
    } else {
      g.push(r)
    }
  }
  const hist = new Map<DrawDbRow, DrawHist | null>()
  for (const g of groups.values()) {
    for (let i = 0; i < g.length; i += 1) {
      const r = g[i]
      if (r != null) {
        hist.set(r, drawHistOf({ group: g, i }))
      }
    }
  }
  const out: PulseDraw[] = []
  for (const r of x.rows.slice(0, x.limit)) {
    let h = hist.get(r)
    if (h == null) {
      h = null
    }
    out.push(toPulseDraw({ r, hist: h }))
  }
  return out
}

/**
 * 抽选分组键:省 + 通道(同省同通道才算「同一条通道」,冷解读只在组内回看)。
 *
 * @param r 一期抽选原始行。
 * @returns 分组键。
 */
function drawGroupKeyOf(r: DrawDbRow): string {
  let stream = r.stream
  if (stream == null || stream === TEXT_NONE) {
    stream = r.label
  }
  if (stream == null) {
    stream = TEXT_NONE
  }
  return r.province + KEY_SEP + stream
}

/**
 * 从本期往回数 12 期(含本期):只统计有分数线的期次;有效期数不足门槛给 null
 * (样本太少的「区间」是噪音,宁可不说)。行已按日期降序,组内自然也降序。
 *
 * @param x 本组与本期在组内的位置。
 * @returns 期数与区间;样本不足则 null。
 */
function drawHistOf(x: DrawHistIn): DrawHist | null {
  const scores: number[] = []
  for (const r of x.group.slice(x.i, x.i + HIST_WINDOW)) {
    if (r.score != null) {
      scores.push(r.score)
    }
  }
  if (scores.length < HIST_MIN_N) {
    return null
  }
  return { n: scores.length, min: Math.min(...scores), max: Math.max(...scores) }
}

/**
 * 洗一期抽选:各格照实兜空,数值列保 null(官方没公布不折 0)。
 *
 * @param x 这一期原始行与它的回看三标量。
 * @returns 一期抽选。
 */
function toPulseDraw(x: PulseDrawIn): PulseDraw {
  let histN: number | null = null
  let histMin: number | null = null
  let histMax: number | null = null
  if (x.hist != null) {
    histN = x.hist.n
    histMin = x.hist.min
    histMax = x.hist.max
  }
  let streamZh = TEXT_NONE
  if (x.r.stream_zh != null) {
    streamZh = x.r.stream_zh
  }
  return {
    date: String(x.r.draw_date),
    province: textOf(x.r.province),
    stream: textOf(x.r.stream),
    streamZh,
    label: textOf(x.r.label),
    score: numOrNullOf(x.r.score),
    invitations: numOrNullOf(x.r.invitations),
    histN,
    histMin,
    histMax,
  }
}

/**
 * 库里的字符串格 → 显示串(官方没写保空串)。
 *
 * @param v 库值。
 * @returns 显示串。
 */
function textOf(v: string | null): string {
  if (v == null) {
    return TEXT_NONE
  }
  return v
}

/**
 * 库里的数值格 → 数值。🔴 官方可空的数值必须保 null —— 折 0 = 替官方编数。
 *
 * @param v 库值。
 * @returns 数值;没有则 null。
 */
function numOrNullOf(v: number | null): number | null {
  if (v == null) {
    return null
  }
  return Number(v)
}

/**
 * 洗一整张抽选表。
 *
 * @param x 抽选行、两个取词函数与界面语言。
 * @returns 展示行。
 */
export function toDrawCellRows(x: DrawCellRowsIn): DrawCellRow[] {
  const out: DrawCellRow[] = []
  for (let i = 0; i < x.rows.length; i += 1) {
    const r = x.rows[i]
    if (r != null) {
      out.push(toDrawCellRow({ r, i, t: x.t, tEn: x.tEn, lang: x.lang }))
    }
  }
  return out
}

/**
 * 洗一期抽选:官方英文名主文案 + 界面语言译名灰注(与旧版同口径),外加冷解读。
 *
 * @param x 这一期与洗行要的上下文。
 * @returns 展示行。
 */
export function toDrawCellRow(x: DrawCellRowIn): DrawCellRow {
  let prog = x.r.province
  if (x.r.province === PROV_FED) {
    prog = TAG_FED
  }
  return {
    key: String(x.i),
    date: ymd(x.r.date),
    prog,
    main: drawMainOf(x),
    note: drawNoteOf(x),
    score: numTextOf(x.r.score),
    invitations: numTextOf(x.r.invitations),
    read: drawReadOf(x),
  }
}

/**
 * 抽选主文案:联邦走英文类别名,省抽选走官方通道名(没有就退回类别键)。
 *
 * @param x 这一期与两个取词函数。
 * @returns 主文案。
 */
function drawMainOf(x: DrawCellRowIn): string {
  if (x.r.province === PROV_FED) {
    return eeKeyDisplay({ t: x.tEn, key: x.r.label })
  }
  if (x.r.stream !== TEXT_NONE) {
    return x.r.stream
  }
  return x.r.label
}

/**
 * 抽选灰注:界面语言的译名。#280 —— 省抽选优先用 ETL 批译
 * (data/processed/draw_stream_zh.json → pnp_draws.stream_zh,覆盖全部 41 个 distinct 流名);
 * 缺列 / 还没翻到的 stream 回退旧的手工小表(17 条,覆盖有限但零延迟)。
 * 联邦走界面语言的类别名,与主文案同文时不出。
 *
 * @param x 这一期与两个取词函数。
 * @returns 灰注;不出时空串。
 */
function drawNoteOf(x: DrawCellRowIn): string {
  if (x.lang === LANG_EN) {
    return TEXT_NONE
  }
  if (x.r.province !== PROV_FED) {
    if (x.lang === LANG_ZH && x.r.streamZh !== TEXT_NONE) {
      return x.r.streamZh
    }
    return drawStreamNote({ stream: x.r.stream, lang: drawLangOf(x.lang) })
  }
  const zh = eeKeyDisplay({ t: x.t, key: x.r.label })
  if (zh === drawMainOf(x)) {
    return TEXT_NONE
  }
  return zh
}

/**
 * 界面语言 → 通道译名小表认得的语言码(表外的语言当英文,与它自己的默认同义)。
 *
 * @param lang 界面语言。
 * @returns 语言码。
 */
function drawLangOf(lang: string): DrawLang {
  if (lang === LANG_ZH) {
    return LANG_ZH
  }
  if (lang === LANG_KO) {
    return LANG_KO
  }
  return LANG_EN
}

/**
 * 冷解读:当期分数线 vs 近 12 期同通道区间(服务端算好的三标量填槽)。
 * 样本不足 → 不出这句(整格留空,不编一句话)。
 *
 * @param x 这一期与取词函数。
 * @returns 冷解读;样本不足时空串。
 */
function drawReadOf(x: DrawCellRowIn): string {
  if (x.r.histN == null || x.r.histMin == null || x.r.histMax == null) {
    return TEXT_NONE
  }
  return x.t('pulse.dr.note', { n: x.r.histN, min: numOf(x.r.histMin), max: numOf(x.r.histMax) })
}

/**
 * 抽选表的列组。列宽写死(冷解读吃最宽一列,它是这张表的结论);百分比固定布局永不横滚。
 * 2026-08-11(Frank「都改成一套」):自造裸 table → 公共 Table(bare = 外面那层就是卡壳)。
 *
 * @param x 取词函数。
 * @returns 列组。
 */
export function drawColsOf(x: DrawColsIn): StartCol<DrawCellRow>[] {
  return [
    { key: COL_DATE, label: x.t('home.dr.date'), width: W_DATE, render: drawDateOf },
    { key: COL_PROG, label: x.t('home.dr.prog'), width: W_PROG, render: ProgCell },
    { key: COL_STREAM, label: x.t('home.dr.stream'), width: W_STREAM, render: StreamCell },
    { key: COL_SCORE, label: x.t('home.dr.score'), width: W_SCORE, render: drawScoreOf },
    { key: COL_INV, label: x.t('home.dr.inv'), width: W_INV, render: drawInvOf },
    { key: COL_READ, label: x.t('pulse.dr.read'), width: W_READ, render: ReadCell },
  ]
}

/**
 * 抽选日期单元格。
 *
 * @param r 这一期。
 * @returns 日期。
 */
export function drawDateOf(r: DrawCellRow): string {
  return r.date
}

/**
 * 分数线单元格。
 *
 * @param r 这一期。
 * @returns 分数线文案。
 */
export function drawScoreOf(r: DrawCellRow): string {
  return r.score
}

/**
 * 邀请数单元格。
 *
 * @param r 这一期。
 * @returns 邀请数文案。
 */
export function drawInvOf(r: DrawCellRow): string {
  return r.invitations
}

/**
 * 抽选表的行身份(同省同通道同日可能有多期,只有位置能当身份)。
 *
 * @param r 这一期。
 * @returns 行键。
 */
export function drawRowKeyOf(r: DrawCellRow): string {
  return r.key
}

/**
 * 抽选卡一条的类:基座 + 末条无分隔线。
 *
 * @param x 是不是最后一条。
 * @returns className。
 */
export function drawRowClsOf(x: DrawRowClsIn): string {
  const cls = [cssOf(css.drawRow)]
  if (x.last) {
    cls.push(cssOf(css.drawRowLast))
  }
  return joinCls(cls)
}


/**
 * 雇主段的分表(按身份档)。三分表并成一份(按雇主名去重)后按档筛、按档排、按行业分:
 * 没工签档 = 近一年 LMIA 获批 / AIP 指定 / RCIP 指定 之一,按近一年 LMIA、在招降序;
 * PGWP 档 = 有 TEER 0-3 在招职业,按把脉结论(可走 → 待核 → 差门槛 → 只能攒 CEC)再按在招降序。
 * 行业 = 该雇主在招岗 NOC 的大类多数归组(companies.industry 两万家是空的,不靠它);归不到组的不出。
 *
 * @param x 三分表、分类映射、职业名表、RCIP 集合与身份档。
 * @returns 按 IND_KEYS 序的分表(凑不出一行的组不出)。
 */
export function empSecsOf(x: EmpSecsIn): EmpSec[] {
  const byInd = new Map<string, EmpCellRow[]>()
  for (const r of unionSponsorRows(x.sponsor)) {
    if (isValuableEmp({ r, kind: x.kind, extra: x.extra, nocInfo: x.nocInfo }) === false) {
      continue
    }
    const ind = indOfNocs({ nocs: r.nocs, nocCat: x.nocCat })
    if (ind === TEXT_NONE) {
      continue
    }
    const cell = toEmpCellRow({
      r, t: x.t, ind, nocInfo: x.nocInfo, nocCat: x.nocCat, extra: x.extra, lang: x.lang, pick: PILOT_NONE,
    })
    const arr = byInd.get(ind)
    if (arr == null) {
      byInd.set(ind, [cell])
    } else {
      arr.push(cell)
    }
  }
  const out: EmpSec[] = []
  for (const key of IND_KEYS) {
    const rows = byInd.get(key)
    if (rows == null || rows.length === 0) {
      continue
    }
    if (x.kind === ID_NOWP) {
      rows.sort(byLmiaThenOpen)
    } else {
      rows.sort(byPulseThenOpen)
    }
    out.push({ key, title: x.t(KEY_IND_HEAD + key), rows })
  }
  return out
}

/**
 * 四分表并成一份,按雇主名去重(一家可能同时在 LMIA 表与紧缺表;pilot 表 2026-09-06 加)。
 *
 * @param sponsor 三分表。
 * @returns 去重后的事实行。
 */
function unionSponsorRows(sponsor: SponsorBoards): SponsorRowList {
  const seen = new Set<string>()
  const out: SponsorRowList = []
  for (const g of [sponsor.lmia, sponsor.named, sponsor.aip, sponsor.pilot]) {
    for (const r of g.top) {
      if (seen.has(r.name) === false) {
        seen.add(r.name)
        out.push(r)
      }
    }
  }
  return out
}

/**
 * 这家雇主够不够格进该身份档的表(Frank「列出在招的有价值的雇主才有意义」):
 * 三试点指定雇主不进行业表(它们各有自己的表,Frank「不要和一般的走 pnp 的雇主放到一起」);
 * 没工签档要有近一年 LMIA;PGWP 档要有 TEER 0-3 在招职业。
 *
 * @param x 事实行、身份档、RCIP 集合与职业表。
 * @returns 够格与否。
 */
function isValuableEmp(x: ValuableIn): boolean {
  if (isDesignated({ r: x.r, extra: x.extra })) {
    return false
  }
  if (x.kind === ID_NOWP) {
    return x.r.lmia4q > 0
  }
  return teer03Of({ nocs: x.r.nocs, nocInfo: x.nocInfo }) > 0
}

/**
 * 一家雇主归哪个行业组:数它在招岗 NOC 的大类,票多的组赢;一个 NOC 都归不到给 ''。
 *
 * @param x NOC 清单与分类映射。
 * @returns 行业组键或 ''。
 */
function indOfNocs(x: IndOfIn): string {
  const votes = new Map<string, number>()
  for (const n of x.nocs) {
    const cat = x.nocCat.get(n)
    if (cat == null) {
      continue
    }
    const key = indKeyOfBroad(cat.broad)
    if (key === TEXT_NONE) {
      continue
    }
    const cur = votes.get(key)
    if (cur == null) {
      votes.set(key, 1)
    } else {
      votes.set(key, cur + 1)
    }
  }
  let best = TEXT_NONE
  let bestN = 0
  for (const key of IND_KEYS) {
    const n = votes.get(key)
    if (n != null && n > bestN) {
      best = key
      bestN = n
    }
  }
  return best
}

/**
 * 本站大类 → 行业组键;不在任何组给 ''。
 *
 * @param broad 本站大类。
 * @returns 行业组键或 ''。
 */
function indKeyOfBroad(broad: string): string {
  for (const key of IND_KEYS) {
    const broads = IND_BROADS[key]
    if (broads != null && broads.includes(broad)) {
      return key
    }
  }
  return TEXT_NONE
}

/**
 * 没工签档排序:近半年 LMIA 获批降序,再近一年,同数按在招降序(2026-09-05 Frank:紧缩之后一年前的记录不代表现在)。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 比较结果。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byLmiaThenOpen(a: EmpCellRow, b: EmpCellRow): number {
  const by2q = b.lmia2q - a.lmia2q
  if (by2q !== 0) {
    return by2q
  }
  const by4q = b.lmia4q - a.lmia4q
  if (by4q !== 0) {
    return by4q
  }
  return b.open - a.open
}

/**
 * PGWP 档排序:把脉结论权小在前(可走 → 待核 → 差门槛 → 只能攒 CEC),同档按在招降序。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 比较结果。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byPulseThenOpen(a: EmpCellRow, b: EmpCellRow): number {
  const byRank = pulseRankOf(a.pulse) - pulseRankOf(b.pulse)
  if (byRank !== 0) {
    return byRank
  }
  return b.open - a.open
}

/**
 * 把脉结论 → 排序权;表里没有的键沉底。
 *
 * @param pulse 结论键。
 * @returns 排序权。
 */
function pulseRankOf(pulse: string): number {
  const r = PULSE_RANK[pulse]
  if (r == null) {
    return IND_KEYS.length
  }
  return r
}

/**
 * 事实行 → 雇主表展示行(值级清洗全在这里:文案、胶囊、链接、门槛判定、把脉结论)。
 *
 * @param x 事实行、取词函数、行业组、职业表、分类映射与 RCIP 集合。
 * @returns 展示行。
 */
function toEmpCellRow(x: EmpCellRowIn): EmpCellRow {
  const r = x.r
  const cls = pillClsOf(cssOf(css.pillProv))
  const nocs = empNocsOf({ r, pick: x.pick })
  const open = empOpenCountOf({ r, pick: x.pick })
  const teer03 = teer03Of({ nocs, nocInfo: x.nocInfo })
  const key = r.name.toLowerCase()
  const designated = isDesignated({ r, extra: x.extra })
  const pulse = pulseOf({ teer03, named: r.named, state: r.verdict.state, designated })
  const briefText = briefOf({ briefs: x.extra.briefs, key, lang: x.lang })
  return {
    key: r.name,
    name: displayNameOf(r.name),
    alias: aliasOf({ r, lang: x.lang }),
    chainText: chainTextOf({ t: x.t, chain: r.chain, pick: x.pick }),
    chainTip: x.t(KEY_CHAIN_TIP),
    jobsHref: empJobsHrefOf({ r, pick: x.pick }),
    companyHref: URL_COMPANY_HEAD + r.slug,
    open,
    openText: numOf(open),
    hiringOcc: hiringOccOf({ nocs, ind: x.ind, nocInfo: x.nocInfo, nocCat: x.nocCat, cls }),
    hiringMoreText: hiringMoreOf({ t: x.t, n: nocs.length }),
    named: r.named,
    aip: r.aip,
    rcip: x.extra.rcip.has(key),
    fcip: x.extra.fcip.has(key),
    brief: briefText.main,
    briefNote: briefText.note,
    flagCls: cls,
    teer03,
    lmia2q: r.lmia2q,
    lmia2qText: countOrDashOf(r.lmia2q),
    lmia4q: r.lmia4q,
    lmia4qText: countOrDashOf(r.lmia4q),
    verdictText: verdictTextOf({ v: r.verdict, t: x.t }),
    sectorText: x.t(KEY_SECTOR_HEAD + sectorKeyOf(r.sector)),
    pulse,
    actJobsText: x.t('pulse.act.jobs'),
    actCompanyText: x.t('pulse.act.company'),
    actBtnCls: actBtnClsOf(),
    onView: trackEmpClick,
  }
}

/**
 * 连锁记号:试点表里连锁雇主给「连锁」,本地雇主与行业表的行给 ''(2026-09-06 Frank 拍板合表挂胶囊)。
 *
 * @param x 取词函数、连锁与否与试点键。
 * @returns 记号文案或 ''。
 */
function chainTextOf(x: ChainTextIn): string {
  if (x.pick === PILOT_NONE || x.chain === false) {
    return TEXT_NONE
  }
  return x.t(KEY_CHAIN)
}

/**
 * 表里用的 NOC 清单:试点表只列该试点岗(AIP = 大西洋、TEER 0-4;RCIP / FCIP = 社区内 + 指定雇主)的职业,
 * 行业表列全部在招岗的(2026-09-05 Frank「现在看着只要去 tim hortons 打工就能走 AIP 稳拿 PR 一样」)。
 *
 * @param x 事实行与试点键。
 * @returns NOC 清单。
 */
function empNocsOf(x: PilotPickIn): string[] {
  if (x.pick === PILOT_KEY_AIP) {
    return x.r.nocsAip
  }
  if (x.pick === PILOT_KEY_RCIP) {
    return x.r.nocsRcip
  }
  if (x.pick === PILOT_KEY_FCIP) {
    return x.r.nocsFcip
  }
  return x.r.nocs
}

/**
 * 表里用的在招数:试点表只算该试点岗(排序也按它),行业表全国在招。
 *
 * @param x 事实行与试点键。
 * @returns 在招数。
 */
function empOpenCountOf(x: PilotPickIn): number {
  if (x.pick === PILOT_KEY_AIP) {
    return x.r.openJobsAip
  }
  if (x.pick === PILOT_KEY_RCIP) {
    return x.r.openJobsRcip
  }
  if (x.pick === PILOT_KEY_FCIP) {
    return x.r.openJobsFcip
  }
  return x.r.openJobs
}

/**
 * 「看岗位」链接:职位板按雇主名搜;AIP 表的行带 AIP 筛选(点进去与「在招」同数),RCIP / FCIP 表的行带
 * 试点社区筛选(职位板没有按单个试点筛的参数,任一试点社区的岗都出),行业表全国搜。
 *
 * @param x 事实行与试点键。
 * @returns 链接。
 */
function empJobsHrefOf(x: PilotPickIn): string {
  const base = URL_HOME_Q_HEAD + encodeURIComponent(x.r.name)
  if (x.pick === PILOT_KEY_AIP) {
    return base + URL_AIP_TAIL
  }
  if (x.pick === PILOT_KEY_RCIP || x.pick === PILOT_KEY_FCIP) {
    return base + URL_PILOT_TAIL
  }
  return base
}

/**
 * TEER 0-3 在招职业数(按 NOC 去重;主图没到 / 官方没标 TEER 的不计)。
 *
 * @param x NOC 清单与职业表。
 * @returns 职业数。
 */
function teer03Of(x: Teer03In): number {
  let n = 0
  for (const noc of x.nocs) {
    const info = x.nocInfo.get(noc)
    if (info != null && info.teer != null && info.teer <= TEER_PNP_MAX) {
      n += 1
    }
  }
  return n
}

/**
 * PGWP 档把脉规则(模板 + 库内事实,不上 LLM;只用来排序):三试点指定 → 可走;
 * 没有 TEER 0-3 在招职业 → 只能攒 CEC;有但岗位不在省清单 → 只能攒 CEC;
 * 在清单且雇主门槛达标或公共部门 → 省提名可走;门槛差项 → 差门槛;门槛没核到 → 省提名待核。
 *
 * @param x 三格事实。
 * @returns 结论键。
 */
function pulseOf(x: PulseIn2): string {
  if (x.designated) {
    return PULSE_OK
  }
  if (x.teer03 === 0 || x.named === false) {
    return PULSE_CEC
  }
  if (x.state === VERDICT_MET || x.state === VERDICT_PUBLIC) {
    return PULSE_OK
  }
  if (x.state === VERDICT_SHORT) {
    return PULSE_SHORT
  }
  return PULSE_CHECK
}

/**
 * 在招职业胶囊:本行业组的职业排前,取前 HIRING_OCC_MAX 个;职业表里没有的(主图没到)跳过。
 *
 * @param x NOC 清单、行业组、职业表、分类映射与胶囊类。
 * @returns 胶囊清单。
 */
function hiringOccOf(x: HiringOccIn): StartPill[] {
  const broads = IND_BROADS[x.ind]
  const first: string[] = []
  const rest: string[] = []
  for (const n of x.nocs) {
    const cat = x.nocCat.get(n)
    if (cat != null && broads != null && broads.includes(cat.broad)) {
      first.push(n)
    } else {
      rest.push(n)
    }
  }
  const out: StartPill[] = []
  for (const n of first.concat(rest)) {
    if (out.length >= HIRING_OCC_MAX) {
      break
    }
    const info = x.nocInfo.get(n)
    if (info != null) {
      out.push({ key: n, text: info.name, cls: x.cls })
    }
  }
  return out
}

/**
 * 「等 N 个」文案:职业数超过胶囊数才出,否则 ''。
 *
 * @param x 取词函数与职业总数。
 * @returns 文案或 ''。
 */
function hiringMoreOf(x: HiringMoreIn): string {
  if (x.n > HIRING_OCC_MAX) {
    return x.t('pulse.nocMore', { n: x.n })
  }
  return TEXT_NONE
}

/**
 * 计数 → 文案;0 给 DASH_MARK(没有就画杠,不显示 0)。
 *
 * @param n 计数。
 * @returns 文案。
 */
function countOrDashOf(n: number): string {
  if (n <= 0) {
    return DASH_MARK
  }
  return numOf(n)
}

/**
 * 雇主类别 → 文案键尾:federal / government / public 原样,空 = 私营企业。
 *
 * @param sector 数据层的类别标注。
 * @returns 文案键尾。
 */
function sectorKeyOf(sector: string): string {
  if (sector === SECTOR_GOVERNMENT || sector === SECTOR_PUBLIC || sector === SECTOR_FEDERAL) {
    return sector
  }
  return SECTOR_PRIVATE
}

/**
 * 雇主门槛判定 → 文案:达标 / 差{年限、雇员数} / 待核 / 公共部门(B4 判定,文案键与 employers 桶同一套)。
 *
 * @param x 判定与取词函数。
 * @returns 文案。
 */
function verdictTextOf(x: VerdictTextIn): string {
  if (x.v.state === VERDICT_PUBLIC) {
    return DASH_MARK
  }
  if (x.v.state === VERDICT_SHORT) {
    const items: string[] = []
    for (const factor of x.v.failed) {
      items.push(x.t(KEY_VERDICT_FACTOR_HEAD + factor))
    }
    return x.t(KEY_VERDICT_HEAD + VERDICT_SHORT, { items: items.join(SEP_LIST) })
  }
  return x.t(KEY_VERDICT_HEAD + x.v.state)
}

/**
 * NOC → 职业名与 TEER(主图全国行;中文取短名,没短名退全名)。
 *
 * @param x 主图与语言。
 * @returns 映射;主图没到给空表。
 */
export function nocInfoOf(x: NocInfoIn): NocInfoMap {
  const m: NocInfoMap = new Map()
  for (const o of x.natOcc) {
    const info: NocInfo = { name: occMainOf({ o, lang: x.lang }), teer: o.teer }
    m.set(o.noc, info)
  }
  return m
}

/**
 * 雇主表的列(按表种)。试点表 = 雇主 / 主营业务 / 在招职业 / 在招 / 操作(省份列 09-05 Frank「没有意义」撤);
 * 有工签档 = 雇主 / 主营业务 / 雇主门槛 / 在招职业 / 在招 / 操作(把脉、TEER 0-3 职业数、岗位在省清单三列
 * 2026-09-05 Frank「这一列有意义吗」撤:进表的都有 TEER 0-3 职业,把脉结论只用来排序,可走的在前);
 * 没工签档 = 雇主 / 业务 / 近半年 LMIA / 在招职业 / 在招 / 操作(入选看近一年,列显近半年,
 * 批过但停了的显示杠;把脉列撤:进表的都有记录,
 * 2026-09-05 Frank「这个是没用的字段」)。一格一个事实。
 *
 * @param x 取词函数与身份档。
 * @returns 列定义。
 */
export function empColsOf(x: EmpColsIn): StartCol<EmpCellRow>[] {
  const name: StartCol<EmpCellRow> = {
    key: COL_EMP, label: x.t('de.colName'), sort: empNameSortOf, render: EmpNameCell,
  }
  const hiring: StartCol<EmpCellRow> = { key: COL_HIRING_OCC, label: x.t('pulse.col.hiringOcc'), render: EmpHiringCell }
  const open: StartCol<EmpCellRow> = {
    key: COL_OPEN, label: x.t('pulse.col.open'), nowrap: true, sort: empOpenSortOf, render: empOpenOf,
  }
  const act: StartCol<EmpCellRow> = {
    key: COL_ACT, label: x.t('col.actions'), nowrap: true, width: W_EMP_ACT, render: EmpActCell,
  }
  const biz: StartCol<EmpCellRow> = { key: COL_BIZ, label: x.t('pulse.col.biz'), render: EmpBriefCell }
  const sector: StartCol<EmpCellRow> = {
    key: COL_SECTOR, label: x.t('pulse.col.sector'), nowrap: true, render: empSectorOf,
  }
  if (x.kind === TABLE_PILOT) {
    return [
      name,
      biz,
      sector,
      hiring,
      open,
      act,
    ]
  }
  if (x.kind === ID_NOWP) {
    return [
      name,
      biz,
      sector,
      { key: COL_LMIA_2Q, label: x.t('se.col.w2'), nowrap: true, sort: empLmia2qSortOf, render: empLmia2qOf },
      hiring,
      open,
      act,
    ]
  }
  return [
    name,
    biz,
    sector,
    { key: COL_VERDICT, label: x.t('se.col.verdict'), nowrap: true, render: empVerdictOf },
    hiring,
    open,
    act,
  ]
}

/**
 * 雇主表的行键。
 *
 * @param r 一行。
 * @returns 行键。
 */
export function empRowKeyOf(r: EmpCellRow): string {
  return r.key
}

/**
 * 雇主名排序键。
 *
 * @param r 一行。
 * @returns 雇主名。
 */
function empNameSortOf(r: EmpCellRow): string {
  return r.name
}

/**
 * 在招排序键。
 *
 * @param r 一行。
 * @returns 在招数。
 */
function empOpenSortOf(r: EmpCellRow): number {
  return r.open
}

/**
 * 在招格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
function empOpenOf(r: EmpCellRow): string {
  return r.openText
}

/**
 * 近半年 LMIA 排序键。
 *
 * @param r 一行。
 * @returns 获批数。
 */
function empLmia2qSortOf(r: EmpCellRow): number {
  return r.lmia2q
}

/**
 * 近半年 LMIA 格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
function empLmia2qOf(r: EmpCellRow): string {
  return r.lmia2qText
}

/**
 * 雇主类别格(哑:行上已算好文案)。
 *
 * @param r 一行。
 * @returns 类别文案。
 */
function empSectorOf(r: EmpCellRow): string {
  return r.sectorText
}

/**
 * 雇主门槛格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
function empVerdictOf(r: EmpCellRow): string {
  return r.verdictText
}

/**
 * 点了雇主表的「看岗位」(沿用 se-view-jobs,已在第一方白名单)。
 *
 * @returns 无。
 */
function trackEmpClick(): void {
  track(TRACK_EMP)
}

/**
 * 操作钮的类:button 桶 mini 档(与职位板操作列同一颗钮,2026-09-05 Frank「按钮样式不能全站统一吗」)。
 *
 * @returns 类名。
 */
export function actBtnClsOf(): string {
  return btnClsOf({ kind: MINI_BTN_KIND, sm: false, lg: false, active: false, className: null })
}

/**
 * 切身份档的手柄工厂:每个胶囊一只。
 *
 * @param x 落档函数。
 * @returns 工厂。
 */
export function makeKindPick(x: KindPickIn): KindPickFn {
  return function pickOf(k: EmpKind): ClickFn {
    return function pick(): void {
      x.setKind(k)
    }
  }
}

/**
 * 身份档胶囊的清单(顺序即胶囊顺序)。
 *
 * @param t 取词函数。
 * @returns 两档的键与文案。
 */
export function kindChipsOf(t: TFn): KindChip[] {
  return [
    { key: ID_NOWP, text: t(KEY_ID_HEAD + ID_NOWP) },
    { key: ID_PGWP, text: t(KEY_ID_HEAD + ID_PGWP) },
  ]
}

/**
 * 社区试点(RCIP / FCIP)指定雇主名与担保雇主的交集(小写;名单本身两千多家不下发,只带碰上的)。
 *
 * @param x 名单原始行、担保雇主行与认哪个试点。
 * @returns 交集里的雇主名(小写)。
 */
function pilotNamesOf(x: PilotNamesIn): string[] {
  const all = new Set<string>()
  for (const r of x.rows) {
    if (r.source.includes(x.pilot)) {
      all.add(r.name)
    }
  }
  const out: string[] = []
  for (const s of x.sponsorRows) {
    const key = s.name.toLowerCase()
    if (all.has(key)) {
      out.push(key)
    }
  }
  return out
}

/**
 * 担保雇主的公司简介(名小写 → 简介);没简介的不进表。
 *
 * @param x 简介原始行与担保雇主行。
 * @returns 映射(对象,进 SSR 契约)。
 */
function briefsOf(x: BriefsIn): Record<string, CompanyBrief> {
  const all = new Map<string, CompanyBrief>()
  for (const r of x.rows) {
    all.set(r.name, { en: r.brief, zh: translationOf(r.brief_zh), ko: translationOf(r.brief_ko) })
  }
  const out: Record<string, CompanyBrief> = {}
  for (const s of x.sponsorRows) {
    const key = s.name.toLowerCase()
    const b = all.get(key)
    if (b != null) {
      out[key] = b
    }
  }
  return out
}

/**
 * 译文列(中/韩同用):库里 NULL 给 ''。
 *
 * @param zh 译文或 null。
 * @returns 译文或 ''。
 */
function translationOf(zh: string | null): string {
  if (zh == null) {
    return TEXT_NONE
  }
  return zh
}

/**
 * 简介格文案:英文原文作主文案,中/韩界面有译文挂译文灰注(2026-09-05 Frank「改成中英双语的吗」→
 * 「这两个保持一致」「先英文再中文」:与名字格同形,英文主、界面语言注);没译文时只英文;没有给 DASH_MARK 无注。
 *
 * @param x 简介表与名(小写)。
 * @returns 主文案 + 灰注。
 */
function briefOf(x: BriefOfIn): BriefTextOut {
  const b = x.briefs.get(x.key)
  if (b == null) {
    return { main: DASH_MARK, note: TEXT_NONE }
  }
  if (x.lang === LANG_ZH && b.zh !== TEXT_NONE) {
    return { main: whatOf(b.en), note: whatOf(b.zh) }
  }
  if (x.lang === LANG_KO && b.ko !== TEXT_NONE) {
    return { main: whatOf(b.en), note: whatOf(b.ko) }
  }
  return { main: whatOf(b.en), note: TEXT_NONE }
}

/**
 * AI 简介里只取「做什么」那一段:简介是 [WHAT] … [BASE] … [SIZE] … [FOUNDED] … [NOTE] … 五段串在一起的
 * (公司信息批的落库格式),主营业务一列只显示 [WHAT] 到下一个标记之间的文字;没有标记的简介原样给。
 * ⚠️ 展示层的权宜:正解是那边落库时拆成五个字段,拆了这里退役。
 *
 * @param brief 简介全文。
 * @returns 主营业务一段。
 */
function whatOf(brief: string): string {
  const start = brief.indexOf(BRIEF_TAG_WHAT)
  if (start < 0) {
    return brief.trim()
  }
  const body = brief.slice(start + BRIEF_TAG_WHAT.length)
  const next = body.search(BRIEF_TAG_RE)
  if (next < 0) {
    return body.trim()
  }
  return body.slice(0, next).trim()
}

/**
 * 是不是 AIP / RCIP / FCIP 三试点之一的指定雇主。
 *
 * @param x 事实行与试点两集合。
 * @returns 指定与否。
 */
function isDesignated(x: DesignatedIn): boolean {
  const key = x.r.name.toLowerCase()
  return x.r.aip || x.extra.rcip.has(key) || x.extra.fcip.has(key)
}

/**
 * 三试点指定雇主表(AIP / RCIP / FCIP 各一张,在招的;不分身份档不分行业,按在招降序;每张在招只算该试点的岗;
 * 连锁雇主名旁挂记号,不再拆表 —— 2026-09-05 曾拆本地 / 连锁两张,09-06 Frank 拍板合回)。
 *
 * @param x 四分表、分类映射、职业表与试点集合。
 * @returns 三张表(凑不出一行的不出)。
 */
export function pilotSecsOf(x: PilotSecsIn): EmpSec[] {
  const rows = unionSponsorRows(x.sponsor)
  const out: EmpSec[] = []
  for (const pilot of PILOT_KEYS) {
    const cells = pilotCellsOf({ x, rows, pilot })
    if (cells.length === 0) {
      continue
    }
    cells.sort(byOpenDescEmp)
    out.push({ key: pilot, title: x.t(KEY_PILOT_HEAD + pilot), rows: cells })
  }
  return out
}

/**
 * 一张试点表的展示行:有该试点在招岗的雇主。
 *
 * @param x 试点表入参、事实行与试点键。
 * @returns 展示行(未排序)。
 */
function pilotCellsOf(x: PilotCellsIn): EmpCellRow[] {
  const cells: EmpCellRow[] = []
  for (const r of x.rows) {
    if (inPilotOf({ r, pilot: x.pilot, extra: x.x.extra }) === false) {
      continue
    }
    const ind = indOfNocs({ nocs: r.nocs, nocCat: x.x.nocCat })
    cells.push(toEmpCellRow({
      r,
      t: x.x.t,
      ind,
      nocInfo: x.x.nocInfo,
      nocCat: x.x.nocCat,
      extra: x.x.extra,
      lang: x.x.lang,
      pick: x.pilot,
    }))
  }
  return cells
}

/**
 * 这家雇主进不进该试点的表:有没有该试点的在招岗(AIP 岗 / RCIP 岗 / FCIP 岗,全是岗级事实;
 * 2026-09-06 起 RCIP / FCIP 不再按名单交集 —— 名单交集只说明雇主名在某社区名单上,
 * 岗未必在那个社区,挂出来的在招数是全国数)。
 *
 * @param x 事实行、试点键与集合。
 * @returns 进不进。
 */
function inPilotOf(x: InPilotIn): boolean {
  if (x.pilot === PILOT_KEY_AIP) {
    return x.r.aip
  }
  if (x.pilot === PILOT_KEY_RCIP) {
    return x.r.openJobsRcip > 0
  }
  return x.r.openJobsFcip > 0
}

/**
 * 按在招降序(试点表)。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 比较结果。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byOpenDescEmp(a: EmpCellRow, b: EmpCellRow): number {
  return b.open - a.open
}

/**
 * 雇主名的显示写法:全大写的名(数据源里常见 'SASKATCHEWAN CANCER AGENCY')转成词首大写,其余原样
 * (2026-09-05 Frank「雇主名需要驼峰吧,不能全大写吧」)。⚠️ 这是展示层的权宜,名归一的正解在 etl/names,
 * 公司页与职位板还是原样 —— 公司信息批落地后这里应退役。
 *
 * @param name 原名。
 * @returns 显示名。
 */
function displayNameOf(name: string): string {
  if (name !== name.toUpperCase()) {
    return name
  }
  const words = name.split(SPACE_SEP)
  const out: string[] = []
  for (const w of words) {
    out.push(caseWordOf(w))
  }
  return out.join(SPACE_SEP)
}

/**
 * 全大写名里的一个词:短词(≤ ACRONYM_MAX 个字母,如 KFC / A&W / CDC)当缩写原样保留,
 * 公司后缀词(INC / LTD / CO …)与其余词转词首大写(2026-09-05 Frank「A&w、Kfc 这种不需要驼峰」)。
 *
 * @param w 一个词(全大写)。
 * @returns 显示写法。
 */
function caseWordOf(w: string): string {
  const bare = w.replace(NON_LETTER_RE, TEXT_NONE)
  if (bare.length <= ACRONYM_MAX && CORP_SUFFIXES.includes(bare) === false) {
    return w
  }
  const lower = w.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/**
 * 界面语言的雇主别名:中文界面取中文别名,韩文取韩文,英文界面与没别名的给 ''。
 *
 * @param x 事实行与语言。
 * @returns 别名或 ''。
 */
function aliasOf(x: AliasIn): string {
  if (x.lang === LANG_ZH) {
    return x.r.aliasZh
  }
  if (x.lang === LANG_KO) {
    return x.r.aliasKo
  }
  return TEXT_NONE
}

/**
 * 洗 macro_series 全表(2026-09-06 省份段 = 宏观统计):值缺位的行不进点集(官方缺位不折 0)。
 *
 * @param rows pg 原始行。
 * @returns 洗净的点。
 */
export function toMacroPoints(rows: MacroDbRow[]): MacroPoint[] {
  const out: MacroPoint[] = []
  for (const r of rows) {
    const p = toMacroPoint(r)
    if (p != null) {
      out.push(p)
    }
  }
  return out
}

/**
 * 洗 macro_series 一行。
 *
 * @param r pg 原始行。
 * @returns 一点;值缺位给 null。
 */
function toMacroPoint(r: MacroDbRow): MacroPoint | null {
  const value = numOrNull(r.value)
  if (value == null) {
    return null
  }
  return {
    geo: text(r.geo),
    key: text(r.key),
    period: text(r.period),
    freq: text(r.freq),
    value,
    asOf: text(r.as_of),
  }
}

/**
 * 洗 pnp_ops_stats 省级指标行。
 *
 * @param rows pg 原始行。
 * @returns 洗净的点。
 */
export function toOpsPoints(rows: OpsDbRow[]): OpsPoint[] {
  const out: OpsPoint[] = []
  for (const r of rows) {
    const p = toOpsPoint(r)
    if (p != null) {
      out.push(p)
    }
  }
  return out
}

/**
 * 洗 pnp_ops_stats 一行。
 *
 * @param r pg 原始行。
 * @returns 一点;值缺位给 null。
 */
function toOpsPoint(r: OpsDbRow): OpsPoint | null {
  const value = numOrNull(r.value)
  if (value == null) {
    return null
  }
  return {
    province: text(r.province),
    metric: text(r.metric),
    value,
    asOf: text(r.as_of),
    period: text(r.period),
  }
}

/**
 * 一个地区的两份点(宏观点按 geo、运营点按 province 各筛一遍)。
 *
 * @param x 地区码与全部点。
 * @returns 该地区的点。
 */
function geoPointsOf(x: GeoPointsIn): GeoPoints {
  const points: MacroPoint[] = []
  for (const p of x.macro) {
    if (p.geo === x.code) {
      points.push(p)
    }
  }
  const ops: OpsPoint[] = []
  for (const o of x.ops) {
    if (o.province === x.code) {
      ops.push(o)
    }
  }
  return { points, ops }
}

/**
 * 「按指标」视图:九张表,每张行 = 全国 + 十省、列 = 年 + 同比、标题下一句判词
 * (Frank 2026-09-09「每个指标一个表,分省份和年份对比」)。一张表一行都没有就不出。
 *
 * @param x 全部点与上下文。
 * @returns 指标表清单。
 */
export function indicatorGeosOf(x: MacroGeosIn): MacroGeo[] {
  const out: MacroGeo[] = []
  for (const key of IND_ORDER) {
    const geo = indGeoOf({ key, t: x.t, lang: x.lang, macro: x.macro, ops: x.ops })
    if (geo != null) {
      out.push(geo)
    }
  }
  return out
}

/**
 * PR 段的全部表:全国 PR 小表打头(2026-09-10 Frank「全国应该放到最上面吧」),其次配额表
 * (「配额 ee 是不是也都迁移到 pr」自省份段迁入;EE 已并进全国小表),后接九省各一张 PR 小表
 * (行 = 类别行,列 = 年 + 同比)—— 同日三连拍:「拆成每个省一个表」「单独列一个大项」「和省一个级别的」。
 * PR 小表首列叫「指标」;全国那张锚点沿用 pl-ind-prAll。
 *
 * @param x 取词函数、界面语言与全部点。
 * @returns 段内表清单(没数的表不出)。
 */
export function prGeosOf(x: PrGeosIn): MacroGeo[] {
  const out: MacroGeo[] = []
  const ca = prRegionGeoOf({ code: GEO_CA, t: x.t, macro: x.macro, ops: x.ops })
  if (ca != null) {
    out.push(ca)
  }
  for (const key of PR_LEAD_KEYS) {
    const geo = indGeoOf({ key, t: x.t, lang: x.lang, macro: x.macro, ops: x.ops })
    if (geo != null) {
      out.push(geo)
    }
  }
  for (const code of IND_GEO_ORDER) {
    if (code === GEO_CA) {
      continue
    }
    const geo = prRegionGeoOf({ code, t: x.t, macro: x.macro, ops: x.ops })
    if (geo != null) {
      out.push(geo)
    }
  }
  return out
}

/**
 * 一个地区的 PR 小表(2026-09-10 Frank「全国应该放到最上面吧」:全国那张提到段首、配额表其次,
 * 建单表的活从 prGeosOf 拆出来复用)。
 *
 * @param x 地区码与全部点。
 * @returns 一张小表;一行都没有给 null。
 */
function prRegionGeoOf(x: PrRegionGeoIn): MacroGeo | null {
  const gp = geoPointsOf({ code: x.code, macro: x.macro, ops: x.ops })
  const keys = prRowKeysOf(x.code)
  const bases: MacroRow[] = []
  for (const key of keys) {
    const base = macroRowOf({ key, code: x.code, t: x.t, points: gp.points, ops: gp.ops })
    if (base != null && base.latest != null) {
      bases.push(dropFutureYearsOf(base))
      for (const childKey of prFoldChildrenOf(key)) {
        const child = macroRowOf({ key: childKey, code: x.code, t: x.t, points: gp.points, ops: gp.ops })
        if (child != null && child.latest != null) {
          bases.push(withFoldParent({ row: dropFutureYearsOf(child), parent: key }))
        }
      }
    }
  }
  if (bases.length === 0) {
    return null
  }
  const year = yoyYearOf({ rows: bases })
  const rows: MacroRow[] = []
  for (const b of bases) {
    rows.push(prRowOf({ base: b, year, t: x.t }))
  }
  const years = yearsOf(rows)
  return {
    code: MK_PR_ALL + SUB_ID_SEP + x.code,
    anchor: prAnchorOf(x.code),
    name: prGeoNameOf({ code: x.code, t: x.t }),
    years,
    rows,
    yoyLabel: yoyLabelOf({ t: x.t, year }),
    keyLabel: x.t('pulse.m.key'),
    yearNotes: yearNotesOf({ rows, years }),
    recLabel: TEXT_NONE,
    formula: TEXT_NONE,
    indexed: false,
  }
}

/**
 * 折叠展开态下这张表真正上屏的行:通道细行只在父行展开时出;有细行可展的大类行配上
 * 折叠钮与当前开合态(2026-09-10 通道树批;没有细行的表原样通过 —— 全站 MacroBlock 共用)。
 *
 * @param x 全部行、开合表与翻转回调。
 * @returns 上屏行。
 */
export function foldRowsOf(x: FoldRowsIn): MacroRow[] {
  const out: MacroRow[] = []
  for (const r of x.rows) {
    if (r.parent !== TEXT_NONE && x.open[r.parent] !== true) {
      continue
    }
    if (hasFoldChildRow({ rows: x.rows, key: r.key })) {
      out.push(withFoldToggle({
        row: r,
        toggle: makeFoldFlip({ key: r.key, flip: x.flip }),
        expanded: x.open[r.key] === true,
      }))
      continue
    }
    out.push(r)
  }
  return out
}

/**
 * 表里有没有挂在该键下的通道细行(有才配折叠钮 —— 树里有名但该地区没数就不出钮)。
 *
 * @param x 全部行与父键。
 * @returns 有给 true。
 */
function hasFoldChildRow(x: HasFoldChildIn): boolean {
  for (const r of x.rows) {
    if (r.parent === x.key) {
      return true
    }
  }
  return false
}

/**
 * 折叠钮点击回调工厂(工厂体内的内嵌函数是宪法豁免形)。
 *
 * @param x 行键与翻转回调。
 * @returns 点击回调。
 */
function makeFoldFlip(x: MakeFoldFlipIn): ClickFn {
  return function onFlip() {
    x.flip(x.key)
  }
}

/**
 * 一行配上折叠钮与开合态(字段写全,不展开)。
 *
 * @param x 行、钮与开合态。
 * @returns 新行。
 */
function withFoldToggle(x: WithFoldToggleIn): MacroRow {
  return {
    key: x.row.key,
    label: x.row.label,
    localeName: x.row.localeName,
    parent: x.row.parent,
    sub: x.row.sub,
    keyCls: x.row.keyCls,
    toggle: x.toggle,
    expanded: x.expanded,
    cells: x.row.cells,
    latest: x.row.latest,
    latestYear: x.row.latestYear,
    missing: x.row.missing,
    yoy: x.row.yoy,
    yoyCls: x.row.yoyCls,
    rec: x.row.rec,
    recCls: x.row.recCls,
  }
}

/**
 * 开合表翻转一格(纯函数;禁展开,逐键复制)。
 *
 * @param x 现开合表与要翻的键。
 * @returns 新开合表。
 */
export function foldFlippedOf(x: FoldFlippedIn): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const k of Object.keys(x.prev)) {
    out[k] = x.prev[k] === true
  }
  out[x.key] = x.prev[x.key] !== true
  return out
}

/**
 * 一个大类行的通道细行键(PR_FOLD 树;不是可展开的大类给空清单)。
 *
 * @param key 行键。
 * @returns 细行键清单。
 */
function prFoldChildrenOf(key: string): string[] {
  const children = PR_FOLD[key]
  if (children == null) {
    return []
  }
  return children
}

/**
 * 一行标上折叠树里的父键并转缩进形(通道细行;字段写全,不展开)。
 *
 * @param x 行与父键。
 * @returns 新行。
 */
function withFoldParent(x: WithFoldParentIn): MacroRow {
  return {
    key: x.row.key,
    label: x.row.label,
    localeName: x.row.localeName,
    parent: x.parent,
    sub: true,
    keyCls: macroKeyClsOf({ sub: true }),
    toggle: x.row.toggle,
    expanded: x.row.expanded,
    cells: x.row.cells,
    latest: x.row.latest,
    latestYear: x.row.latestYear,
    missing: x.row.missing,
    yoy: x.row.yoy,
    yoyCls: x.row.yoyCls,
    rec: x.row.rec,
    recCls: x.row.recCls,
  }
}

/**
 * 一张 PR 小表的行键:全国 = 类别行 + 联邦两行(EE 邀请 / EE 接纳目标,2026-09-10 Frank
 * 「这两个应该合并吧」自单表并入);省 = 类别行。
 *
 * @param code 地区码。
 * @returns 行键序。
 */
function prRowKeysOf(code: string): string[] {
  if (code === GEO_CA) {
    const out: string[] = []
    for (const key of PR_ROW_KEYS) {
      out.push(key)
    }
    for (const key of PR_CA_EXTRA_KEYS) {
      out.push(key)
    }
    return out
  }
  return PR_ROW_KEYS
}

/**
 * PR 小表的锚点:全国沿用 pl-ind-prAll(二级导航「PR」胶囊落这),省带码后缀保证唯一。
 *
 * @param code 地区码。
 * @returns 锚点 id。
 */
function prAnchorOf(code: string): string {
  if (code === GEO_CA) {
    return ID_IND_HEAD + MK_PR_ALL
  }
  return ID_IND_HEAD + MK_PR_ALL + SUB_ID_SEP + code.toLowerCase()
}

/**
 * PR 小表的标题:全国取词,省用界面语言全名(标题行是本地语言,不用行内的通行短名形)。
 *
 * @param x 地区码与取词函数。
 * @returns 标题。
 */
function prGeoNameOf(x: GeoNameIn): string {
  if (x.code === GEO_CA) {
    return x.t('pulse.s4.all')
  }
  return provLabelOf({ t: x.t, code: x.code })
}

/**
 * PR 小表的一行:省块形底行照抄,配上同比格(行名就是指标名,不换)。
 *
 * @param x 底行与同比年。
 * @returns 带同比的行。
 */
function prRowOf(x: PrRowIn): MacroRow {
  const yoy = yoyCellOf({ cells: x.base.cells, year: x.year, t: x.t })
  return {
    key: x.base.key,
    label: x.base.label,
    localeName: x.base.localeName,
    parent: x.base.parent,
    sub: x.base.sub,
    keyCls: x.base.keyCls,
    toggle: x.base.toggle,
    expanded: x.base.expanded,
    cells: x.base.cells,
    latest: x.base.latest,
    latestYear: x.base.latestYear,
    missing: x.base.missing,
    yoy,
    yoyCls: yoyClsOf({ cell: yoy, key: x.base.key }),
    rec: TEXT_NONE,
    recCls: TEXT_NONE,
  }
}

/**
 * 一张指标表:逐地区按省块同一套算法出行,再改成地区行并配同比;同比年 = 全表最新的完整年。
 * 2026-09-10 Frank「这四个都是一回事」两处并表:配额表全国行 = 接纳目标(联邦不发省级配额,
 * 人头口径在译名行标明);EE 表第二行 = EE 接纳目标(PR 走 prGeosOf 每省一张小表,不走这里)。
 *
 * @param x 指标键与全部点。
 * @returns 指标表;没有一行给 null。
 */
function indGeoOf(x: IndGeoIn): MacroGeo | null {
  const bases: IndBase[] = []
  for (const code of IND_GEO_ORDER) {
    const gp = geoPointsOf({ code, macro: x.macro, ops: x.ops })
    const base = macroRowOf({ key: x.key, code, t: x.t, points: gp.points, ops: gp.ops })
    if (base != null) {
      bases.push({ code, row: base })
    }
  }
  if (bases.length === 0) {
    return null
  }
  const year = yoyYearOf({ rows: indBaseRowsOf(bases) })
  const plain: MacroRow[] = []
  for (const b of bases) {
    plain.push(indRowOf({
      base: b.row,
      code: b.code,
      name: geoNameOf({ code: b.code, t: x.t }),
      localeName: geoLocaleOf({ code: b.code, t: x.t, lang: x.lang }),
      year,
      key: x.key,
      t: x.t,
    }))
  }
  if (x.key === MK_ALLOC) {
    const target = allocTargetRowOf({ t: x.t, macro: x.macro, ops: x.ops })
    if (target != null) {
      plain.unshift(target)
    }
  }
  const rows = recRowsOf({ t: x.t, rows: plain, key: x.key })
  const years = yearsOf(rows)
  return {
    code: x.key,
    anchor: ID_IND_HEAD + x.key,
    name: x.t(KEY_MACRO_HEAD + x.key),
    years,
    rows,
    yoyLabel: yoyLabelOf({ t: x.t, year }),
    keyLabel: x.t('pulse.m.geo'),
    yearNotes: yearNotesOf({ rows, years }),
    recLabel: recLabelOf({ t: x.t, key: x.key }),
    formula: formulaOf({ t: x.t, key: x.key }),
    indexed: false,
  }
}

/**
 * 配额表的全国行 = 省提名接纳目标(2026-09-10 并表):联邦不发省级配额证书数,只发接纳目标
 * (人头口径,与省的提名证书不是一个单位 —— 2026-09-09 已注明不硬套,所以行名「全国」下
 * 用译名行位标明「省提名接纳目标(人)」,不冒充证书数)。
 *
 * @param x 取词函数与全部点。
 * @returns 全国行;没数给 null。
 */
function allocTargetRowOf(x: AllocTargetRowIn): MacroRow | null {
  const gp = geoPointsOf({ code: GEO_CA, macro: x.macro, ops: x.ops })
  const base = macroRowOf({ key: MK_PNP_TARGET, code: GEO_CA, t: x.t, points: gp.points, ops: gp.ops })
  if (base == null || base.latest == null) {
    return null
  }
  return indRowOf({
    base: dropFutureYearsOf(base),
    code: GEO_CA,
    name: x.t('pulse.s4.all'),
    localeName: x.t(KEY_MACRO_HEAD + MK_PNP_TARGET),
    year: TEXT_NONE,
    key: MK_PNP_TARGET,
    t: x.t,
  })
}

/**
 * 一行去掉未来年格(2026-09-10 Frank「这个格式」实拍:接纳目标 2027/2028 计划年把配额表
 * 年窗顶右移,九个省行在那两列全空 —— 并进省级表的全国行只保留到当前年,计划年不进这张表)。
 *
 * @param base 省块形底行。
 * @returns 只剩当前年及以前格的行。
 */
function dropFutureYearsOf(base: MacroRow): MacroRow {
  const now = thisYearOf()
  const cells: Record<string, MacroCell> = {}
  for (const y of Object.keys(base.cells)) {
    const c = base.cells[y]
    if (c != null && y <= now) {
      cells[y] = c
    }
  }
  return {
    key: base.key,
    label: base.label,
    localeName: base.localeName,
    parent: base.parent,
    sub: base.sub,
    keyCls: base.keyCls,
    toggle: base.toggle,
    expanded: base.expanded,
    cells,
    latest: latestCellOf(cells),
    latestYear: latestYearOf(cells),
    missing: base.missing,
    yoy: base.yoy,
    yoyCls: base.yoyCls,
    rec: base.rec,
    recCls: base.recCls,
  }
}

/**
 * 手机省卡的「年 × 值」迷你格:取该行有数的末几年(含进行年与计划年),年头一排、值一排
 * (2026-09-10「手机用卡片 手机不用显示图」)。
 *
 * @param r 一行。
 * @returns 年与值文案的清单(最多 CARD_YEARS 个)。
 */
export function cardPairsOf(r: MacroRow): CardPair[] {
  const years = Object.keys(r.cells).sort()
  const tail = years.slice(-CARD_YEARS)
  const out: CardPair[] = []
  for (const y of tail) {
    const c = r.cells[y]
    if (c == null) {
      continue
    }
    out.push({ year: y, text: c.text })
  }
  return out
}

/**
 * 表里的非缩进行(手机卡与趋势图用:「其中省提名」缩进行在卡上没有省名、在图上一省两线,
 * 都只留地区主行)。
 *
 * @param rows 全部行。
 * @returns 非缩进行。
 */
export function nonSubRowsOf(rows: MacroRow[]): MacroRow[] {
  const out: MacroRow[] = []
  for (const r of rows) {
    if (r.sub === false) {
      out.push(r)
    }
  }
  return out
}

/**
 * 标题下的公式行:只有竞争表有。
 *
 * @param x 取词函数与指标键。
 * @returns 公式或空串。
 */
function formulaOf(x: RecLabelIn): string {
  if (x.key === FORMULA_KEY) {
    return x.t('pulse.m.compFormula')
  }
  return TEXT_NONE
}

/**
 * 推荐列名:只有竞争表有。
 *
 * @param x 取词函数与指标键。
 * @returns 列名或空串。
 */
function recLabelOf(x: RecLabelIn): string {
  if (REC_KEYS.includes(x.key) === false) {
    return TEXT_NONE
  }
  return x.t('pulse.m.rec')
}

/**
 * 每张表的推荐列:有最新值的**省**(全国不参评)按最新值排名 —— 越低越好的指标升序、其余降序;
 * 名次在前一半「推荐」、其余「不推荐」(2026-09-10 Frank「把一般删了」,两档);只有全国一行的表不出。
 * 名次 = 比它更好的省数(并列同名次),不用比较器排序(一函数一参)。
 * 只在**最新年份一致**的省之间排(2026-09-10 Frank「这个推荐合理吗」:PE 2024 与 ON 2026 年 4 月同榜、
 * 去年用完的 100% 输给今年没用完的 69%,是拿不同年份比);年份落后的省推荐格空着。
 *
 * @param x 取词函数、行与指标键。
 * @returns 带推荐格的行。
 */
function recRowsOf(x: RecRowsIn): MacroRow[] {
  if (REC_KEYS.includes(x.key) === false) {
    return x.rows
  }
  const lower = REC_LOWER_BETTER.includes(x.key)
  const year = recYearOf(x.rows)
  const provs: MacroRow[] = []
  for (const r of x.rows) {
    if (r.latest != null && r.key !== GEO_CA && r.latestYear === year) {
      provs.push(r)
    }
  }
  const out: MacroRow[] = []
  for (const r of x.rows) {
    let rec: RecOut = { text: TEXT_NONE, cls: TEXT_NONE }
    if (r.latest != null && r.key !== GEO_CA && r.latestYear === year) {
      rec = recOfRank({ t: x.t, rank: recRankOf({ row: r, rows: provs, lower }), n: provs.length })
    }
    out.push(withRec({ row: r, rec }))
  }
  return out
}

/**
 * 参评年份 = 各省最新格年份里最大的那个(字符串比:年份四位数或「2026-04」形,同长按字典序即按时间序)。
 *
 * @param rows 地区行。
 * @returns 年份;没有省有格给空串。
 */
function recYearOf(rows: MacroRow[]): string {
  let year = TEXT_NONE
  for (const r of rows) {
    if (r.latest != null && r.key !== GEO_CA && r.latestYear > year) {
      year = r.latestYear
    }
  }
  return year
}

/**
 * 一行的名次 = 比它更好的省数(越低越好时「更好」= 值更小)。
 *
 * @param x 该行、参评行与方向。
 * @returns 名次(0 起)。
 */
function recRankOf(x: RecRankOfIn): number {
  const v = macroLatestValueOf(x.row)
  let better = 0
  for (const o of x.rows) {
    const w = macroLatestValueOf(o)
    if ((x.lower && w < v) || (x.lower === false && w > v)) {
      better = better + 1
    }
  }
  return better
}

/**
 * 一行最新格的值(没格给 0;只在已筛掉空行的排序里用)。
 *
 * @param r 一行。
 * @returns 值。
 */
function macroLatestValueOf(r: MacroRow): number {
  if (r.latest == null) {
    return 0
  }
  return r.latest.value
}

/**
 * 名次 → 推荐档(借竞争度胶囊的绿 / 红两色):前一半「推荐」,其余「不推荐」;奇数省时中位那省归前一半。
 *
 * @param x 名次与总数。
 * @returns 文案与类。
 */
function recOfRank(x: RecRankIn): RecOut {
  if (x.rank < Math.ceil(x.n * REC_HALF)) {
    return { text: x.t('pulse.r.yes'), cls: recClsOf(DIFF_EASY) }
  }
  return { text: x.t('pulse.r.no'), cls: recClsOf(DIFF_TIGHT) }
}

/**
 * 推荐胶囊的类:难度档配色再叠不折行档 —— .pill 为韩文职业名放开了折行,推荐词是短语,
 * 375px 英文界面「Not recommended」被连坐断成两截(2026-09-10 实撞),推荐胶囊单独收回 nowrap。
 *
 * @param tier 难度档。
 * @returns className。
 */
function recClsOf(tier: string): string {
  return joinCls([diffClsOf({ tier }), cssOf(css.recPill)])
}

/**
 * 一行加上推荐格(字段写全,不展开)。
 *
 * @param x 行与推荐格。
 * @returns 新行。
 */
function withRec(x: WithRecIn): MacroRow {
  return {
    key: x.row.key,
    label: x.row.label,
    localeName: x.row.localeName,
    parent: x.row.parent,
    sub: x.row.sub,
    keyCls: x.row.keyCls,
    toggle: x.row.toggle,
    expanded: x.row.expanded,
    cells: x.row.cells,
    latest: x.row.latest,
    latestYear: x.row.latestYear,
    missing: x.row.missing,
    yoy: x.row.yoy,
    yoyCls: x.row.yoyCls,
    rec: x.rec.text,
    recCls: x.rec.cls,
  }
}

/**
 * 每一年整列共用的灰注:该年有数的格全带同一个非空灰注才提到列头;有一格不同(含完整年的空注)
 * 就给空串,灰注留在各格 —— 各省截止月可能不一样,不硬统一。
 *
 * @param x 行与年份列。
 * @returns 年 → 灰注。
 */
function yearNotesOf(x: YearNotesIn): Record<string, string> {
  const out: Record<string, string> = {}
  for (const y of x.years) {
    let shared = TEXT_NONE
    let same = true
    for (const r of x.rows) {
      const c = r.cells[y]
      if (c == null) {
        continue
      }
      if (shared === TEXT_NONE) {
        shared = c.note
      }
      if (c.note !== shared) {
        same = false
      }
    }
    if (same) {
      out[y] = shared
    } else {
      out[y] = TEXT_NONE
    }
  }
  return out
}

/**
 * 成对清单里的行(算同比年用)。
 *
 * @param bases 地区 + 底行。
 * @returns 底行。
 */
function indBaseRowsOf(bases: IndBase[]): MacroRow[] {
  const out: MacroRow[] = []
  for (const b of bases) {
    out.push(b.row)
  }
  return out
}

/**
 * 省块形的一行 → 地区行:键与名换成地区,其余照抄,再配同比格。
 *
 * @param x 底行、地区与同比年。
 * @returns 地区行。
 */
function indRowOf(x: IndRowIn): MacroRow {
  const yoy = yoyCellOf({ cells: x.base.cells, year: x.year, t: x.t })
  return {
    key: x.code,
    label: x.name,
    localeName: x.localeName,
    parent: TEXT_NONE,
    sub: false,
    keyCls: x.base.keyCls,
    toggle: null,
    expanded: false,
    cells: x.base.cells,
    latest: x.base.latest,
    latestYear: x.base.latestYear,
    missing: x.base.missing,
    yoy,
    yoyCls: yoyClsOf({ cell: yoy, key: x.key }),
    rec: TEXT_NONE,
    recCls: TEXT_NONE,
  }
}

/**
 * 全表的同比年 = 各行有数年份里最新的一个(含进行年;未来年 —— 接纳目标这类计划值 —— 不算)。
 * 2026-09-10 Frank「所有的都用 26 比 25 的,也就是最新的比去年的。这个是自动更新的」:
 * 原「流量类只认完整年」口径作废,进行年累计照比(列头「至 X 月」已标口径),随年份自动走。
 *
 * @param rows 行。
 * @returns 年;一格都没有给空串。
 */
function yoyYearOf(x: YoyYearIn): string {
  const now = thisYearOf()
  let best = TEXT_NONE
  for (const r of x.rows) {
    for (const y of Object.keys(r.cells)) {
      const c = r.cells[y]
      if (c == null || y > now) {
        continue
      }
      if (best === TEXT_NONE || y > best) {
        best = y
      }
    }
  }
  return best
}

/**
 * 一行的同比格:同比年(可为进行年,2026-09-10「最新的比去年的」)对前一个完整年,
 * 相对变化取一位小数带正负号。
 *
 * @param x 年 → 格与同比年。
 * @returns 同比格;算不出给 null。
 */
function yoyCellOf(x: YoyCellIn): MacroCell | null {
  if (x.year === TEXT_NONE) {
    return null
  }
  const a = x.cells[x.year]
  const b = x.cells[String(Number(x.year) - 1)]
  if (a == null || b == null || b.note !== TEXT_NONE || b.value === 0) {
    return null
  }
  const pct = (a.value / b.value - 1) * PCT_SCALE
  return { value: pct, text: yoyTextOf({ pct, t: x.t }), note: TEXT_NONE }
}

/**
 * 同比文案:带正负号的一位小数百分数(「+1.2%」「-0.7%」);一位小数四舍五入到 0 出「持平」
 * (Frank 2026-09-10「+0.0% 这个显示有什么意义」→「持平」)。
 *
 * @param x 百分数与取词函数。
 * @returns 文案。
 */
function yoyTextOf(x: YoyTextIn): string {
  const abs = Math.abs(x.pct).toFixed(PCT_DIGITS)
  if (Number(abs) === 0) {
    return x.t('pulse.m.flat')
  }
  const body = abs + PCT_MARK
  if (x.pct < 0) {
    return SIGN_MINUS + body
  }
  return SIGN_PLUS + body
}

/**
 * 同比格的色类:持平幅度内素色,涨绿跌红(借月环比的三态类);「涨了是坏事」的指标反着给;没格给空串。
 * 算在数据里而不是单元格里取:格件 import functions、functions 又 import 格件就成环。
 *
 * @param x 同比格与指标键。
 * @returns 类名。
 */
function yoyClsOf(x: YoyClsIn): string {
  if (x.cell == null) {
    return TEXT_NONE
  }
  let signed = x.cell.value
  if (MACRO_BAD_UP_KEYS.includes(x.key)) {
    signed = -signed
  }
  return momClsOf({ mom: signed, flatDelta: Math.abs(x.cell.value) < YOY_FLAT_PCT })
}

/**
 * 同比列名(「同比 25/24」);没同比年给空串。
 *
 * @param x 取词函数与同比年。
 * @returns 列名。
 */
function yoyLabelOf(x: YoyLabelIn): string {
  if (x.year === TEXT_NONE) {
    return TEXT_NONE
  }
  const prev = String(Number(x.year) - 1)
  return x.t('pulse.m.yoy', { a: x.year.slice(-YOY_YEAR_TAIL), b: prev.slice(-YOY_YEAR_TAIL) })
}

/**
 * 地区块的显示名:全国取词,省用界面语言的全称(Frank 2026-09-06「留一个全称就行」)。
 *
 * @param x 地区码与取词函数。
 * @returns 显示名。
 */
function geoNameOf(x: GeoNameIn): string {
  if (x.code === GEO_CA) {
    return x.t('pulse.s4.all')
  }
  return provShortOf(x.code)
}

/**
 * 地区行的译名行:省给中韩界面的译名(英文界面空串),全国行不带
 * (2026-09-10 Frank「这种是不是应该统一一下」:指标表地区行改招聘对比的三格形,主名 = 通行短名)。
 *
 * @param x 地区码、取词函数与界面语言。
 * @returns 译名或空串。
 */
function geoLocaleOf(x: GeoLocaleIn): string {
  if (x.code === GEO_CA) {
    return TEXT_NONE
  }
  return provLocaleOf({ t: x.t, lang: x.lang, code: x.code })
}

/**
 * 宏观表的一行:直读键 / 派生键 / 运营键三路各取各的格。
 *
 * @param x 行键与该地区的两份点。
 * @returns 一行;一格都没有给 null。
 * 全国不适用的行(省级配额 / 已发 / 竞争 / 用尽率)整行不出;省的不适用照显「不适用」,十省不缺
 * (Frank 2026-09-09「全国如果不适用,是不是不用显示了」)。
 */
function macroRowOf(x: MacroRowIn): MacroRow | null {
  const cells = macroCellsOf(x)
  const has = Object.keys(cells).length > 0
  if (has === false && MACRO_CA_ONLY_ROWS.includes(x.key) && x.code !== GEO_CA) {
    return null
  }
  const applies = macroRowAppliesTo({ code: x.code, key: x.key })
  if (has === false && applies === false && x.code === GEO_CA) {
    return null
  }
  return {
    key: x.key,
    label: x.t(KEY_MACRO_HEAD + x.key),
    localeName: TEXT_NONE,
    parent: TEXT_NONE,
    sub: MACRO_SUB_ROWS.includes(x.key),
    keyCls: macroKeyClsOf({ sub: MACRO_SUB_ROWS.includes(x.key) }),
    toggle: null,
    expanded: false,
    cells,
    latest: latestCellOf(cells),
    latestYear: latestYearOf(cells),
    missing: macroMissingTextOf({ t: x.t, code: x.code, key: x.key, has, applies }),
    yoy: null,
    yoyCls: TEXT_NONE,
    rec: TEXT_NONE,
    recCls: TEXT_NONE,
  }
}

/**
 * 这一行对该地区适不适用(不适用 = 显「不适用」而不是「未公布」:魁省不参加省提名、全国没有省级行;
 * Frank 2026-09-09「不是 10 个省吗为什么只显示 9 个省」—— 十省一行不少)。
 *
 * @param x 地区码与行键。
 * @returns 适用给 true。
 */
function macroRowAppliesTo(x: MacroRowApplyIn): boolean {
  if (MACRO_CA_ONLY_ROWS.includes(x.key)) {
    return x.code === GEO_CA
  }
  const na = MACRO_NA_ROWS[x.code]
  if (na != null && na.includes(x.key)) {
    return false
  }
  return true
}

/**
 * 一格都没有时该显哪个词:不适用 / 未发布(官方不发或还没发,举证在 MACRO_UNPUBLISHED);本站没抓到的
 * 留白不写字 —— Frank 2026-09-09「不要写不收录,没抓到就去抓。只有未发布和不适用两种状态」;有格给空串。
 *
 * @param x 取词函数、地区码、行键与有没有格。
 * @returns 词或空串。
 */
function macroMissingTextOf(x: MacroMissingIn): string {
  if (x.has) {
    return TEXT_NONE
  }
  if (x.applies === false) {
    return x.t('pulse.m.na')
  }
  const up = MACRO_UNPUBLISHED[x.code]
  if (up != null && up.includes(x.key)) {
    return x.t('pulse.m.unreleased')
  }
  return TEXT_NONE
}

/**
 * 一行的年 → 格:运营行读 pnp_ops_stats,其余直读同名数据键(「其中」五行是 StatCan 的互斥拆分,直读即可加总)。
 * 配额行合并数(PNP+AIP)不再挂「含 AIP」注(Frank 2026-09-10「去掉 AIP 字样,知道一个总配额即可」),
 * 拆分口径仍在 pnp_allocations.json 的 c<年> 列与 note 里。
 *
 * @param x 行键与两份点。
 * @returns 年 → 格。
 */
function macroCellsOf(x: MacroRowIn): Record<string, MacroCell> {
  if (x.key === MR_ISSUED) {
    return opsCellsOf({ metrics: OPS_ISSUED_METRICS, ops: x.ops, t: x.t })
  }
  if (x.key === MR_WORK) {
    return cellsOfKey({ key: MK_WORK_ONLY, points: x.points, t: x.t })
  }
  if (x.key === MK_ALLOC) {
    return allocCellsOf({
      single: cellsOfKey({ key: MK_ALLOC, points: x.points, t: x.t }),
      incl: cellsOfKey({ key: MK_ALLOC_INCL, points: x.points, t: x.t }),
      note: TEXT_NONE,
    })
  }
  if (x.key === MR_USE_RATE) {
    return quotaUsedCellsOf({
      alloc: cellsOfKey({ key: MK_ALLOC, points: x.points, t: x.t }),
      issued: opsCellsOf({ metrics: OPS_ISSUED_CAL_METRICS, ops: x.ops, t: x.t }),
    })
  }
  if (x.key === MR_REMAINING) {
    return remainingCellsOf({
      direct: opsCellsOf({ metrics: [OPS_REMAINING], ops: x.ops, t: x.t }),
      alloc: cellsOfKey({ key: MK_ALLOC, points: x.points, t: x.t }),
      issued: opsCellsOf({ metrics: OPS_ISSUED_CAL_METRICS, ops: x.ops, t: x.t }),
    })
  }
  return cellsOfKey({ key: x.key, points: x.points, t: x.t })
}

/**
 * 某数据键的点 → 年 → 格:完整年(年末 / 完整年度)各占一格;进行年只取最新一点并带灰注。
 *
 * @param x 数据键与该地区的点。
 * @returns 年 → 格。
 */
function cellsOfKey(x: CellsOfKeyIn): Record<string, MacroCell> {
  const cells: Record<string, MacroCell> = {}
  let newest: MacroPoint | null = null
  for (const p of x.points) {
    if (p.key !== x.key) {
      continue
    }
    const y = yearOfPoint({ p, t: x.t })
    if (y.full) {
      cells[y.year] = macroCellOf({ key: x.key, value: p.value, note: TEXT_NONE })
    } else if (newest == null || p.period > newest.period) {
      newest = p
    }
  }
  if (newest != null) {
    const y = yearOfPoint({ p: newest, t: x.t })
    if (cells[y.year] == null) {
      cells[y.year] = macroCellOf({ key: x.key, value: newest.value, note: y.note })
    }
  }
  return cells
}

/**
 * 一点落在哪一年:季度以次年 1 月 1 日为年末,月度以 12 月为年末,年度看 as_of 是否整年。
 *
 * @param x 一点与取词函数。
 * @returns 年份、是否完整年、进行年灰注。
 */
function yearOfPoint(x: YearOfPointIn): PointYear {
  const head = x.p.period.slice(0, YEAR_LEN)
  if (x.p.freq === FREQ_Q) {
    if (x.p.period.endsWith(PERIOD_JAN_TAIL)) {
      return { year: String(Number(head) - 1), full: true, note: TEXT_NONE }
    }
    return { year: head, full: false, note: x.t('pulse.m.thru', { mon: monTextOf({ t: x.t, period: x.p.period }) }) }
  }
  if (x.p.freq === FREQ_M) {
    if (x.p.period.endsWith(PERIOD_DEC_TAIL)) {
      return { year: head, full: true, note: TEXT_NONE }
    }
    return { year: head, full: false, note: x.t('pulse.m.thru', { mon: monTextOf({ t: x.t, period: x.p.period }) }) }
  }
  if (x.p.asOf === TEXT_NONE || x.p.asOf === x.p.period) {
    return { year: head, full: true, note: TEXT_NONE }
  }
  return { year: head, full: false, note: x.t('pulse.m.thru', { mon: monTextOf({ t: x.t, period: x.p.asOf }) }) }
}

/**
 * 期键里的月份缩写(取词:英文 Apr、中文 4 月、韩文 4월)。
 *
 * @param x 取词函数与期键(YYYY-MM 或 YYYY-MM-DD)。
 * @returns 月份缩写。
 */
function monTextOf(x: MonTextIn): string {
  return x.t(KEY_MON_HEAD + Number(x.period.slice(MONTH_START, MONTH_END)))
}

/**
 * 一格的显示:失业率一位小数带百分号,其余千分位。
 *
 * @param x 数据键、值与灰注。
 * @returns 一格。
 */
function macroCellOf(x: MacroCellIn): MacroCell {
  if (MACRO_PCT_KEYS.includes(x.key)) {
    return { value: x.value, text: x.value.toFixed(PCT_DIGITS) + PCT_MARK, note: x.note }
  }
  if (x.key === MK_COMP) {
    return { value: x.value, text: x.value.toFixed(RATIO_DIGITS) + RATIO_TAIL, note: x.note }
  }
  return { value: x.value, text: numOf(x.value), note: x.note }
}

/**
 * pnp_ops_stats 若干指标名 → 年 → 格(同年多点取最大;各省叫法不同故传清单)。
 *
 * @param x 指标名清单与该省的运营点。
 * @returns 年 → 格。
 */
function opsCellsOf(x: OpsCellsIn): Record<string, MacroCell> {
  const out: Record<string, MacroCell> = {}
  for (const p of x.ops) {
    if (x.metrics.includes(p.metric) === false) {
      continue
    }
    const c = opsCellOf({ p, t: x.t })
    if (c == null) {
      continue
    }
    const had = out[c.year]
    if (had == null || c.cell.value > had.value) {
      out[c.year] = c.cell
    }
  }
  return out
}

/**
 * 运营点的年与格:年从 period 里的四位数字取,取不到看 as_of;灰注 = 截至日,没有就用期间原文;
 * 期间原文就是那个年份时不注(与列头重复,Frank 2026-09-06 实拍「6,850 / 2018」)。
 *
 * @param x 运营点与取词函数。
 * @returns 年与格;年取不出给 null。
 */
function opsCellOf(x: OpsCellIn): MaybeOpsCell {
  const m = OPS_YEAR_RE.exec(x.p.period)
  let year = TEXT_NONE
  if (m != null && m[0] != null) {
    year = m[0]
  } else if (x.p.asOf.length >= YEAR_LEN) {
    year = x.p.asOf.slice(0, YEAR_LEN)
  }
  if (year === TEXT_NONE) {
    return null
  }
  let note = x.p.asOf
  if (note === TEXT_NONE) {
    note = x.p.period
  }
  if (note === year) {
    note = TEXT_NONE
  }
  return { year, cell: { value: x.p.value, text: numOf(x.p.value), note } }
}

/**
 * 剩余名额:官方直给优先;没有的年用 配额 − 已发(两边同年都有且不为负)。
 *
 * @param x 直给、配额、已发三份格。
 * @returns 年 → 格。
 */
function remainingCellsOf(x: RemainingIn): Record<string, MacroCell> {
  const out: Record<string, MacroCell> = {}
  for (const y of Object.keys(x.direct)) {
    const c = x.direct[y]
    if (c != null) {
      out[y] = c
    }
  }
  for (const y of Object.keys(x.alloc)) {
    const a = x.alloc[y]
    const i = x.issued[y]
    if (out[y] == null && a != null && i != null && a.value - i.value >= 0) {
      out[y] = { value: a.value - i.value, text: numOf(a.value - i.value), note: i.note }
    }
  }
  return out
}

/**
 * 配额表的格:单列数优先;官方只发合并数的年份用合并数顶上并带「含 AIP」灰注(NB / NL / PE)。
 *
 * @param x 单列格、合并格与灰注文案。
 * @returns 年 → 格。
 */
function allocCellsOf(x: AllocCellsIn): Record<string, MacroCell> {
  const out: Record<string, MacroCell> = {}
  for (const y of Object.keys(x.single)) {
    const c = x.single[y]
    if (c != null) {
      out[y] = c
    }
  }
  for (const y of Object.keys(x.incl)) {
    const c = x.incl[y]
    if (c != null && out[y] == null) {
      out[y] = { value: c.value, text: c.text, note: x.note }
    }
  }
  return out
}

/**
 * 配额用尽率(%)= 已发 ÷ 配额,同年两格都在才出;灰注随已发那格(它才是进行中的那个)。
 *
 * @param x 配额格与已发格。
 * @returns 年 → 格。
 */
function quotaUsedCellsOf(x: UseRateIn): Record<string, MacroCell> {
  const out: Record<string, MacroCell> = {}
  for (const y of Object.keys(x.issued)) {
    const a = x.alloc[y]
    const i = x.issued[y]
    if (a == null || i == null || a.value === 0) {
      continue
    }
    const v = i.value / a.value * PCT_SCALE
    out[y] = { value: v, text: v.toFixed(PCT_DIGITS) + PCT_MARK, note: i.note }
  }
  return out
}

/**
 * 一行里最新一年的格(手机卡显示)。
 *
 * @param cells 年 → 格。
 * @returns 最新格;空表给 null。
 */
function latestCellOf(cells: Record<string, MacroCell>): MacroCell | null {
  const best = latestYearOf(cells)
  if (best === TEXT_NONE) {
    return null
  }
  const c = cells[best]
  if (c == null) {
    return null
  }
  return c
}

/**
 * 一行里「最新」的年份(手机卡取格与标年用):当年及以前里最新的一年;未来年(接纳目标这类
 * 计划值)不算最新 —— Frank 2026-09-09 实拍全国块显 2027 目标「这不废话吗」;整行只有未来年才取最近的那年。
 *
 * @param cells 年 → 格。
 * @returns 年份;空表给空串。
 */
function latestYearOf(cells: Record<string, MacroCell>): string {
  const now = thisYearOf()
  let best = TEXT_NONE
  let future = TEXT_NONE
  for (const y of Object.keys(cells)) {
    if (y > now) {
      if (future === TEXT_NONE || y < future) {
        future = y
      }
      continue
    }
    if (best === TEXT_NONE || y > best) {
      best = y
    }
  }
  if (best === TEXT_NONE) {
    return future
  }
  return best
}

/**
 * 地区块的年份列 = 各行年份并集,升序。
 *
 * @param rows 行。
 * @returns 年份。
 */
function yearsOf(rows: MacroRow[]): string[] {
  const set = new Set<string>()
  for (const r of rows) {
    for (const y of Object.keys(r.cells)) {
      set.add(y)
    }
  }
  return Array.from(set).sort()
}

/**
 * 宏观表的列组:指标列 + 各年一列(表头只写年:存量行取年末值、流量行取全年值,格内灰注标进行年截至月)。
 *
 * @param x 取词函数与年份列。
 * @returns 列组。
 */
export function macroColsOf(x: MacroColsIn): StartCol<MacroRow>[] {
  const out: StartCol<MacroRow>[] = [
    { key: COL_MACRO_KEY, label: x.keyLabel, render: MacroKeyCell, width: W_MACRO_KEY },
  ]
  const now = thisYearOf()
  const unreleased = x.t('pulse.m.unreleased')
  for (const y of x.years) {
    const last = y === x.years[x.years.length - 1]
    const note = yearNoteOf({ yearNotes: x.yearNotes, year: y })
    out.push({
      key: y,
      label: yearColLabelOf({ year: y, note }),
      nowrap: true,
      render: makeMacroYearCell({ year: y, last, now, unreleased, note }),
    })
  }
  if (x.yoyLabel !== TEXT_NONE) {
    out.push({ key: COL_YOY, label: x.yoyLabel, nowrap: true, render: MacroYoyCell })
  }
  if (x.recLabel !== TEXT_NONE) {
    out.push({ key: COL_REC, label: x.recLabel, nowrap: true, render: MacroRecCell })
  }
  return out
}

/**
 * 某一年的列头灰注(表里没这年给空串)。
 *
 * @param x 年 → 灰注表与年。
 * @returns 灰注。
 */
function yearNoteOf(x: YearNoteIn): string {
  const n = x.yearNotes[x.year]
  if (n == null) {
    return TEXT_NONE
  }
  return n
}

/**
 * 年份列的列头:有共用灰注就「2026 至 4 月」,没有就只写年。
 *
 * @param x 年与灰注。
 * @returns 列头。
 */
function yearColLabelOf(x: YearColLabelIn): string {
  if (x.note === TEXT_NONE) {
    return x.year
  }
  return x.year + SPACE_SEP + x.note
}

/**
 * 当前年(四位串;年份列与行年份同为字符串比较)。
 *
 * @returns 当前年。
 */
function thisYearOf(): string {
  return String(new Date().getFullYear())
}

/**
 * 宏观表行身份。
 *
 * @param r 一行。
 * @returns 行键。
 */
export function macroRowKeyOf(r: MacroRow): string {
  return r.key
}

/**
 * 序列图取一行某年的原值(通用表格序列契约:(行, 列键) 两参)。
 * 全国行一律给 null → 通用件按「有值点不足两个」跳过这条,图上不出全国(Frank 2026-09-10「图表去掉全国」:
 * 全国柱是各省之和,把省的柱全压扁);表里全国行照旧。
 *
 * @param r 一行。
 * @param key 年份列键。
 * @returns 原值;该年没格或是全国行给 null。
 */
// eslint-disable-next-line local/one-parameter -- 通用表格序列契约 valueOf 定死 (行, 列键) 两参(components/table TableSeriesIn)
export function macroValueOf(r: MacroRow, key: string): number | null {
  if (r.key === GEO_CA) {
    return null
  }
  const c = r.cells[key]
  if (c == null) {
    return null
  }
  return c.value
}

/**
 * 序列图图例名 = 行名。
 *
 * @param r 一行。
 * @returns 行名。
 */
export function macroLabelOf(r: MacroRow): string {
  return r.label
}

/**
 * 通用表格序列能力要的五句文案(桶不携词)。
 *
 * @param t 取词函数。
 * @returns 文案。
 */
export function seriesWordsOf(t: TFn): SeriesWords {
  return {
    table: t('pulse.m.table'),
    chart: t('pulse.m.chart'),
    recent: t('pulse.m.recent'),
    more: t('pulse.m.more'),
    all: t('pulse.m.all'),
    indexNote: t('pulse.m.index'),
  }
}

/**
 * 洗招聘对比横表(省 × 大类汇总行 → 展示行)。
 *
 * @param x 汇总行与取词上下文。
 * @returns 展示行。
 */
export function toJobsRows(x: JobsRowsIn): JobsRow[] {
  const out: JobsRow[] = []
  for (const r of x.rows) {
    out.push(toJobsRow({ r, t: x.t, lang: x.lang }))
  }
  return out
}

/**
 * 洗招聘对比一行:省名三格、三个数值(AIP 岗与看岗位 2026-09-10 Frank「这两列 删掉」撤)。
 *
 * @param x 这一行与上下文。
 * @returns 展示行。
 */
function toJobsRow(x: JobsRowIn): JobsRow {
  return {
    key: x.r.province,
    name: provShortOf(x.r.province),
    code: x.r.province,
    localeName: provLocaleOf({ t: x.t, lang: x.lang, code: x.r.province }),
    nameSort: provFullOf(x.r.province),
    openText: numTextOf(x.r.openJobs),
    openSort: x.r.openJobs,
    new7Text: numTextOf(x.r.new7d),
    new7Sort: x.r.new7d,
    wageText: wageTextOf(x.r.medianWageAnnual),
    wageSort: x.r.medianWageAnnual,
  }
}

/**
 * 中位年薪文案(整数加元);没有横杠。
 *
 * @param n 年薪。
 * @returns 文案。
 */
function wageTextOf(n: number | null): string {
  if (n == null) {
    return DASH_MARK
  }
  return CURRENCY_MARK + numOf(n)
}

/**
 * 招聘对比横表的列组:省份 / 在招 / 近 7 天 / 中位年薪(Frank 2026-09-06「紧缺清单岗不需要这一列」;
 * AIP 岗与操作两列 2026-09-10 Frank「这两列 删掉」同撤,横杠居多、看岗位与省名跳转重复)。
 *
 * @param x 取词函数。
 * @returns 列组。
 */
export function jobsColsOf(x: JobsColsIn): StartCol<JobsRow>[] {
  return [
    { key: COL_PROV, label: x.t('pulse.s4.prov'), sort: jobsNameSortOf, render: ProvNameCell },
    { key: COL_JOBS_OPEN, label: x.t('stats.openJobs'), nowrap: true, sort: jobsOpenSortOf, render: jobsOpenTextOf },
    { key: COL_JOBS_NEW7, label: x.t('stats.new7d'), nowrap: true, sort: jobsNew7SortOf, render: jobsNew7TextOf },
    { key: COL_JOBS_WAGE, label: x.t('stats.medWage'), nowrap: true, sort: jobsWageSortOf, render: jobsWageTextOf },
  ]
}

/**
 * 省名的排序键(全名)。
 *
 * @param r 一行。
 * @returns 全名。
 */
export function jobsNameSortOf(r: JobsRow): string {
  return r.nameSort
}

/**
 * 在招职位排序键。
 *
 * @param r 一行。
 * @returns 在招职位。
 */
export function jobsOpenSortOf(r: JobsRow): number | null {
  return r.openSort
}

/**
 * 在招职位单元格。
 *
 * @param r 一行。
 * @returns 文案。
 */
export function jobsOpenTextOf(r: JobsRow): string {
  return r.openText
}

/**
 * 近 7 天发布排序键。
 *
 * @param r 一行。
 * @returns 近 7 天发布。
 */
export function jobsNew7SortOf(r: JobsRow): number | null {
  return r.new7Sort
}

/**
 * 近 7 天发布单元格。
 *
 * @param r 一行。
 * @returns 文案。
 */
export function jobsNew7TextOf(r: JobsRow): string {
  return r.new7Text
}

/**
 * 中位年薪排序键。
 *
 * @param r 一行。
 * @returns 中位年薪。
 */
export function jobsWageSortOf(r: JobsRow): number | null {
  return r.wageSort
}

/**
 * 中位年薪单元格。
 *
 * @param r 一行。
 * @returns 文案。
 */
export function jobsWageTextOf(r: JobsRow): string {
  return r.wageText
}

/**
 * 招聘对比行身份。
 *
 * @param r 一行。
 * @returns 省码。
 */
export function jobsRowKeyOf(r: JobsRow): string {
  return r.key
}

/**
 * 宏观表「指标」单元格的类:「其中」行缩进。
 *
 * @param x 是不是缩进行。
 * @returns 类名。
 */
function macroKeyClsOf(x: MacroKeyClsIn): string {
  if (x.sub) {
    return cssOf(css.macroSub)
  }
  return TEXT_NONE
}

/**
 * 地区块表格的序列声明(喂通用表格的序列能力;形状本域自声明,全格照抄 components/table 的 TableSeriesIn)。
 *
 * @param x 取词函数与地区块。
 * @returns 序列声明。
 */
export function macroSeriesOf(x: MacroSeriesIn): MacroSeriesSpec {
  return {
    pointKeys: x.geo.years,
    valueOf: macroValueOf,
    labelOf: macroLabelOf,
    chartRows: nonSubRowsOf(x.geo.rows),
    onSwitch: seriesSwitchTrack,
    recent: MACRO_RECENT,
    more: MACRO_MORE,
    indexed: x.geo.indexed,
    words: seriesWordsOf(x.t),
  }
}
