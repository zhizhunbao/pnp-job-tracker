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
import { drawStreamNote, eeKeyDisplay, normalizeProfile, streamDisplay } from '@/lib/jobs'
import { makeT } from '@/lib/i18n'
import { PROVS, PROV_NAME } from '@/lib/stats'
import { track } from '@/lib/track'
import { ymd } from '@/lib/time'
import { btnClsOf } from '@/components/button'
import { cssOf } from '@/components/css'
import { shortOcc } from '@/components/quiz'
import {
  ANCHOR_HEAD, BROAD_ALL, CARD_GAP,
  CLS_CARD_HOVER, CLS_MKT_CTL, CLS_SEP, COL_DEAD, COL_DIFF,
  COL_HOT,
  COL_MOM, COL_NAMED, COL_NOC, COL_OCC, COL_OPEN, COL_PNP_PROVS, COL_PR, COL_PROV,
  COL_SAL, COL_SPONSOR_RATE, COL_STUDY, COL_TEER, COL_WORK, DASH_MARK,
  DEAD_PROV_ORDER, DIFF_EASY, DIFF_MID, DIFF_ORDER, DIFF_TIGHT, EV_SCROLL,
  HOME_TTL_MS, INFO_IMP, INFO_PNP_PR, INFO_STUDY, INFO_TFWP,
  ID_BOARDS, ID_PROV, ID_SE, KEY_DIFF_HEAD, KEY_PROV_HEAD,
  KEY_PR_HEAD, KEY_SEP, LABEL_NOC,
  LANG_EN, LANG_KO, LANG_ZH, MID_ALL, MOM_FLAT, NAT_MIN_OPEN, NAV_IDS, NAV_TOP_LINE,
  NOC_HEAD, NUM_LOCALE, PAREN_L, PAREN_R, PCT_MARK, PCT_SCALE,
  PNP_SORT_SCALE, PROV_ALL, PROV_ALL_LOWER,
  PROV_DEFAULT, PROV_MIN_OPEN, PROV_QC, RATE_DIGITS, RATE_MAX, RATE_OVER_TEXT,
  SEP_LIST, SHORT_PROV, SIGN_MINUS, SIGN_PLUS, TEER_HEAD, TEXT_NONE,
  TIER_BOTH, TIER_FED, TRACK_CARD, TRACK_CTA,
  TRACK_OCC, URL_HOME, URL_HOME_PNP, URL_HOME_Q_HEAD, URL_SPONSORS_API,
  COL_EMP, ID_CITY, ID_TREND, IND_BROADS, IND_KEYS,
  EMPTY_CITY_ROWS, KEY_IND_HEAD, SEC_TOP_OPEN, SEC_TOP_WAGE, TRACK_EMP, TREND_AREA_OPACITY, TREND_COLOR, TREND_H_MAIN,
  TREND_H_SMALL, TREND_MIN_POINTS, TREND_PAD_MAIN, TREND_PAD_SMALL, URL_HOME_CITY_HEAD, WAGE_MIN_OPEN,
  AXIS_CATEGORY, AXIS_VALUE, CHART_TRIGGER_AXIS, SERIES_LINE_TYPE, TREND_LINE_WIDTH, WAGE_K,
  WAGE_K_MARK, WAGE_RANGE_SEP, WAGE_SIGN,
  HIST_WINDOW, HIST_MIN_N, TAG_FED, PROV_FED, COL_DATE, COL_PROG, COL_STREAM, COL_SCORE, COL_INV, COL_READ, W_DATE,
  W_PROG, W_STREAM, W_SCORE, W_INV, W_READ,
  COL_ACT, COL_HIRING_OCC, COL_LMIA_2Q, COL_VERDICT,
  HIRING_OCC_MAX, ID_NOWP, ID_PGWP, KEY_ID_HEAD, KEY_VERDICT_FACTOR_HEAD, KEY_VERDICT_HEAD,
  PULSE_CEC, PULSE_CHECK, PULSE_OK, PULSE_RANK, PULSE_SHORT, TEER_PNP_MAX, URL_COMPANY_HEAD, VERDICT_MET,
  VERDICT_PUBLIC, VERDICT_SHORT, MINI_BTN_KIND, W_EMP_ACT, CARD_PAGE_SIZE, COL_SECTOR, KEY_SECTOR_HEAD,
  KEY_VERDICT_NA, SECTOR_GOVERNMENT, SECTOR_PRIVATE, SECTOR_PUBLIC,
  COL_BIZ, PILOT_FCIP, PILOT_RCIP, KEY_PILOT_HEAD, PILOT_KEYS, PILOT_KEY_AIP, PILOT_KEY_RCIP, TABLE_PILOT,
  SPACE_SEP, ACRONYM_MAX, CORP_SUFFIXES, NON_LETTER_RE, BRIEF_TAG_RE, BRIEF_TAG_WHAT,
} from './constants'
import { DeadCell } from './deadcell'
import { EmpActCell } from './empactcell'
import { EmpBriefCell } from './empbriefcell'
import { EmpNameCell } from './empnamecell'
import { EmpHiringCell } from './emphiringcell'
import { OccActCell } from './occactcell'
import { DiffCell } from './diffcell'
import { HotCell } from './hotcell'
import { MomCell } from './momcell'
import { NamedCell } from './namedcell'
import { OccNameCell } from './occnamecell'
import { OpenStrongCell } from './openstrongcell'
import { PnpCell } from './pnpcell'
import { ProgCell } from './progcell'
import { PrCell } from './prcell'
import { ProvNameCell } from './provnamecell'
import { ReadCell } from './readcell'
import { StreamCell } from './streamcell'
import type { ChartOption } from '@/components/stats'
import type { CityRow, DailyRow } from '@/lib/stats'
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
  PlaceholderClsIn, ProvCardClsIn, ProvCellRow, ProvCellRowIn,
  ProvCellRowsIn, ProvColsIn, ProvExtraMap, ProvInfoKey, ProvLabelOfIn, ProvLocaleIn, ProvOccHitIn,
  ProvOccIn, ProvPickFn, ProvPickIn, ProvPresetIn, ProvStatIn, ProvsOfOccIn,
  PulseScalars, PulseScalarsIn, SecHeadClsIn, SelectChangeFn, SelectChangeIn,
  SponsorFullProbe, SponsorGroup, SponsorLoadIn,
  SponsorRowList, StartCol, StartPill, StartProfileObj,
  StatRowList, StatRowOne,
  StreamLabelIn, TierClsIn, TierTextIn,
  CityCellRow, CityCellRowsIn, CityNameIn, DateSum, EmpCellRow, EmpCellRowIn, EmpColsIn, EmpSec, EmpSecsIn, IndOfIn,
  HiringMoreIn, IndRowsIn, LineOptionIn, OccSec, OccSecsIn, SeriesIn, SponsorBoards, TrendOfIn, TrendPanel, TrendSeries,
  EmpKind, HiringOccIn, KindChip, KindPickFn, KindPickIn, NocInfo, NocInfoIn, NocInfoMap, PulseIn2,
  AliasIn, BriefOfIn, BriefTextOut, BriefsIn, CityRowsIn, CompanyBrief, SeedGroupIn, SponsorSeedIn, EmpExtra,
  NocCatMap, DesignatedIn, InPilotIn, PilotNamesIn, PilotSecsIn,
  Teer03In, VerdictTextIn,
  TrendSmallIn, ValuableIn,
  EmptyQueryResult, PulseDraw, DrawDbRow, DrawHist, DrawHistIn, DrawsIn, PulseDrawIn, DrawCellRow, DrawCellRowIn,
  DrawCellRowsIn, DrawColsIn, DrawRowClsIn, DrawLang,
  TFn,
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
 * 会话解析挂了 = 当匿名(S4 省份预选:已建档按档案省,匿名默认 ON —— **不许按 IP 判**;
 * 站内零 geo 能力,且主力受众在境外,同 i18n「不许按 IP 判语言」同族红线)。
 *
 * @returns 没有登录用户。
 */
export function nullUser(): null {
  return null
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
    city: x.cityRows,
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
    city: x.core.city,
    provPreset: x.provPreset,
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
 * 城市统计行的空表(城市段取数挂了给它,段整段不出)。
 *
 * @returns 空表。
 */
export function emptyCityRows(): CityRow[] {
  return []
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
 * S4 省份预选(设计 §1 拍板 4):**已建档按档案省,匿名默认 ON —— 不许按 IP 判**
 * (站内零 geo 能力,且主力受众在境外;同 i18n「不许按 IP 判语言」同族红线)。
 * 跨域形状接缝:quota 域声明的 users.profile 允许嵌套对象,jobs 域的 ProfileJson 只到扁平格
 * (两域各自声明自己的形状,不互相取 —— 宪法)。断言只住这一处,收窄由 normalizeProfile 逐格做。
 *
 * @param x 当前会话用户。
 * @returns 档案里第一个受支持的目标省;没有则空串(视图落到默认省)。
 */
export function provPresetOf(x: ProvPresetIn): string {
  let raw: StartProfileObj | null = null
  if (x.user != null) {
    raw = x.user.profile
  }
  const profile = raw as Parameters<typeof normalizeProfile>[0]
  for (const p of normalizeProfile(profile).targetProvinces) {
    if (PROVS.includes(p)) {
      return p
    }
  }
  return TEXT_NONE
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
 * IRCC 体量那几格的显示串:官方缺位与 0 都给横杠 —— 这几格的 0 也是「没这个数」
 * (省份不可能一年零学签),照原实现同口径。
 *
 * @param n 数;null = 官方缺位。
 * @returns 显示串。
 */
function volTextOf(n: number | null): string {
  if (n == null || n === 0) {
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
 * 省 chips 上的整段文字:英文在前,中韩括注译名(#146 站规)。
 *
 * @param x 取词函数、界面语言与省码。
 * @returns chips 文字。
 */
export function provChipTextOf(x: ProvLocaleIn): string {
  const en = provShortOf(x.code)
  const loc = provLocaleOf(x)
  if (loc === TEXT_NONE) {
    return en
  }
  return en + PAREN_L + loc + PAREN_R
}

/**
 * 切省的初值:已建档按档案省,匿名(空串)落默认省 —— **不许按 IP 判**。
 *
 * @param preset 服务端算好的预选省;'' = 匿名或档案里没写。
 * @returns 初值省。
 */
export function provInitOf(preset: string): string {
  if (preset === TEXT_NONE) {
    return PROV_DEFAULT
  }
  return preset
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
    { id: ID_CITY, label: x.t('pulse.nav.city') },
    { id: ID_TREND, label: x.t('pulse.nav.trend') },
  ]
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
 * 洗一整批省份。
 *
 * @param x 省 × 大类汇总行、取词函数、界面语言与省卡增补。
 * @returns 展示行。
 */
export function toProvCellRows(x: ProvCellRowsIn): ProvCellRow[] {
  const out: ProvCellRow[] = []
  for (const r of x.rows) {
    out.push(toProvCellRow({ r, t: x.t, lang: x.lang, provExtra: x.provExtra }))
  }
  return out
}

/**
 * 洗一行省份:省名三格、难度档、四个体量数值一次算清。
 *
 * @param x 这一行与洗行要的上下文。
 * @returns 展示行。
 */
export function toProvCellRow(x: ProvCellRowIn): ProvCellRow {
  const tier = provTierOf(x)
  const work = provWorkOf(x)
  const study = provInfoOf(x, INFO_STUDY)
  const pnpPr = provInfoOf(x, INFO_PNP_PR)
  let namedText = TEXT_NONE
  if (x.r.namedJobs != null && x.r.namedJobs > 0) {
    namedText = numOf(x.r.namedJobs)
  }
  return {
    key: x.r.province,
    name: provShortOf(x.r.province),
    nameSort: provFullOf(x.r.province),
    code: x.r.province,
    localeName: provLocaleOf({ t: x.t, lang: x.lang, code: x.r.province }),
    tier,
    tierText: provTierTextOf({ t: x.t, tier }),
    tierCls: diffClsOf({ tier }),
    tierCardCls: diffCardClsOf({ tier }),
    tierSort: diffSortOf(tier),
    openText: numTextOf(x.r.openJobs),
    openSort: x.r.openJobs,
    namedText,
    noListText: x.t('stats.noList'),
    namedSort: namedSortOf(x.r.namedJobs),
    workText: volTextOf(work),
    workSort: work,
    studyText: volTextOf(study),
    studySort: study,
    prText: volTextOf(pnpPr),
    prNaText: x.t('stats.naQc'),
    prNotApplicable: volTextOf(pnpPr) === DASH_MARK && x.r.province === PROV_QC,
    prSort: pnpPr,
  }
}

/**
 * 难度档的显示名;没算出来不取词(单元格根本不渲这一粒)。
 *
 * @param x 取词函数与难度档。
 * @returns 显示名;没有则空串。
 */
function provTierTextOf(x: TierTextIn): string {
  if (x.tier === TEXT_NONE) {
    return TEXT_NONE
  }
  return x.t(KEY_DIFF_HEAD + x.tier)
}

/**
 * 该省的难度档(stats.difficulty broad=all 行的 tier);没算出来或不是三档之一给空串。
 *
 * @param x 这一行与省卡增补。
 * @returns 难度档;没有则空串。
 */
function provTierOf(x: ProvCellRowIn): string {
  const ex = x.provExtra[x.r.province]
  if (ex == null || ex.tier == null) {
    return TEXT_NONE
  }
  if (ex.tier === DIFF_EASY || ex.tier === DIFF_MID || ex.tier === DIFF_TIGHT) {
    return ex.tier
  }
  return TEXT_NONE
}

/**
 * 工签体量 = TFWP + IMP;两格都缺(或都是 0)给 null(单元格显横杠,不折 0)。
 *
 * @param x 这一行与省卡增补。
 * @returns 工签体量;没有则 null。
 */
function provWorkOf(x: ProvCellRowIn): number | null {
  const tfwp = provInfoOf(x, INFO_TFWP)
  const imp = provInfoOf(x, INFO_IMP)
  let sum = 0
  if (tfwp != null) {
    sum += tfwp
  }
  if (imp != null) {
    sum += imp
  }
  if (sum === 0) {
    return null
  }
  return sum
}

/**
 * 省卡 IRCC 体量里的一格(学签 / TFWP / IMP / 省提名拿到 PR);官方缺位保 null。
 *
 * @param x 这一行与省卡增补。
 * @param key 取哪一格。
 * @returns 那一格的数;没有则 null。
 */
// eslint-disable-next-line local/one-parameter -- 第二参是取哪一格的键名字面量(TS 靠它选属性),不是业务入参
function provInfoOf(x: ProvCellRowIn, key: ProvInfoKey): number | null {
  const ex = x.provExtra[x.r.province]
  if (ex == null || ex.info == null) {
    return null
  }
  const slot = ex.info[key]
  if (slot == null) {
    return null
  }
  return slot.n
}

/**
 * 难度档的排序键;表外的档给 null 沉底。
 *
 * @param tier 难度档。
 * @returns 排序键。
 */
function diffSortOf(tier: string): number | null {
  const rank = DIFF_ORDER[tier]
  if (rank == null) {
    return null
  }
  return rank
}

/**
 * 具名通道岗数的排序键(没清单的省按 0 排)。
 *
 * @param n 具名通道岗数。
 * @returns 排序键。
 */
function namedSortOf(n: number | null): number {
  if (n == null) {
    return 0
  }
  return n
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
 * 当前省的统计行。
 *
 * @param x 汇总行与当前省。
 * @returns 那一行;没有则 null。
 */
export function provStatOf(x: ProvStatIn): StatRowOne | null {
  for (const r of x.rows) {
    if (r.province === x.prov) {
      return r
    }
  }
  return null
}

/**
 * 省内职业榜:全国档吃全国行(在架 ≥30),省档吃该省行(在架 ≥10)。
 * Frank 2026-08-06「命中率 0 还排第一?」:省级小样本里 pulse 的动量分被小基数环比打爆
 * (SK 收银员 7→19 = +171% 骑上榜首)—— 省榜回归**体量榜**(按在架量,「该省职业真榜」本义),
 * 环比 / 占比 / 判决当信息列;pulse 排序只留全国降温 / 升温榜。
 *
 * @param x 主图四份数据与当前省。
 * @returns 榜行;数据还没到则 null。
 */
export function provOccOf(x: ProvOccIn): OccRowList | null {
  if (x.market == null) {
    return null
  }
  const out: OccRowList = []
  for (const o of x.market.occ) {
    if (provOccHitOf({ o, prov: x.prov })) {
      out.push(o)
    }
  }
  out.sort(byOpenDesc)
  return out
}

/**
 * 这一行进不进省内职业榜(全国档与省档两套样本门槛,设计 §3)。
 *
 * @param x 这一行与当前省。
 * @returns 进不进。
 */
function provOccHitOf(x: ProvOccHitIn): boolean {
  if (x.prov === PROV_ALL) {
    return isAllProv(x.o.province) && openOf(x.o) >= NAT_MIN_OPEN
  }
  return x.o.province === x.prov && openOf(x.o) >= PROV_MIN_OPEN
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
 * 分省概览的列组(2026-08-06 Frank「省卡改表格吧 拆两个 section」:
 * 桌面 = 可排序表格(10 省 × 混量纲指标,表格才排得动),手机 = 原省卡;
 * 表格行不可点(E8-08 站规「可点才有态」),切省统一走 S4b 的 chips)。
 *
 * @param x 取词函数。
 * @returns 列组。
 */
export function provColsOf(x: ProvColsIn): StartCol<ProvCellRow>[] {
  return [
    { key: COL_PROV, label: x.t('pulse.s4.prov'), sort: provNameSortOf, render: ProvNameCell },
    { key: COL_DIFF, label: x.t('pulse.s4.diff'), nowrap: true, sort: provTierSortOf, render: DiffCell },
    { key: COL_OPEN, label: x.t('stats.openJobs'), nowrap: true, sort: provOpenSortOf, render: OpenStrongCell },
    { key: COL_NAMED, label: x.t('stats.named'), nowrap: true, sort: provNamedSortOf, render: NamedCell },
    { key: COL_WORK, label: x.t('stats.cardWork'), nowrap: true, sort: provWorkSortOf, render: provWorkTextOf },
    { key: COL_STUDY, label: x.t('stats.cardStudy'), nowrap: true, sort: provStudySortOf, render: provStudyTextOf },
    { key: COL_PR, label: x.t('stats.cardPr'), nowrap: true, sort: provPrSortOf, render: PrCell },
  ]
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
 * 省名的排序键(按省全名,与显示的通行短名分开)。
 *
 * @param r 这一行。
 * @returns 省全名。
 */
export function provNameSortOf(r: ProvCellRow): string {
  return r.nameSort
}

/**
 * 难度档的排序键。
 *
 * @param r 这一行。
 * @returns 排序键。
 */
export function provTierSortOf(r: ProvCellRow): number | null {
  return r.tierSort
}

/**
 * 在招岗数的排序键。
 *
 * @param r 这一行。
 * @returns 在招岗数。
 */
export function provOpenSortOf(r: ProvCellRow): number | null {
  return r.openSort
}

/**
 * 具名通道岗数的排序键。
 *
 * @param r 这一行。
 * @returns 排序键。
 */
export function provNamedSortOf(r: ProvCellRow): number {
  return r.namedSort
}

/**
 * 工签体量的排序键。
 *
 * @param r 这一行。
 * @returns 排序键。
 */
export function provWorkSortOf(r: ProvCellRow): number | null {
  return r.workSort
}

/**
 * 工签体量单元格。
 *
 * @param r 这一行。
 * @returns 数值文案。
 */
export function provWorkTextOf(r: ProvCellRow): string {
  return r.workText
}

/**
 * 学签体量的排序键。
 *
 * @param r 这一行。
 * @returns 排序键。
 */
export function provStudySortOf(r: ProvCellRow): number | null {
  return r.studySort
}

/**
 * 学签体量单元格。
 *
 * @param r 这一行。
 * @returns 数值文案。
 */
export function provStudyTextOf(r: ProvCellRow): string {
  return r.studyText
}

/**
 * 省提名拿到 PR 的排序键。
 *
 * @param r 这一行。
 * @returns 排序键。
 */
export function provPrSortOf(r: ProvCellRow): number | null {
  return r.prSort
}

/**
 * 分省概览的行身份。
 *
 * @param r 这一行。
 * @returns 行键。
 */
export function provRowKeyOf(r: ProvCellRow): string {
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
 * 一张省卡的类:基座 + 选中档 + 全局 hover 高亮。
 *
 * @param x 是不是当前省。
 * @returns className。
 */
export function provCardClsOf(x: ProvCardClsIn): string {
  const cls = [cssOf(css.provCard), CLS_CARD_HOVER]
  if (x.on) {
    cls.push(cssOf(css.provCardOn))
  }
  return joinCls(cls)
}

/**
 * 切省下拉的类:同上。
 *
 * @returns className。
 */
export function provSelClsOf(): string {
  return joinCls([CLS_MKT_CTL, cssOf(css.provSel)])
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
 * 省 chips 逐项的点击手柄工厂。
 *
 * @param x 换省的落格。
 * @returns 手柄工厂。
 */
export function makeProvPick(x: ProvPickIn): ProvPickFn {
  return function pickOf(p: string): ClickFn {
    return function pick(): void {
      x.setProv(p)
    }
  }
}

/**
 * 原生下拉的换值手柄(把事件拆成值)。
 *
 * @param x 换值的落格。
 * @returns 换值手柄。
 */
export function makeSelectChange(x: SelectChangeIn): SelectChangeFn {
  return function onChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.set(e.target.value)
  }
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
        x.setSponsorFull({ lmia: j.lmia, named: groupOrEmpty(j.named), aip: groupOrEmpty(j.aip) })
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
 * 城市段的候选行:主图的 city 行按在招降序(全量,视图分页);主图没到给 null。
 *
 * @param x 主图四份数据。
 * @returns 城市行或 null。
 */
export function cityRowsOf(x: CityRowsIn): CityRow[] | null {
  const rows = x.city.slice()
  rows.sort(byCityOpenDesc)
  return rows
}

/**
 * 在招(null 当 0,只用于排序)。
 *
 * @param r 一行。
 * @returns 在招数。
 */
function cityOpenOf(r: CityRow): number {
  if (r.openJobs == null) {
    return 0
  }
  return r.openJobs
}

/**
 * 按在招降序。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 比较结果。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byCityOpenDesc(a: CityRow, b: CityRow): number {
  return cityOpenOf(b) - cityOpenOf(a)
}

/**
 * 城市统计行 → 城市卡展示行(值级清洗全在这里)。
 *
 * @param x 城市行、取词函数与语言。
 * @returns 展示行。
 */
export function toCityCellRows(x: CityCellRowsIn): CityCellRow[] {
  const out: CityCellRow[] = []
  for (const r of x.rows) {
    out.push(toCityCellRow(r, x))
  }
  return out
}

/**
 * 一行城市统计 → 展示行。
 *
 * @param r 城市统计行。
 * @param x 取词函数与语言。
 * @returns 展示行。
 */
// eslint-disable-next-line local/one-parameter -- 行构造器照 toOccCellRow 的形:行 + 上下文两参
function toCityCellRow(r: CityRow, x: CityCellRowsIn): CityCellRow {
  return {
    key: r.city + KEY_SEP + r.province,
    name: cityNameOf({ r, lang: x.lang }),
    provName: provLabelOf({ t: x.t, code: r.province }),
    provCode: r.province,
    openText: numOrDashOf(r.openJobs),
    new7Text: numOrDashOf(r.new7d),
    wageText: wageOrDashOf(r.medianWageAnnual),
    namedText: numOrDashOf(r.namedJobs),
    href: URL_HOME_CITY_HEAD + encodeURIComponent(r.city),
  }
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
 * 城市卡的类(与省卡同形,不带选中态)。
 *
 * @returns 类名。
 */
export function cityCardClsOf(): string {
  return joinCls([cssOf(css.provCard), cssOf(css.cityCard), CLS_CARD_HOVER])
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
 * 城市行还没到时给页态一份空清单(useCardPage 要一份稳定身份的数组比对;null 不能比)。
 *
 * @param rows 城市行或 null。
 * @returns 原清单,或空清单。
 */
export function rowsOrEmpty(rows: CityRow[] | null): CityRow[] {
  if (rows == null) {
    return EMPTY_CITY_ROWS
  }
  return rows
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
    const cell = toEmpCellRow({ r, t: x.t, ind, nocInfo: x.nocInfo, nocCat: x.nocCat, extra: x.extra, lang: x.lang })
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
 * 三分表并成一份,按雇主名去重(一家可能同时在 LMIA 表与紧缺表)。
 *
 * @param sponsor 三分表。
 * @returns 去重后的事实行。
 */
function unionSponsorRows(sponsor: SponsorBoards): SponsorRowList {
  const seen = new Set<string>()
  const out: SponsorRowList = []
  for (const g of [sponsor.lmia, sponsor.named, sponsor.aip]) {
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
  const teer03 = teer03Of({ nocs: r.nocs, nocInfo: x.nocInfo })
  const key = r.name.toLowerCase()
  const designated = isDesignated({ r, extra: x.extra })
  const pulse = pulseOf({ teer03, named: r.named, state: r.verdict.state, designated })
  const briefText = briefOf({ briefs: x.extra.briefs, key, lang: x.lang })
  return {
    key: r.name,
    name: displayNameOf(r.name),
    alias: aliasOf({ r, lang: x.lang }),
    jobsHref: URL_HOME_Q_HEAD + encodeURIComponent(r.name),
    companyHref: URL_COMPANY_HEAD + r.slug,
    open: r.openJobs,
    openText: numOf(r.openJobs),
    hiringOcc: hiringOccOf({ nocs: r.nocs, ind: x.ind, nocInfo: x.nocInfo, nocCat: x.nocCat, cls }),
    hiringMoreText: hiringMoreOf({ t: x.t, n: r.nocs.length }),
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
 * 雇主类别 → 文案键尾:government / public 原样,空 = 私营企业。
 *
 * @param sector 数据层的类别标注。
 * @returns 文案键尾。
 */
function sectorKeyOf(sector: string): string {
  if (sector === SECTOR_GOVERNMENT || sector === SECTOR_PUBLIC) {
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
    return x.t(KEY_VERDICT_NA)
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
 * 三试点指定雇主表(AIP / RCIP / FCIP 各一张,在招的;不分身份档不分行业,按在招降序)。
 *
 * @param x 三分表、分类映射、职业表与试点集合。
 * @returns 三张表(凑不出一行的不出)。
 */
export function pilotSecsOf(x: PilotSecsIn): EmpSec[] {
  const rows = unionSponsorRows(x.sponsor)
  const out: EmpSec[] = []
  for (const pilot of PILOT_KEYS) {
    const cells: EmpCellRow[] = []
    for (const r of rows) {
      if (inPilotOf({ r, pilot, extra: x.extra }) === false) {
        continue
      }
      const ind = indOfNocs({ nocs: r.nocs, nocCat: x.nocCat })
      cells.push(toEmpCellRow({
        r, t: x.t, ind, nocInfo: x.nocInfo, nocCat: x.nocCat, extra: x.extra, lang: x.lang,
      }))
    }
    if (cells.length === 0) {
      continue
    }
    cells.sort(byOpenDescEmp)
    out.push({ key: pilot, title: x.t(KEY_PILOT_HEAD + pilot), rows: cells })
  }
  return out
}

/**
 * 这家雇主在不在该试点的指定名单上(AIP 看岗位事实,RCIP / FCIP 看名单交集)。
 *
 * @param x 事实行、试点键与集合。
 * @returns 在不在。
 */
function inPilotOf(x: InPilotIn): boolean {
  const key = x.r.name.toLowerCase()
  if (x.pilot === PILOT_KEY_AIP) {
    return x.r.aip
  }
  if (x.pilot === PILOT_KEY_RCIP) {
    return x.extra.rcip.has(key)
  }
  return x.extra.fcip.has(key)
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
