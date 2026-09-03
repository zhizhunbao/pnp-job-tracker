/**
 * jobs 页面域的函数:URL ↔ 筛选的唯一映射、cookie 读写、列集与表头派生、
 * 单元格三段律的中段(库行 → 展示行)、手机卡胶囊规格、列宽的两个纯算法、
 * JD 正文的断行与分节、建议问题提取、投递邮件拼装、详情页的面包屑与兜底链。
 * 零 JSX 零 hook —— 排版归各 tsx,状态归 hooks.ts,死值归 constants.ts。
 *
 * 🔴 本文件**不带 `'use client'`**:服务端 page.tsx 要用 parseJobFilters / toSearchParams /
 * parseColWidthSeed(它们与客户端是同一套口径,分家就会两头对不上),标了指令就把
 * 服务端那半也拖进客户端边界。
 *
 * 🔴 三处逐行特批的多参签名(`fetchJobText` / `extractSug` / `resizeColWidths`):
 * 它们的调用点在**本批不许动的地方** —— 前两个在 components/advisor(本批只许改它的
 * import 行),第三个在 tests/int/colResize.int.spec.ts 的九条断言里。签名由外部消费者
 * 定死,收成 `XxxIn` 就要改那两处;等 advisor 换装批一起收。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { eeIsDormant, eeLastDraw } from '@/components/pnp'
import { cssOf } from '@/components/css'
import { OB_SEEN_KEY } from '@/components/profile'
import { readQuiz } from '@/components/quiz'
import { BROAD_SLUGS } from '@/lib/stats'
import { makeT } from '@/lib/i18n'
import { eeDisplay, isDirect, isJdNone, sourceLabel, streamDisplay } from '@/lib/jobs'
import { PROV_NAMES, mapQuery, mapsUrl, parseLoc, provName } from '@/lib/location'
import { FREE_MATCH_JOBS_PER_DAY } from '@/lib/quota'
import { catName, colorOf, nocLocalTitle } from '@/lib/noc'
import { fmtLocalSec, ymd } from '@/lib/time'
import { track } from '@/lib/track'
import {
  ACC_UNKNOWN, AI_BOLD_RE, AI_GAP_RE, AI_GAP_TO, AI_LEAD_BLANK_RE, AI_TAIL_BLANK_RE, APPLY_MAIL_RE, AT, AUTH_LOGIN,
  AUTH_REGISTER, AUTH_RESET, BLOCK_KEY_SEP, BROAD_ORDER_LAST, CANADA_MAIL_SUFFIX,
  CARET_CLOSED, CARET_DOWN, CARET_OPEN, CARET_RIGHT, CELL_TONE_CLS, CHIP, CHIP_TONE_CLS, COL, COL_FLOOR, COLS_COOKIE,
  COLS_MAX_AGE_S, COLUMNS, COLW_COOKIE, COLW_MAX_AGE_S, COMMA, COMPANY_MIN_LEN, COMPANY_SUFFIX_RE, COOKIE_EQ,
  COOKIE_PATH_AGE, COOKIE_SAMESITE, CSS_BORDER_NONE, CSS_STICKY, CURSOR_COL_RESIZE, CURSOR_NONE, DASH, DATE_LEN,
  DEFAULT_COLS, DIR_ASC, DIR_DESC, DIRECT_URL_KEY, DISPOSITION_NONE, EE_PREFIX, ELIG_OK, EV_MOUSE_MOVE, EV_MOUSE_UP,
  FIELD_GROUP, FILTER_PROV, FILTER_Q, FK, FK_DIRECT, FMT_QUOTA, FOLD_KEYS, FROZEN_COLS, FROZEN_EDGE_SHADOW,
  FROZEN_LINE_SHADOW, FROZEN_Z, GC_MAIL_SUFFIX, HDR_FREE_LEFT, HEAD_BG, HEAD_LINE,
  HTTP_PAYMENT, HTTP_TOO_MANY, JB_MAIL_HOST, JD_ALT_SEP, JD_BARE_LABEL_RE, JD_BULLET_MARK, JD_BULLET_PREFIX,
  JD_BULLET_RE, JD_DASH_PREFIX_RE, JD_DONE, JD_DUP_MAX_LEN, JD_EMPHASIS_RE, JD_EMPTY, JD_ESC_RE, JD_ESC_TO,
  JD_GLUE_TPL, JD_HR_DASH_TPL, JD_HR_LABELS, JD_HR_LINE_TO, JD_HR_LINE_TPL, JD_INLINE_LABELS, JD_INLINE_TPL, JD_KIND,
  JD_LABEL_LINE_RE, JD_LEAD_BULLET_RE, JD_MONEY_RE, JD_SEC_APPLY, JD_SEC_PAY, JD_SEC_ROLE, JD_SEC_SPLIT_RE,
  JD_SEC_STEP, JD_SECS, JD_SENTENCE_RE, JD_SPACES_RE, JD_STAR_ITEM_RE, JD_STAR_RE, JD_SUB_HEADS, JD_TOP_HEADS,
  JD_TPL_SLOT, K_ACC, K_COL, K_DIVISOR, K_ELIG, K_EMP, K_LOCK_TIP, K_MATCH, K_OPT, K_ORIGIN, K_PROV, K_SPONSOR_GRADE,
  K_SUG_GENERIC, K_TEER, K_TERM, K_UNCAT, KIND, LANG_ZH, LAYOUT_AUTO, LEVEL_BROAD, LEVEL_FINE, LEVEL_MID,
  LMIA_PREFIX, LOC_SEP, MAIL_ATTACH, MAIL_BLANK, MAIL_BODY_AT, MAIL_BODY_DOT, MAIL_BODY_HEAD, MAIL_BODY_IN,
  MAIL_BODY_QUOTE, MAIL_CRLF, MAIL_HELLO, MAIL_POSTING, MAIL_REGARDS, MAIL_SUBJECT_AT, MAIL_SUBJECT_HEAD, MAILTO,
  MAILTO_BODY, MAILTO_SUBJECT, MATCH_TONE_CLS, MEASURE_CLS, MEASURE_ROWS, MV_DOT, NEWLINE, NOWRAP_COLS, P90, P_DIR,
  P_LOGIN, P_PAGE, P_RESET, P_SIGNUP, P_SORT, P_VIEW, PAREN_L, PAREN_R, PCT_DECIMALS, PCT_MULTIPLIER, PILOT_ANY,
  PILOT_NONE, PNP_OCC_INELIGIBLE, PNP_OCC_PROGRAM_AIP, PNP_OCC_PROGRAM_PNP, PREF_KEY, PRO_COLS, PRO_MASK, PROV_QC,
  QS_HEAD, RE_ESC_RE, RE_FLAG_G, RE_FLAG_GI, ROW_BG, ROW_BG_ALT, ROW_LINE, SAVED_STATUS_WISH, SEC_MODE, SEP_EN,
  SEP_ZH, SIG_EQ, SIG_SEP, SIGN_DOLLAR, SIGN_PCT, SIGN_PLUS, SORT_MARK_ASC, SORT_MARK_DESC, SORT_MARK_IDLE, SPACE,
  SPONSOR_GRADE_AIP_ONLY, STAR_OFF, STAR_ON, STATUS_CLOSED, SUG_CUT_RE, SUG_DEDUP_TO, SUG_DEDUP_TPL, SUG_HEAD_MARK,
  SUG_LAST_MAX, SUG_LAST_MIN, SUG_MARK, SUG_MAX_LEN, SUG_QUESTION_RE, SUG_TAIL_MAX, TABLE_SEL, TABLE_WRAP_SEL,
  TARGET_MAX, TARGET_P90, TBODY_ROW_SEL, TEER_PREFIX, TEER_ROUTE_MAX, TEXT_NONE, TEXT_STATUS, TH_SEL, TONE,
  TRACK_KEY_FROM, TRACK_REL_JOB, TRAIL_WS_RE, TRANS_ERROR, TRANS_LOADING, UNCAT, UNIT_HOUR, UNIT_K_YEAR,
  UPSELL_LOGIN, UPSELL_MATCH, UPSELL_SS, URL_API_JOB_TEXT, URL_BOARD, URL_BOARD_BROAD, URL_BOARD_FINE,
  URL_BOARD_MATCH, URL_BOARD_MID, URL_BOARD_PROV, URL_JOB, URL_JOBS_QUERY, URL_LEVEL_AMP, URL_TO_FILTER, VAL_MATCH,
  VAL_ON, WIDTH_MAX_CONTENT, WIDTH_MIN_CONTENT, WIDTH_SLACK, WIDTH_ZERO, WRAP_COLS, WWW_PREFIX_RE, YEAR_MONTH_LEN,
  ZEBRA_MOD,
} from './constants'
import type {
  AgeTextFn, AgeTextIn, AiNoteTextIn, AliasOfIn, Alloc, AllocateIn, AnyRouteIn, ApplyFiltersIn, ApplyLabelIn,
  AuthFromUrlOut, AuthMode, BlockedKeys, BoardCardIn, BoardCardView, BoardCellIn, BoardCellView, BoolFn,
  CapSugIn, CatLabel, CatLabelIn, CatSegsIn, CellClickIn, CellIn, CellTone, CellView, CellWidthsIn, ChipClickIn,
  ChipIn, ChipPushBlockIn, ChipPushIn, ChipPushQcIn, ChipSpec, ChipSpecsIn, CityOptsIn, ClearFiltersIn, ClickFn,
  ColActionIn, ColMeasure, ColOptionView, ColResizeIn, ColResizeStartIn, ColSpec, ColStatsIn, ColWant, ColWidthFnIn,
  ColWidthSeed, CookieIn, CrumbSeg, CurFiltersIn, DataKeyIn, DescOpenIn, DistOptsIn, DonorsIn, DragIn,
  FallbackHrefIn, FallbackTextIn, FallbackValueIn, FieldOpenIn, FillIn, FilterCountIn, FilterOpts, FilterOptsIn,
  FilterState, FilterValueIn, FineOptsIn, FixedNoteIn, FoldBtnClsIn, FrozenStyleIn, FullHrefIn, GapIn, HeadCellAtIn,
  HeadCellView, HeadClsIn, HeadTitleIn, JdLinesIn, JdLineView, JdPair, JdPairsIn, JdPayIn, JdReIn,
  JdSecHeadIn, JdSecModeIn, JdSectionMode, JdSectionsIn, JdSectionView, JobColKey, JobDetailIn, JobDetailView,
  JobDims, JobFact, JobFilters, JobPlan, JobPlanIn, JobsBoardPanel, JobsQueryIn, JobTextOut, KMoneyIn, MailBodyIn,
  MailtoIn, MapHrefIn, MatchLabelIn, MatchProfileFact, MeasureIn, MeasureOut, MeasurePassIn,
  MeasureWordIn, MidOptsIn, MoreLabelIn, MvBarTextIn, NextSortIn, NocCategoryDoc, NocCatRow, NocDescDoc, NocDescFact,
  NocHeadIn, NocLabelIn, NocNameIn, NocRowIn, NoTextIn, NumOrIn, OrigLabelIn, PageSigIn, PayFallbackForIn,
  PickedShownIn, PlanProfileIn, PnpOccRow, PrefixLabelIn, ProMatchIn, ProofTextIn, ProvFullIn, ProvWordIn, RankOfIn,
  ResizeBindIn,
  RoundIn, SavedEntry, SavedListJson, SaveLabelIn, SaveToggleIn, SeedFilterIn, SeedJson, SeedValueIn, SessionUser,
  ShowFallbackIn, ShowFormattedIn, ShowRelatedIn, ShowSourceIn, SlotIn, SortMarkIn, SortState, StickyOffsetsIn,
  SubOfIn, SubTextIn, SugOut, TakerIn, TextFn, TFn, ThWidthIn, TransLabelIn, TransShownIn, TransStatus,
  UpsellKind, UpsellReasonIn, WantsIn, WidthsKeyIn,
} from './types'
import { CACHE } from './variables'
import css from './jobs.module.css'

/**
 * Next 的 searchParams 对象 → URLSearchParams(服务端也走 parseJobFilters 一个入口,
 * 别自己拆)。同名参数重复出现时取第一个,与 `sp.get` 同语义。
 *
 * @param sp Next 传进来的查询参数对象。
 * @returns 标准查询参数。
 */
export function toSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') {
      u.set(k, v)
    } else if (Array.isArray(v) && v.length > 0) {
      u.set(k, String(v[0]))
    }
  }
  return u
}

/**
 * URL 参数 → 筛选对象。省接受两位码或全名(深链两种都在用),统一存全名 ——
 * fProv/深链/保存的筛选都依赖它。
 *
 * @param sp 查询参数。
 * @returns 非默认筛选;空对象 = 干净板。
 */
export function parseJobFilters(sp: URLSearchParams): JobFilters {
  const f: JobFilters = {}
  for (const [urlKey, fKey] of Object.entries(URL_TO_FILTER)) {
    const got = sp.get(urlKey)
    let raw = TEXT_NONE
    if (got != null) {
      raw = got.trim()
    }
    if (raw === TEXT_NONE) {
      continue
    }
    f[fKey] = filterValueOf({ fKey, raw })
  }
  if (sp.get(DIRECT_URL_KEY) === VAL_ON) {
    f.directOnly = true
  }
  return f
}

/**
 * 省参数的取值:两位码翻成全名,别的参数原样。
 *
 * @param x 筛选键与原始值。
 * @returns 落进筛选对象的值。
 */
function filterValueOf(x: FilterValueIn): string {
  if (x.fKey !== FILTER_PROV) {
    return x.raw
  }
  const full = PROV_NAMES[x.raw.toUpperCase()]
  if (full == null) {
    return x.raw
  }
  return full
}

/**
 * 省全名 → 两位码(市/区联动要按码筛维度表)。
 *
 * @param name 省全名;'' = 没选省。
 * @returns 省码;查不到给空串。
 */
export function provCodeOf(name: string): string {
  if (name === TEXT_NONE) {
    return TEXT_NONE
  }
  for (const [code, full] of Object.entries(PROV_NAMES)) {
    if (full === name) {
      return code
    }
  }
  return TEXT_NONE
}

/**
 * 筛选签名:客户端拿它比对「SSR 是不是已经按这套筛选查过了」,一致就跳过首次重复请求。
 *
 * @param f 筛选对象。
 * @returns 与顺序无关的签名串。
 */
export function filterSig(f: JobFilters): string {
  const parts = []
  for (const k of Object.keys(f).sort()) {
    parts.push(k + SIG_EQ + String(f[k]))
  }
  return parts.join(SIG_SEP)
}

/**
 * 当前非默认筛选:一张 fState 表喂五处 —— URL 写、URL 读(兜底)、快照写、快照回放、请求参数。
 *
 * @param x 筛选各格 + 关键词(可传防抖后的词)+ 只看直发。
 * @returns 非默认筛选;空对象 = 干净板。
 */
export function curFiltersOf(x: CurFiltersIn): JobFilters {
  const f: JobFilters = {}
  for (const [k, s] of Object.entries(x.fState)) {
    let v = s.v
    if (k === FILTER_Q) {
      v = x.q.trim()
    }
    if (v !== TEXT_NONE) {
      f[k] = v
    }
  }
  if (x.directOnly) {
    f.directOnly = true
  }
  return f
}

/**
 * 筛选对象 → /api/jobs 的查询串(布尔折成 '1')。
 *
 * @param f 筛选对象。
 * @returns 查询参数。
 */
export function filterParamsOf(f: JobFilters): URLSearchParams {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(f)) {
    if (v === true) {
      sp.set(k, VAL_ON)
    } else {
      sp.set(k, String(v))
    }
  }
  return sp
}

/**
 * 拼一条 cookie 串(名、已编码的值、存活秒数;路径与同站策略全站一套)。
 *
 * @param x cookie 名、值与时效。
 * @returns 可直接赋给 `document.cookie` 的串。
 */
export function cookieStringOf(x: CookieIn): string {
  return x.name + COOKIE_EQ + x.value + COOKIE_PATH_AGE + String(x.maxAge) + COOKIE_SAMESITE
}

/**
 * 写列集 cookie:下次刷新服务端直接渲对的列,零闪烁。
 *
 * @param keys 当前勾选的列键。
 * @returns 无。
 */
export function writeColsCookie(keys: string[]): void {
  try {
    document.cookie = cookieStringOf({
      name: COLS_COOKIE,
      value: encodeURIComponent(JSON.stringify(keys)),
      maxAge: COLS_MAX_AGE_S,
    })
  } catch {
    return
  }
}

/**
 * 解析列宽 cookie 值 → 种子;脏数据/对不上一律当没有。
 *
 * @param raw cookie 原值;缺席或空串 = 没有。
 * @returns 种子;不可用时给 null。
 */
export function parseColWidthSeed(raw: string | undefined | null): ColWidthSeed | null {
  if (raw == null || raw === TEXT_NONE) {
    return null
  }
  try {
    const s: unknown = JSON.parse(decodeURIComponent(raw))
    return seedOf(s)
  } catch {
    return null
  }
}

/**
 * 解出来的东西是不是一份能用的种子:keys 是串、pct 是同长度的百分比数组。
 *
 * @param s JSON 解出来的东西。
 * @returns 种子;不合格给 null。
 */
function seedOf(s: unknown): ColWidthSeed | null {
  if (s == null || typeof s !== 'object') {
    return null
  }
  const o = s as SeedJson
  if (typeof o.keys !== 'string' || Array.isArray(o.pct) === false) {
    return null
  }
  const pct = o.pct as unknown[]
  if (pct.length !== o.keys.split(COMMA).length) {
    return null
  }
  const nums: number[] = []
  for (const n of pct) {
    if (typeof n !== 'number' || n <= 0 || n >= PCT_MULTIPLIER) {
      return null
    }
    nums.push(n)
  }
  return { keys: o.keys, pct: nums }
}

/**
 * 默认显示的核心列(一键回到它)。
 *
 * @returns 默认列集的副本。
 */
export function defaultColsOf(): JobColKey[] {
  return DEFAULT_COLS.slice()
}

/**
 * 可勾选的列(固定列与 match 不进选择器 —— match 是「我的匹配」视图专属)。
 *
 * @returns 可勾选列键。
 */
export function togglableColsOf(): JobColKey[] {
  const keys: JobColKey[] = []
  for (const c of COLUMNS) {
    if (c.always !== true && c.key !== COL.match) {
      keys.push(c.key)
    }
  }
  return keys
}

/**
 * cookie/localStorage 里存的列键 → 只留今天还认得的那些(改过列集也不会炸)。
 *
 * @param keys 存量列键。
 * @returns 合法列键。
 */
export function knownColsOf(keys: string[]): JobColKey[] {
  const out: JobColKey[] = []
  for (const c of COLUMNS) {
    if (keys.includes(c.key)) {
      out.push(c.key)
    }
  }
  return out
}

/**
 * 当前该渲哪几列:固定列恒在,其余按勾选;match 列不出
 * (Frank 2026-07-27 看着匹配视图整列全是「高」:「这一列没有必要吧」—— 这个视图本身
 * 就是「你的匹配」,再来一列逐行复读一遍「高」是零信息量。匹配仍然是**筛选与排序**维度:
 * view=match 的 WHERE、fElig 筛选、sort=match,只是不占一列)。
 *
 * @param visible 勾选的列键。
 * @returns 按列序排好的列。
 */
export function shownColsOf(visible: JobColKey[]): ColSpec[] {
  const out: ColSpec[] = []
  for (const c of COLUMNS) {
    if (c.key === COL.match) {
      continue
    }
    if (c.always === true || visible.includes(c.key)) {
      out.push(c)
    }
  }
  return out
}

/**
 * 只冻结**最左连续**的固定列:中间插了非固定列就停,保证 sticky 偏移 = 真实累计位置
 * (不会错位)。
 *
 * @param shown 当前列。
 * @returns 要冻结的列键(顺序即列序)。
 */
export function frozenKeysOf(shown: ColSpec[]): JobColKey[] {
  const keys: JobColKey[] = []
  for (const c of shown) {
    if (FROZEN_COLS.has(c.key) === false) {
      break
    }
    keys.push(c.key)
  }
  return keys
}

/**
 * 固定列单元格的贴边样式:sticky + 累计 left + 不透明底色(挡住滚动内容);
 * 竖线走 inset 阴影 —— border-collapse 的表里 sticky 单元格的右边框 Chromium 不画
 * (Frank「查询之后列竖线没了,点一下竖线才恢复」就是它)。
 *
 * @param x 列键、横滚态、冻结集、累计偏移与两个色。
 * @returns 贴边样式;不该固定时给 null。
 */
export function frozenStyleOf(x: FrozenStyleIn): React.CSSProperties | null {
  const left = x.stickyLeft[x.k]
  if (x.overflow === false || x.frozenSet.has(x.k) === false || left == null) {
    return null
  }
  let shadow = FROZEN_LINE_SHADOW + x.line
  if (x.k === x.lastFrozen) {
    shadow = shadow + FROZEN_EDGE_SHADOW
  }
  return {
    position: CSS_STICKY,
    left,
    zIndex: FROZEN_Z,
    background: x.bg,
    borderRight: CSS_BORDER_NONE,
    boxShadow: shadow,
  }
}

/**
 * 这一列的内容折不折行:原子值列不折(日期/金额/百分比等短值,断行会很丑),
 * 短语列(AIP/LMIA/资格/匹配)照折 —— 它们中文短、英文长,让它们在本列内换行,别再挤隔壁。
 *
 * @param k 列键。
 * @returns 不折行 = true。
 */
export function colNoWrapOf(k: JobColKey): boolean {
  return NOWRAP_COLS.has(k) && WRAP_COLS.has(k) === false
}

/**
 * 表头的悬停说明:年薪列挂折算口径(表头收短成「年薪」后,口径悬停才出、不占版面),
 * 其余挂「点表头排序」。
 *
 * @param x 取词函数与列键。
 * @returns 悬停说明。
 */
export function headTitleOf(x: HeadTitleIn): string {
  if (x.k === COL.salaryYr) {
    return x.t('fact.salYrNote')
  }
  return x.t('th.tip')
}

/**
 * 表头的排序提示符。
 *
 * @param x 当前是不是按这一列排、排序方向。
 * @returns ▼ / ▲ / ↕。
 */
export function sortMarkOf(x: SortMarkIn): string {
  if (x.active === false) {
    return SORT_MARK_IDLE
  }
  if (x.dir === DIR_DESC) {
    return SORT_MARK_DESC
  }
  return SORT_MARK_ASC
}

/**
 * 点表头换排序:新列降序 → 第二下升序 → 第三下取消,回本视图默认
 * (匹配视图 = 匹配度,普通视图 = 发布时间;#127 评分默认序退役)。
 *
 * @param x 当前排序态、点的哪一列、本视图默认列。
 * @returns 下一个排序态。
 */
export function nextSortOf(x: NextSortIn): SortState {
  if (x.sort.key !== x.key) {
    return { key: x.key, dir: DIR_DESC }
  }
  if (x.sort.dir === DIR_DESC) {
    return { key: x.key, dir: DIR_ASC }
  }
  return { key: x.fallback, dir: DIR_DESC }
}

/**
 * 官方具名排除清单:整表算一次 `省码|NOC` 命中集,逐行 O(1) 查。
 * E6-09(2026-07-26 Frank「恢复可点」):命中官方具名排除清单的岗,格子要说结论、
 * 要能点开看依据 —— 与「TEER 不够」这种泛判定不同。
 *
 * @param rows pnp-occupations 维度行。
 * @returns 两套键集。
 */
export function blockedKeysOf(rows: PnpOccRow[]): BlockedKeys {
  const pnp = new Set<string>()
  const aip = new Set<string>()
  for (const r of rows) {
    if (r.type !== PNP_OCC_INELIGIBLE) {
      continue
    }
    let program = r.program
    if (program === TEXT_NONE) {
      program = PNP_OCC_PROGRAM_PNP
    }
    const key = r.province + BLOCK_KEY_SEP + r.noc
    if (program === PNP_OCC_PROGRAM_AIP) {
      aip.add(key)
    } else {
      pnp.add(key)
    }
  }
  return { pnp, aip }
}

/**
 * 这个格子点了有没有反应 —— 收编后 none 一档不再开弹框,若仍渲成手型
 * 就成了「看着能点、点了没反应」,比不能点更糟。手型与真实行为绑同一个判据。
 * title 例外:它不走 FIELD_GROUP,直开职位描述弹框(2026-07-19 Frank 拍板)。
 *
 * @param k 列键。
 * @returns 可点 = true。
 */
export function cellActionable(k: JobColKey): boolean {
  if (k === COL.title) {
    return true
  }
  const d = FIELD_GROUP[k]
  return d != null && d !== DISPOSITION_NONE
}

/**
 * 这一行的这一格现在可不可点。批A 追拍(Frank「走不了的就别给点了」):
 * PNP/EE/AIP 的「—」格(无信号)摘可点 —— 点开只会看到「走不了」,没有意义。
 * 2026-07-26 Frank「恢复可点」:命中官方具名清单的走不了 = 有依据可看,重新可点
 * (泛判定的「—」仍不可点)。
 *
 * @param x 列键、库行、上下文。
 * @returns 可点 = true。
 */
export function cellActive(x: CellIn): boolean {
  if (cellActionable(x.k) === false) {
    return false
  }
  const key = x.j.province + BLOCK_KEY_SEP + x.j.noc
  if (x.k === COL.pnp) {
    return x.j.pnpEligible === true || x.cx.blocked.pnp.has(key)
  }
  if (x.k === COL.ee) {
    return hasText(x.j.eeCategory)
  }
  if (x.k === COL.aip) {
    return x.j.aip === true || x.cx.blocked.aip.has(key)
  }
  if (x.k === COL.pilot) {
    return hasText(x.j.pilot)
  }
  return true
}

/**
 * 这一格有没有值(库里可空的文本列统一走它,不用 `!x`)。
 *
 * @param s 库里的文本;缺席/空串 = 没有。
 * @returns 有值 = true。
 */
function hasText(s: string | null | undefined): boolean {
  return s != null && s !== TEXT_NONE
}

/**
 * 库里可空的文本 → 显示值:没有就给长横。
 *
 * @param s 库值。
 * @returns 显示值。
 */
function dashOf(s: string | null | undefined): string {
  if (hasText(s) === false) {
    return DASH
  }
  return String(s)
}

/**
 * 库里可空的文本 → 空串(算派生值时用,别把 null 带进拼串)。
 *
 * @param s 库值。
 * @returns 文本;没有给空串。
 */
function textOf(s: string | null | undefined): string {
  if (s == null) {
    return TEXT_NONE
  }
  return s
}

/**
 * 分类的显示名:'未分类' 复用规范键 `cell.uncat`(字典里没有 `broad.未分类`,
 * 否则会回退成原样输出 "broad.未分类");其余走 catName —— 名字住 noc_categories,
 * 分类换一版不必再往 i18n 里手加 17×3 个键(#256 那类事故的同一个根)。
 *
 * @param x 取词函数与分类值。
 * @returns 人话分类名。
 */
export function catTextOf(x: CatLabelIn): string {
  if (x.v === TEXT_NONE || x.v === UNCAT) {
    return x.t(K_UNCAT)
  }
  return catName({ t: x.t, value: x.v })
}

/**
 * 造一份空展示行再按需覆盖(每一格都有默认值,省得逐处写全)。
 *
 * @param x 要覆盖的那几格。
 * @returns 展示行。
 */
function blankView(x: Partial<CellView>): CellView {
  const base: CellView = {
    kind: KIND.text,
    text: DASH,
    tone: TONE.plain,
    title: TEXT_NONE,
    href: TEXT_NONE,
    color: TEXT_NONE,
    level: TEXT_NONE,
    pop: TEXT_NONE,
  }
  const got = Object.assign(base, x)
  if (x.pop == null && got.kind === KIND.text) {
    got.pop = got.text
  }
  return got
}

/**
 * 一格的展示行:先按 Pro 锁位与匹配列分流,再按字段族逐族算。
 * ⚠️ Pro 锁位那一支眼下**取不到**:PRO_COLS 只剩 match 一个键,而条件里又把 match 排掉了
 * (2026-07-25 放开 vs 中位三件套之后就是这个样子)。留着是因为 PRO_COLS 是单一来源 ——
 * 哪天再锁一列,锁位与打码逻辑立刻生效,不必重写。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行;操作列先出(它不渲文本,格件按 kind 换收藏钮 —— 2026-08-29 换装批
 *   实拍抓的回归:此分支缺席时 actions 一路漏到 metaCellOf 的 lastSeen 兜底,
 *   「操作」格渲成抓取时间戳)。
 */
export function cellViewOf(x: CellIn): CellView {
  if (x.k === COL.actions) {
    return blankView({ kind: KIND.actions })
  }
  if (PRO_COLS.has(x.k) && x.cx.plan.isPro === false && x.k !== COL.match) {
    return blankView({ kind: KIND.lock, text: maskOf(x.k), title: x.cx.t(K_LOCK_TIP + x.k) })
  }
  if (x.k === COL.match) {
    return matchViewOf(x)
  }
  const cat = catCellOf(x)
  if (cat != null) {
    return cat
  }
  const job = jobCellOf(x)
  if (job != null) {
    return job
  }
  const money = salaryCellOf(x)
  if (money != null) {
    return money
  }
  const place = placeCellOf(x)
  if (place != null) {
    return place
  }
  const signal = signalCellOf(x)
  if (signal != null) {
    return signal
  }
  return metaCellOf(x)
}

/**
 * Pro 锁位的打码占位数(真值免费态压根不出服务端,占位数是假的,扒开也没用)。
 *
 * @param k 列键。
 * @returns 占位数;没配就给长横。
 */
function maskOf(k: JobColKey): string {
  const m = PRO_MASK[k]
  if (m == null) {
    return DASH
  }
  return m
}

/**
 * 与我的匹配(E5-00):高 = 绿 chip / 中 = 蓝 / 低 = 灰 / 不适用 = 浅;未建档 → 引导。
 * 匹配全放开(Frank 2026-07-21):所有岗都出真实档位,不再有「超额打码」档 ——
 * 收费只剩 Pro 数据列。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行。
 */
function matchViewOf(x: CellIn): CellView {
  if (x.j.match != null) {
    return blankView({
      kind: KIND.match,
      text: x.cx.t(K_MATCH + x.j.match),
      level: x.j.match,
      title: x.cx.t('match.tip'),
    })
  }
  if (x.cx.plan.loggedIn === false || x.cx.plan.profileOk === false) {
    return blankView({ kind: KIND.needProfile, text: x.cx.t('match.needProfile') })
  }
  return blankView({ tone: TONE.muted })
}

/**
 * 分类族:大/中/小分类、TEER、NOC 码、经验级别。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行;不是本族给 null。
 */
function catCellOf(x: CellIn): CellView | null {
  const t = x.cx.t
  if (x.k === COL.broad) {
    return blankView({ text: catTextOf({ t, v: x.j.broad }), tone: TONE.cat, color: colorOf(x.j.broad).fg })
  }
  if (x.k === COL.mid) {
    return blankView({ text: catTextOf({ t, v: x.j.mid }), tone: TONE.slate })
  }
  if (x.k === COL.fine) {
    if (hasText(x.j.mid) === false || x.j.mid === UNCAT || x.j.fine === x.j.mid) {
      return blankView({ tone: TONE.slate })
    }
    return blankView({ text: catTextOf({ t, v: x.j.fine }), tone: TONE.slate })
  }
  if (x.k === COL.teer) {
    if (x.j.teer == null) {
      return blankView({ tone: TONE.slate })
    }
    const tip = t('teer.tip', { n: x.j.teer, l: t(K_TEER + x.j.teer) })
    return blankView({ text: TEER_PREFIX + String(x.j.teer), tone: TONE.slate, title: tip, pop: TEXT_NONE })
  }
  if (x.k === COL.noc) {
    return blankView({ text: dashOf(x.j.noc) })
  }
  if (x.k === COL.accessibility) {
    let level = ACC_UNKNOWN
    if (hasText(x.j.accessibility)) {
      level = x.j.accessibility
    }
    return blankView({ text: t(K_ACC + level) })
  }
  return null
}

/**
 * 岗位本身:职位名、公司名、工时、雇佣期。
 * #175:职位/公司格的外链 href 摘除 —— 点击行为只剩弹框(外链出口在弹框/详情页里,
 * 一格一个动作)。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行;不是本族给 null。
 */
function jobCellOf(x: CellIn): CellView | null {
  if (x.k === COL.title) {
    return blankView({ text: x.j.title, tone: TONE.link })
  }
  if (x.k === COL.company) {
    return blankView({ text: x.j.company, tone: TONE.link })
  }
  if (x.k === COL.empHours) {
    if (hasText(x.j.employmentHours) === false) {
      return blankView({ tone: TONE.faintSm })
    }
    return blankView({ text: x.cx.t(K_EMP + x.j.employmentHours), tone: TONE.slateSm })
  }
  if (x.k === COL.empTerm) {
    if (hasText(x.j.employmentTerm) === false) {
      return blankView({ tone: TONE.faintSm })
    }
    return blankView({ text: x.cx.t(K_TERM + x.j.employmentTerm), tone: TONE.slateSm })
  }
  return null
}

/**
 * 薪资族:帖面薪资、折算年薪、当地中位时薪/年薪、vs 中位。
 * 颜色跟 salaryText 走,不跟 salary(原文)走:护栏判定源头填错的行(如「$295,000.00 daily」)
 * 原文有值但我们不敢显示 —— 标成绿色等于说「这条有可信薪资」,是误导。2026-08-05 拍板。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行;不是本族给 null。
 */
function salaryCellOf(x: CellIn): CellView | null {
  if (x.k === COL.salary) {
    if (hasText(x.j.salaryText) === false) {
      return blankView({ tone: TONE.muted, title: x.j.salary })
    }
    return blankView({ text: x.j.salaryText, tone: TONE.money, title: x.j.salary })
  }
  if (x.k === COL.salaryYr) {
    return kMoneyOf({ v: x.j.salaryAnnual, tone: TONE.money })
  }
  if (x.k === COL.wageMedYr) {
    return kMoneyOf({ v: x.j.wageMedAnnual, tone: TONE.slate })
  }
  if (x.k === COL.wageMedHr) {
    if (x.j.wageMedHourly == null) {
      return blankView({ tone: TONE.muted })
    }
    return blankView({ text: SIGN_DOLLAR + String(x.j.wageMedHourly) + UNIT_HOUR, tone: TONE.slate })
  }
  if (x.k === COL.vsMedian) {
    return vsMedianOf(x)
  }
  return null
}

/**
 * 年薪型金额 → 「$NK/yr」;没有就给长横加浅灰。
 *
 * @param x 年薪与有值时的色档。
 * @returns 展示行。
 */
function kMoneyOf(x: KMoneyIn): CellView {
  if (x.v == null) {
    return blankView({ tone: TONE.muted })
  }
  return blankView({ text: SIGN_DOLLAR + String(Math.round(x.v / K_DIVISOR)) + UNIT_K_YEAR, tone: x.tone })
}

/**
 * vs 当地中位:高于中位绿、低于中位琥珀;两个数缺一就给长横。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行。
 */
function vsMedianOf(x: CellIn): CellView {
  const a = x.j.salaryAnnual
  const m = x.j.wageMedAnnual
  if (a == null || m == null || m === 0) {
    return blankView({ tone: TONE.muted })
  }
  const p = Math.round((a / m - 1) * PCT_MULTIPLIER)
  let sign = TEXT_NONE
  let tone: CellTone = TONE.vsDown
  if (p >= 0) {
    sign = SIGN_PLUS
    tone = TONE.vsUp
  }
  return blankView({ text: sign + String(p) + SIGN_PCT, tone })
}

/**
 * 地点族:国家、省、市、区、地址。省/市/区 → 文字 = 地图链接、格子 = 地点弹框
 * (E8-12 Frank「点文字跳 map,点框弹框」);各字段只查自己那一级(与「一格一事」同一原则:
 * 点省看省、点市看市、点区/地址才到街号)。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行;不是本族给 null。
 */
function placeCellOf(x: CellIn): CellView | null {
  const L = parseLoc(x.j)
  if (x.k === COL.country) {
    return blankView({ text: dashOf(L.country), tone: TONE.slate })
  }
  if (x.k === COL.province) {
    return blankView({ text: dashOf(L.prov), tone: TONE.slate, href: mapHrefOf({ k: x.k, j: x.j, has: L.prov }) })
  }
  if (x.k === COL.city) {
    return blankView({ text: dashOf(L.city), tone: TONE.slate, href: mapHrefOf({ k: x.k, j: x.j, has: L.city }) })
  }
  if (x.k === COL.district) {
    const href = mapHrefOf({ k: x.k, j: x.j, has: L.district })
    return blankView({ text: dashOf(L.district), tone: TONE.ink, href })
  }
  if (x.k === COL.address) {
    let href = TEXT_NONE
    if (hasText(x.j.address)) {
      href = mapsUrl(x.j.address)
    }
    return blankView({ text: dashOf(x.j.address), href })
  }
  return null
}

/**
 * 这一级地点的地图链接:查询串统一走 mapQuery(与手机卡同源;省用全称消歧)。
 *
 * @param x 列键、库行、这一级有没有值。
 * @returns 地图链接;这一级没值给空串。
 */
function mapHrefOf(x: MapHrefIn): string {
  if (x.has === TEXT_NONE) {
    return TEXT_NONE
  }
  return mapsUrl(mapQuery({ field: x.k, job: x.j }))
}

/**
 * 移民信号族:PNP、EE、AIP、试点社区、外劳记录、身份预筛。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行;不是本族给 null。
 */
function signalCellOf(x: CellIn): CellView | null {
  if (x.k === COL.pnp) {
    return pnpCellOf(x)
  }
  if (x.k === COL.ee) {
    return eeCellOf(x)
  }
  if (x.k === COL.aip) {
    return aipCellOf(x)
  }
  if (x.k === COL.pilot) {
    if (hasText(x.j.pilot) === false) {
      return blankView({ tone: TONE.faintSm })
    }
    return blankView({ text: x.j.pilot, tone: TONE.cyanSm })
  }
  if (x.k === COL.lmia) {
    if (x.j.lmiaPositions == null || x.j.lmiaPositions === 0) {
      return blankView({ tone: TONE.faintSm })
    }
    const text = x.cx.t('cell.lmiaYes', { n: x.j.lmiaPositions, q: x.j.lmiaLastQuarter })
    return blankView({ text, tone: TONE.tealSm })
  }
  if (x.k === COL.eligibility) {
    if (hasText(x.j.eligibilityFlag) === false) {
      return blankView({ tone: TONE.faintSm })
    }
    return blankView({ text: x.cx.t(K_ELIG + x.j.eligibilityFlag), tone: TONE.redBoldSm })
  }
  return null
}

/**
 * 省提名格:三档强度 + 魁省 N/A。强 = 具名紧缺通道(琥珀底色徽章,全列唯一加底色的一档)、
 * 中 = 可提名(带省码 —— Frank 2026-07-26「最好是显示 可哪个省的提名」:省提名是**逐省**的,
 * 光写「可提名」会让人以为哪儿都能走)、E6-09 官方具名排除 = 红字说结论(格子可点看依据)、
 * 其余走不了仍是灰「—」。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行。
 */
function pnpCellOf(x: CellIn): CellView {
  if (x.j.province === PROV_QC) {
    return blankView({ text: x.cx.t('cell.pnpQc'), tone: TONE.purpleSm })
  }
  if (hasText(x.j.pnpStream)) {
    return blankView({ kind: KIND.stream, text: streamDisplay({ t: x.cx.t, label: x.j.pnpStream }) })
  }
  if (x.j.pnpEligible === true) {
    return blankView({ text: x.cx.t('cell.pnpSkilledProv', { p: x.j.province }), tone: TONE.moneyMd })
  }
  if (x.cx.blocked.pnp.has(x.j.province + BLOCK_KEY_SEP + x.j.noc)) {
    return blankView({ text: x.cx.t('cell.pnpExcl'), tone: TONE.redSm })
  }
  return blankView({ tone: TONE.mutedSm })
}

/**
 * 联邦 EE 类别抽选(全国单一源,数据层算):命中 → 蓝,未列入 → 长横,休眠类别 → 灰 + 上次抽选。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行。
 */
function eeCellOf(x: CellIn): CellView {
  if (hasText(x.j.eeCategory) === false) {
    return blankView({ tone: TONE.faintSm })
  }
  const label = x.j.eeCategory
  const lastDraw = eeLastDraw(label, x.cx.eeCats)
  const month = monthOf(lastDraw)
  const text = eeDisplay({ t: x.cx.t, label })
  if (eeIsDormant(lastDraw)) {
    return blankView({
      text: text + x.cx.t('ee.lastDraw', { d: month }),
      tone: TONE.mutedSm,
      title: x.cx.t('ee.dormantTip', { d: month }),
      pop: TEXT_NONE,
    })
  }
  return blankView({ text, tone: TONE.blueSm, pop: TEXT_NONE })
}

/**
 * 上次抽选日截到「年-月」;没有抽选记录时给长横。
 *
 * @param iso 抽选日;'' = 没有。
 * @returns 年-月 或 长横。
 */
function monthOf(iso: string): string {
  const m = iso.slice(0, YEAR_MONTH_LEN)
  if (m === TEXT_NONE) {
    return DASH
  }
  return m
}

/**
 * 大西洋试点格。E6-09:省里逐条点名「这些职业不受理背书」→ 结论压过「雇主在指定名单」
 * (官方一律不受理)。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行。
 */
function aipCellOf(x: CellIn): CellView {
  if (x.cx.blocked.aip.has(x.j.province + BLOCK_KEY_SEP + x.j.noc)) {
    return blankView({ text: x.cx.t('cell.aipBlocked'), tone: TONE.redSm })
  }
  if (x.j.aip === true) {
    return blankView({ text: x.cx.t('cell.aipYes'), tone: TONE.amberSm })
  }
  return blankView({ tone: TONE.faintSm })
}

/**
 * 其余各列:来源、渠道、首发、状态、三个时间。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行。
 */
function metaCellOf(x: CellIn): CellView {
  if (x.k === COL.source) {
    return blankView({ text: sourceLabel(x.j), tone: TONE.slate })
  }
  if (x.k === COL.origin) {
    if (hasText(x.j.origin) === false) {
      return blankView({ tone: TONE.slate })
    }
    return blankView({ text: x.cx.t(K_ORIGIN + x.j.origin), tone: TONE.slate })
  }
  if (x.k === COL.direct) {
    if (isDirect(x.j)) {
      return blankView({ text: x.cx.t('cell.first'), tone: TONE.moneySm })
    }
    return blankView({ text: x.cx.t('cell.repost'), tone: TONE.mutedSm })
  }
  if (x.k === COL.status) {
    if (x.j.status === STATUS_CLOSED) {
      return blankView({ text: x.cx.t('cell.closed'), tone: TONE.mutedSm })
    }
    return blankView({ text: x.cx.t('cell.open'), tone: TONE.moneySm })
  }
  if (x.k === COL.closedAt) {
    return blankView({ text: ymdOf(x.j.closedAt), tone: TONE.mutedSm })
  }
  if (x.k === COL.datePosted) {
    return blankView({ text: ymdOf(x.j.datePosted), tone: TONE.graySm })
  }
  if (hasText(x.j.lastSeen) === false) {
    return blankView({ tone: TONE.mutedSm })
  }
  return blankView({ text: fmtLocalSec(x.j.lastSeen), tone: TONE.mutedSm })
}

/**
 * 日期列的显示值。
 *
 * @param iso 库里的日期;'' = 没有。
 * @returns 年-月-日 或 长横。
 */
function ymdOf(iso: string): string {
  if (hasText(iso) === false) {
    return DASH
  }
  return ymd(iso)
}

/**
 * 造一枚挂帖时长的文案函数(Frank 走查过的本地午夜解析坑,现已收在 lib/time 的 daysSince):
 * 「今天」与「N 天」两句文案归调用方,组件只管版式。
 *
 * @param x 取词函数。
 * @returns 交给 DateAge 的 ageText 手柄。
 */
export function makeAgeText(x: AgeTextIn): AgeTextFn {
  return function ageText(days: number): string {
    if (days === 0) {
      return PAREN_L + x.t('cell.today') + PAREN_R
    }
    return PAREN_L + x.t('fact.daysUpVal', { n: days }) + PAREN_R
  }
}

/**
 * 通道胶囊排(批A 追拍「每个岗位都要列 teer,pnp,ee 胶囊;aip/qc 单独列;
 * 什么都走不了就不用列」):统一门 = 任一通道可走(具名信号或 TEER≤3 或 QC);
 * 全走不了 → 通道胶囊整排不出。E6-09(手机优先):命中官方具名清单的「走不了」也要在卡上说 ——
 * 那是有依据的结论,不是「没信号」。
 * 2026-07-26 Frank「高 低 …没必要显示」:匹配裸字胶囊不在此列(卡上没有列头,
 * 孤零零一个「高」说不清是什么的高)。
 *
 * @param x 库行、取词函数、排除清单、EE 类别维度。
 * @returns 这一张卡要出的胶囊;空数组 = 整排不出。
 */
export function chipSpecsOf(x: ChipSpecsIn): ChipSpec[] {
  const out: ChipSpec[] = []
  const isQc = x.j.province === PROV_QC
  const bk = x.j.province + BLOCK_KEY_SEP + x.j.noc
  const pnpExcl = x.blocked.pnp.has(bk)
  const aipBlocked = x.blocked.aip.has(bk)
  if (anyRouteOf({ j: x.j, isQc, pnpExcl, aipBlocked })) {
    pushTeerChip({ out, x })
    pushPnpChip({ out, x, pnpExcl, aipBlocked })
    pushEeChip({ out, x })
    pushAipChip({ out, x, pnpExcl, aipBlocked })
    pushPilotChip({ out, x, isQc })
  }
  pushSponsorChip({ out, x })
  if (hasText(x.j.eligibilityFlag)) {
    out.push(chipOf({ tone: CHIP.red, text: x.t(K_ELIG + x.j.eligibilityFlag), k: COL.eligibility, tip: TEXT_NONE }))
  }
  return out
}

/**
 * 任一通道可走没(全走不了就整排不出胶囊)。
 *
 * @param x 库行与三个已算好的判定。
 * @returns 有路可走 = true。
 */
function anyRouteOf(x: AnyRouteIn): boolean {
  if (x.j.pnpEligible === true || hasText(x.j.eeCategory) || x.j.aip === true || hasText(x.j.pilot)) {
    return true
  }
  if (x.isQc || x.pnpExcl || x.aipBlocked) {
    return true
  }
  return x.j.teer != null && x.j.teer <= TEER_ROUTE_MAX
}

/**
 * 造一枚胶囊(可点与否由它代表的那一列说了算)。
 *
 * @param x 语义色档、文本、代表哪一列、悬停说明。
 * @returns 胶囊规格。
 */
function chipOf(x: ChipIn): ChipSpec {
  return { tone: x.tone, text: x.text, k: x.k, tip: x.tip, act: cellActionable(x.k) }
}

/**
 * TEER 胶囊。#214 回滚(Frank 2026-07-26「直接改回用 teer 不行么」):
 * 卡上显示回 TEER 码,人话档名退到悬停说明。
 *
 * @param a 收集器与入参。
 * @returns 无。
 */
function pushTeerChip(a: ChipPushIn): void {
  if (a.x.j.teer == null) {
    return
  }
  const tip = a.x.t('teer.tip', { n: a.x.j.teer, l: a.x.t(K_TEER + a.x.j.teer) })
  a.out.push(chipOf({ tone: CHIP.gray, text: TEER_PREFIX + String(a.x.j.teer), k: COL.teer, tip }))
}

/**
 * 省提名胶囊。批A 追拍(Frank「可提名和可省提名有什么区别」):命中具名清单显清单名
 * (BC 医疗),通用才显「可提名」;命中排除清单显结论。
 * Frank 2026-07-26「不符合清单 职业不受理 需要两个胶囊吗」:两条都命中排除时,
 * 这一枚就写「本省不受理」,AIP 那枚不再出。
 *
 * @param a 收集器、入参与两条排除判定。
 * @returns 无。
 */
function pushPnpChip(a: ChipPushBlockIn): void {
  if (a.x.j.pnpEligible === true) {
    let text = a.x.t('cell.pnpSkilledProv', { p: a.x.j.province })
    if (hasText(a.x.j.pnpStream)) {
      text = streamDisplay({ t: a.x.t, label: a.x.j.pnpStream })
    }
    a.out.push(chipOf({ tone: CHIP.amber, text, k: COL.pnp, tip: TEXT_NONE }))
    return
  }
  if (a.pnpExcl === false) {
    return
  }
  let text = a.x.t('cell.pnpExcl')
  if (a.aipBlocked) {
    text = a.x.t('cell.blockedBoth')
  }
  a.out.push(chipOf({ tone: CHIP.red, text, k: COL.pnp, tip: TEXT_NONE }))
}

/**
 * EE 类别胶囊(休眠类别灰 + 上次抽选月)。
 *
 * @param a 收集器与入参。
 * @returns 无。
 */
function pushEeChip(a: ChipPushIn): void {
  if (hasText(a.x.j.eeCategory) === false) {
    return
  }
  const label = a.x.j.eeCategory
  const last = eeLastDraw(label, a.x.eeCats)
  const month = monthOf(last)
  const name = EE_PREFIX + eeDisplay({ t: a.x.t, label })
  if (eeIsDormant(last)) {
    const tip = a.x.t('ee.dormantTip', { d: month })
    a.out.push(chipOf({ tone: CHIP.gray, text: name + a.x.t('ee.lastDraw', { d: month }), k: COL.ee, tip }))
    return
  }
  a.out.push(chipOf({ tone: CHIP.blue, text: name, k: COL.ee, tip: TEXT_NONE }))
}

/**
 * 大西洋试点胶囊。两条都命中排除时不出(那一枚已经由省提名胶囊说了「本省不受理」)。
 *
 * @param a 收集器、入参与两条排除判定。
 * @returns 无。
 */
function pushAipChip(a: ChipPushBlockIn): void {
  if (a.aipBlocked && a.pnpExcl === false) {
    a.out.push(chipOf({ tone: CHIP.red, text: a.x.t('cell.aipBlocked'), k: COL.aip, tip: TEXT_NONE }))
    return
  }
  if (a.aipBlocked === false && a.x.j.aip === true) {
    a.out.push(chipOf({ tone: CHIP.orange, text: a.x.t('cell.aipYes'), k: COL.aip, tip: TEXT_NONE }))
  }
}

/**
 * 试点社区胶囊(E6-11:值 = 类型缩写,社区名/口径进弹框)与魁省胶囊。
 *
 * @param a 收集器、入参与魁省判定。
 * @returns 无。
 */
function pushPilotChip(a: ChipPushQcIn): void {
  if (hasText(a.x.j.pilot)) {
    a.out.push(chipOf({ tone: CHIP.sky, text: a.x.j.pilot, k: COL.pilot, tip: TEXT_NONE }))
  }
  if (a.isQc) {
    a.out.push(chipOf({ tone: CHIP.purple, text: PROV_QC, k: COL.province, tip: TEXT_NONE }))
  }
}

/**
 * 担保档胶囊(08-10 Frank「这个也放到下面」):公司名旁徽章退役,与 #145 的 LMIA chip 合一 ——
 * 有档显档名(Has LMIA record 等),无档但有 LMIA 数才显数;AIP-only 三档照旧不显
 * (AIP 胶囊已在)。
 *
 * @param a 收集器与入参。
 * @returns 无。
 */
function pushSponsorChip(a: ChipPushIn): void {
  const grade = a.x.j.sponsorGrade
  const positions = a.x.j.lmiaPositions
  const noLmia = positions == null || positions === 0
  const aipOnly = grade === SPONSOR_GRADE_AIP_ONLY && noLmia && a.x.j.aip === true
  if (grade != null && aipOnly === false) {
    const tip = a.x.t('gr.sponsorTip')
    a.out.push(chipOf({ tone: CHIP.indigo, text: a.x.t(K_SPONSOR_GRADE + grade), k: COL.lmia, tip }))
    return
  }
  if (noLmia === false) {
    a.out.push(chipOf({ tone: CHIP.teal, text: LMIA_PREFIX + String(positions), k: COL.lmia, tip: TEXT_NONE }))
  }
}

/**
 * 职业(NOC)多值的显示名:走维度表里的译名(与卡片上那条灰注同一个出口),
 * 查不到就显码本身;代码不裸奔,值仍是精确的 NOC 码。
 *
 * @param x NOC 多值、译名取值函数、界面语言。
 * @returns 顿号/逗号连接的人话名;没选职业时给空串。
 */
export function nocLabelOf(x: NocLabelIn): string {
  const names = []
  for (const raw of x.fNoc.split(COMMA)) {
    const code = raw.trim()
    if (code === TEXT_NONE) {
      continue
    }
    const name = x.nameOf(code)
    if (name === TEXT_NONE) {
      names.push(code)
    } else {
      names.push(name)
    }
  }
  if (names.length === 0) {
    return TEXT_NONE
  }
  if (x.lang === LANG_ZH) {
    return names.join(SEP_ZH)
  }
  return names.join(SEP_EN)
}

/**
 * 数组格的读值兜底(开灯批 2026-08-26:数字数组下标缺席就是 undefined,就地折默认)。
 *
 * @param x 读到的值与兜底值。
 * @returns 数。
 */
function nOf(x: NumOrIn): number {
  if (x.v == null) {
    return x.or
  }
  return x.v
}

/**
 * 拖列的**纯算法**(Excel 式,2026-08-16 Frank「有时候右边的列移动,有时候左边的列移动,
 * 能不能统一都改成右边的列整体移动」):把第 idx 列拉到 want 宽,总宽恒定不变。
 * · idx 左边的列一律不动(先前全局重分,左边会跟着跳)
 * · 拉宽:差额从**右边**列里出,自最右一列开始逐列让到各自下限;中间列宽度不变 = 整体平移
 * · 缩窄:腾出的宽度按**内容**给(见 takerOf),不按位置甩给最右一列
 * · 最后一列没有右邻居,只能反过来向左要(否则拖了没反应)
 * 总宽恒定不变,所以「永不横滚」那条铁律仍然成立。
 *
 * @param base 拖之前各列的实宽。
 * @param idx 被拖的是第几列。
 * @param want 想把它拉到多宽。
 * @param floors 各列下限(表头不折行:max(FLOOR, head, word))。
 * @param maxes 各列内容自然宽(缩窄时按它决定谁接手);不给就退回最右一列。
 * @returns 整数像素,和恒等于输入和。
 */
// eslint-disable-next-line local/one-parameter -- 签名由 tests/int/colResize 的九条断言定死(承重墙)
export function resizeColWidths(
  base: number[], idx: number, want: number, floors: number[], maxes?: number[],
): number[] {
  const w = base.slice()
  if (idx < 0 || idx >= w.length) {
    return w
  }
  const donors = donorsOf({ idx, len: w.length })
  const target = Math.max(nOf({ v: floors[idx], or: COL_FLOOR }), want)
  let need = target - nOf({ v: base[idx], or: COL_FLOOR })
  if (need < 0) {
    const t = takerOf({ donors, w, maxes })
    w[t] = nOf({ v: w[t], or: COL_FLOOR }) - need
    need = 0
  }
  for (const d of donors) {
    if (need === 0) {
      break
    }
    const give = Math.min(need, nOf({ v: w[d], or: COL_FLOOR }) - nOf({ v: floors[d], or: COL_FLOOR }))
    w[d] = nOf({ v: w[d], or: COL_FLOOR }) - give
    need = need - give
  }
  w[idx] = nOf({ v: base[idx], or: COL_FLOOR }) + (target - nOf({ v: base[idx], or: COL_FLOOR }) - need)
  const out = []
  for (const v of w) {
    out.push(Math.round(v))
  }
  return out
}

/**
 * 让宽的列按什么顺序找:右边有列就自最右一列往左,最后一列只能向左邻居要。
 *
 * @param x 被拖列与总列数。
 * @returns 让宽列的下标序列。
 */
function donorsOf(x: DonorsIn): number[] {
  const out = []
  if (x.idx < x.len - 1) {
    for (let i = x.len - 1; i > x.idx; i = i - 1) {
      out.push(i)
    }
    return out
  }
  for (let i = x.idx - 1; i >= 0; i = i - 1) {
    out.push(i)
  }
  return out
}

/**
 * 缩窄一列时,腾出来的宽度归谁 —— 和分宽规则③同一条:**给内容最需要的那列**。
 * 先前按位置给最右一列:那通常是「操作」(内容恒短),于是每缩一次就在右端空出一大片
 * (Frank「操作右面空了一大截」的老毛病换个入口又长出来)。
 * 缺口最大的优先;都补平了(或压根没量到内容)就给内容最长的那列;maxes 缺席才退回最右一列。
 *
 * @param x 让宽列、当前各列宽、各列自然宽。
 * @returns 接手的列下标。
 */
function takerOf(x: TakerIn): number {
  const first = nOf({ v: x.donors[0], or: 0 })
  const maxes = x.maxes
  if (maxes == null) {
    return first
  }
  let best = first
  let bestGap = gapOf({ maxes, w: x.w, i: first })
  let widest = first
  for (const i of x.donors) {
    const gap = gapOf({ maxes, w: x.w, i })
    if (gap > bestGap) {
      best = i
      bestGap = gap
    }
    if (nOf({ v: maxes[i], or: 0 }) > nOf({ v: maxes[widest], or: 0 })) {
      widest = i
    }
  }
  if (bestGap > 0) {
    return best
  }
  return widest
}

/**
 * 这一列还差多少才够放下它的内容。
 *
 * @param x 各列自然宽、当前宽、第几列。
 * @returns 缺口(不为负)。
 */
function gapOf(x: GapIn): number {
  return Math.max(0, nOf({ v: x.maxes[x.i], or: 0 }) - nOf({ v: x.w[x.i], or: 0 }))
}

/**
 * 纯函数:按「① 表头第一 → ② 内容第二 → ③ 余量给最长那列」把可分宽度分给各列
 * (Frank「列宽应该优先考虑 title 宽度,其次是内容宽度」)。
 * ① 表头永不折行、永不截断,顺带保底:再挤也不把一个词拦腰断成「Newfoundlan / d」。
 * ④ 总宽恒等于容器宽 → **永不横滚**;只有「表头都放不下」或用户手动拖宽才允许滚。
 *
 * @param x 各列的量宽结果与可分宽度。
 * @returns 各列像素,和恒等于可分宽度(除非表头都放不下)。
 */
export function allocateColWidths(x: AllocateIn): Record<string, number> {
  const out: Record<string, number> = {}
  if (x.cols.length === 0) {
    return out
  }
  const flex: Alloc[] = []
  let room = x.avail
  for (const c of x.cols) {
    if (c.pinned == null) {
      flex.push(c)
    } else {
      const pw = Math.round(c.pinned)
      out[c.key] = pw
      room = room - pw
    }
  }
  if (flex.length === 0) {
    return out
  }
  let used = 0
  for (const c of flex) {
    const w = Math.max(COL_FLOOR, c.head, c.word)
    out[c.key] = w
    used = used + w
  }
  let extra = room - used
  extra = fillTo({ out, flex, extra, target: TARGET_P90 })
  extra = fillTo({ out, flex, extra, target: TARGET_MAX })
  if (extra > 0) {
    const key = widestOf(flex)
    out[key] = nOf({ v: out[key], or: 0 }) + extra
  }
  roundOut({ out, flex, room })
  return out
}

/**
 * 内容那一步:先把各列补到目标宽(p90 = 九成的值不折行,max = 最长值)。
 * **缺口小的先补满**:薪资/省市这种原子值只差几十像素,补满就彻底不折行;
 * 职位/公司这种长文本再怎么给也给不完,让它们分剩下的 —— 一句话:短值列不折行,
 * 挤压全压在本来就要多行的文本列上(和 Frank「哪个最宽优先缩哪个」同一个意思)。
 *
 * @param a 分宽表、参与瓜分的列、余量与这一步的目标。
 * @returns 补完还剩多少。
 */
function fillTo(a: FillIn): number {
  let extra = a.extra
  let rest = wantsOf({ out: a.out, flex: a.flex, target: a.target })
  while (rest.length > 0 && extra > 0) {
    const head = rest[0]
    if (head == null) {
      break
    }
    if (head.want <= extra / rest.length) {
      a.out[head.key] = nOf({ v: a.out[head.key], or: 0 }) + head.want
      extra = extra - head.want
      rest = rest.slice(1)
      continue
    }
    let total = 0
    for (const r of rest) {
      total = total + r.want
    }
    for (const r of rest) {
      a.out[r.key] = nOf({ v: a.out[r.key], or: 0 }) + extra * (r.want / total)
    }
    extra = 0
  }
  return extra
}

/**
 * 各列离目标宽还差多少(按缺口从小到大排)。
 *
 * @param x 分宽表、参与瓜分的列与目标。
 * @returns 还缺宽度的列。
 */
function wantsOf(x: WantsIn): ColWant[] {
  const rest: ColWant[] = []
  for (const c of x.flex) {
    const want = Math.max(0, c[x.target] - nOf({ v: x.out[c.key], or: 0 }))
    if (want > 0) {
      rest.push({ key: c.key, want })
    }
  }
  rest.sort(byWant)
  return rest
}

/**
 * 缺口从小到大。比较器的两参一返由 `Array.prototype.sort` 定死 —— 宪法钦定的豁免形态。
 *
 * @param a 前一项。
 * @param b 后一项。
 * @returns 排序权重。
 */
// eslint-disable-next-line local/one-parameter -- 比较器签名由 Array.prototype.sort 定死(宪法钦定的豁免形态)
function byWant(a: ColWant, b: ColWant): number {
  return a.want - b.want
}

/**
 * 内容最长的那一列(余量与舍入误差都往它身上补,别摊给恒短值列 ——
 * 免得「vs 中位」这种恒短值白占一片空地)。
 *
 * @param flex 参与瓜分的列。
 * @returns 列键。
 */
function widestOf(flex: Alloc[]): string {
  let best = flex[0]
  for (const c of flex) {
    if (best == null || c.max > best.max) {
      best = c
    }
  }
  if (best == null) {
    return TEXT_NONE
  }
  return best.key
}

/**
 * 整数化:小数列宽会让 1px 列分隔线落在半个设备像素上被吃掉(Frank 实拍「列的竖线怎么没了」)。
 * 四舍五入后把误差补回最宽那列,保证总和不多不少 = 可分宽度。
 *
 * @param a 分宽表、参与瓜分的列与可分宽度。
 * @returns 无。
 */
function roundOut(a: RoundIn): void {
  let sum = 0
  for (const c of a.flex) {
    const rounded = Math.round(nOf({ v: a.out[c.key], or: 0 }))
    a.out[c.key] = rounded
    sum = sum + rounded
  }
  const drift = a.room - sum
  if (drift !== 0) {
    const key = widestOf(a.flex)
    a.out[key] = nOf({ v: a.out[key], or: 0 }) + drift
  }
}

/**
 * 正则元字符转义(标签词拼进正则前)。
 *
 * @param s 标签词。
 * @returns 转义后的词。
 */
function jdEsc(s: string): string {
  return s.replace(JD_ESC_RE, JD_ESC_TO)
}

/**
 * 全部内联标签词拼成正则备选项。
 *
 * @returns 备选项串。
 */
function jdAlts(): string {
  const alts = []
  for (const s of JD_INLINE_LABELS) {
    alts.push(jdEsc(s))
  }
  for (const s of JD_HR_LABELS) {
    alts.push(jdEsc(s))
  }
  return alts.join(JD_ALT_SEP)
}

/**
 * 按模板造一枚标签正则(模板里的填充位换成备选项)。
 *
 * @param x 模板与标志。
 * @returns 正则。
 */
function jdRe(x: JdReIn): RegExp {
  return new RegExp(x.tpl.replace(JD_TPL_SLOT, jdAlts()), x.flags)
}

/**
 * 抓取的 JD 正文 → 逐行。双轨渲染:数据层给了真实换行(05b 块级序列化,原帖分段/列表/标题保真)
 * → 按原换行渲染,空行 = 段距;压平老坨帖(Job Bank 聚合时丢格式,0 换行)→ 才走猜测式断行
 * (粘连断行/bullet 拆行/一句一行,历轮拍板)。
 * 2026-07-16 用户拍板:JD 弹窗去表格,原汁原味逐行显示 —— 第 16 轮「键值段表格化 + 规则解读列」
 * 整体退役(多张表的抽象感 + 解读列大量留空,读起来不如原文)。
 *
 * @param x 正文与截断长度。
 * @returns 归一后的行序列。
 */
export function jdLinesOf(x: JdLinesIn): string[] {
  const clipped = x.text.slice(0, x.max)
  let lines: string[] = []
  if (clipped.includes(NEWLINE)) {
    lines = trimAll(clipped.replace(JD_EMPHASIS_RE, SPACE).split(NEWLINE))
  } else {
    lines = jdGuessLines(clipped)
  }
  const hrLine = jdRe({ tpl: JD_HR_LINE_TPL, flags: TEXT_NONE })
  const out = []
  for (const l of jdDropDupLines(lines)) {
    out.push(l.replace(hrLine, JD_HR_LINE_TO))
  }
  return out
}

/**
 * 压平老坨帖的猜测式断行:无空格粘边 → 已知标签 → HR 破折号变体 → 「* 项」→ 行内圆点 →
 * markdown 残渣 → 一句一行。⚠️ 顺序不能换:剥星号必须排在「* 项」拆行之后,
 * 否则会抢掉列表拆行的星号。
 *
 * @param clipped 截断后的正文。
 * @returns 行序列。
 */
function jdGuessLines(clipped: string): string[] {
  const split = clipped
    .replace(jdRe({ tpl: JD_GLUE_TPL, flags: RE_FLAG_G }), NEWLINE)
    .replace(jdRe({ tpl: JD_INLINE_TPL, flags: RE_FLAG_G }), NEWLINE)
    .replace(jdRe({ tpl: JD_HR_DASH_TPL, flags: RE_FLAG_G }), NEWLINE)
    .replace(JD_STAR_ITEM_RE, NEWLINE)
    .replace(JD_BULLET_RE, NEWLINE)
    .replace(JD_EMPHASIS_RE, SPACE)
    .replace(JD_STAR_RE, SPACE)
    .split(NEWLINE)
  const out = []
  for (const raw of split) {
    for (const one of raw.split(JD_SENTENCE_RE)) {
      const l = one.trim().replace(JD_LEAD_BULLET_RE, TEXT_NONE).replace(JD_SPACES_RE, SPACE)
      if (l !== TEXT_NONE) {
        out.push(l)
      }
    }
  }
  return out
}

/**
 * 保真轨的整行归一:去首尾空白 + 压多余空格(空行保留作段距)。
 *
 * @param lines 原始行。
 * @returns 归一后的行。
 */
function trimAll(lines: string[]): string[] {
  const out = []
  for (const l of lines) {
    out.push(l.trim().replace(JD_SPACES_RE, SPACE))
  }
  return out
}

/**
 * 相邻重复短行去重。空行原样留下且不参与比较、也不清空基准;
 * 与上一非空行相同且不超过 80 字符的行判为模板节头重复,只保留首次出现
 * (2026-07-19 Frank 报障:ZipRecruiter 帖「Job Description」连出两遍,库内 349 帖同款)。
 *
 * @param lines 归一后的行序列。
 * @returns 去掉相邻重复短行后的行序列。
 */
function jdDropDupLines(lines: string[]): string[] {
  const out: string[] = []
  let prev: string | null = null
  for (const l of lines) {
    if (l.length === 0) {
      out.push(l)
      continue
    }
    const dup = l === prev && l.length <= JD_DUP_MAX_LEN
    prev = l
    if (dup === false) {
      out.push(l)
    }
  }
  return out
}

/**
 * JD 正文一行 → 渲染档。节头用白名单识别(Job Bank 固定小节),白名单外一律当内容行 ——
 *「English」这类单词值不会被误判成标题。行首「• 」保留(数据层给的列表符,只在猜测轨剥)。
 *
 * @param l 一行。
 * @returns 这一行的展示行。
 */
export function jdLineViewOf(l: string): JdLineView {
  if (l === TEXT_NONE) {
    return { kind: JD_KIND.gap, text: TEXT_NONE, label: TEXT_NONE }
  }
  if (l.startsWith(JD_BULLET_MARK)) {
    return { kind: JD_KIND.bullet, text: l, label: TEXT_NONE }
  }
  const low = l.toLowerCase()
  if (JD_TOP_HEADS.has(low)) {
    return { kind: JD_KIND.h1, text: l, label: TEXT_NONE }
  }
  if (JD_SUB_HEADS.has(low)) {
    return { kind: JD_KIND.h2, text: l, label: TEXT_NONE }
  }
  const bare = l.match(JD_BARE_LABEL_RE)
  if (bare != null) {
    const [, bareHead] = bare
    return { kind: JD_KIND.h2, text: String(bareHead), label: TEXT_NONE }
  }
  const m = l.match(JD_LABEL_LINE_RE)
  if (m != null) {
    const [, label, body] = m
    return { kind: JD_KIND.label, text: String(body), label: String(label) }
  }
  return { kind: JD_KIND.text, text: l, label: TEXT_NONE }
}

/**
 * 五节整理版分节:[ROLE]/[REQS]/[PAY]/[WORKHOURS]/[APPLY] 标记文本 → 节键 → 节内容。
 *
 * @param s 标记文本。
 * @returns 节键 → 节内容。
 */
export function jdParseSecs(s: string): Record<string, string> {
  const parts = s.split(JD_SEC_SPLIT_RE)
  const secs: Record<string, string> = {}
  for (let i = 1; i < parts.length; i = i + JD_SEC_STEP) {
    const pk = parts[i]
    const body = parts[i + 1]
    if (pk != null) {
      secs[pk] = String(body).trim()
    }
  }
  return secs
}

/**
 * 一节的行 + 对齐的译文。#186(Frank「上面已有信息就别再加一个 (not stated)」):
 * 节内逐行丢掉 (not stated) 变体行 —— 模型偶发在有真内容的节里也补一条
 * (如薪资列了时薪又挂一条),那是噪音。丢完为空 = 整节缺。译文按丢完后的行位对齐。
 *
 * @param x 这一节的原文与译文。
 * @returns 逐行配对。
 */
export function jdPairsOf(x: JdPairsIn): JdPair[] {
  const rawEn = nonEmptyLines(x.body)
  const rawZh = nonEmptyLines(x.trans)
  const out: JdPair[] = []
  for (let i = 0; i < rawEn.length; i = i + 1) {
    const en = String(rawEn[i])
    if (isJdNone(en)) {
      continue
    }
    let zh = TEXT_NONE
    const z = rawZh[i]
    if (z != null && z !== en && isJdNone(z) === false) {
      zh = z.replace(JD_DASH_PREFIX_RE, TEXT_NONE)
    }
    out.push({ en, zh })
  }
  return out
}

/**
 * 逐行去空白、丢空行。
 *
 * @param s 一节文本。
 * @returns 非空行。
 */
export function nonEmptyLinesOf(s: string): string[] {
  return nonEmptyLines(s)
}

/**
 * 逐行去空白、丢空行。
 *
 * @param s 一节文本。
 * @returns 非空行。
 */
function nonEmptyLines(s: string): string[] {
  const out = []
  for (const raw of s.split(NEWLINE)) {
    const l = raw.trim()
    if (l !== TEXT_NONE) {
      out.push(l)
    }
  }
  return out
}

/**
 * 这一节是不是列表(有「- 」开头的行就整节渲成 ul)。
 *
 * @param pairs 这一节的行。
 * @returns 是列表 = true。
 */
export function jdHasBullets(pairs: JdPair[]): boolean {
  for (const p of pairs) {
    if (p.en.startsWith(JD_BULLET_PREFIX)) {
      return true
    }
  }
  return false
}

/**
 * 剥掉行首的「- 」(渲染时 bullet 由版式给,不重复出字符)。
 *
 * @param l 一行。
 * @returns 剥掉前缀的行。
 */
export function jdStripDash(l: string): string {
  return l.replace(JD_DASH_PREFIX_RE, TEXT_NONE)
}

/**
 * PAY 节要不要在节首顶一条帖面薪资。Frank 2026-07-31「整理后的怎么薪资没显示」:
 * 模型抄了福利漏了钱数(#123c 只管整节空)—— 一行都不含数字 = 视为缺薪资,
 * 帖面薪资字段照 #123c 口径顶到节首(真数不靠 LLM 抄)。
 *
 * @param x 这一节的行与帖面薪资。
 * @returns 要顶的那句;不顶给空串。
 */
export function jdPayFallbackOf(x: JdPayIn): string {
  if (x.fallbackPay === TEXT_NONE) {
    return TEXT_NONE
  }
  for (const p of x.pairs) {
    if (JD_MONEY_RE.test(p.en)) {
      return TEXT_NONE
    }
  }
  return x.fallbackPay
}

/**
 * URL → 域名(#239):来源行只报出处,不铺整条链接(整条 URL 在 375 上折两行又长又丑);
 * 解析失败退原串(宁可原样也不吞)。
 *
 * @param u 原帖链接。
 * @returns 域名。
 */
export function hostOf(u: string): string {
  try {
    return new URL(u).host.replace(WWW_PREFIX_RE, TEXT_NONE)
  } catch {
    return u
  }
}

/**
 * 懒取 JD 正文。#126 同岗会话缓存:三处调用点(事实块 / JD 弹框 / 详情页 JD 区)共用,
 * 同一岗反复开关不重复打端点烧额度。命中缓存时 freeLeft = null(没消耗,额度行不刷新)。
 * #134(Frank 报障「点了一些工作发现都是空的」):429 曾掉进「空」分支 —— 额度一用完,
 * 之后每个岗都显示「本站暂未收录正文」,把限流谎报成缺数据(最恶的一种静默失败:
 * 用户以为站没数据)。三态分明:402 = 免费额度用完 · 429 = 匿名 IP 池用完 ·
 * 其它非 2xx = 取数失败(不是「没有」)。
 *
 * @param applyUrl 原帖链接。
 * @param signal 中断信号(组件卸载时掐掉在途请求)。
 * @returns 三态分明的取数结果。
 */
// eslint-disable-next-line local/one-parameter -- 签名由 advisor 的调用点定死(本批只许动它的 import 行)
export async function fetchJobText(applyUrl: string, signal?: AbortSignal): Promise<JobTextOut> {
  const hit = CACHE.jobText.get(applyUrl)
  if (hit != null) {
    return { status: TEXT_STATUS.ok, text: hit, freeLeft: null }
  }
  const init: RequestInit = {}
  if (signal != null) {
    init.signal = signal
  }
  const res = await fetch(URL_API_JOB_TEXT + encodeURIComponent(applyUrl), init)
  const freeLeft = freeLeftOf(res)
  if (res.status === HTTP_PAYMENT) {
    return { status: TEXT_STATUS.gated, text: TEXT_NONE, freeLeft }
  }
  if (res.status === HTTP_TOO_MANY) {
    return { status: TEXT_STATUS.limited, text: TEXT_NONE, freeLeft }
  }
  if (res.ok === false) {
    return { status: TEXT_STATUS.error, text: TEXT_NONE, freeLeft }
  }
  const text = (await res.text()).trim()
  if (text !== TEXT_NONE) {
    CACHE.jobText.set(applyUrl, text)
    return { status: TEXT_STATUS.ok, text, freeLeft }
  }
  return { status: TEXT_STATUS.empty, text, freeLeft }
}

/**
 * 响应头里的剩余免费次数(额度可见化)。
 *
 * @param res 响应。
 * @returns 剩余次数;头缺席给 null。
 */
export function freeLeftOf(res: Response): number | null {
  const left = res.headers.get(HDR_FREE_LEFT)
  if (left == null) {
    return null
  }
  return Number(left)
}

/**
 * 从正文里抽投递邮箱(非 JB 岗正文常直接带邮箱)。官方站域名不算雇主邮箱。
 *
 * @param text 正文。
 * @returns 邮箱;没抽到给空串。
 */
export function applyEmailOf(text: string): string {
  const found = text.match(APPLY_MAIL_RE)
  if (found == null) {
    return TEXT_NONE
  }
  for (const m of found) {
    const [, host] = m.split(AT)
    const d = String(host).toLowerCase()
    const official = d.includes(JB_MAIL_HOST) || d.endsWith(GC_MAIL_SUFFIX) || d.endsWith(CANADA_MAIL_SUFFIX)
    if (d !== TEXT_NONE && official === false) {
      return m
    }
  }
  return TEXT_NONE
}

/**
 * 投递邮件的 mailto 链接:替他把主题与正文都备好,他自己按发送 ——
 * 首版**不代发**(邮箱授权/简历存储/发信信誉全后置)。
 *
 * @param x 收件邮箱与本岗。
 * @returns mailto 链接。
 */
export function mailtoOf(x: MailtoIn): string {
  const title = x.job.title
  const company = x.job.company
  let at = TEXT_NONE
  if (company !== TEXT_NONE) {
    at = MAIL_SUBJECT_AT + company
  }
  const subject = MAIL_SUBJECT_HEAD + title + at
  const body = mailBodyOf({ job: x.job, title, company })
  return MAILTO + x.email + MAILTO_SUBJECT + encodeURIComponent(subject) + MAILTO_BODY + encodeURIComponent(body)
}

/**
 * 投递邮件正文。
 *
 * @param x 本岗与已取好的岗名、公司名。
 * @returns 正文。
 */
function mailBodyOf(x: MailBodyIn): string {
  const loc = []
  for (const p of [x.job.city, x.job.province]) {
    if (p !== TEXT_NONE) {
      loc.push(p)
    }
  }
  let at = TEXT_NONE
  if (x.company !== TEXT_NONE) {
    at = MAIL_BODY_AT + x.company
  }
  let inLoc = TEXT_NONE
  if (loc.length > 0) {
    inLoc = MAIL_BODY_IN + loc.join(LOC_SEP)
  }
  const lines = [
    MAIL_HELLO, MAIL_BLANK,
    MAIL_BODY_HEAD + x.title + MAIL_BODY_QUOTE + at + inLoc + MAIL_BODY_DOT,
    MAIL_POSTING + x.job.applyUrl, MAIL_BLANK,
    MAIL_ATTACH, MAIL_BLANK,
    MAIL_REGARDS,
  ]
  return lines.join(MAIL_CRLF)
}

/**
 * 从完整回复里摘建议问题:① ❓ 标记行(协议,第 15 轮 #36 用户点名「基于具体内容生成问题」);
 * ② 兜底 = 末行是独立短问句(模型偶发漏打标记,问题裸奔在正文结尾 —— 2026-07-11 用户实机撞到)。
 * 都没有 → 原文返回,chip 走罐头池。兜底分支同过 capSug(第 16 轮它绕过了)。
 *
 * @param s 完整回复。
 * @param company 雇主名(把它换成指代词,见 scrubCompany)。
 * @param lang 界面语言(取指代词那句文案)。
 * @returns 正文与建议问题。
 */
// eslint-disable-next-line local/one-parameter -- 签名由 advisor 的调用点定死(本批只许动它的 import 行)
export function extractSug(s: string, company?: string, lang?: string): SugOut {
  const co = textOf(company)
  const i = s.lastIndexOf(SUG_MARK)
  if (i >= 0 && s.length - i <= SUG_TAIL_MAX) {
    const raw = s.slice(i + SUG_MARK.length).trim()
    return { body: s.slice(0, i).replace(TRAIL_WS_RE, TEXT_NONE), sug: capSug({ q: raw, company: co, lang }) }
  }
  const t = s.replace(TRAIL_WS_RE, TEXT_NONE)
  const nl = t.lastIndexOf(NEWLINE)
  const last = t.slice(nl + 1).trim()
  const ok = nl > 0 && last.length >= SUG_LAST_MIN && last.length <= SUG_LAST_MAX
    && SUG_QUESTION_RE.test(last) && last.startsWith(SUG_HEAD_MARK) === false
  if (ok) {
    return { body: t.slice(0, nl).replace(TRAIL_WS_RE, TEXT_NONE), sug: capSug({ q: last, company: co, lang }) }
  }
  return { body: t, sug: TEXT_NONE }
}

/**
 * 建议问题长度红线(2026-07-11 用户拍板「不要太长」):>60 字裁到首个问号;
 * 还收不住 → 弃用退罐头。先剥 **(#43)+ 公司名指代(#49)。
 *
 * @param x 原句、雇主名与界面语言。
 * @returns 收得住的问题;收不住给空串。
 */
function capSug(x: CapSugIn): string {
  const q = scrubCompany({ q: x.q.replace(AI_BOLD_RE, TEXT_NONE), company: x.company, lang: x.lang })
  if (q.length <= SUG_MAX_LEN) {
    return q
  }
  const m = q.match(SUG_CUT_RE)
  if (m == null) {
    return TEXT_NONE
  }
  return String(m[0])
}

/**
 * #49(第 19 轮):#44 的 prompt 约束(雇主用「这家公司」指代)模型不稳定遵守,
 * 缓存换血即复发(「TABOCHE TECHNOLOGY过去是否…」「ERA是否…」实拍)——
 * 前端兜底:占位里把公司名(含去后缀核心名)统一替换成指代词,相邻重复再合一。
 *
 * @param x 原句、雇主名与界面语言。
 * @returns 换过指代词的句子。
 */
function scrubCompany(x: CapSugIn): string {
  if (x.company === TEXT_NONE) {
    return x.q
  }
  let lang = LANG_ZH
  if (x.lang != null) {
    lang = x.lang
  }
  const generic = makeT(lang as Parameters<typeof makeT>[0])(K_SUG_GENERIC)
  const core = x.company.replace(COMPANY_SUFFIX_RE, TEXT_NONE).trim()
  const names = Array.from(new Set([x.company.trim(), core]))
  names.sort(byLengthDesc)
  let q = x.q
  for (const n of names) {
    if (n.length >= COMPANY_MIN_LEN) {
      q = q.replace(new RegExp(n.replace(RE_ESC_RE, JD_ESC_TO), RE_FLAG_GI), generic)
    }
  }
  return q.replace(new RegExp(SUG_DEDUP_TPL.replace(JD_TPL_SLOT, generic), RE_FLAG_G), SUG_DEDUP_TO)
}

/**
 * 长的排前面(先换长名再换短名,免得短名把长名切碎)。比较器的两参一返由
 * `Array.prototype.sort` 定死 —— 宪法钦定的豁免形态。
 *
 * @param a 前一项。
 * @param b 后一项。
 * @returns 排序权重。
 */
// eslint-disable-next-line local/one-parameter -- 比较器签名由 Array.prototype.sort 定死(宪法钦定的豁免形态)
function byLengthDesc(a: string, b: string): number {
  return b.length - a.length
}

/**
 * 面包屑的职业分类路径段(省 › 大 › 中 › 小):同名相邻跳过,不铺重复。
 *
 * @param x 取词函数与本岗三级分类。
 * @returns 路径段。
 */
export function catSegsOf(x: CatSegsIn): CrumbSeg[] {
  const all: CrumbSeg[] = []
  if (x.broad !== TEXT_NONE && x.broad !== UNCAT) {
    all.push({ txt: catTextOf({ t: x.t, v: x.broad }), href: URL_BOARD_BROAD + encodeURIComponent(x.broad) })
  }
  if (x.mid !== TEXT_NONE && x.mid !== UNCAT) {
    const href = URL_BOARD_BROAD + encodeURIComponent(x.broad) + URL_BOARD_MID + encodeURIComponent(x.mid)
    all.push({ txt: catTextOf({ t: x.t, v: x.mid }), href })
  }
  if (x.fine !== TEXT_NONE && x.fine !== UNCAT) {
    all.push({ txt: catTextOf({ t: x.t, v: x.fine }), href: URL_BOARD_FINE + encodeURIComponent(x.fine) })
  }
  const out: CrumbSeg[] = []
  let prev = TEXT_NONE
  for (const s of all) {
    if (s.txt !== prev) {
      out.push(s)
    }
    prev = s.txt
  }
  return out
}

/**
 * 相似职位的兜底去处:筛选参数与面包屑同一套(?prov / ?fine|mid|broad),按级给键,
 * 不新造口径。按哪一级筛由服务端定(loadRelatedJobs 探过「本省该级确实还有在招岗」)——
 * 探不到就退到只按省,决不把人从死页面送进空列表。
 *
 * @param x 省码、按哪一级筛与那一级的值。
 * @returns 兜底链;没省就给空串(整条不出)。
 */
export function fallbackHrefOf(x: FallbackHrefIn): string {
  if (x.province === TEXT_NONE) {
    return TEXT_NONE
  }
  const head = URL_BOARD_PROV + encodeURIComponent(x.province)
  if (x.value === TEXT_NONE) {
    return head
  }
  return head + URL_LEVEL_AMP + x.level + SIG_EQ + encodeURIComponent(x.value)
}

/**
 * 省名用 `prov.XX` 三语单名,不用面包屑那种「Ontario(安大略省)」组合 ——
 * 文案定长,不把职业名插进句子;字典缺键就退全名。
 *
 * @param x 取词函数、省码与省全名。
 * @returns 省的单名。
 */
export function provWordOf(x: ProvWordIn): string {
  const key = K_PROV + x.province.toUpperCase()
  const word = x.t(key)
  if (word === key) {
    return x.full
  }
  return word
}

/**
 * 面包屑省格的显示名(「Ontario(安大略省)」两段式,英文在前的全站口径)。
 *
 * @param x 取词函数与省码。
 * @returns 显示省名;省码缺席时给空串(那一格整个不渲)。
 */
export function provFullOf(x: ProvFullIn): string {
  if (x.province === TEXT_NONE) {
    return TEXT_NONE
  }
  return provName({ t: x.t, code: x.province, localeOnly: false })
}

/**
 * 量宽:整表临时「不折行 + 按内容撑开」,读每列真实需要多宽,量完立刻还原(只存在一帧,不进画面)。
 *
 * 量的是**内容**不是格子:量宽模式下格子被拉到整列宽,读 td 宽度只会读回「最长那条」。
 * 用 Range 圈住格内内容量它自己,才分得出「这一列大多数值有多宽」。
 * 第二趟整表按 min-content 摊开(允许折行)→ 每格的 Range 宽 = 它最宽的那一行 = 最长的那个词,
 * 这就是「列的下限」:比它还窄就会出现「Newfoundlan / d and Labrador」这种断词。
 *
 * ⚠️ 手机端容器 display:none → 量不了,返回 null 让调用方下一帧再试。
 * 历史教训(别再走回头路):量宽的 key 在**量之前**就标记为「已量」,首帧 tbody 还没行 →
 * 量空了也不会重来,线上于是所有列一律 120px 均分(2026-08-03 实测 prod)。现在只有**量到了**才记 key。
 *
 * @param x 列集、表头行与格内边距。
 * @returns 量宽结果;这一帧量不了给 null。
 */
export function measureColWidths(x: MeasureIn): MeasureOut | null {
  const head = x.head
  if (head == null) {
    return null
  }
  const table = head.closest(TABLE_SEL) as HTMLTableElement | null
  if (table == null || table.querySelector(TBODY_ROW_SEL) == null) {
    return null
  }
  const wrap = table.closest(TABLE_WRAP_SEL) as HTMLElement | null
  if (wrap == null || wrap.clientWidth === 0) {
    return null
  }
  const prevLayout = table.style.tableLayout
  const prevWidth = table.style.width
  const prevMin = table.style.minWidth
  table.classList.add(MEASURE_CLS)
  table.style.tableLayout = LAYOUT_AUTO
  table.style.width = WIDTH_MAX_CONTENT
  table.style.minWidth = WIDTH_ZERO
  const measured = contentPass({ keys: x.keys, head, table, pad: x.pad })
  table.classList.remove(MEASURE_CLS)
  table.style.width = WIDTH_MIN_CONTENT
  wordPass({ keys: x.keys, table, pad: x.pad, measured })
  table.style.tableLayout = prevLayout
  table.style.width = prevWidth
  table.style.minWidth = prevMin
  return { measured, wrapW: wrap.clientWidth }
}

/**
 * 量宽第一趟:表头宽、九成位宽、最长值宽。
 * 九成位而不是最大值:整列宽度不该被一条超长值绑架(一条「Manufacturing and utilities」
 * 能把大分类撑到 249px,右边几列全被压到底线反而更折行)。最长值留给「还有余量」那步。
 *
 * @param x 列集、表头行、表格与格内边距。
 * @returns 每列量到的四个数(word 那格由第二趟补)。
 */
function contentPass(x: MeasurePassIn): Record<string, ColMeasure> {
  const m: Record<string, ColMeasure> = {}
  const rows = rowsOf(x.table)
  for (let i = 0; i < x.keys.length; i = i + 1) {
    const key = String(x.keys[i])
    const th = headCell({ head: x.head, i })
    const cells = cellWidths({ rows, i })
    cells.sort(byNumber)
    m[key] = {
      head: thWidth({ th, pad: x.pad }),
      word: 0,
      p90: p90Of(cells) + x.pad,
      max: maxOf(cells) + x.pad,
    }
  }
  return m
}

/**
 * 量宽第二趟:每列最长的那个词(列的下限)。
 *
 * @param x 列集、表格、格内边距与第一趟的结果(就地补 word 那一格)。
 * @returns 无。
 */
function wordPass(x: MeasureWordIn): void {
  const rows = rowsOf(x.table)
  for (let i = 0; i < x.keys.length; i = i + 1) {
    const mk = x.measured[String(x.keys[i])]
    if (mk != null) {
      mk.word = maxOf(cellWidths({ rows, i })) + x.pad
    }
  }
}

/**
 * 表体前几十行(再往下量不改结论,却要多跑几百次 Range 测量)。
 *
 * @param table 表格。
 * @returns 参与量宽的行。
 */
function rowsOf(table: HTMLTableElement): Element[] {
  const all = Array.from(table.querySelectorAll(TBODY_ROW_SEL))
  return all.slice(0, MEASURE_ROWS)
}

/**
 * 表头的第 i 格。
 *
 * @param x 表头行与第几格。
 * @returns 那一格;越界给 null。
 */
function headCell(x: HeadCellAtIn): HTMLElement | null {
  const el = x.head.children[x.i]
  if (el == null) {
    return null
  }
  return el as HTMLElement
}

/**
 * 表头这一格要多宽(量不到时给下限)。
 *
 * @param x 表头格与格内边距。
 * @returns 宽度。
 */
function thWidth(x: ThWidthIn): number {
  if (x.th == null) {
    return x.pad
  }
  return contentWidth(x.th) + x.pad
}

/**
 * 这一列每一行的内容宽。
 *
 * @param x 参与量宽的行与第几列。
 * @returns 各行的内容宽。
 */
function cellWidths(x: CellWidthsIn): number[] {
  const out: number[] = []
  for (const tr of x.rows) {
    const el = tr.children[x.i]
    if (el != null) {
      out.push(contentWidth(el as HTMLElement))
    }
  }
  return out
}

/**
 * 用 Range 圈住格内内容量它自己(量的是内容不是格子)。
 * +1:文字实宽是小数(85.2px),向上取整还差半个像素就会折行 —— 留 1px 富余。
 *
 * @param el 格子。
 * @returns 内容宽。
 */
function contentWidth(el: HTMLElement): number {
  const r = document.createRange()
  r.selectNodeContents(el)
  return Math.ceil(r.getBoundingClientRect().width) + WIDTH_SLACK
}

/**
 * 从小到大。比较器的两参一返由 `Array.prototype.sort` 定死 —— 宪法钦定的豁免形态。
 *
 * @param a 前一项。
 * @param b 后一项。
 * @returns 排序权重。
 */
// eslint-disable-next-line local/one-parameter -- 比较器签名由 Array.prototype.sort 定死(宪法钦定的豁免形态)
function byNumber(a: number, b: number): number {
  return a - b
}

/**
 * 已排序数组的九成位。
 *
 * @param sorted 从小到大排好的宽度。
 * @returns 九成位;一行都没有给 0。
 */
function p90Of(sorted: number[]): number {
  if (sorted.length === 0) {
    return 0
  }
  const at = Math.min(sorted.length - 1, Math.floor(sorted.length * P90))
  return nOf({ v: sorted[at], or: 0 })
}

/**
 * 一组数里最大的那个。
 *
 * @param xs 一组数。
 * @returns 最大值;空数组给 0。
 */
function maxOf(xs: number[]): number {
  let best = 0
  for (const n of xs) {
    if (n > best) {
      best = n
    }
  }
  return best
}

/**
 * 造拖列的手柄。**Excel 式**(2026-08-16 Frank「有时候右边的列移动,有时候左边的列移动,
 * 能不能统一都改成右边的列整体移动」):拖之前**把所有列按当前实宽钉住**(左边从此一动不动),
 * 被拖列吃掉位移,差额只从**右边**列里出、且从最右一列开始逐列让 —— 中间那些列宽度不变,
 * 整体平移,正是 Excel 的手感。总宽恒定不变,所以「永不横滚」那条铁律仍然成立。
 * 让宽的下限仍是「表头不折行」;最后一列没有右邻居 → 只能反过来从它左边那列让,否则拖了没反应。
 *
 * ⚠️ 列集与量宽结果走活引用:直接闭包会钉死在首帧的值(列集换了、量宽更新了都读不到)。
 *
 * @param x 列集与量宽结果的活引用、手动宽的写回口。
 * @returns 交给表头竖线的 onMouseDown 手柄。
 */
export function makeColResize(x: ColResizeIn): (i: ColResizeStartIn) => void {
  return function startResize(i: ColResizeStartIn): void {
    i.e.preventDefault()
    i.e.stopPropagation()
    const th = (i.e.currentTarget as HTMLElement).closest(TH_SEL) as HTMLElement | null
    const rowEl = thRow(th)
    if (th == null || rowEl == null) {
      return
    }
    const base = thWidths(rowEl)
    const order = x.keysRef.current
    const idx = order.indexOf(i.key)
    if (idx < 0 || base.length !== order.length) {
      return
    }
    const floors = floorsOf({ order, measured: x.measuredRef.current })
    const maxes = maxesOf({ order, measured: x.measuredRef.current })
    dragCols({ base, idx, floors, maxes, order, startX: i.e.clientX, setManual: x.setManual })
  }
}

/**
 * 竖线所在的表头行。
 *
 * @param th 表头格;null = 没找到。
 * @returns 表头行;没找到给 null。
 */
function thRow(th: HTMLElement | null): HTMLElement | null {
  if (th == null) {
    return null
  }
  return th.parentElement
}

/**
 * 表头各格的当前实宽。
 *
 * @param rowEl 表头行。
 * @returns 各列实宽。
 */
function thWidths(rowEl: HTMLElement): number[] {
  const out: number[] = []
  for (const el of Array.from(rowEl.children)) {
    out.push((el as HTMLElement).getBoundingClientRect().width)
  }
  return out
}

/**
 * 各列的下限:表头不折行(max(FLOOR, head, word))。
 *
 * @param x 列集与量宽结果。
 * @returns 各列下限。
 */
function floorsOf(x: ColStatsIn): number[] {
  const out: number[] = []
  for (const k of x.order) {
    const m = x.measured[k]
    if (m == null) {
      out.push(COL_FLOOR)
    } else {
      out.push(Math.max(COL_FLOOR, m.head, m.word))
    }
  }
  return out
}

/**
 * 各列的内容自然宽(缩窄时按它决定谁接手)。
 *
 * @param x 列集与量宽结果。
 * @returns 各列自然宽。
 */
function maxesOf(x: ColStatsIn): number[] {
  const out: number[] = []
  for (const k of x.order) {
    const m = x.measured[k]
    if (m == null) {
      out.push(0)
    } else {
      out.push(m.max)
    }
  }
  return out
}

/**
 * 挂上拖动期间的全局监听(拖到表头外面也得跟手),松开即摘。
 *
 * @param x 拖列要用的全部量。
 * @returns 无。
 */
function dragCols(x: DragIn): void {
  function onMove(ev: MouseEvent): void {
    const want = Math.round(nOf({ v: x.base[x.idx], or: COL_FLOOR }) + (ev.clientX - x.startX))
    const w = resizeColWidths(x.base, x.idx, want, x.floors, x.maxes)
    const next: Record<string, number> = {}
    for (let i = 0; i < x.order.length; i = i + 1) {
      next[String(x.order[i])] = nOf({ v: w[i], or: COL_FLOOR })
    }
    x.setManual(next)
  }
  function onUp(): void {
    document.removeEventListener(EV_MOUSE_MOVE, onMove)
    document.removeEventListener(EV_MOUSE_UP, onUp)
    document.body.style.cursor = CURSOR_NONE
  }
  document.addEventListener(EV_MOUSE_MOVE, onMove)
  document.addEventListener(EV_MOUSE_UP, onUp)
  document.body.style.cursor = CURSOR_COL_RESIZE
}

/**
 * 固定左列的累计左偏移:先量固定列实宽 → 算累计 left,再贴 sticky(先计算再显示)。
 * 列宽变了必须重量:sticky 的 left 是**累计实宽**,拖列改了左侧列宽而偏移量还停在旧值,
 * 固定列就会钉在旧位置、拿不透明底色盖住右邻居(Frank 2026-08-16「怎么穿透了职位列」)。
 *
 * @param x 表头行与要冻结的列键。
 * @returns 列键 → 左偏移;表头还没挂上时给空表。
 */
export function stickyOffsetsOf(x: StickyOffsetsIn): Record<string, number> {
  const offs: Record<string, number> = {}
  if (x.head == null) {
    return offs
  }
  let cum = 0
  for (let i = 0; i < x.frozenKeys.length; i = i + 1) {
    offs[String(x.frozenKeys[i])] = cum
    const el = headCell({ head: x.head, i })
    if (el != null) {
      cum = cum + Math.round(el.getBoundingClientRect().width)
    }
  }
  return offs
}

/**
 * 造「点这一格开对应弹框」的手柄(逐格一枚,tsx 里不许现声明函数)。
 *
 * @param x 单一路由、库行、列键与弹框大标题。
 * @returns 点击手柄。
 */
export function makeFieldOpen(x: FieldOpenIn): ClickFn {
  return function openField(): void {
    x.onField(x.k, x.job, x.title)
  }
}

/**
 * 造「收/取消收藏这一岗」的手柄。
 *
 * @param x 收藏开关与这一岗。
 * @returns 点击手柄。
 */
export function makeSaveToggle(x: SaveToggleIn): ClickFn {
  return function toggleSave(): void {
    x.onSave(x.job)
  }
}

/**
 * 造「开这一岗的职位描述弹框」的手柄。
 *
 * @param x 开弹框的动作与这一岗。
 * @returns 点击手柄。
 */
export function makeDescOpen(x: DescOpenIn): ClickFn {
  return function openDesc(): void {
    x.onDesc(x.job)
  }
}

/**
 * 造「对这一列做点什么」的手柄(勾列、点表头排序、双击回自动共用)。
 *
 * @param x 收列键的动作与列键。
 * @returns 点击手柄。
 */
export function makeColAction(x: ColActionIn): ClickFn {
  return function colAction(): void {
    x.act(x.k)
  }
}

/**
 * 造这一列竖线的按下手柄。
 *
 * @param x 列宽机器与列键。
 * @returns 鼠标按下手柄。
 */
export function makeResizeStart(x: ResizeBindIn): (e: React.MouseEvent) => void {
  return function onResize(e: React.MouseEvent): void {
    x.cw.startResize({ e, key: x.k })
  }
}

/**
 * 造这一列竖线的双击手柄(该列回归自动)。
 *
 * @param x 列宽机器与列键。
 * @returns 点击手柄。
 */
export function makeAutoFit(x: ResizeBindIn): ClickFn {
  return function autoFit(): void {
    x.cw.autoFit(x.k)
  }
}

/**
 * 筛选初值来自服务端(page.tsx 已按 URL 解析并据此查过库)→ 首帧下拉就是选中的那项、
 * 行就是筛选后的行,水合零差异,不再「先抖一下全部」。没参数进来就是干净板。
 *
 * @param x 初始筛选与要取哪一格。
 * @returns 这一格的初值;没有给空串。
 */
export function seedFilter(x: SeedFilterIn): string {
  const v = x.f[x.k]
  if (typeof v === 'string') {
    return v
  }
  return TEXT_NONE
}

/**
 * 快照回放 / URL 兜底共用的落地口:把一份筛选写回各格。
 *
 * @param x 筛选各格的读写口、要落的筛选、只看直发的写口。
 * @returns 无。
 */
export function applyFiltersTo(x: ApplyFiltersIn): void {
  for (const [k, s] of Object.entries(x.fState)) {
    const v = x.f[k]
    if (typeof v === 'string' && v !== TEXT_NONE) {
      s.set(v)
    }
  }
  if (x.f[FK_DIRECT] === true) {
    x.setDirect(true)
  }
}

/**
 * 折叠区里有几项被选中(徽标计数)。
 *
 * @param x 筛选各格与只看直发。
 * @returns 计数。
 */
export function foldActiveOf(x: FilterCountIn): number {
  let n = 0
  for (const k of FOLD_KEYS) {
    const slot = x.fState[k]
    if (slot != null && slot.v !== TEXT_NONE) {
      n = n + 1
    }
  }
  if (x.directOnly) {
    n = n + 1
  }
  return n
}

/**
 * 有没有任何筛选在生效(「已选」行与横幅数字口径都看它)。
 *
 * @param x 筛选各格与只看直发。
 * @returns 有 = true。
 */
export function anyFilterOf(x: FilterCountIn): boolean {
  if (x.directOnly) {
    return true
  }
  for (const slot of Object.values(x.fState)) {
    if (slot.v !== TEXT_NONE) {
      return true
    }
  }
  return false
}

/**
 * 「已选」行渲不渲(2026-08-29:「清除筛选」搬回输入行之后立的判据)。
 * 这一行今天只装两件:职业(NOC)胶囊、「保存此筛选」(登录才出)——
 * 两件都没有时整行不渲,否则一个空 div 照样吃掉筛选区 8px 的 gap。
 *
 * @param x 有没有筛选、职业胶囊的显示名与登录态。
 * @returns 渲 = true。
 */
export function pickedShownOf(x: PickedShownIn): boolean {
  if (x.anyFilter === false) {
    return false
  }
  if (x.nocLabel !== TEXT_NONE) {
    return true
  }
  return x.loggedIn
}

/**
 * 清除全部筛选(URL 参数不用在这儿摘:「筛选 → URL」那一处会把清空后的状态同步回地址栏 ——
 * 2026-07-19 Frank「点击清除筛选,一刷新又回去了」的老补丁已并入同一出口)。
 *
 * @param x 筛选各格与只看直发的写口。
 * @returns 无。
 */
export function clearFiltersIn(x: ClearFiltersIn): void {
  for (const slot of Object.values(x.fState)) {
    slot.set(TEXT_NONE)
  }
  x.setDirect(false)
}

/**
 * 去重 + 去空 + 字母序(联动下拉的选项)。
 *
 * @param xs 原始值。
 * @returns 排好的唯一值。
 */
function uniq(xs: string[]): string[] {
  const set = new Set<string>()
  for (const v of xs) {
    if (v !== TEXT_NONE) {
      set.add(v)
    }
  }
  const out = Array.from(set)
  out.sort()
  return out
}

/**
 * 联动下拉的选项:省/市/区来自维度表(E10-01 P3:维度独立加载后不再从 job 行现推),
 * 大/中/小类来自 noc_categories。
 * 大类按行业顺序(BROAD_SLUGS = etl/noc_buckets.BROADS 的镜像),不用 uniq 的字母序 ——
 * 对中文那是按码位排的,等于乱序;清单外的值(未分类)垫底。
 *
 * @param x 维度表与当前的省/市/大类/中类。
 * @returns 六组选项。
 */
export function filterOptsOf(x: FilterOptsIn): FilterOpts {
  const code = provCodeOf(x.prov)
  const nc = x.dims.nocCategories
  return {
    prov: provOptsOf(x.dims),
    city: cityOptsOf({ dims: x.dims, code }),
    district: distOptsOf({ dims: x.dims, code, city: x.city }),
    broad: broadOptsOf(nc),
    mid: midOptsOf({ nc, broad: x.broad }),
    fine: fineOptsOf({ nc, broad: x.broad, mid: x.mid }),
  }
}

/**
 * 省全名清单(筛选值就是它)。
 *
 * @param dims 维度表。
 * @returns 省全名。
 */
function provOptsOf(dims: JobDims): string[] {
  const out: string[] = []
  for (const p of dims.provinces) {
    out.push(p.name)
  }
  return out
}

/**
 * 市清单(跟着省联动)。
 *
 * @param x 维度表与当前省码。
 * @returns 市名。
 */
function cityOptsOf(x: CityOptsIn): string[] {
  const out: string[] = []
  for (const c of x.dims.cities) {
    if (x.code === TEXT_NONE || c.province === x.code) {
      out.push(c.name)
    }
  }
  return uniq(out)
}

/**
 * 区清单(跟着省/市联动)。
 *
 * @param x 维度表、当前省码与当前市。
 * @returns 区名。
 */
function distOptsOf(x: DistOptsIn): string[] {
  const out: string[] = []
  for (const d of x.dims.districts) {
    const provOk = x.code === TEXT_NONE || d.province === x.code
    const cityOk = x.city === TEXT_NONE || d.city === x.city
    if (provOk && cityOk) {
      out.push(d.name)
    }
  }
  return uniq(out)
}

/**
 * 大分类清单,按行业顺序排(清单外的值垫底)。
 *
 * @param nc 分类维度行。
 * @returns 大分类。
 */
function broadOptsOf(nc: NocCatRow[]): string[] {
  const order = new Map<string, number>()
  for (let i = 0; i < BROAD_SLUGS.length; i = i + 1) {
    const pair = BROAD_SLUGS[i]
    if (pair != null) {
      const [, b] = pair
      order.set(b, i)
    }
  }
  const out: string[] = []
  for (const c of nc) {
    out.push(c.broad)
  }
  const list = uniq(out)
  list.sort(makeByOrder(order))
  return list
}

/**
 * 造一枚按行业顺序排的比较器(清单外的值垫底)。
 *
 * @param order 大类 → 行业序号。
 * @returns 比较器。
 */
function makeByOrder(order: Map<string, number>): (a: string, b: string) => number {
  return function byOrder(a: string, b: string): number {
    return rankOf({ order, v: a }) - rankOf({ order, v: b })
  }
}

/**
 * 这个大类排第几(清单外的垫底)。
 *
 * @param x 顺序表与大类值。
 * @returns 序号。
 */
function rankOf(x: RankOfIn): number {
  const i = x.order.get(x.v)
  if (i == null) {
    return BROAD_ORDER_LAST
  }
  return i
}

/**
 * 中分类清单(跟着大类联动)。
 *
 * @param x 分类维度行与当前大类。
 * @returns 中分类。
 */
function midOptsOf(x: MidOptsIn): string[] {
  const out: string[] = []
  for (const c of x.nc) {
    if (x.broad === TEXT_NONE || c.broad === x.broad) {
      out.push(c.mid)
    }
  }
  return uniq(out)
}

/**
 * 小分类清单(跟着大/中类联动)。
 *
 * @param x 分类维度行与当前大/中类。
 * @returns 小分类。
 */
function fineOptsOf(x: FineOptsIn): string[] {
  const out: string[] = []
  for (const c of x.nc) {
    const broadOk = x.broad === TEXT_NONE || c.broad === x.broad
    const midOk = x.mid === TEXT_NONE || c.mid === x.mid
    if (broadOk && midOk) {
      out.push(c.fine)
    }
  }
  return uniq(out)
}

/**
 * 分页签名:筛选/搜索/排序/切匹配视图变化 → 回第 0 页(取数 effect 随之重拉替换)。
 *
 * @param x 当前筛选、排序与匹配视图。
 * @returns 签名串。
 */
export function pageSigOf(x: PageSigIn): string {
  return filterSig(x.cur) + SIG_SEP + x.sort.key + SIG_SEP + x.sort.dir + SIG_SEP + String(x.matchView)
}

/**
 * 量宽的数据指纹:列集/语言/当前这批行 —— 变了就重量。
 * 老版本只看「有没有行」,筛完「IT」后大分类列还按上一批的宽度占地(Frank 2026-08-03 实拍)。
 *
 * @param x 列集签名、界面语言与当前这批行。
 * @returns 指纹串。
 */
export function dataKeyOf(x: DataKeyIn): string {
  const first = x.rows[0]
  const last = x.rows[x.rows.length - 1]
  return [x.shownKey, x.lang, String(x.rows.length), idOf(first), idOf(last)].join(BLOCK_KEY_SEP)
}

/**
 * 一行的岗位号(没有这一行时给空串)。
 *
 * @param j 库行;缺席 = 这一批是空的。
 * @returns 岗位号。
 */
function idOf(j: JobFact | undefined): string {
  if (j == null) {
    return TEXT_NONE
  }
  return String(j.id)
}

/**
 * 造「按 NOC 码取译名」的取值函数(职业胶囊与手机卡的岗名灰注同一个出口)。
 *
 * @param x 维度表与界面语言。
 * @returns NOC 码 → 译名;查不到给空串。
 */
export function makeNocName(x: NocNameIn): (code: string) => string {
  return function nocName(code: string): string {
    for (const row of x.dims.nocDescriptions) {
      if (row.noc === code) {
        return nocLocalTitle({ row, lang: x.lang })
      }
    }
    return TEXT_NONE
  }
}

/**
 * 造 colgroup 的取宽函数:量到了给像素,只有种子时给百分比(服务端渲染就能定版式,
 * 水合不再抻一下 —— 原来首屏走浏览器自动布局,量完再换固定布局,表格明显抻一下,实测 CLS 0.087)。
 *
 * @param x 量到没、各列像素、种子与列集。
 * @returns 列键 → 宽度。
 */
export function makeColWidth(x: ColWidthFnIn): (key: string) => number | string | undefined {
  return function widthOf(key: string): number | string | undefined {
    if (x.measuredReady) {
      return x.px[key]
    }
    if (x.useSeed && x.seed != null) {
      const pct = x.seed.pct[x.keys.indexOf(key)]
      if (pct != null) {
        return String(pct) + SIGN_PCT
      }
    }
    return undefined
  }
}

/**
 * 把算好的比例记进 cookie,下次刷新服务端就能把 colgroup 一起渲出来。
 * 存比例不存像素:视口宽窄不同也照样对得上(百分比之和 = 100% = 容器宽)。
 *
 * @param x 列集签名、各列像素、总宽与列集。
 * @returns 这一份比例的序列化串('' = 还没量到,不写)。
 */
export function colWidthSeedValue(x: SeedValueIn): string {
  if (x.total === 0) {
    return TEXT_NONE
  }
  const pct: number[] = []
  for (const k of x.keys) {
    pct.push(Number((nOf({ v: x.px[k], or: 0 }) / x.total * PCT_MULTIPLIER).toFixed(PCT_DECIMALS)))
  }
  return JSON.stringify({ keys: x.keysKey, pct })
}

/**
 * 写列宽 cookie。
 *
 * @param value 已序列化的比例串。
 * @returns 无。
 */
export function writeColWidthCookie(value: string): void {
  try {
    document.cookie = cookieStringOf({
      name: COLW_COOKIE,
      value: encodeURIComponent(value),
      maxAge: COLW_MAX_AGE_S,
    })
  } catch {
    return
  }
}

/**
 * 保存此筛选(E5-03;D1 2026-07-19 降免费)存进库的那份条件。
 * ⚠️ 逐字沿用旧实现的键集:**不含职业(fNoc)** —— 它是 2026-08-16 才加的筛选,
 * 保存筛选这边一直没跟上。改口径要连带 saved-searches 的回放一起改,不在换装批的范围。
 *
 * @param x 筛选各格与只看直发。
 * @returns 存库的条件对象。
 */
export function saveFiltersOf(x: FilterCountIn): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  for (const [k, slot] of Object.entries(x.fState)) {
    if (k !== FK.noc) {
      out[k] = slot.v
    }
  }
  out[FK_DIRECT] = x.directOnly
  return out
}

/**
 * /api/jobs 的查询串:筛选参数与 URL/快照同一个出口(fState 一张表)。
 *
 * @param x 当前筛选、排序、匹配视图与页号。
 * @returns 查询串。
 */
export function jobsQueryOf(x: JobsQueryIn): string {
  const sp = filterParamsOf(x.cur)
  sp.set(P_SORT, x.sort.key)
  sp.set(P_DIR, x.sort.dir)
  if (x.matchView) {
    sp.set(P_VIEW, VAL_MATCH)
  }
  sp.set(P_PAGE, String(x.page))
  return sp.toString()
}

/**
 * 收藏列表响应 → 岗位号 → 收藏行的映射。
 *
 * @param d 响应;null = 拉失败,按空算。
 * @returns 映射。
 */
export function savedMapOf(d: SavedListJson | null): Record<string, SavedEntry> {
  const m: Record<string, SavedEntry> = {}
  if (d == null || d.docs == null) {
    return m
  }
  for (const doc of d.docs) {
    if (doc.job != null && doc.id != null) {
      m[String(doc.job)] = { id: doc.id, status: statusOf(doc.status) }
    }
  }
  return m
}

/**
 * 收藏行的状态(缺席按心愿单算)。
 *
 * @param s 库里的状态。
 * @returns 状态。
 */
function statusOf(s: string | null | undefined): string {
  if (s == null || s === TEXT_NONE) {
    return SAVED_STATUS_WISH
  }
  return s
}

/**
 * 地址栏里带没带「开哪个登录框」的参数,开完立刻把它洗掉
 * (第 15 轮用户反馈:留着参数,刷新就再弹一次)。
 *
 * @returns 要开的框与重置 token;不开时 mode 给 false。
 */
export function authFromUrl(): AuthFromUrlOut {
  const out: AuthFromUrlOut = { mode: false, token: TEXT_NONE }
  try {
    const sp = new URLSearchParams(window.location.search)
    const rst = sp.get(P_RESET)
    const wantLogin = sp.get(P_LOGIN) === VAL_ON
    const wantSignup = sp.get(P_SIGNUP) === VAL_ON
    if (rst == null && wantLogin === false && wantSignup === false) {
      return out
    }
    if (rst != null) {
      out.mode = AUTH_RESET
      out.token = rst
    } else if (wantSignup) {
      out.mode = AUTH_REGISTER
    } else {
      out.mode = AUTH_LOGIN
    }
    sp.delete(P_LOGIN)
    sp.delete(P_SIGNUP)
    sp.delete(P_RESET)
    replaceQuery(sp)
    return out
  } catch {
    return out
  }
}

/**
 * 把洗过的参数写回地址栏(不留历史,刷新即终态)。
 *
 * @param sp 洗过的查询参数。
 * @returns 无。
 */
export function replaceQuery(sp: URLSearchParams): void {
  const qs = sp.toString()
  let tail = TEXT_NONE
  if (qs !== TEXT_NONE) {
    tail = QS_HEAD + qs
  }
  window.history.replaceState(null, TEXT_NONE, window.location.pathname + tail)
}

/**
 * 手里有没有职业答案(没有就先去建档,别弹一个填不出结果的登录框)。
 *
 * @returns 有 = true。
 */
export function hasQuizNocs(): boolean {
  const a = readQuiz()
  if (a == null || a.nocs == null) {
    return false
  }
  return a.nocs.length > 0
}

/**
 * 这一下点匹配入口是进还是出。
 *
 * @param matchView 当前在不在匹配视图。
 * @returns 去处。
 */
export function matchHrefOf(matchView: boolean): string {
  if (matchView) {
    return URL_BOARD
  }
  return URL_BOARD_MATCH
}

/**
 * 首访引导弹过了没(E11-05②:关/完成就置这一格,不再自动弹)。
 *
 * @returns 弹过了 = true。
 */
export function obSeen(): boolean {
  try {
    return localStorage.getItem(OB_SEEN_KEY) != null
  } catch {
    return false
  }
}

/**
 * 记下「首访引导弹过了」。
 *
 * @returns 无。
 */
export function markObSeen(): void {
  try {
    localStorage.setItem(OB_SEEN_KEY, VAL_ON)
  } catch {
    return
  }
}

/**
 * localStorage 里的列集偏好(cookie 之外的那一份兜底)。
 *
 * @returns 合法列键;没有或解析失败给空数组。
 */
export function readColsPref(): JobColKey[] {
  try {
    const saved = localStorage.getItem(PREF_KEY)
    if (saved == null) {
      return []
    }
    const arr: unknown = JSON.parse(saved)
    if (Array.isArray(arr) === false) {
      return []
    }
    return knownColsOf((arr as unknown[]).map(String))
  } catch {
    return []
  }
}

/**
 * 把列集偏好留一份在 localStorage(cookie 之外的兜底)。
 *
 * @param keys 当前勾选的列键。
 * @returns 无。
 */
export function writeColsPref(keys: JobColKey[]): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(keys))
  } catch {
    return
  }
}

/**
 * 初始列:服务端从 cookie 解析后传进来 → SSR 与客户端首帧一致(零闪);无则用默认。
 *
 * @param initialCols cookie 里的列集;缺席 = 没有。
 * @returns 初始列键。
 */
export function initialColsOf(initialCols: string[] | undefined): JobColKey[] {
  if (initialCols == null) {
    return defaultColsOf()
  }
  const known = knownColsOf(initialCols)
  if (known.length === 0) {
    return defaultColsOf()
  }
  return known
}

/**
 * 列集签名(逗号连接,量宽与重挂监听都按它比对)。
 *
 * @param shown 当前列。
 * @returns 签名串。
 */
export function colsKeyOf(shown: ColSpec[]): string {
  return keysOf(shown).join(COMMA)
}

/**
 * 当前列的列键(顺序即列序)。
 *
 * @param shown 当前列。
 * @returns 列键。
 */
export function keysOf(shown: ColSpec[]): JobColKey[] {
  const out: JobColKey[] = []
  for (const c of shown) {
    out.push(c.key)
  }
  return out
}

/**
 * 各列当前宽度的签名:列宽变了固定列的累计偏移必须重量(见 stickyOffsetsOf)。
 *
 * @param x 当前列与列宽机器。
 * @returns 签名串。
 */
export function widthsKeyOf(x: WidthsKeyIn): string {
  const parts: string[] = []
  for (const c of x.shown) {
    parts.push(String(x.cw.width(c.key)))
  }
  return parts.join(COMMA)
}

/**
 * 数组的最后一项(空数组给空串)。
 *
 * @param xs 一串键。
 * @returns 最后一项。
 */
export function lastOf(xs: string[]): string {
  if (xs.length === 0) {
    return TEXT_NONE
  }
  return String(xs[xs.length - 1])
}

/**
 * 取某一格筛选的当前值。
 *
 * @param x 筛选各格与要取哪一格。
 * @returns 当前值;这一格不在给空串。
 */
export function slotOf(x: SlotIn): string {
  const slot = x.fState[x.k]
  if (slot == null) {
    return TEXT_NONE
  }
  return slot.v
}

/**
 * 取某一格筛选的写口。
 *
 * @param x 筛选各格与要取哪一格。
 * @returns 写口;这一格不在给一枚空手柄。
 */
export function setterOf(x: SlotIn): TextFn {
  const slot = x.fState[x.k]
  if (slot == null) {
    return noopText
  }
  return slot.set
}

/**
 * 空手柄(取不到那一格时顶班,免得调用点还要判空)。
 *
 * @returns 无。
 */
function noopText(): void {
  return
}

/**
 * 库里可空的串 → 显示串。
 *
 * @param s 库值;缺席 = 没有。
 * @returns 串;没有给空串。
 */
export function strOf(s: string | null | undefined): string {
  if (s == null) {
    return TEXT_NONE
  }
  return s
}

/**
 * 接口回来的可空串 → 身份四件那一格(没有就是 null,不折空串 —— 空串会被当成「有个空名字」)。
 *
 * @param s 响应里的值。
 * @returns 串或 null。
 */
export function strOrNull(s: string | null | undefined): string | null {
  if (s == null) {
    return null
  }
  return s
}

/**
 * 首屏筛选:props 给了就用,没给就是干净板。
 *
 * @param f props 里的初始筛选;缺席 = 没参数进来。
 * @returns 初始筛选。
 */
export function initialFiltersOf(f: JobFilters | undefined): JobFilters {
  if (f == null) {
    return {}
  }
  return f
}

/**
 * NOC 官方描述那一块的小标题:带上抓取日期(官方页会改版,读的人要知道这是哪天抓的)。
 *
 * @param x 小标题与抓取日期。
 * @returns 小标题;没有日期就只出标题。
 */
export function nocBlockHeadOf(x: NocHeadIn): string {
  if (x.fetched === TEXT_NONE) {
    return x.head
  }
  return x.head + PAREN_L + x.fetched + PAREN_R
}

/**
 * AI 文本的一段:去段首尾空行 + 压多余空行,免大空隙。
 *
 * @param seg 切出来的一段。
 * @returns 正文;整段是空白就给空串(那一段不渲)。
 */
export function aiParaOf(seg: string): string {
  return seg.replace(AI_LEAD_BLANK_RE, TEXT_NONE).replace(AI_TAIL_BLANK_RE, TEXT_NONE).replace(AI_GAP_RE, AI_GAP_TO)
}

/**
 * AI 文本里【小标题】的类:首个不留上距。
 * ⚠️ 这一条**没有**跟着 JD 正文那样改 `:first-child` —— renderAI 对空段返回 null(不产出节点),
 * 首个 null 会让 `:first-child` 落到下一个元素上,与原逻辑不等价(main.css 第 15 段的旧注释
 * 就是在说这件事)。
 *
 * @param i 第几段。
 * @returns 类名。
 */
export function aiHeadClsOf(i: number): string {
  if (i === 0) {
    return cssOf(css.aiHead) + SPACE + cssOf(css.aiHeadFirst)
  }
  return cssOf(css.aiHead)
}

/**
 * 五节整理版 → 逐节的展示行。J3 五节整理版(2026-07-19 Frank 批):节头加粗独立行,
 * 节内一条一行(W 规范:禁「·」「/」杂糅);(not stated) → 「原帖未提及」灰字,缺节不脑补。
 * trans = 同结构译文(行位保真)→ 节内按行号逐句对照。
 * #155(Frank「这两个字也是重复的」):首节 ROLE 的小标题「这活干什么」紧贴大标题「职位描述」,
 * 两行说同一件事 —— 首节不出小标题,正文直接跟在大标题下面;其余四节照旧有小标题分区。
 * #161(Frank「这个地方缺 title 吧」):#155 的作用域开大了 —— JD 弹框那个容器上方只有
 * 「✨ AI 整理…」一行灰注、**没有大标题**,砍掉首节小标题后正文就裸奔了。改成按容器决定:
 * underTitle = 紧跟大标题(详情页)才省略,默认照常出小标题。
 *
 * @param x 整理版文本、取词函数、译文与三样兜底。
 * @returns 五节的展示行。
 */
export function jdSectionViewsOf(x: JdSectionsIn): JdSectionView[] {
  const secs = jdParseSecs(x.text)
  const tSecs = jdTransSecsOf(x.trans)
  const out: JdSectionView[] = []
  for (const [m, key] of JD_SECS) {
    const pairs = jdPairsOf({ body: strOf(secs[m]), trans: strOf(tSecs[m]) })
    out.push({
      m,
      head: jdSecHeadOf({ m, key, t: x.t, underTitle: x.underTitle }),
      mode: jdSecModeOf({
        m,
        none: pairs.length === 0,
        applyUrl: x.applyUrl,
        applyEmail: x.applyEmail,
        fallbackPay: x.fallbackPay,
      }),
      pairs,
      bullets: jdHasBullets(pairs),
      payFallback: jdPayFallbackOf({ pairs, fallbackPay: payFallbackFor({ m, fallbackPay: x.fallbackPay }) }),
      applyUrl: x.applyUrl,
      applyEmail: x.applyEmail,
      noneText: x.t('act.f.none'),
      officialText: x.t('act.seeOfficial'),
    })
  }
  return out
}

/**
 * 译文分节(没有译文就是空表)。
 *
 * @param trans 同结构译文;'' = 不出对照。
 * @returns 节键 → 译文。
 */
function jdTransSecsOf(trans: string): Record<string, string> {
  if (trans === TEXT_NONE) {
    return {}
  }
  return jdParseSecs(trans)
}

/**
 * 这一节出不出小标题。
 *
 * @param x 节键、取词键、取词函数与「紧跟大标题」。
 * @returns 小标题;不出给空串。
 */
function jdSecHeadOf(x: JdSecHeadIn): string {
  if (x.m === JD_SEC_ROLE && x.underTitle) {
    return TEXT_NONE
  }
  return x.t(x.key)
}

/**
 * 这一节渲哪一档。
 *
 * @param x 节键、整节缺没、原帖链接、投递邮箱与帖面薪资。
 * @returns 渲染档。
 */
function jdSecModeOf(x: JdSecModeIn): JdSectionMode {
  if (x.m === JD_SEC_APPLY && x.applyUrl !== TEXT_NONE) {
    if (x.none === false) {
      return SEC_MODE.applyLines
    }
    if (x.applyEmail !== TEXT_NONE) {
      return SEC_MODE.applyEmail
    }
    return SEC_MODE.applyLink
  }
  if (x.none && x.m === JD_SEC_PAY && x.fallbackPay !== TEXT_NONE) {
    return SEC_MODE.payFallback
  }
  if (x.none) {
    return SEC_MODE.none
  }
  return SEC_MODE.lines
}

/**
 * 只有薪资节才有「节首顶一条帖面薪资」这回事。
 *
 * @param x 节键与帖面薪资。
 * @returns 帖面薪资;别的节给空串。
 */
function payFallbackFor(x: PayFallbackForIn): string {
  if (x.m === JD_SEC_PAY) {
    return x.fallbackPay
  }
  return TEXT_NONE
}

/**
 * 中文对照钮的钮面文案:在途 / 失败 / 收起 / 展开。
 *
 * @param x 取词函数、取数态与在屏没。
 * @returns 钮面文案。
 */
export function transLabelOf(x: TransLabelIn): string {
  if (x.status === TRANS_LOADING) {
    return x.t('cat.translating')
  }
  if (x.status === TRANS_ERROR) {
    return x.t('cat.transErr')
  }
  if (x.shown) {
    return x.t('cat.hideZh')
  }
  return x.t('cat.showZh')
}

/**
 * 中文对照钮在途时的加倍类。
 *
 * @param status 取数态。
 * @returns 类名;不在途给空串。
 */
export function transBusyClsOf(status: TransStatus): string {
  if (status === TRANS_LOADING) {
    return cssOf(css.pillBusy)
  }
  return TEXT_NONE
}

/**
 * AI 速读展开时的高亮类。
 *
 * @param aiOn 展开着没。
 * @returns 类名;没展开给空串。
 */
export function aiOnClsOf(aiOn: boolean): string {
  if (aiOn) {
    return cssOf(css.pillOn)
  }
  return TEXT_NONE
}

/**
 * AI 速读的折叠箭头(▾ = 展开 / ▸ = 收起)。
 *
 * @param aiOn 展开着没。
 * @returns 箭头。
 */
export function caretOf(aiOn: boolean): string {
  if (aiOn) {
    return CARET_DOWN
  }
  return CARET_RIGHT
}

/**
 * 整理版状态行的正文:整理好了 / 整理中 / 额度用完 / 生成失败。
 *
 * @param x 取词函数、整理版与失败由头。
 * @returns 一句灰注。
 */
export function aiNoteTextOf(x: AiNoteTextIn): string {
  if (x.fmt != null) {
    return x.t('act.ai')
  }
  if (x.fmt === undefined) {
    return x.t('act.aiWorking')
  }
  if (x.why === FMT_QUOTA) {
    return x.t('act.aiQuota')
  }
  return x.t('act.aiFail')
}

/**
 * 「看原文 / 看整理版」那颗钮的钮面文案。
 *
 * @param x 取词函数与在看原文没。
 * @returns 钮面文案。
 */
export function origLabelOf(x: OrigLabelIn): string {
  if (x.showOrig) {
    return x.t('act.seeFmt')
  }
  return x.t('act.seeOrig')
}

/**
 * 「怎么投」与薪资节的帖面薪资兜底(#123c):清洗产物优先,没有才退原文 ——
 * 这一处**保留**了旧实现的「退原文」,与手机卡薪资那一格的口径不同:卡上那格是**给结论**
 * (标绿 = 我们背书这条薪资可信),整理版这一处只是把帖面写着的话搬过来当兜底,不做背书。
 *
 * @param job 本岗。
 * @returns 帖面薪资;都没有给空串。
 */
export function fallbackPayOf(job: JobFact): string {
  if (job.salaryText !== TEXT_NONE) {
    return job.salaryText
  }
  return job.salary
}

/**
 * 空态那句话:原站拦抓取的说清是谁拦的,不谎报成「本站暂未收录」。
 *
 * @param x 取词函数与拦抓取的来源;'' = 不是被拦的。
 * @returns 空态说明。
 */
export function noTextOf(x: NoTextIn): string {
  if (x.src === TEXT_NONE) {
    return x.t('act.noText')
  }
  return x.t('act.noTextBlocked', { src: x.src })
}

/**
 * 现在渲整理版还是原文:有整理版且没切到原文才渲整理版。
 *
 * @param x 整理版与「在看原文」。
 * @returns 渲整理版 = true。
 */
export function showFormattedOf(x: ShowFormattedIn): boolean {
  return x.fmt != null && x.showOrig === false
}

/**
 * 在屏的对照译文;没开或还没拉到就给空串。
 *
 * @param x 对照在屏没与译文。
 * @returns 译文或空串。
 */
export function transShownOf(x: TransShownIn): string {
  if (x.shown && x.trans != null) {
    return x.trans
  }
  return TEXT_NONE
}

/**
 * 底部来源行出不出:整理版在屏时「怎么投」整节已链官方原帖,出处不丢,就不再兜底
 * (#167③;2026-07-21 Frank「去掉 source 链接」);空态那一档也不出(它自己有官方页出口)。
 *
 * @param x 本岗、取数态、整理版与「在看原文」。
 * @returns 出 = true。
 */
export function showSourceOf(x: ShowSourceIn): boolean {
  if (x.applyUrl === TEXT_NONE || x.status === JD_EMPTY) {
    return false
  }
  return (x.status === JD_DONE && showFormattedOf({ fmt: x.fmt, showOrig: x.showOrig })) === false
}

/**
 * 「打开完整页」的去处:只有弹框里出(整页版自己就是完整页)。
 *
 * @param x 在不在弹框里与这一岗的号。
 * @returns 去处;整页版给空串。
 */
export function fullHrefOf(x: FullHrefIn): string {
  if (x.inModal) {
    return URL_JOB + String(x.id)
  }
  return TEXT_NONE
}

/**
 * 投递主钮的钮面文案。投递方式在途时用中性「投递」占位 —— 别先显「前往投递」再闪成
 * 「邮件投递」(Frank 问「为什么有的是前往有的是邮箱」,闪变加剧困惑)。
 *
 * @param x 取词函数、投递邮箱与查完没。
 * @returns 钮面文案。
 */
export function applyLabelOf(x: ApplyLabelIn): string {
  if (x.email !== TEXT_NONE) {
    return x.t('apply.email')
  }
  if (x.emailDone) {
    return x.t('apply.web')
  }
  return x.t('apply.plain')
}

/**
 * 投递栏的类:整页窄屏那一档改 fixed 贴屏底。
 *
 * @param fixedBar 是不是 fixed 那一档。
 * @returns 类名。
 */
export function barClsOf(fixedBar: boolean): string {
  if (fixedBar) {
    return cssOf(css.bar) + SPACE + cssOf(css.barFixed)
  }
  return cssOf(css.bar)
}

/**
 * 相似职位行的灰字小注:同公司组不写(组标题已经说了同公司,再贴一遍既重复又在 375 上被截断)。
 *
 * @param x 要不要写与公司名。
 * @returns 小注;不写给空串。
 */
export function subOf(x: SubOfIn): string {
  if (x.withCompany) {
    return x.company
  }
  return TEXT_NONE
}

/**
 * 职位详情页要现算的那几样:面包屑的省段与分类路径、职位名译名、相似职位的兜底链。
 * 职位名译名(Frank「job 名称也需要翻译」):雇主原始岗名多是英文且不规范,挂 NOC 官方职业名的
 * 界面语言译名作对照(#151 口径,与公司页在招职位同款);英文界面 / 无译名 = 空,不渲。
 * 兜底链的文案定长,不把职业名插进句子 —— NOC 官方职业名可以长到
 * 「Machine operators and related workers in pulp and paper production and wood processing…」,
 * 塞进句子手机上折三行;范围交给链接目标,措辞与分组小标题「同省同职业」同一套词。
 *
 * @param x 本岗、页面维度、界面语言与取词函数。
 * @returns 详情页的展示行。
 */
export function jobDetailViewOf(x: JobDetailIn): JobDetailView {
  const provFull = provFullOf({ t: x.t, province: x.job.province })
  const level = strOf(x.related.fallbackLevel)
  const value = fallbackValueOf({ job: x.job, level })
  return {
    provFull,
    provHref: URL_BOARD_PROV + encodeURIComponent(x.job.province),
    segs: catSegsOf({ t: x.t, broad: x.job.broad, mid: x.job.mid, fine: x.job.fine }),
    alias: aliasOf({ row: nocRowOf({ dims: x.dims, noc: x.job.noc }), lang: x.lang, title: x.job.title }),
    fallbackHref: fallbackHrefOf({ province: x.job.province, level, value }),
    fallbackText: fallbackTextOf({
      t: x.t,
      value,
      prov: provWordOf({ t: x.t, province: x.job.province, full: provFull }),
    }),
  }
}

/**
 * 兜底链按哪一级筛,那一级的值是什么。
 *
 * @param x 本岗与级名;'' = 只按省。
 * @returns 那一级的值;没有给空串。
 */
function fallbackValueOf(x: FallbackValueIn): string {
  if (x.level === LEVEL_FINE) {
    return x.job.fine
  }
  if (x.level === LEVEL_MID) {
    return x.job.mid
  }
  if (x.level === LEVEL_BROAD) {
    return x.job.broad
  }
  return TEXT_NONE
}

/**
 * 兜底链的文案:按职业筛的一句、只按省的另一句。
 *
 * @param x 取词函数、那一级的值与省的单名。
 * @returns 文案。
 */
function fallbackTextOf(x: FallbackTextIn): string {
  if (x.value === TEXT_NONE) {
    return x.t('detail.relatedNoneProv', { p: x.prov })
  }
  return x.t('detail.relatedNoneOcc')
}

/**
 * 本岗 NOC 在维表里的那一行。
 *
 * @param x 页面维度与 NOC 码。
 * @returns 那一行;维表里没有给 null。
 */
function nocRowOf(x: NocRowIn): NocDescFact | null {
  for (const row of x.dims.nocDesc) {
    if (row.noc === x.noc) {
      return row
    }
  }
  return null
}

/**
 * 职位名底下那条译名:与岗名一样(忽略大小写)就不出,免得同一句写两遍。
 *
 * @param x 维表行、界面语言与岗名。
 * @returns 译名;不出给空串。
 */
function aliasOf(x: AliasOfIn): string {
  const zh = nocLocalTitle({ row: x.row, lang: x.lang })
  if (zh === TEXT_NONE || zh.toLowerCase() === x.title.toLowerCase()) {
    return TEXT_NONE
  }
  return zh
}

/**
 * 相似职位卡出不出:只在 closed 岗渲染(在招岗服务端就不查,related 恒空)——
 * 下架页原本是死路,横幅说完「已下架」就没有下一步(2026-08-11 Frank
 * 「下架了应该下面列出其他相似职位,用户不至于一看下架就走」)。
 *
 * @param x 本岗状态、相似职位与兜底链。
 * @returns 出 = true。
 */
export function showRelatedOf(x: ShowRelatedIn): boolean {
  if (x.status !== STATUS_CLOSED) {
    return false
  }
  return x.related.sameCompany.length > 0 || x.related.sameOcc.length > 0 || x.fallbackHref !== TEXT_NONE
}

/**
 * 兜底链出不出:同公司与同职业都零在招时,卡里原本什么都不剩 —— 下架页又成死路。
 *
 * @param x 相似职位与兜底链。
 * @returns 出 = true。
 */
export function showFallbackOf(x: ShowFallbackIn): boolean {
  if (x.related.sameCompany.length > 0 || x.related.sameOcc.length > 0) {
    return false
  }
  return x.fallbackHref !== TEXT_NONE
}

/**
 * 造一枚「点了相似职位」的埋点手柄(from 分两档:下架页的两组 / 两组都空时的兜底链)。
 *
 * @param from 来源格。
 * @returns 点击手柄。
 */
export function trackRelated(from: string): ClickFn {
  return function onRelated(): void {
    track(TRACK_REL_JOB, { [TRACK_KEY_FROM]: from })
  }
}

/**
 * 匹配档 chip 的配色类。
 *
 * @param level 档(high/mid/low/na)。
 * @returns 类名。
 */
export function matchToneClsOf(level: string): string {
  const cls = MATCH_TONE_CLS[level]
  if (cls == null) {
    return cssOf(css.matchNa)
  }
  return cssOf(css[cls])
}

/**
 * 收藏钮的类:已收藏加一档琥珀。
 *
 * @param on 已收藏没。
 * @returns 类名。
 */
export function actBtnClsOf(on: boolean): string {
  if (on) {
    return cssOf(css.actBtn) + SPACE + cssOf(css.actBtnOn)
  }
  return cssOf(css.actBtn)
}

/**
 * 一枚胶囊的类:基座 + 语义色档 + 可点档。
 *
 * @param spec 胶囊规格。
 * @returns 类名。
 */
export function chipClsOf(spec: ChipSpec): string {
  const tone = CHIP_TONE_CLS[spec.tone]
  let cls = cssOf(css.chip)
  if (tone != null) {
    cls = cls + SPACE + cssOf(css[tone])
  }
  if (spec.act) {
    cls = cls + SPACE + cssOf(css.chipAct)
  }
  return cls
}

/**
 * 悬停说明:没有就不挂(空串会渲成一个空 tooltip)。
 *
 * @param tip 说明;'' = 不挂。
 * @returns 说明或 undefined。
 */
export function titleOrNone(tip: string): string | undefined {
  if (tip === TEXT_NONE) {
    return undefined
  }
  return tip
}

/**
 * 表头一格的类:可排序的带手型,当前按它排的亮蓝。
 *
 * @param x 当前按它排没与可不可排序。
 * @returns 类名。
 */
export function headClsOf(x: HeadClsIn): string {
  let cls = cssOf(css.th)
  if (x.sortable) {
    cls = cls + SPACE + cssOf(css.thSortable)
  }
  if (x.active) {
    cls = cls + SPACE + cssOf(css.thOn)
  }
  return cls
}

/**
 * 排序提示符的类。
 *
 * @param active 当前按它排没。
 * @returns 类名。
 */
export function sortHintClsOf(active: boolean): string {
  if (active) {
    return cssOf(css.sortHint) + SPACE + cssOf(css.sortHintOn)
  }
  return cssOf(css.sortHint)
}

/**
 * 表头各格的展示行(列名、悬停、排序态与三个手柄一次算好)。
 *
 * @param b 职位板整台状态机。
 * @returns 表头各格。
 */
export function headCellsOf(b: JobsBoardPanel): HeadCellView[] {
  const out: HeadCellView[] = []
  for (const c of b.cols.shown) {
    const active = b.sort.key === c.key
    out.push({
      k: c.key,
      label: b.t(K_COL + c.key),
      title: headTitleOf({ t: b.t, k: c.key }),
      active,
      mark: sortMarkOf({ active, dir: b.sort.dir }),
      sortable: c.key !== COL.actions,
      frozen: frozenStyleOf({
        k: c.key,
        overflow: b.cols.cw.overflow,
        frozenSet: b.cols.frozenSet,
        stickyLeft: b.cols.stickyLeft,
        lastFrozen: b.cols.lastFrozen,
        bg: HEAD_BG,
        line: HEAD_LINE,
      }),
      onSort: makeColAction({ act: b.onSort, k: c.key }),
      onResize: makeResizeStart({ cw: b.cols.cw, k: c.key }),
      onAutoFit: makeAutoFit({ cw: b.cols.cw, k: c.key }),
      resizeTip: b.t('resize.tip'),
    })
  }
  return out
}

/**
 * 表格一格的展示行:展示行 + 可点态 + 贴边样式 + 点了去哪,一次算好。
 * 点法三条(逐字沿用旧实现):职位格直开职位描述(2026-07-19 Frank「点职位也能显示职位描述」;
 * title 顾问弹框由 JD 框标题栏的「AI 顾问」钮承接);Pro 锁列不开顾问弹框 —— 没数据只会误导,
 * 锁形本身已链去建档,match 在免费额度内有值仍可开;其余走单一路由 openField。
 *
 * @param x 整台状态机、这一行、列键与斑马纹档。
 * @returns 一格的展示行。
 */
export function boardCellViewOf(x: BoardCellIn): BoardCellView {
  const view = cellViewOf({ k: x.k, j: x.job, cx: x.b.cellCtx })
  const active = cellActive({ k: x.k, j: x.job, cx: x.b.cellCtx })
  const saved = x.b.saved[String(x.job.id)] != null
  return {
    view,
    active,
    saved,
    saveLabel: saveLabelOf({ t: x.b.t, saved }),
    onSave: makeSaveToggle({ onSave: x.b.onSave, job: x.job }),
    onLink: stopClick,
    nowrap: colNoWrapOf(x.k),
    isCell: x.k !== COL.actions,
    title: cellTitleOf(view),
    frozen: frozenStyleOf({
      k: x.k,
      overflow: x.b.cols.cw.overflow,
      frozenSet: x.b.cols.frozenSet,
      stickyLeft: x.b.cols.stickyLeft,
      lastFrozen: x.b.cols.lastFrozen,
      bg: rowBgOf(x.alt),
      line: ROW_LINE,
    }),
    onClick: cellClickOf({ b: x.b, job: x.job, k: x.k, view, active }),
  }
}

/**
 * 收藏钮的钮面文案。
 *
 * @param x 取词函数与已收藏没。
 * @returns 钮面文案。
 */
function saveLabelOf(x: SaveLabelIn): string {
  if (x.saved) {
    return x.t('sj.saved')
  }
  return x.t('sj.save')
}

/**
 * 格子的悬停说明:元素类的格把说明挂在自己身上,纯文本格挂显示文本(长值被裁时还看得全)。
 *
 * @param view 展示行。
 * @returns 悬停说明;不挂给空串。
 */
function cellTitleOf(view: CellView): string {
  if (view.title !== TEXT_NONE) {
    return view.title
  }
  if (view.kind === KIND.text) {
    return view.text
  }
  return TEXT_NONE
}

/**
 * 斑马纹这一档的底色(固定列贴边要拿它当不透明底)。
 *
 * @param alt 是不是另一档。
 * @returns 色值。
 */
function rowBgOf(alt: boolean): string {
  if (alt) {
    return ROW_BG_ALT
  }
  return ROW_BG
}

/**
 * 这一格点了去哪;不可点给 null(手型与真实行为绑同一个判据 —— 看着能点、点了没反应比不能点更糟)。
 *
 * @param x 整台状态机、这一行、列键、展示行与可点态。
 * @returns 点击手柄;不可点给 null。
 */
function cellClickOf(x: CellClickIn): ClickFn | null {
  if (x.active === false) {
    return null
  }
  if (x.k === COL.title) {
    return makeDescOpen({ onDesc: x.b.onDesc, job: x.job })
  }
  if (PRO_COLS.has(x.k) && x.b.plan.isPro === false && proMatchOpenOf({ k: x.k, j: x.job }) === false) {
    return null
  }
  return makeFieldOpen({ onField: x.b.onField, job: x.job, k: x.k, title: x.view.pop })
}

/**
 * Pro 锁列里唯一还能点开的那一格:match 在免费额度内有值时照旧可开。
 *
 * @param x 列键与这一行。
 * @returns 可开 = true。
 */
function proMatchOpenOf(x: ProMatchIn): boolean {
  return x.k === COL.match && x.j.match != null
}

/**
 * 格内链接的点击:只跳地图,不连带把整格的弹框也开了。
 *
 * @param e 点击事件(签名由 React 的事件系统定死)。
 * @returns 无。
 */
export function stopClick(e: React.MouseEvent): void {
  e.stopPropagation()
}

/**
 * 表格一格的类:数据格挂裁剪与断词,操作列不挂(它装的是按钮,挂了会把钮裁掉)。
 *
 * @param c 一格的展示行。
 * @returns 类名。
 */
export function cellClsOf(c: BoardCellView): string {
  let cls = cssOf(css.td)
  if (c.isCell) {
    cls = cls + SPACE + cssOf(css.cell)
  }
  if (c.active) {
    cls = cls + SPACE + cssOf(css.cellAct)
  }
  cls = cls + SPACE + toneClsOf(c.view.tone)
  if (c.nowrap) {
    return cls + SPACE + cssOf(css.nowrap)
  }
  return cls + SPACE + cssOf(css.wrapCell)
}

/**
 * 色档 → 类名。
 *
 * @param tone 色档。
 * @returns 类名。
 */
function toneClsOf(tone: CellTone): string {
  return cssOf(css[CELL_TONE_CLS[tone]])
}

/**
 * 格子上还要内联的两样运行时数据:冻结列的 sticky 偏移、大分类那一列的逐类色。
 *
 * @param c 一格的展示行。
 * @returns 内联样式;两样都没有给 undefined。
 */
export function cellStyleOf(c: BoardCellView): React.CSSProperties | undefined {
  if (c.view.color === TEXT_NONE) {
    if (c.frozen == null) {
      return undefined
    }
    return c.frozen
  }
  return Object.assign({ color: c.view.color }, c.frozen)
}

/**
 * 表格一行的类(斑马纹两档)。
 *
 * @param alt 是不是另一档。
 * @returns 类名。
 */
export function rowClsOf(alt: boolean): string {
  if (alt) {
    return cssOf(css.row) + SPACE + cssOf(css.rowAlt)
  }
  return cssOf(css.row)
}

/**
 * 表格外框的类:整表换血期半透明。
 *
 * @param swapping 换血中没。
 * @returns 类名。
 */
export function wrapClsOf(swapping: boolean): string {
  if (swapping) {
    return cssOf(css.tableWrap) + SPACE + cssOf(css.dim)
  }
  return cssOf(css.tableWrap)
}

/**
 * 卡片流的类:整表换血期半透明。
 *
 * @param swapping 换血中没。
 * @returns 类名。
 */
export function cardsClsOf(swapping: boolean): string {
  if (swapping) {
    return cssOf(css.cards) + SPACE + cssOf(css.dim)
  }
  return cssOf(css.cards)
}

/**
 * 表格本体的类:量好宽之后换固定布局(colgroup 说了算)。
 *
 * @param ready 有宽度可下没。
 * @returns 类名。
 */
export function tableClsOf(ready: boolean): string {
  if (ready) {
    return cssOf(css.table) + SPACE + cssOf(css.tableFixed)
  }
  return cssOf(css.table)
}

/**
 * 「显示更多」在途时的加倍类。
 *
 * @param loading 在途没。
 * @returns 类名;不在途给空串。
 */
export function moreBtnClsOf(loading: boolean): string {
  if (loading) {
    return cssOf(css.moreBusy)
  }
  return TEXT_NONE
}

/**
 * 「显示更多」的钮面文案:在途时只出省略号。
 *
 * @param x 在途没、钮面文案与在途占位。
 * @returns 钮面文案。
 */
export function moreLabelOf(x: MoreLabelIn): string {
  if (x.loading) {
    return x.busy
  }
  return x.label
}

/**
 * 内联样式:没有就给 undefined(React 不接受 null)。
 *
 * @param s 算出来的样式;null = 没有。
 * @returns 样式或 undefined。
 */
export function styleOrNone(s: React.CSSProperties | null): React.CSSProperties | undefined {
  if (s == null) {
    return undefined
  }
  return s
}

/**
 * 点击手柄:不可点就给 undefined(挂一个空手柄会让格子看着能点)。
 *
 * @param f 手柄;null = 不可点。
 * @returns 手柄或 undefined。
 */
export function clickOrNone(f: ClickFn | null): ClickFn | undefined {
  if (f == null) {
    return undefined
  }
  return f
}

/**
 * 这一行落在斑马纹的哪一档。
 *
 * @param i 第几行。
 * @returns 另一档 = true。
 */
export function isAltRow(i: number): boolean {
  return i % ZEBRA_MOD === 1
}

/**
 * 手机卡一张的展示行:链接、译名灰注、地点两段与胶囊排一次算好。
 * #129(Frank「卡片本身点不进去」):整卡可点 = 进详情页;卡内既有交互(弹框/收藏/胶囊)
 * 各自 stopPropagation 保持原行为。
 * #200(Frank「岗位名称中文翻译默认都加上」):职位名下挂 NOC 官方职业名译名(界面语言;
 * 与在招职位/弹框标题同款)—— 岗位名看不懂时靠这条。
 * #315:公司名补真 href(= 该公司筛选页,与雇主资质卡「该雇主在招职位」同链)—— 左键
 * preventDefault 照旧弹框,中键/新标签/键盘/爬虫拿到真链接,链接不再是无 href 的假按钮。
 * 薪资**只认清洗产物,不兜底回原文**:原来写「清洗产物 || 原文」,于是清洗为空时手机上会冒出
 * Job Bank 原话「$37.50 hourly」,而桌面是横线 —— 同一格两端两个样;护栏压制的行(源头填错栏)
 * 更不能靠这条兜底复活。2026-08-05 拍板。
 *
 * @param x 整台状态机与这一行。
 * @returns 一张卡的展示行。
 */
export function boardCardViewOf(x: BoardCardIn): BoardCardView {
  const L = parseLoc(x.job)
  const nameOf = makeNocName({ dims: x.b.data.dims, lang: x.b.lang })
  const saved = x.b.saved[String(x.job.id)] != null
  return {
    href: URL_JOB + String(x.job.id),
    note: aliasOf({
      row: nocRowOf({ dims: { nocDesc: x.b.data.dims.nocDescriptions, nocCategories: [] }, noc: x.job.noc }),
      lang: x.b.lang,
      title: x.job.title,
    }),
    companyHref: URL_JOBS_QUERY + encodeURIComponent(x.job.company),
    salary: x.job.salaryText,
    city: L.city,
    prov: x.job.province,
    cityHref: mapsUrl(mapQuery({ field: COL.city, job: x.job })),
    provHref: mapsUrl(mapQuery({ field: COL.province, job: x.job })),
    cityText: L.city,
    provText: L.prov,
    chips: chipSpecsOf({ j: x.job, t: x.b.t, blocked: x.b.blocked, eeCats: x.b.data.dims.eeCategories }),
    saved,
    starLabel: saveLabelOf({ t: x.b.t, saved }),
    star: starOf(saved),
    aging: x.job.status !== STATUS_CLOSED,
    ageText: makeAgeText({ t: x.b.t }),
    nameOf,
  }
}

/**
 * 收藏星标的字形。
 *
 * @param saved 已收藏没。
 * @returns 实心或空心星。
 */
function starOf(saved: boolean): string {
  if (saved) {
    return STAR_ON
  }
  return STAR_OFF
}

/**
 * 星标的类:已收藏加一档琥珀。
 *
 * @param saved 已收藏没。
 * @returns 类名。
 */
export function starClsOf(saved: boolean): string {
  if (saved) {
    return cssOf(css.star) + SPACE + cssOf(css.starOn)
  }
  return cssOf(css.star)
}

/**
 * 造「点卡上职位名」的手柄:拦住整卡的跳转,改开职位描述弹框(Frank 走查:手机点职位名要开
 * JD 弹框,与桌面一致;#131 的「跳详情页」推翻)。href 保留给爬虫 / SEO / 长按开页。
 *
 * @param x 开弹框的动作与这一岗。
 * @returns 点击手柄。
 */
export function makeCardTitleClick(x: DescOpenIn): (e: React.MouseEvent) => void {
  return function onCardTitle(e: React.MouseEvent): void {
    e.preventDefault()
    x.onDesc(x.job)
  }
}

/**
 * 造「点卡上公司名/市/省」的手柄:拦住整卡的跳转与本段的默认外链,改开对应字段的弹框。
 *
 * @param x 单一路由、这一岗、列键与弹框大标题。
 * @returns 点击手柄。
 */
export function makeCardFieldClick(x: FieldOpenIn): (e: React.MouseEvent) => void {
  return function onCardField(e: React.MouseEvent): void {
    e.preventDefault()
    e.stopPropagation()
    x.onField(x.k, x.job, x.title)
  }
}

/**
 * 造「点卡上星标」的手柄:收藏是卡内交互,别把整卡的跳转也触发了。
 *
 * @param x 收藏开关与这一岗。
 * @returns 点击手柄。
 */
export function makeCardStarClick(x: SaveToggleIn): (e: React.MouseEvent) => void {
  return function onCardStar(e: React.MouseEvent): void {
    e.stopPropagation()
    x.onSave(x.job)
  }
}

/**
 * 造「点卡上一枚胶囊」的手柄;不可点的连手柄也不给(挂上 stopPropagation 会吞整卡点击)。
 *
 * @param x 单一路由、这一岗与胶囊规格。
 * @returns 点击手柄;不可点给 null。
 */
export function makeChipClick(x: ChipClickIn): ClickFn | null {
  if (x.spec.act === false) {
    return null
  }
  return function onChip(): void {
    x.onField(x.spec.k, x.job, x.spec.text)
  }
}

/**
 * 值有才给,没有就不给(JobCard 的可选格:传空串会渲出一个空位)。
 *
 * @param s 值。
 * @returns 值或 undefined。
 */
export function someOf(s: string): string | undefined {
  if (s === TEXT_NONE) {
    return undefined
  }
  return s
}

/**
 * 造一格筛选的换值手柄。
 *
 * @param x 筛选各格与要换哪一格。
 * @returns 换值手柄。
 */
export function makeSlotChange(x: SlotIn): TextFn {
  return setterOf(x)
}

/**
 * 造省下拉的换值手柄:换省要把市与区一起清掉(它们是省的联动下级,留着就成了对不上的条件)。
 *
 * @param fState 筛选各格。
 * @returns 换值手柄。
 */
export function makeProvChange(fState: FilterState): TextFn {
  return function onProv(v: string): void {
    setterOf({ fState, k: FK.prov })(v)
    setterOf({ fState, k: FK.city })(TEXT_NONE)
    setterOf({ fState, k: FK.district })(TEXT_NONE)
  }
}

/**
 * 造市下拉的换值手柄:换市要把区清掉。
 *
 * @param fState 筛选各格。
 * @returns 换值手柄。
 */
export function makeCityChange(fState: FilterState): TextFn {
  return function onCity(v: string): void {
    setterOf({ fState, k: FK.city })(v)
    setterOf({ fState, k: FK.district })(TEXT_NONE)
  }
}

/**
 * 造大分类下拉的换值手柄:换大类要把中/小类一起清掉。
 *
 * @param fState 筛选各格。
 * @returns 换值手柄。
 */
export function makeBroadChange(fState: FilterState): TextFn {
  return function onBroad(v: string): void {
    setterOf({ fState, k: FK.broad })(v)
    setterOf({ fState, k: FK.mid })(TEXT_NONE)
    setterOf({ fState, k: FK.fine })(TEXT_NONE)
  }
}

/**
 * 造中分类下拉的换值手柄:换中类要把小类清掉。
 *
 * @param fState 筛选各格。
 * @returns 换值手柄。
 */
export function makeMidChange(fState: FilterState): TextFn {
  return function onMid(v: string): void {
    setterOf({ fState, k: FK.mid })(v)
    setterOf({ fState, k: FK.fine })(TEXT_NONE)
  }
}

/**
 * 造勾选框的换值手柄(事件形状由 React 定死,这里只把 checked 拆出来)。
 *
 * @param set 布尔的写口。
 * @returns 换值手柄。
 */
export function makeCheckChange(set: BoolFn): (e: React.ChangeEvent<HTMLInputElement>) => void {
  return function onCheck(e: React.ChangeEvent<HTMLInputElement>): void {
    set(e.target.checked)
  }
}

/**
 * 造身份预筛勾选框的换值手柄(GAP1③:勾上 = 'ok',取消 = 空)。
 *
 * @param fState 筛选各格。
 * @returns 换值手柄。
 */
export function makeEligChange(fState: FilterState): (e: React.ChangeEvent<HTMLInputElement>) => void {
  return function onElig(e: React.ChangeEvent<HTMLInputElement>): void {
    setterOf({ fState, k: FK.elig })(eligValueOf(e.target.checked))
  }
}

/**
 * 身份预筛勾上时存什么值。
 *
 * @param on 勾上没。
 * @returns 值。
 */
function eligValueOf(on: boolean): string {
  if (on) {
    return ELIG_OK
  }
  return TEXT_NONE
}

/**
 * 造是/否类下拉的显示名函数(值 → `opt.yes` / `opt.no`)。
 *
 * @param t 取词函数。
 * @returns 显示名函数。
 */
export function makeOptLabel(t: TFn): (v: string) => string {
  return function optLabel(v: string): string {
    return t(K_OPT + v)
  }
}

/**
 * 造试点社区下拉的显示名函数:yes/no 走取词,RCIP/FCIP 是官方缩写原样出。
 *
 * @param t 取词函数。
 * @returns 显示名函数。
 */
export function makePilotLabel(t: TFn): (v: string) => string {
  return function pilotLabel(v: string): string {
    if (v === PILOT_ANY || v === PILOT_NONE) {
      return t(K_OPT + v)
    }
    return v
  }
}

/**
 * 造带前缀取词的显示名函数(职位类型 / 年薪档 / 对比中位档)。
 *
 * @param x 取词函数与键前缀。
 * @returns 显示名函数。
 */
export function makePrefixLabel(x: PrefixLabelIn): (v: string) => string {
  return function prefixLabel(v: string): string {
    return x.t(x.prefix + v)
  }
}

/**
 * 造省下拉的显示名函数。2026-08-16 Frank「这个没有完全国际化」:省下拉的选项一直是英文全名
 * (筛选值就是它,深链/保存的筛选都靠它),中文界面看着半中半英 —— 挂上显示层,**值不动**。
 * 同日续:出**界面语言的省名就够**,「Ontario(安大略省)」在下拉里是一行说两遍。
 *
 * @param t 取词函数。
 * @returns 显示名函数。
 */
export function makeProvLabel(t: TFn): (v: string) => string {
  return function provLabel(v: string): string {
    return provName({ t, code: provCodeOrSelf(v), localeOnly: true })
  }
}

/**
 * 省全名 → 省码(查不到就把原值交回去,让显示层自己兜)。
 *
 * @param v 省全名。
 * @returns 省码或原值。
 */
function provCodeOrSelf(v: string): string {
  const code = provCodeOf(v)
  if (code === TEXT_NONE) {
    return v
  }
  return code
}

/**
 * 造分类下拉的显示名函数(未分类走规范键,其余走 noc_categories 的三语名)。
 *
 * @param t 取词函数。
 * @returns 显示名函数。
 */
export function makeCatLabel(t: TFn): (v: string) => string {
  return function catLabel(v: string): string {
    return catTextOf({ t, v })
  }
}

/**
 * 「更多筛选」钮的类:展开着或折叠区里有选中项就亮起来。
 *
 * @param x 展开着没与徽标计数。
 * @returns 类名。
 */
export function foldBtnClsOf(x: FoldBtnClsIn): string {
  const base = cssOf(css.btn38) + SPACE + cssOf(css.btnRow)
  if (x.fold || x.foldActive > 0) {
    return base + SPACE + cssOf(css.btnOn)
  }
  return base
}

/**
 * 「我的匹配」钮的类:桌面专属(手机走窄屏入口条),激活时亮起来并加粗。
 *
 * @param matchView 匹配视图开着没。
 * @returns 类名。
 */
export function matchBtnClsOf(matchView: boolean): string {
  const base = cssOf(css.wideOnly) + SPACE + cssOf(css.btn38)
  if (matchView) {
    return base + SPACE + cssOf(css.btnOn) + SPACE + cssOf(css.btnBold)
  }
  return base
}

/**
 * 勾选型筛选的类:勾上加一档浅靛底。
 *
 * @param on 勾上没。
 * @returns 类名。
 */
export function checkClsOf(on: boolean): string {
  if (on) {
    return cssOf(css.check) + SPACE + cssOf(css.checkOn)
  }
  return cssOf(css.check)
}

/**
 * 字段面板里一列的类:固定列灰着不可取消。
 *
 * @param always 是不是固定列。
 * @returns 类名。
 */
export function colOptClsOf(always: boolean): string {
  if (always) {
    return cssOf(css.colOpt) + SPACE + cssOf(css.colOptFixed)
  }
  return cssOf(css.colOpt)
}

/**
 * 折叠区展开/收起的箭头。
 *
 * @param fold 展开着没。
 * @returns 箭头。
 */
export function foldCaretOf(fold: boolean): string {
  if (fold) {
    return CARET_OPEN
  }
  return CARET_CLOSED
}

/**
 * 「我的匹配」钮的钮面文案:在视图里出「退出」,不在出「进入」。
 *
 * @param x 取词函数与匹配视图开着没。
 * @returns 钮面文案。
 */
export function matchLabelOf(x: MatchLabelIn): string {
  if (x.matchView) {
    return x.t('mv.exit')
  }
  return x.t('mv.entry')
}

/**
 * 字段面板里的逐列勾选(match 列不进选择器 —— 它是「我的匹配」视图专属,勾了也不出列)。
 *
 * @param b 职位板整台状态机。
 * @returns 逐列的展示行。
 */
export function colPanelRowsOf(b: JobsBoardPanel): ColOptionView[] {
  const out: ColOptionView[] = []
  for (const c of COLUMNS) {
    if (c.key === COL.match) {
      continue
    }
    out.push({
      k: c.key,
      label: b.t(K_COL + c.key),
      checked: c.always === true || b.cols.visible.includes(c.key),
      always: c.always === true,
      fixedNote: fixedNoteOf({ t: b.t, always: c.always === true }),
      onToggle: makeColAction({ act: b.cols.onCol, k: c.key }),
    })
  }
  return out
}

/**
 * 固定列后面那句小注。
 *
 * @param x 取词函数与是不是固定列。
 * @returns 小注;不是固定列给空串。
 */
function fixedNoteOf(x: FixedNoteIn): string {
  if (x.always) {
    return x.t('fields.fixed')
  }
  return TEXT_NONE
}

/**
 * 字段钮的类(与同行下拉对齐的 38 高,内容一行排开)。
 *
 * @returns 类名。
 */
export function fieldsBtnClsOf(): string {
  return cssOf(css.btn38) + SPACE + cssOf(css.btnRow)
}

/**
 * 一行都没有时的正文。
 *
 * @param x 取词函数与匹配视图开着没。
 * @returns 一句话。
 */
export function emptyTextOf(x: MatchLabelIn): string {
  if (x.matchView) {
    return x.t('mv.empty')
  }
  return x.t('empty')
}

/**
 * 空态里「去改档案」的链接文案:只有匹配视图出(空的匹配视图不该是死路)。
 *
 * @param x 取词函数与匹配视图开着没。
 * @returns 链接文案;普通视图给空串。
 */
export function emptyLinkOf(x: MatchLabelIn): string {
  if (x.matchView) {
    return x.t('mv.editProfile')
  }
  return TEXT_NONE
}

/**
 * 横幅副标的主句。标题数字口径不变:库内真实总数(第 15 轮 #34);筛选/匹配态只报命中数
 * (第 17 轮 #42)。
 *
 * @param x 取词函数、有没有筛选、匹配视图与总数。
 * @returns 主句。
 */
export function subTextOf(x: SubTextIn): string {
  if (x.anyFilter || x.matchView) {
    return x.t('subtitle.hits', { n: x.total })
  }
  return x.t('subtitle.count', { n: x.total })
}

/**
 * 横幅副标的证言句(第 5 轮 #14):省提名清单命中岗 + 有外劳记录雇主数 ——
 * 首屏 3 秒讲清与聚合站的区别。两个数都为 0 就不出。
 *
 * @param x 取词函数与两个数。
 * @returns 证言句;没数给空串。
 */
export function proofTextOf(x: ProofTextIn): string {
  if (x.named === 0 && x.lmia === 0) {
    return TEXT_NONE
  }
  return x.t('subtitle.proof', { named: x.named, lmia: x.lmia })
}

/**
 * 匹配视图状态条的正文。只报「高」(第 6 轮 #23):中匹配门槛宽、数字动辄数千,报出来像灌水,
 * 反而稀释高匹配的可信度。
 *
 * @param x 取词函数与全量匹配计数。
 * @returns 一句话。
 */
export function mvBarTextOf(x: MvBarTextIn): string {
  if (x.totals == null || x.totals.high === 0) {
    return x.t('mv.on')
  }
  return x.t('mv.on') + MV_DOT + x.t('mv.today', { h: x.totals.high })
}

/**
 * 升级弹框的由头文案。免费位用满(ss)说「Pro 可存 5 个」;匹配锁(match)带 FOMO 数字 ——
 * 拿得到今日高匹配数就报数,拿不到只说额度。其余由头不给文案(弹框用它自己的默认话术)。
 *
 * @param x 取词函数、由头、全量匹配计数与免费额度。
 * @returns 文案;不给给 undefined。
 */
export function upsellReasonOf(x: UpsellReasonIn): string | undefined {
  if (x.upsell === UPSELL_SS) {
    return x.t('ss.pro')
  }
  if (x.upsell !== UPSELL_MATCH) {
    return undefined
  }
  if (x.totals != null && x.totals.high > x.cap) {
    return x.t('up.matchN', { h: x.totals.high, n: x.cap })
  }
  return x.t('up.match', { n: x.cap })
}

/**
 * 匿名弹框开哪一档:「我的匹配」入口开登录框,其余一律注册框(用户定:注册与购买分离)。
 *
 * @param upsell 由头。
 * @returns 登录或注册。
 */
export function upsellModeOf(upsell: UpsellKind): AuthMode {
  if (upsell === UPSELL_LOGIN) {
    return AUTH_LOGIN
  }
  return AUTH_REGISTER
}

/**
 * 匿名弹框登录成功后回哪:只有「我的匹配」那一档直落匹配视图(Google 路径靠它)。
 *
 * @param upsell 由头。
 * @returns 去处;别的档给 undefined(回原页)。
 */
export function upsellReturnOf(upsell: UpsellKind): string | undefined {
  if (upsell === UPSELL_LOGIN) {
    return URL_BOARD_MATCH
  }
  return undefined
}

/**
 * cookie 里的列集 → 初始列。列偏好从 cookie 读(浏览器/服务器都能读)→ SSR 直接渲对的列,
 * 零闪烁;客户端选列时写这个 cookie。脏数据/解析失败一律当没有(用默认列)。
 *
 * @param raw cookie 原值;缺席 = 没设过。
 * @returns 列键;没有给 undefined(交给组件用默认列)。
 */
export function colsFromCookie(raw: string | undefined): string[] | undefined {
  if (raw == null) {
    return undefined
  }
  try {
    const arr: unknown = JSON.parse(decodeURIComponent(raw))
    if (Array.isArray(arr) === false) {
      return undefined
    }
    return stringsOf(arr as unknown[])
  } catch {
    return undefined
  }
}

/**
 * 一串东西里的那些串(cookie 里混进别的类型就丢掉)。
 *
 * @param arr 解出来的数组。
 * @returns 串。
 */
function stringsOf(arr: unknown[]): string[] {
  const out: string[] = []
  for (const v of arr) {
    if (typeof v === 'string') {
      out.push(v)
    }
  }
  return out
}

/**
 * 会话用户 + 分层结果 → 传给前端的分层态(E3-05/E5-00:展示引导用;gate 本身在服务端的
 * SELECT/匹配范围里已经生效)。
 * #84:身份四件 SSR 直传(账户钮零闪,不再等客户端拉 /api/users/me)。
 * ⚠️ `displayName` / `avatar` 两格:会话用户身上**可能压根没有**(Users collection 有,
 * 会话形状只留了鉴权那几格),取值处照旧兜 null。
 * dd24-#107:详情页曾把 profile 硬置 null,投递栏上线后成了坑 —— 详情页直入的已建档用户
 * 点投递被当无档案弹空白向导(填完还会覆盖真档案);user 本来就在手上,传真实档案零额外查询。
 *
 * @param x 会话用户、Pro 态、档案与建档态。
 * @returns 分层态。
 */
export function toJobPlan(x: JobPlanIn): JobPlan {
  const u = x.user
  return {
    isPro: x.pro,
    loggedIn: u != null,
    profileOk: x.profileOk,
    profile: planProfileOf({ profileOk: x.profileOk, profile: x.profile }),
    freeMatchCap: FREE_MATCH_JOBS_PER_DAY,
    email: strOrNull(u?.email),
    displayName: strOrNull(u?.displayName),
    avatar: strOrNull(u?.avatar),
    proUntil: proUntilOf(u),
  }
}

/**
 * 传给前端的档案:没建档就给 null(空档案会让引导表单以空值覆盖已有档案)。
 *
 * @param x 建档态与档案。
 * @returns 档案或 null。
 */
function planProfileOf(x: PlanProfileIn): MatchProfileFact | null {
  if (x.profileOk === false) {
    return null
  }
  return x.profile
}

/**
 * Pro 到期日截到年月日;没有就给空串。
 *
 * @param u 会话用户;null = 匿名。
 * @returns 到期日。
 */
function proUntilOf(u: SessionUser | null): string {
  if (u == null || u.proUntil == null) {
    return TEXT_NONE
  }
  return String(u.proUntil).slice(0, DATE_LEN)
}

/**
 * noc-descriptions 文档 → 详情页要的那几格(全格兜空串:维表按级填,DDL 后加的译名列
 * 可能还没灌)。
 *
 * @param docs 维表文档。
 * @returns 洗净的行。
 */
export function toNocDescList(docs: NocDescDoc[]): NocDescFact[] {
  const out: NocDescFact[] = []
  for (const r of docs) {
    out.push({
      noc: r.noc,
      title: strOf(r.title),
      titleZh: strOf(r.titleZh),
      titleKo: strOf(r.titleKo),
      duties: strOf(r.duties),
      requirements: strOf(r.requirements),
      fetched: strOf(r.fetched),
    })
  }
  return out
}

/**
 * noc-categories 文档 → 面包屑要的三级分类与它们的英韩名。列表页会注册整张分类维表;
 * 详情页直入也必须注册本岗这一行,否则英/韩界面会回退中文分类名。
 *
 * @param docs 维表文档。
 * @returns 洗净的行。
 */
export function toCatLabelList(docs: NocCategoryDoc[]): CatLabel[] {
  const out: CatLabel[] = []
  for (const r of docs) {
    out.push({
      broad: strOf(r.broad),
      mid: strOf(r.mid),
      fine: strOf(r.fine),
      broadEn: strOf(r.broadEn),
      broadKo: strOf(r.broadKo),
      midEn: strOf(r.midEn),
      midKo: strOf(r.midKo),
      fineEn: strOf(r.fineEn),
      fineKo: strOf(r.fineKo),
    })
  }
  return out
}
