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
import { SQL } from '@/lib/db'
import { drawStreamNote, eeKeyDisplay, normalizeProfile, streamDisplay } from '@/lib/jobs'
import { BROAD_SLUGS, PROVS, PROV_NAME } from '@/lib/stats'
import { ymd } from '@/lib/time'
import { track } from '@/lib/track'
import { cssOf } from '@/components/css'
import { shortOcc } from '@/components/quiz'
import {
  ANCHOR_HEAD, BROAD_ALL, BROAD_UNCAT, CARD_GAP, CAT_COLLECTION, CAT_FIND_DEPTH, CAT_FIND_LIMIT,
  CLS_CARD_HOVER, CLS_MKT_CTL, CLS_ROW_HOVER, CLS_SEP, COL_DATE, COL_DEAD, COL_DIFF, COL_FINE_EN,
  COL_FINE_KEY, COL_FINE_KO, COL_HOT, COL_INV, COL_MID_EN, COL_MID_KEY, COL_MID_KO,
  COL_MOM, COL_NAMED, COL_NOC, COL_OCC, COL_OPEN, COL_PNP_PROVS, COL_PR, COL_PROG, COL_PROV, COL_READ,
  COL_SAL, COL_SCORE, COL_SPONSOR_RATE, COL_STREAM, COL_STUDY, COL_TEER, COL_WORK, COOLING_MAX, DASH_MARK,
  DEAD_PROV_ORDER, DICT_TTL_MS, DIFF_EASY, DIFF_MID, DIFF_ORDER, DIFF_TIGHT, EV_CHAT_OPEN, EV_SCROLL,
  HEATING_MIN, HIST_MIN_N, HIST_WINDOW, HOME_TTL_MS, INFO_IMP, INFO_PNP_PR, INFO_STUDY, INFO_TFWP,
  ID_BOARDS, ID_DRAWS, ID_PROV, ID_PROVOCC, ID_SE, KEY_BROAD_HEAD, KEY_DIFF_HEAD, KEY_PROV_HEAD,
  KEY_PR_HEAD, KEY_SEP, KEY_SE_ASK_HEAD, KIND_AIP, KIND_LMIA, KIND_NAMED, LABEL_NOC,
  LANG_EN, LANG_KO, LANG_ZH, MID_ALL, MOM_FLAT, NAT_MIN_OPEN, NAV_IDS, NAV_TOP_LINE, NEWS_TAIL_RE,
  NOC_HEAD, NOC_KEY_BROAD, NOC_KEY_FINE, NOC_KEY_MID, NUM_LOCALE, PAREN_L, PAREN_R, PCT_MARK, PCT_SCALE,
  PNP_SORT_SCALE, PROV_ALL, PROV_ALL_LOWER,
  PROV_DEFAULT, PROV_FED, PROV_MIN_OPEN, PROV_ORDER_LAST, PROV_QC, RATE_DIGITS, RATE_MAX, RATE_OVER_TEXT,
  REGION_FEDERAL, SEP_LIST, SHORT_PROV, SIGN_MINUS, SIGN_PLUS, TAG_FED, TAG_IRCC, TEER_HEAD, TEXT_NONE,
  TIER_BOTH, TIER_FED, TIER_RANK, TIER_RANK_LAST, TOPN_MIN, TOPN_OPTS, TRACK_ASK, TRACK_CARD, TRACK_CTA,
  TRACK_OCC, URL_HOME, URL_HOME_PNP, URL_HOME_Q_HEAD, URL_NEWS, URL_NEWS_HEAD, URL_SPONSORS_API, W_DATE,
  W_INV, W_PROG, W_READ, W_SCORE, W_STREAM, WAGE_K, WAGE_K_MARK, WAGE_RANGE_SEP, WAGE_SIGN,
} from './constants'
import { DeadCell } from './deadcell'
import { DiffCell } from './diffcell'
import { HotCell } from './hotcell'
import { MomCell } from './momcell'
import { NamedCell } from './namedcell'
import { OccNameCell } from './occnamecell'
import { OpenStrongCell } from './openstrongcell'
import { PnpCell } from './pnpcell'
import { PrCell } from './prcell'
import { ProgCell } from './progcell'
import { ProvNameCell } from './provnamecell'
import { ReadCell } from './readcell'
import { StreamCell } from './streamcell'
import type { SponsorCellRow } from '@/components/employers'
import { CACHE } from './variables'
import type {
  AskChatIn, BandClsIn, BroadOptsIn, CatLabelIn, CatOption, CatOptionsIn, CatOptionsRowsIn, CleanupFn,
  ClickFn, DrawCellRow, DrawCellRowIn, DrawCellRowsIn, DrawColsIn, DrawDbRow, DrawHist, DrawHistIn,
  DrawLang, DrawRowClsIn, DrawsIn, EmptyDocs, EmptyQueryResult, FilterFn, FilterPickIn, FineOptsIn,
  CatCell, HomeCoreIn, HomeStats, HomeStatsCore, HomeStatsOfIn, HotPillsIn, LabelFactoryIn, LabelFn,
  MidOptsIn, MomClsIn,
  NatOccIn, NavLinkClsIn, NavWatchIn, NewsCellRow, NewsCellRowIn, NewsCellRowsIn, NewsRecentDbRow,
  NewsRowClsIn, NewsRowsIn, NocCat, NocCatOfIn, NocProvsIn, NocProvsMap, NocTitleDbRow,
  GapClsIn, NavItem, NavItemsIn, NumCardRow, NumCardsIn, OccBoards, OccBoardsIn, OccCellRow, OccCellRowIn,
  OccCellRowsIn, OccColsIn, SponsorGroupEntry, SponsorGroupsIn,
  OccLabelIn, OccNameIn, OccOption, OccOptionsIn, OccOptionsRowsIn, OccRowList, OccRowOne, OccSelHitIn,
  OccSelOption, OccSelOptsIn, OccTitleIn, PlaceholderClsIn, ProvCardClsIn, ProvCellRow, ProvCellRowIn,
  ProvCellRowsIn, ProvColsIn, ProvExtraMap, ProvInfoKey, ProvLabelOfIn, ProvLocaleIn, ProvOccHitIn,
  ProvOccIn, ProvOptsIn, ProvPickFn, ProvPickIn, ProvPresetIn, ProvStatIn, ProvsOfOccIn, PulseDraw,
  PulseDrawIn, PulseNews, PulseScalars, PulseScalarsIn, SecHeadClsIn, SelectChangeFn, SelectChangeIn,
  ShownSponsorsIn, SomeCatIn, SponsorFullProbe, SponsorGroup, SponsorHitIn, SponsorLoadIn, SponsorNoteIn,
  SponsorLabels, SponsorLabelsIn, SponsorRowList, SponsorSliceIn, StartCol, StartPill, StartProfileObj,
  StatRowList, StatRowOne,
  StreamLabelIn, StreamOptsIn, TierClsIn, TierTextIn, TopNChangeIn,
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
 * 橱窗职业筛 datalist 的候选(旧货架页同款手法,1h 进程缓存;~500 行,gzip 15KB)。
 * 查询挂了照样把空清单存进缓存 —— 与原实现同口径:宁可这一格空着,不拖累整页。
 *
 * @param x 数据库连接。
 * @returns 候选清单。
 */
export async function loadOccOptions(x: OccOptionsIn): Promise<OccOption[]> {
  const hit = CACHE.occOpts
  if (hit != null && Date.now() - hit.ts < DICT_TTL_MS) {
    return hit.rows
  }
  let raw: NocTitleDbRow[] = []
  try {
    const res = await x.db.query(SQL.NOC_ALL_TITLES)
    raw = res.rows as NocTitleDbRow[]
  } catch {
    raw = []
  }
  const rows = toOccOptions({ rows: raw })
  CACHE.occOpts = { ts: Date.now(), rows }
  return rows
}

/**
 * 职业筛联动(大类→中类→小类→职业,2026-08-08 Frank「大类种类小类联动过滤要加上」;
 * 小类一级 08-09 补,Frank「全部小类呢?」)的中/小类英韩名 —— 与职位板同一张
 * noc_categories 维度表(一行 = 一个小类,1h 进程缓存);大类沿用既有 i18n `broad.*` 键
 * (27 个已全译,不必再查)。
 *
 * @param x payload 实例。
 * @returns 中/小类名清单。
 */
export async function loadCatOptions(x: CatOptionsIn): Promise<CatOption[]> {
  const hit = CACHE.catOpts
  if (hit != null && Date.now() - hit.ts < DICT_TTL_MS) {
    return hit.rows
  }
  let docs: CatOptionsRowsIn['docs'] = []
  try {
    const res = await x.payload.find({
      collection: CAT_COLLECTION,
      limit: CAT_FIND_LIMIT,
      depth: CAT_FIND_DEPTH,
    })
    docs = res.docs
  } catch {
    docs = []
  }
  const rows = toCatOptions({ docs })
  CACHE.catOpts = { ts: Date.now(), rows }
  return rows
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
 * 分类维度表查询挂了的空结果面。
 *
 * @returns 零行的结果面。
 */
export function emptyDocs(): EmptyDocs {
  return { docs: [] }
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
 * 把各条查询的结果组装成一份聚合。纯拼装 —— 每一格的算法各自成函数。
 *
 * @param x 各条查询的结果、已建好的橱窗三表、SSR 每表带几行与两处条数上限。
 * @returns 一份聚合(逐用户的两格由 `homeStatsOf` 补)。
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
  return {
    total,
    named,
    sponsor: {
      lmia: sponsorSliceOf({ group: x.boards.lmia, rows: x.ssrRows }),
      named: sponsorSliceOf({ group: x.boards.named, rows: x.ssrRows }),
      aip: sponsorSliceOf({ group: x.boards.aip, rows: x.ssrRows }),
    },
    occOpts: x.occOpts,
    catMids: x.catMids,
    pulse: pulseScalarsOf({ occ: x.occRows }),
    nocCat: nocCatOf({ occ: x.occRows, sponsorRows: x.sponsorRows }),
    draws: toDrawsWithHistory({ rows: x.drawRows, limit: x.drawsLimit }),
    news: toNewsRows({ rows: x.newsRows, limit: x.newsLimit }),
    provExtra: x.provExtra,
  }
}

/**
 * 把聚合与逐用户那两格拼成整份 SSR 契约。
 *
 * @param x 聚合、预选省与抓取时刻。
 * @returns 整份 SSR 契约。
 */
export function homeStatsOf(x: HomeStatsOfIn): HomeStats {
  return {
    total: x.core.total,
    named: x.core.named,
    draws: x.core.draws,
    news: x.core.news,
    sponsor: x.core.sponsor,
    occOpts: x.core.occOpts,
    catMids: x.core.catMids,
    pulse: x.core.pulse,
    nocCat: x.core.nocCat,
    provExtra: x.core.provExtra,
    provPreset: x.provPreset,
    checkedAt: x.checkedAt,
  }
}

/**
 * #313(LCP 7.15s 真因):三表全量(16,430 行)序列化进 RSC payload 把 SSR 文档撑到 6.92MB
 * ——「全量可翻页」拍板不动,只换运输方式:SSR 只带每表前几十行 + total,挂载后
 * Pulse 拉 `/api/employers/sponsors` 换全量(手法照 occ 大表的 `/api/stats/market` 先例)。
 *
 * @param x 这张表的全量行与 SSR 带几行。
 * @returns 切好的那一段。
 */
export function sponsorSliceOf(x: SponsorSliceIn): SponsorGroup {
  return { top: x.group.top.slice(0, x.rows), total: x.group.total }
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
 * 政策动态:同题去重带归一化 —— IRCC 同一稿隔日重发常只差尾部「(城市)」括注,
 * 精确比对抓不住。去重后再切到条数上限。
 *
 * @param x 原始行与下发条数上限。
 * @returns 去重切片后的动态。
 */
export function toNewsRows(x: NewsRowsIn): PulseNews[] {
  const seen = new Set<string>()
  const out: PulseNews[] = []
  for (const r of x.rows) {
    if (out.length >= x.limit) {
      return out
    }
    const k = newsKeyOf(textOf(r.title))
    if (seen.has(k) === false) {
      seen.add(k)
      out.push(toPulseNews(r))
    }
  }
  return out
}

/**
 * 同题去重的比对键:剪掉尾部括注、掐头去尾、转小写。
 *
 * @param title 官方原标题。
 * @returns 比对键。
 */
function newsKeyOf(title: string): string {
  return title.replace(NEWS_TAIL_RE, TEXT_NONE).trim().toLowerCase()
}

/**
 * 洗一条政策动态:各格照实兜空串。
 *
 * @param r 一条原始行。
 * @returns 一条动态。
 */
function toPulseNews(r: NewsRecentDbRow): PulseNews {
  let titleZh = TEXT_NONE
  if (r.title_zh != null) {
    titleZh = r.title_zh
  }
  return {
    date: String(r.date),
    region: textOf(r.region),
    title: textOf(r.title),
    titleZh,
    slug: textOf(r.slug),
  }
}

/**
 * 洗职业筛候选:题名照实兜空串(缺翻译不丢筛选项)。
 *
 * @param x 职业名维度行。
 * @returns 候选清单。
 */
export function toOccOptions(x: OccOptionsRowsIn): OccOption[] {
  const out: OccOption[] = []
  for (const r of x.rows) {
    out.push({ noc: r.noc, title: textOf(r.title), titleZh: textOf(r.title_zh) })
  }
  return out
}

/**
 * 洗职业筛联动的中/小类名:各格照实兜空串。
 *
 * @param x 分类维度行。
 * @returns 中/小类名清单。
 */
export function toCatOptions(x: CatOptionsRowsIn): CatOption[] {
  const out: CatOption[] = []
  for (const c of x.docs) {
    out.push({
      broad: catTextOf(c.broad),
      mid: catTextOf(c.mid),
      midEn: catTextOf(c.midEn),
      midKo: catTextOf(c.midKo),
      fine: catTextOf(c.fine),
      fineEn: catTextOf(c.fineEn),
      fineKo: catTextOf(c.fineKo),
    })
  }
  return out
}

/**
 * 分类维度行上的一格 → 显示串。这张表的列在 payload 那份生成类型里是「可以不填」的
 * (键可能压根不在),`== null` 一次收掉两种「没有」。
 *
 * @param v 那一格。
 * @returns 显示串;没有则空串。
 */
function catTextOf(v: CatCell): string {
  if (v == null) {
    return TEXT_NONE
  }
  return v
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
 * 二级导航条上的五项(顺序即条上的顺序)。#312:导航用短词(pulse.nav.*),
 * 分区 h2 保全称 —— 逐字同文等于同屏同一事实说两遍。
 *
 * @param x 取词函数。
 * @returns 五项。
 */
export function navItemsOf(x: NavItemsIn): NavItem[] {
  return [
    { id: ID_SE, label: x.t('pulse.nav.se') },
    { id: ID_BOARDS, label: x.t('pulse.nav.occ') },
    { id: ID_PROV, label: x.t('pulse.nav.prov') },
    { id: ID_PROVOCC, label: x.t('pulse.nav.provocc') },
    { id: ID_DRAWS, label: x.t('pulse.nav.draws') },
  ]
}

/**
 * 橱窗三分表按人群拆开(顺序即页面上的顺序:没工签 → 有工签 → 去海洋省)。
 * 空表不在这里滤 —— 「第几张」要按这个固定次序算,间距才跟原实现一致。
 *
 * @param x 橱窗三分表。
 * @returns 三项。
 */
export function sponsorGroupsOf(x: SponsorGroupsIn): SponsorGroupEntry[] {
  return [
    { kind: KIND_LMIA, group: x.sponsor.lmia },
    { kind: KIND_NAMED, group: x.sponsor.named },
    { kind: KIND_AIP, group: x.sponsor.aip },
  ]
}

/**
 * 四张分榜是不是全空(数据到了但榜全空才整块不渲染,绝不拿存量榜顶包)。
 *
 * @param b 四张榜。
 * @returns 是不是全空。
 */
export function boardsEmptyOf(b: OccBoards): boolean {
  return b.mine.length === 0 && b.backup.length === 0 && b.cooling.length === 0 && b.heating.length === 0
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
 * 洗一整批政策动态。
 *
 * @param x 动态行与界面语言。
 * @returns 展示行。
 */
export function toNewsCellRows(x: NewsCellRowsIn): NewsCellRow[] {
  const out: NewsCellRow[] = []
  for (let i = 0; i < x.rows.length; i += 1) {
    const r = x.rows[i]
    if (r != null) {
      out.push(toNewsCellRow({ r, i, lang: x.lang }))
    }
  }
  return out
}

/**
 * 洗一条政策动态:地址、日期、发布方标签与中文界面下的标题译名灰注
 * (E13-06,titleZh 由 ETL 本地翻译;没译文只出原题)。
 *
 * @param x 这一条与洗行要的上下文。
 * @returns 展示行。
 */
export function toNewsCellRow(x: NewsCellRowIn): NewsCellRow {
  let key = x.r.slug
  if (key === TEXT_NONE) {
    key = String(x.i)
  }
  let href = URL_NEWS
  if (x.r.slug !== TEXT_NONE) {
    href = URL_NEWS_HEAD + x.r.slug
  }
  let tag = x.r.region.toUpperCase()
  if (x.r.region === REGION_FEDERAL) {
    tag = TAG_IRCC
  }
  let titleZh = TEXT_NONE
  if (x.lang === LANG_ZH && x.r.titleZh !== TEXT_NONE) {
    titleZh = x.r.titleZh
  }
  return { key, href, date: ymd(x.r.date), tag, title: x.r.title, titleZh }
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
  if (x.market == null) {
    return null
  }
  const out: OccRowList = []
  for (const o of x.market.occ) {
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
  if (x.market == null) {
    return m
  }
  for (const o of x.market.occ) {
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
 * 三榜分层(Frank 2026-08-06 深夜拍板,口径 08-06 二改):判据 = **省具名紧缺清单命中**
 * (namedJobs),≠「有无 PNP 通道」—— 排除式省(AB;ON 改制后全职业可)和雇主担保类通用通道
 * 不进 namedJobs(Chefs 教训:榜A原名「无省提名通道」= 撒谎),榜题一律说「紧缺清单」。
 * E13-08:≥100 大盘门槛撤,全 NOC 入榜(Frank 2026-08-07);分页在表内,
 * 小样本环比由 mom14d 的 prev<5→null 守着。
 * AIP 维度职业级现库没有(occ 表无 aip 计数)→ 雷区 / 有兜底两榜暂按 PNP 清单口径,
 * ETL 加列后升级「PNP+AIP 双无」。
 *
 * @param x 全国行与可提名省份表。
 * @returns 四张榜。
 */
export function occBoardsOf(x: OccBoardsIn): OccBoards {
  const mine: OccRowList = []
  const backup: OccRowList = []
  const cooling: OccRowList = []
  const heating: OccRowList = []
  for (const o of x.natOcc) {
    if (provsOfOcc({ o, nocProvs: x.nocProvs }).length > 0) {
      if (o.mom14d != null && o.mom14d < COOLING_MAX) {
        cooling.push(o)
      }
      if (o.mom14d != null && o.mom14d > HEATING_MIN) {
        heating.push(o)
      }
    } else if (o.deadProvs != null && o.deadProvs !== TEXT_NONE) {
      mine.push(o)
    } else {
      backup.push(o)
    }
  }
  mine.sort(byOpenDesc)
  backup.sort(byTierThenOpen)
  cooling.sort(byMomAsc)
  heating.sort(byMomDesc)
  return { mine, backup, cooling, heating }
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
 * 14 天新发环比(排序用;两张榜的入榜条件已保证非 null)。
 *
 * @param o 这一行。
 * @returns 环比。
 */
function momOf(o: OccRowOne): number {
  if (o.mom14d == null) {
    return 0
  }
  return o.mom14d
}

/**
 * 通道档的行序(档未落库时全档同 rank,退回按在架量)。
 *
 * @param o 这一行。
 * @returns 行序。
 */
function tierRankOf(o: OccRowOne): number {
  if (o.channelTier == null) {
    return TIER_RANK_LAST
  }
  const rank = TIER_RANK[o.channelTier]
  if (rank == null) {
    return TIER_RANK_LAST
  }
  return rank
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
 * 通道档难的在上(Frank「把最难的放上面」),同档按在架量。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 比较结果。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byTierThenOpen(a: OccRowOne, b: OccRowOne): number {
  const byTier = tierRankOf(a) - tierRankOf(b)
  if (byTier !== 0) {
    return byTier
  }
  return openOf(b) - openOf(a)
}

/**
 * 跌得狠的在前。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 比较结果。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byMomAsc(a: OccRowOne, b: OccRowOne): number {
  return momOf(a) - momOf(b)
}

/**
 * 涨得猛的在前。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 比较结果。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byMomDesc(a: OccRowOne, b: OccRowOne): number {
  return momOf(b) - momOf(a)
}

/**
 * 分省概览的行:只取省 × 大类汇总行(旧行未落 mid 列时读取层回填 'all')。
 *
 * @param x 主图四份数据。
 * @returns 汇总行(数据还没到给空清单)。
 */
export function provRowsOf(x: NatOccIn): StatRowList {
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
 * 省筛的选项:只列本表真实存在的省,按职位板的省序排(表外的码兜到队尾)。
 *
 * @param x 本表的全量事实行。
 * @returns 省码清单。
 */
export function provOptsOf(x: ProvOptsIn): string[] {
  const set = new Set<string>()
  for (const r of x.rows) {
    for (const p of r.provs) {
      set.add(p)
    }
  }
  return [...set].sort(byProvOrder)
}

/**
 * 按职位板的省序比较两个省码。
 *
 * @param a 一个省码。
 * @param b 另一个省码。
 * @returns 比较结果。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byProvOrder(a: string, b: string): number {
  return provOrderOf(a) - provOrderOf(b)
}

/**
 * 一个省码在职位板省序里的位置;表外的码排最后。
 *
 * @param p 省码。
 * @returns 位置。
 */
function provOrderOf(p: string): number {
  const i = PROVS.indexOf(p)
  if (i < 0) {
    return PROV_ORDER_LAST
  }
  return i
}

/**
 * 通道筛的选项:只有具名省清单那张表出这一格(省提名绑省,通道是它的第二维)。
 *
 * @param x 本表的全量事实行与人群档。
 * @returns 通道名清单。
 */
export function streamOptsOf(x: StreamOptsIn): string[] {
  if (x.kind !== KIND_NAMED) {
    return []
  }
  const set = new Set<string>()
  for (const r of x.rows) {
    for (const s of r.streams) {
      set.add(s)
    }
  }
  return [...set].sort()
}

/**
 * 大类筛的选项:只列本表真实存在的分类(小样本橱窗表不比全量职位板,摆满 89 个中类
 * 全是死选项),按职位板的大类顺序(BROAD_SLUGS / etl/noc_buckets)排。
 *
 * @param x 本表的全量事实行与分类映射。
 * @returns 大类清单。
 */
export function broadOptsOf(x: BroadOptsIn): string[] {
  const set = new Set<string>()
  for (const r of x.rows) {
    for (const n of r.nocs) {
      const c = x.nocCat.get(n)
      if (c != null && c.broad !== TEXT_NONE) {
        set.add(c.broad)
      }
    }
  }
  return [...set].sort(byBroadOrder)
}

/**
 * 按职位板的大类顺序比较两个大类。
 *
 * @param a 一个大类。
 * @param b 另一个大类。
 * @returns 比较结果。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byBroadOrder(a: string, b: string): number {
  return broadOrderOf(a) - broadOrderOf(b)
}

/**
 * 一个大类在职位板大类序里的位置;表外的排最后。
 *
 * @param b 大类。
 * @returns 位置。
 */
function broadOrderOf(b: string): number {
  for (let i = 0; i < BROAD_SLUGS.length; i += 1) {
    const pair = BROAD_SLUGS[i]
    if (pair != null) {
      const [, broad] = pair
      if (broad === b) {
        return i
      }
    }
  }
  return PROV_ORDER_LAST
}

/**
 * 中类筛的选项:受上一级大类联动收窄。
 *
 * @param x 本表的全量事实行、分类映射与大类筛现值。
 * @returns 中类清单。
 */
export function midOptsOf(x: MidOptsIn): string[] {
  const set = new Set<string>()
  for (const r of x.rows) {
    for (const n of r.nocs) {
      const c = x.nocCat.get(n)
      if (c != null && c.mid !== TEXT_NONE && (x.fBroad === TEXT_NONE || c.broad === x.fBroad)) {
        set.add(c.mid)
      }
    }
  }
  return [...set].sort()
}

/**
 * 小类筛的选项(2026-08-09 Frank「全部小类呢?」—— 此前从中类直接跳到职业,
 * 少了职位板同款的一级):受上两级大类 / 中类联动收窄。
 *
 * @param x 本表的全量事实行、分类映射与上两级筛现值。
 * @returns 小类清单。
 */
export function fineOptsOf(x: FineOptsIn): string[] {
  const set = new Set<string>()
  for (const r of x.rows) {
    for (const n of r.nocs) {
      const c = x.nocCat.get(n)
      if (c != null && c.fine !== TEXT_NONE
        && (x.fBroad === TEXT_NONE || c.broad === x.fBroad)
        && (x.fMid === TEXT_NONE || c.mid === x.fMid)) {
        set.add(c.fine)
      }
    }
  }
  return [...set].sort()
}

/**
 * 职业筛的选项 = 纯点选(Frank 2026-08-08「手机上也没办法敲字」;搜雇主名文本框同日拍掉
 * 「文本框是干啥的」+ 手机零打字,筛选全点选;「只看技能类获批」钮 08-10 也拍掉 ——
 * 技能类获批数已是表内一列,自己点列排序即可):只列本表真实存在的职业,按雇主数倒序;
 * 字典缺题名的码原样兜底(不因缺翻译丢筛选项);受上三级联动收窄。
 *
 * @param x 本表的全量事实行、职业名候选、界面语言、分类映射与上三级筛现值。
 * @returns 职业选项。
 */
export function occSelOptsOf(x: OccSelOptsIn): OccSelOption[] {
  const cnt = new Map<string, number>()
  for (const r of x.rows) {
    for (const n of r.nocs) {
      if (occSelHitOf({ n, nocCat: x.nocCat, fBroad: x.fBroad, fMid: x.fMid, fFine: x.fFine })) {
        let had = cnt.get(n)
        if (had == null) {
          had = 0
        }
        cnt.set(n, had + 1)
      }
    }
  }
  const title = new Map<string, string>()
  for (const o of x.occOpts) {
    title.set(o.noc, occTitleOf({ o, lang: x.lang }))
  }
  const out: OccSelOption[] = []
  for (const [noc, count] of cnt.entries()) {
    let label = title.get(noc)
    if (label == null || label === TEXT_NONE) {
      label = noc
    }
    out.push({ noc, label, count })
  }
  out.sort(byCountDesc)
  return out
}

/**
 * 这个 NOC 过不过上三级分类筛(职业筛的选项按这一条收窄)。
 *
 * @param x NOC 码、分类映射与上三级筛现值。
 * @returns 过不过。
 */
function occSelHitOf(x: OccSelHitIn): boolean {
  const c = x.nocCat.get(x.n)
  if (x.fBroad !== TEXT_NONE && (c == null || c.broad !== x.fBroad)) {
    return false
  }
  if (x.fMid !== TEXT_NONE && (c == null || c.mid !== x.fMid)) {
    return false
  }
  if (x.fFine !== TEXT_NONE && (c == null || c.fine !== x.fFine)) {
    return false
  }
  return true
}

/**
 * 职业筛候选的显示名:中文界面优先中文译名,其余走官方英文名。
 *
 * @param x 这一条候选与界面语言。
 * @returns 显示名。
 */
function occTitleOf(x: OccTitleIn): string {
  if (x.lang === LANG_ZH && x.o.titleZh !== TEXT_NONE) {
    return x.o.titleZh
  }
  return x.o.title
}

/**
 * 按雇主数倒序比较两个职业选项。
 *
 * @param a 一项。
 * @param b 另一项。
 * @returns 比较结果。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byCountDesc(a: OccSelOption, b: OccSelOption): number {
  return b.count - a.count
}

/**
 * 通过全部六格筛选的行(全量已在客户端 → 筛选纯前端)。
 *
 * @param x 本表的全量事实行、六格筛选现值与分类映射。
 * @returns 命中行。
 */
export function shownSponsorsOf(x: ShownSponsorsIn): SponsorRowList {
  const out: SponsorRowList = []
  for (const r of x.rows) {
    if (sponsorHitOf({ r, f: x.f, nocCat: x.nocCat })) {
      out.push(r)
    }
  }
  return out
}

/**
 * 这一行过不过六格筛选。三级分类各判各的(与原实现同口径:大类命中的 NOC 与中类命中的
 * NOC 不必是同一个),职业筛按码直判。
 *
 * @param x 这一行、六格筛选现值与分类映射。
 * @returns 过不过。
 */
function sponsorHitOf(x: SponsorHitIn): boolean {
  if (x.f.fProv !== TEXT_NONE && x.r.provs.includes(x.f.fProv) === false) {
    return false
  }
  if (x.f.fStream !== TEXT_NONE && x.r.streams.includes(x.f.fStream) === false) {
    return false
  }
  const broadHit = someCatOf({ r: x.r, nocCat: x.nocCat, key: NOC_KEY_BROAD, v: x.f.fBroad })
  if (x.f.fBroad !== TEXT_NONE && broadHit === false) {
    return false
  }
  if (x.f.fMid !== TEXT_NONE && someCatOf({ r: x.r, nocCat: x.nocCat, key: NOC_KEY_MID, v: x.f.fMid }) === false) {
    return false
  }
  if (x.f.fFine !== TEXT_NONE && someCatOf({ r: x.r, nocCat: x.nocCat, key: NOC_KEY_FINE, v: x.f.fFine }) === false) {
    return false
  }
  if (x.f.fNoc !== TEXT_NONE && x.r.nocs.includes(x.f.fNoc) === false) {
    return false
  }
  return true
}

/**
 * 这一行有没有哪个 NOC 的某一级分类等于给定值。
 *
 * @param x 这一行、分类映射、取哪一级与要等于什么。
 * @returns 有没有。
 */
function someCatOf(x: SomeCatIn): boolean {
  for (const n of x.r.nocs) {
    const c = x.nocCat.get(n)
    if (c != null && c[x.key] === x.v) {
      return true
    }
  }
  return false
}

/**
 * 橱窗表页脚的说明:筛过就说命中几家 / 共几家,没筛就只说共几家。
 *
 * @param x 取词函数、命中数与总数。
 * @returns 说明文案。
 */
export function sponsorNoteOf(x: SponsorNoteIn): string {
  if (x.shown !== x.total) {
    return x.t('pulse.hitEmp', { m: numOf(x.shown), n: numOf(x.total) })
  }
  return x.t('pulse.totalEmp', { n: numOf(x.total) })
}

/**
 * 省筛下拉的显示名函数。
 *
 * @param x 取词函数。
 * @returns 显示名函数。
 */
export function makeProvLabel(x: LabelFactoryIn): LabelFn {
  return function provLabel(code: string): string {
    return provLabelOf({ t: x.t, code })
  }
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
 * 大类筛下拉的显示名函数(未分类那一档另有一条词)。
 *
 * @param x 取词函数。
 * @returns 显示名函数。
 */
export function makeBroadLabel(x: LabelFactoryIn): LabelFn {
  return function broadLabel(broad: string): string {
    if (broad === BROAD_UNCAT) {
      return x.t('cell.uncat')
    }
    return x.t(KEY_BROAD_HEAD + broad)
  }
}

/**
 * 中类 / 小类筛下拉的显示名函数(两级共用一个工厂,差别只在取哪三列):
 * 中文界面直接用数据层的中文值,英韩走 noc_categories 的对应列,缺就原样。
 *
 * @param x 分类维度行、界面语言与三个列名。
 * @returns 显示名函数。
 */
export function makeCatLabel(x: CatLabelIn): LabelFn {
  const en = new Map<string, string>()
  const ko = new Map<string, string>()
  for (const r of x.catMids) {
    en.set(r[x.keyCol], r[x.enCol])
    ko.set(r[x.keyCol], r[x.koCol])
  }
  return function catLabel(v: string): string {
    if (x.lang === LANG_ZH) {
      return v
    }
    let hit = en.get(v)
    if (x.lang === LANG_KO) {
      hit = ko.get(v)
    }
    if (hit == null || hit === TEXT_NONE) {
      return v
    }
    return hit
  }
}

/**
 * 职业筛下拉的显示名函数。
 *
 * @param x 职业筛的选项。
 * @returns 显示名函数。
 */
export function makeOccLabel(x: OccLabelIn): LabelFn {
  const byNoc = new Map<string, string>()
  for (const o of x.opts) {
    byNoc.set(o.noc, o.label)
  }
  return function occLabel(noc: string): string {
    const hit = byNoc.get(noc)
    if (hit == null) {
      return noc
    }
    return hit
  }
}

/**
 * 橱窗单表五只下拉的显示名函数(中类与小类共用一个工厂,差别只在取哪三列)。
 *
 * @param x 取词函数、分类维度行、界面语言与职业筛的选项。
 * @returns 五只显示名函数。
 */
export function sponsorLabelsOf(x: SponsorLabelsIn): SponsorLabels {
  return {
    prov: makeProvLabel({ t: x.t }),
    stream: makeStreamLabel({ t: x.t }),
    broad: makeBroadLabel({ t: x.t }),
    mid: makeCatLabel({
      catMids: x.catMids, lang: x.lang, keyCol: COL_MID_KEY, enCol: COL_MID_EN, koCol: COL_MID_KO,
    }),
    fine: makeCatLabel({
      catMids: x.catMids, lang: x.lang, keyCol: COL_FINE_KEY, enCol: COL_FINE_EN, koCol: COL_FINE_KO,
    }),
    occ: makeOccLabel({ opts: x.occSel }),
  }
}

/**
 * 职业筛下拉的值清单(只要码,显示名走 labelOf)。
 *
 * @param opts 职业筛的选项。
 * @returns 码清单。
 */
export function occSelValuesOf(opts: OccSelOption[]): string[] {
  const out: string[] = []
  for (const o of opts) {
    out.push(o.noc)
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
 * 把几个类拼成一个 className(HTML 的 class 属性按空白切词)。
 *
 * @param cls 各类。
 * @returns 拼好的 className。
 */
function joinCls(cls: string[]): string {
  return cls.join(CLS_SEP)
}

/**
 * 色带的类:基座 + 白底档 + hero 档。
 *
 * @param x 两个档位开关。
 * @returns className。
 */
export function bandClsOf(x: BandClsIn): string {
  const cls = [cssOf(css.band)]
  if (x.white) {
    cls.push(cssOf(css.bandWhite))
  }
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
 * 橱窗表的行身份。
 *
 * @param r 这一行展示行。
 * @returns 行键(雇主名)。
 */
export function sponsorRowKeyOf(r: SponsorCellRow): string {
  return r.name
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
 * 政策动态一条的类:基座 + 全局 hover 高亮 + 第二条起的上分隔线。
 *
 * @param x 是不是第一条。
 * @returns className。
 */
export function newsRowClsOf(x: NewsRowClsIn): string {
  const cls = [cssOf(css.newsRow), CLS_ROW_HOVER]
  if (x.first === false) {
    cls.push(cssOf(css.newsRowTop))
  }
  return joinCls(cls)
}

/**
 * 条数下拉的类:全局 .mktCtl(手机 44 触控靶的跨页规范)+ 本域的长相。
 *
 * @returns className。
 */
export function topnSelClsOf(): string {
  return joinCls([CLS_MKT_CTL, cssOf(css.topnSel)])
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
 * 对话导流钮的类(经 Button 渲染,权重靠 css 里的类名加倍,这里只取一次)。
 *
 * @returns className。
 */
export function askClsOf(): string {
  return cssOf(css.ask)
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
 * 条数下拉的档位:三档里只留数据撑得住的那几档(只剩一档 = 没得选,整只下拉不出)。
 *
 * @param max 数据一共有多少条。
 * @returns 档位清单。
 */
export function topnOptsOf(max: number): number[] {
  const out: number[] = []
  for (const n of TOPN_OPTS) {
    if (out.length === 0 || n <= Math.max(max, TOPN_MIN)) {
      out.push(n)
    }
  }
  return out
}

/**
 * 换一级筛选的手柄:落本级的值,再把下面几级一并清空(大类→中类→小类→职业四级联动)。
 *
 * @param x 本级落格与下面几级的落格。
 * @returns 换值手柄。
 */
export function makeFilterPick(x: FilterPickIn): FilterFn {
  return function pick(v: string): void {
    x.set(v)
    for (const reset of x.resets) {
      reset(TEXT_NONE)
    }
  }
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
 * 条数下拉的换档手柄(把事件拆成数)。
 *
 * @param x 换档的落格。
 * @returns 换档手柄。
 */
export function makeTopNChange(x: TopNChangeIn): SelectChangeFn {
  return function onChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.set(Number(e.target.value))
  }
}

/**
 * 表题旁对话导流钮的点击手柄。2026-08-08 Frank 追加「表管事实,人话归对话」:
 * 行为复刻 C6 通道卡 PathwaysCard.openChat 的既有写法(o2p:chat-open + prefill),
 * 不自造事件;预填问句只填框,**绝不代发送**。
 *
 * @param x 人群档与取词函数。
 * @returns 点击手柄。
 */
export function makeAskChat(x: AskChatIn): ClickFn {
  return function open(): void {
    track(TRACK_ASK)
    window.dispatchEvent(new CustomEvent(EV_CHAT_OPEN, { detail: { prefill: x.t(KEY_SE_ASK_HEAD + x.kind) } }))
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
