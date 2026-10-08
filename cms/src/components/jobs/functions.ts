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
 * 2026-09-23 拖列整功能撤(Frank「拖动功能去掉吧」,线上拖了没反应):`resizeColWidths` 连同那份测试一并删,
 * 特批只剩前两处;列宽的纯算法只剩分宽(allocateColWidths)一个。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import {
  eeIsDormant, eeLastDraw, pnpFactsIndexOf, pnpBlockedKeysOf, pnpCellActiveOf, qcCellNameOf,
  pnpBlockCellOf, pnpChannelKeyOf, pnpChannelOf,
  pnpExcludedOf, pnpNameOf,
} from '@/components/pnp'
import { cssOf } from '@/components/css'
import { lazyTitleOf, titleSubOf, untranslatedOf } from '@/components/jobtitle'
import { OB_SEEN_KEY } from '@/components/profile'
import { BROAD_SLUGS } from '@/lib/stats'
import { eeDisplay, isDirect, isExpiredJob, isJdNone, sourceLabel } from '@/lib/jobs'
import { PROV_NAMES, homeGateJsOf, homeProvinceOf, mapQuery, mapsUrl, parseLoc, provName } from '@/lib/location'
import { catName, colorOf, nocLocalTitle, pickName } from '@/lib/noc'
import { makeT } from '@/lib/i18n'
import { fmtLocal, fmtLocalSec, ymd } from '@/lib/time'
import { track } from '@/lib/track'
import {
  ACC_UNKNOWN, APPLY_MAIL_RE, AT, AUTH_LOGIN,
  AUTH_REGISTER, AUTH_RESET, BLOCK_KEY_SEP, BROAD_ORDER_LAST, CANADA_MAIL_SUFFIX, CARET_CLOSED, CARET_OPEN,
  CELL_TONE_CLS, CHIP, CHIP_TONE_CLS, COL, COLS_COOKIE, COLS_MAX_AGE_S, COLUMNS, COLW_COOKIE, COLW_MAX_AGE_S, COL_FLOOR,
  COMMA, COOKIE_EQ, COOKIE_PATH_AGE, COOKIE_SAMESITE, COOKIE_SEP, CSS_BORDER_NONE,
  CSS_STICKY, DASH, DATE_LEN, DEFAULT_COLS, DIR_ASC, DIR_DESC, DISPOSITION_NONE, EE_PREFIX, FIELD_GROUP, FILTER_PROV,
  FILTER_Q, FK, FMT_QUOTA, FOLD_KEYS, FROZEN_COLS, FROZEN_EDGE_SHADOW, FROZEN_LINE_SHADOW, FROZEN_Z, GC_MAIL_SUFFIX,
  HDR_FREE_LEFT, HEAD_BG, HEAD_LINE, HOME_GATE_CSS, HOME_GATE_MAYBE, HOME_GATE_OFF, HOME_GATE_ON, HTTP_PAYMENT,
  HTTP_TOO_MANY, JB_MAIL_HOST, JD_ALT_SEP, JD_BARE_LABEL_RE, JD_BULLET_MARK, JD_BULLET_PREFIX, JD_BULLET_RE,
  JD_DASH_ITEM_RE, JD_GUESS_BAD_RE, JD_GUESS_MAX_LEN, JD_GUESS_MAX_WORDS, JD_GUESS_MIN_LEN, JD_GUESS_MIN_WORDS,
  JD_GUESS_NEXT_PARA_LEN, JD_HEAD_MARK, JD_DASH_PREFIX_RE, JD_ITEM_TAIL_RE, JD_PREFERRED_HEAD, JD_SUBHEAD_COLON_RE,
  JD_LONG_LINE_LEN, JD_DUP_MAX_LEN, JD_EMPHASIS_RE, JD_ESC_RE,
  JD_ESC_TO, JD_GLUE_TPL, JD_HR_DASH_TPL, JD_HR_LABELS, JD_HR_LINE_TO, JD_HR_LINE_TPL, JD_INLINE_LABELS, JD_INLINE_TPL,
  JD_KIND, JD_LABEL_LINE_RE, JD_LEAD_BULLET_RE, JD_LOC_PROV_KEY, JD_MONEY_RE, JD_SECS, JD_SEC_APPLY, JD_SEC_LOC,
  JD_SEC_PAY, JD_SEC_ROLE, JD_SEC_SPLIT_RE, JD_SEC_STEP, JD_SENTENCE_RE, JD_SPACES_RE, JD_STAR_ITEM_RE, JD_STAR_RE,
  JD_SUB_HEADS, JD_TOP_HEADS, JD_TPL_SLOT, JD_DONE, JD_EMPTY, JD_LIMITED, KIND, K_ACC, K_COL, K_DIVISOR, K_ELIG, K_EMP,
  K_LOCK_TIP, K_ORIGIN, K_PROV, K_SPONSOR_GRADE, K_TEER, K_TERM, K_UNCAT, K_WHO, LANG_KO,
  LANG_ZH, LAYER_CO, LAYER_JOB, LAYOUT_AUTO, LEVEL_BROAD, LEVEL_FINE, LEVEL_MID, LMIA_PREFIX, LOC_SEP, MEASURE_ROWS,
  NEWLINE, NOWRAP_COLS, P90, PAREN_L, PAREN_R, PCT_DECIMALS, PCT_MULTIPLIER, PREF_KEY, PROV_PICK_COOKIE,
  PROV_PICK_MAX_AGE_S, PROV_QC, PRO_COLS, PRO_MASK, P_DIR, P_LOGIN, P_PAGE, P_RESET, P_SIGNUP, P_SORT, QS_HEAD,
  RE_FLAG_G, ROLE_ADMIN, ROW_BG, ROW_BG_ALT, ROW_LINE, SAVED_STATUS_WISH, SEC_MODE, SEP_EN,
  NOC_LABEL_LIST_MAX, NOC_MORE_KEY, SEP_ZH, SIGN_DOLLAR, SIGN_PCT, SIGN_PLUS, SIG_EQ, SIG_SEP, SORT_MARK_ASC,
  SORT_MARK_DESC, SORT_MARK_IDLE, SPACE,
  SPONSOR_GRADE_AIP_ONLY, STAR_OFF, STAR_ON, STATUS_CLOSED,
  TABLE_SEL,
  TARGET_MAX, TARGET_P90, TBODY_ROW_SEL, TEER_PREFIX, TEER_ROUTE_MAX, TEXT_NONE, TEXT_STATUS, TONE, TRACK_FROM_CLOSED,
  TRACK_FROM_CLOSED_NONE, TRACK_FROM_OPEN, TRACK_FROM_OPEN_NONE, TRACK_KEY_FROM, TRACK_REL_JOB,
  TRANS_ERROR, TRANS_IDLE, TRANS_LOADING, UNCAT, UNIT_HOUR, UNIT_HR_RE, UNIT_K_YEAR, UNIT_YR_RE, UPSELL_SS,
  URL_API_JOB_TEXT, URL_API_JOB_TEXT_ID, URL_BOARD_BROAD, URL_BOARD_NOC, URL_BOARD_PROV, URL_JOB, URL_JOBS_QUERY,
  URL_LEVEL_AMP, URL_TO_FILTER, VAL_ON, WIDTH_MAX_CONTENT, WIDTH_MIN_CONTENT, WIDTH_SLACK, WIDTH_ZERO, WRAP_COLS,
  YEAR_MONTH_LEN, ZEBRA_MOD, DATE_CELL, P_REL_GROUP, P_REL_ID, URL_API_JOB_RELATED_PAGE,
  IMM_COLS, LANG_EN, DISPOSITION_MAP, GROUP_PNP,
} from './constants'
import type {
  AgeTextFn, AgeTextIn, AiNoteTextIn, AliasOfIn, Alloc, AllocateIn, AnyRouteIn, ApplyFiltersIn, SsrTransIn,
  AuthFromUrlOut, BlockedKeys, BoardCardIn, BoardCardView, BoardCellIn, BoardCellView, BoardPnpFacts, CardTitlesIn,
  CardsClsIn, HomeGate, LoadTipIn, PnpChipIn, CatLabel, CatLabelIn, CatSegsIn, CellClickIn, CellIn, CellTone,
  CellView, CellWidthsIn, ChipClickIn, ChipIn, ChipPushBlockIn, ChipPushIn, ChipPushQcIn, ChipSpec, ChipSpecsIn,
  CityOptsIn, ClearFiltersIn, ClickFn, ColActionIn, ColMeasure, ColOptionView, ColSpec, CompanyPeek, ColWant,
  ColWidthFnIn, ColWidthSeed, CookieIn, CrumbSeg, CurFiltersIn, DataKeyIn, DescOpenIn, DistOptsIn,
  FallbackHrefIn, FallbackTextIn, FallbackValueIn, FetchJobTextIn, FieldOpenIn, FillIn, FilterCountIn, FilterOpts,
  FilterOptsIn, FilterState, FilterValueIn, FixedNoteIn, FoldBtnClsIn, FoldNClsIn, FrozenStyleIn, GatedFiltersIn,
  GatedSetIn, HeadCellAtIn,
  HeadCellView, HeadClsIn, HeadTitleIn, HomeProvinceIn, JdCityLocalIn, JdLineView, JdLineViewIn, JdLinesIn,
  JdLocationSectionIn, JdLocationZhIn, JdPair, JdPairsIn, JdPayIn, JdReIn, JdSecHeadIn, JdSecModeIn, JdSectionMode,
  JdSectionView, JdSectionsIn, JobColKey, JobDetailIn, JobDetailView, JobDims, JobFact, JobFilters, JobPlan, JobPlanIn,
  JobTextOut, JobsBoardPanel, JobsQueryIn, KMoneyIn, MapHrefIn, MatchProfileFact, MeasureIn,
  MeasureOut, MeasurePassIn, MeasureWordIn, MoreLabelIn, NcByEeIn, NextSortIn, NoTextIn, NocCatRow, OrigLinkLabelIn,
  NocCategoryDoc, NocDescDoc, NocDescFact, NocHeadIn, NocLabelIn, NocNameIn, NocRowIn, NumOrIn, OccCellIn, OccNameIn,
  OccOptsIn, OccSlotIn, PageSigIn, PayFallbackForIn, PayFallbackZhIn, PayPairsZhIn, PeekStackRef, PickedShownIn,
  PlanProfileIn, PopupToCoIn, PrefixLabelIn, ProvFullIn, ProvWordIn, RankOfIn, RelJsonTotalIn, RelPageUrlIn,
  RelatedJobFact, RelatedJobJson, RelatedJobs, RelatedJson, RoundIn, SaveLabelIn, SaveToggleIn,
  SavedEntry, SavedListJson, SeedFilterIn, SeedJson, SeedValueIn, SessionUser, ShowFallbackIn, ShowFormattedIn,
  ShowRelatedIn, SlotIn, SortMarkIn, SortState, StickyOffsetsIn, SubTextIn, TFn, TextFn, ThWidthIn,
  TransLabelIn, TransShownIn, TransStatus, TransStatusShownIn, UpsellReasonIn, UserFilterIn, WantsIn, WidthsKeyIn,
  JobBodyPanel, JobDateCell, JobDatesOfIn, JdGroup, JdSubgroupsIn, PushGroupIn, RepeatItemIn, SubheadPairIn,
  CellCtx, ImmCtxIn, ImmMoneyIn, ImmNameEnIn, PopupState, ImmRow, ImmRowsIn, ImmSignalIn, ImmWageIn, OpenImmIn,
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
 * @param x 筛选各格 + 关键词(可传防抖后的词)。
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
 * 2026-09-23 match 列随「我的匹配」整拆出了列表,只剩固定列不进选择器。
 *
 * @returns 可勾选列键。
 */
export function togglableColsOf(): JobColKey[] {
  const keys: JobColKey[] = []
  for (const c of COLUMNS) {
    if (c.always !== true) {
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
 * 2026-09-23「我的匹配」整拆,match 列与匹配视图一起撤,这里不再需要跳过它。
 *
 * @param visible 勾选的列键。
 * @returns 按列序排好的列。
 */
export function shownColsOf(visible: JobColKey[]): ColSpec[] {
  const out: ColSpec[] = []
  for (const c of COLUMNS) {
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
 * 随首屏下发给职位板的维度:整包维度逐格照抄,只把省提名清单与抽选两张整表换成空表。
 * 2026-09-26 /fe 首页 Frank:这两张表每次随首页内联约 380KB(清单 ~293KB、抽选 ~91KB),而省提名弹框近 30 天
 * 真实用户打开 0 次 —— 改成弹框打开才懒取(/api/jobs/pnp,advisor 域 usePnpData);格子要的排除键与弹框事实索引
 * 另由 boardPnpOf 压成几串键随板下发。服务端门照旧拿整包(匹配维度要清单)。
 *
 * @param dims 首屏整包维度(服务端取的那份)。
 * @returns 下发给板的维度。
 */
export function boardDimsOf(dims: JobDims): JobDims {
  return {
    provinces: dims.provinces,
    cities: dims.cities,
    districts: dims.districts,
    nocCategories: dims.nocCategories,
    sources: dims.sources,
    experienceLevels: dims.experienceLevels,
    pnpOccupations: [],
    pnpDraws: [],
    pathways: [],
    qcCells: [],
    eeCategories: dims.eeCategories,
    eeBroads: dims.eeBroads,
    nocDescriptions: dims.nocDescriptions,
    occupations: dims.occupations,
    fieldSources: dims.fieldSources,
    news: dims.news,
  }
}

/**
 * 格子要的省提名事实(服务端门里从两张整表压好,随首屏下发;2026-09-26 起整表不再内联,见 boardDimsOf):
 * 官方具名排除两套键(口径同 blockedKeysOf)+ 省提名弹框的事实索引(pnp 域 pnpFactsIndexOf,与弹框出卡同一判据)。
 * 2026-09-28 排除键的算法随省提名弹框自立迁进 pnp 桶(pnpBlockedKeysOf,原本域 blockedKeysOf),这里只压成数组随板下发。
 *
 * @param dims 首屏整包维度(服务端取的那份)。
 * @returns 排除键与弹框事实索引。
 */
export function boardPnpOf(dims: JobDims): BoardPnpFacts {
  const blocked = pnpBlockedKeysOf(dims.pnpOccupations)
  return {
    pnpBlocked: Array.from(blocked.pnp),
    index: pnpFactsIndexOf({
      occ: dims.pnpOccupations, draws: dims.pnpDraws, pathways: dims.pathways, qcCells: dims.qcCells,
    }),
  }
}

/**
 * 随板下发的排除键 → 逐行 O(1) 查的两套键集(整表算一次;2026-09-26 起键在服务端压好,这里只装集合)。
 *
 * @param facts 随首屏下发的省提名事实。
 * @returns 两套键集。
 */
export function blockedSetsOf(facts: BoardPnpFacts): BlockedKeys {
  return { pnp: new Set(facts.pnpBlocked) }
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
 * 2026-09-26 /fe 首页 Frank(止血):省提名格再加一道「弹框里真有卡可出」,见 pnpActiveOf。
 * 2026-09-28 省提名格与 AIP 格的判据收进 pnp 桶(pnpCellActiveOf / aipExcludedOf;pnpActiveOf 随之迁走)。
 * 2026-10-01 Frank「这个地方不应该显示职业不受理,应该只显示是否是指定雇主」:AIP 格只看指定雇主,可点 = 是指定雇主(aipExcludedOf 随之删)。
 *
 * @param x 列键、库行、上下文。
 * @returns 可点 = true。
 */
export function cellActive(x: CellIn): boolean {
  if (cellActionable(x.k) === false) {
    return false
  }
  if (x.k === COL.pnp) {
    return pnpCellActiveOf({ job: x.j, blocked: x.cx.blocked, index: x.cx.pnpIndex })
  }
  if (x.k === COL.ee) {
    return hasText(x.j.eeCategory)
  }
  if (x.k === COL.aip) {
    return x.j.aip === true
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
    sub: TEXT_NONE,
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
  if (PRO_COLS.has(x.k) && x.cx.plan.isPro === false) {
    return blankView({ kind: KIND.lock, text: maskOf(x.k), title: x.cx.t(K_LOCK_TIP + x.k) })
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
 * 分类族:大/中/小分类、TEER、NOC 码、经验级别。
 * 2026-09-23 职业分类改两级:中 / 小分类两列撤;NOC 列改叫「职业」,显示人话短名(码在点开的类别弹框里)。
 * 同日 Frank「这个 NOC 字段怎么没有了」:码单列回来(nocCode),格里只放码,与改前的 NOC 列一样。
 * 同日 Frank「职业和 NOC 不需要加颜色吗」:两列与大分类同色(同一行的大类色),一行里分类三格一眼成组。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行;不是本族给 null。
 */
function catCellOf(x: CellIn): CellView | null {
  const t = x.cx.t
  if (x.k === COL.broad) {
    return blankView({ text: catTextOf({ t, v: x.j.broad }), tone: TONE.cat, color: colorOf(x.j.broad).fg })
  }
  if (x.k === COL.teer) {
    if (x.j.teer == null) {
      return blankView({ tone: TONE.slate })
    }
    const tip = t('teer.tip', { n: x.j.teer, l: t(K_TEER + x.j.teer) })
    return blankView({ text: TEER_PREFIX + String(x.j.teer), tone: TONE.slate, title: tip, pop: TEXT_NONE })
  }
  if (x.k === COL.noc) {
    const text = occCellTextOf({ job: x.j, lang: x.cx.lang, occName: x.cx.occName })
    return blankView({ text, tone: TONE.cat, color: colorOf(x.j.broad).fg })
  }
  if (x.k === COL.nocCode) {
    return blankView({ text: dashOf(x.j.noc), tone: TONE.cat, color: colorOf(x.j.broad).fg })
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
 * 「职业」列一格的文字(2026-09-23 职业分类改两级):人话短名。先用这一行随行带的职业名(JOB_COLUMNS 左连
 * noc_descriptions)—— Frank「刷新的时候为什么先显示号码」:原先只等懒取的大维度包,首屏先露职业码;
 * 行上没有再查维度表;两边都没有(描述表压根没这一码)才退回码,没码显示长横。
 *
 * @param x 这一行、界面语言与职业名取值函数。
 * @returns 格内文字。
 */
function occCellTextOf(x: OccCellIn): string {
  const own = pickName({ row: x.job.occNames, lang: x.lang })
  if (own !== TEXT_NONE) {
    return own
  }
  const name = x.occName(x.job.noc)
  if (name !== TEXT_NONE) {
    return name
  }
  return dashOf(x.job.noc)
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
  if (x.k === COL.whoCanApply) {
    if (hasText(x.j.whoCanApply) === false) {
      return blankView({ tone: TONE.faintSm })
    }
    return blankView({ text: x.cx.t(K_WHO + x.j.whoCanApply), tone: TONE.slateSm })
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
 * 具名通道与九省通用通道两格(2026-09-24 Frank「这个要不都改成上面英文,下面中文灰字」):上行英文名、下行界面语言译名灰字
 * (英文界面不出第二行;中文「技术工人」直译易误读成手艺人,Frank「接待员和行政助理也属于技术工人?」);同日 Frank
 * 「这种胶囊样式都去掉吧。都改成一致的」:琥珀徽章撤,两格同一绿字色档。九省之外(领地等)照旧一行「{省} 可提名」。
 * 2026-09-28 写哪条通道、叫什么名字收进 pnp 桶(pnpChannelKeyOf / pnpNameOf,与手机胶囊、弹框通道卡同一处判);
 * 原 pnpNamedCellOf / pnpGenericCellOf / pnpGenericOf 三件并掉,这里只剩色档与拼格。
 * 同日 Frank「这个要不要把灰字去掉」「先弄安省的」:两行改一行 —— 只写界面语言直白名(与手机胶囊同一个),英文行撤;
 * 官方原名进弹框「本岗能走的通道」卡的灰字。
 * 2026-09-29 Frank「有些职位不满足门槛 也要弹框 并说明」「就直接说 兼职」:走不了的岗红字直接写原因(兼职、合同工、季节工、
 * 临时工、工资低于中位、职业不收;数据层 pnpBlock,pnp 桶 pnpBlockOf 取词),可点开看「本岗不满足的门槛」卡;原先是灰「—」点不开。
 * 2026-09-30 Frank「兼职 这种都改成不符合 可以吗」(选「五个都改」):工作性质四个与工资那个改写「不符合」(pnp 桶 pnpBlockCellOf),
 * 职业不收照写;具体原因在弹框卡里。
 * 2026-09-30 魁省门槛弹框(Frank 勾「PSTQ + 通道名」):魁省岗写这个职业第一个通道(「PSTQ 高技能」这类,pnp 桶 qcCellNameOf),
 * 可点开看每个通道的门槛卡;不在官方对照表里的职业照旧紫字「魁省」。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行。
 */
function pnpCellOf(x: CellIn): CellView {
  if (x.j.province === PROV_QC) {
    return blankView({ text: qcCellNameOf({ t: x.cx.t, noc: x.j.noc, index: x.cx.pnpIndex }), tone: TONE.purpleSm })
  }
  const key = pnpChannelKeyOf({ job: x.j, defaults: x.cx.pnpIndex.defaults })
  if (key !== TEXT_NONE) {
    return blankView({ text: pnpNameOf({ key, t: x.cx.t }), tone: TONE.moneyMd })
  }
  const block = pnpBlockCellOf({ job: x.j, t: x.cx.t })
  if (block !== TEXT_NONE) {
    return blankView({ text: block, tone: TONE.redSm })
  }
  if (x.j.pnpEligible === true) {
    return blankView({ text: x.cx.t('cell.pnpSkilledProv', { p: x.j.province }), tone: TONE.moneyMd })
  }
  if (pnpExcludedOf({ job: x.j, blocked: x.cx.blocked })) {
    return blankView({ text: x.cx.t('cell.pnpExcl'), tone: TONE.redSm })
  }
  return blankView({ tone: TONE.mutedSm })
}

/**
 * 联邦 EE 类别抽选(全国单一源,数据层算):命中 → 蓝,未列入 → 长横,休眠类别 → 灰 + 上次抽选。
 * 2026-09-21 Frank「EE 类别应该只有这些」(下拉九类截图定版):格子只出类别名,
 * 上次抽选年月不再拼进正文(「STEM 2024-04」看着不像类别),收进悬停说明。
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
      text,
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
 * 2026-10-01 Frank「这个地方不应该显示职业不受理,应该只显示是否是指定雇主」:只写是不是指定雇主,「职业不受理」那支撤(是写「指定雇主」,不是写长横)。
 *
 * @param x 列键、库行、上下文。
 * @returns 展示行。
 */
function aipCellOf(x: CellIn): CellView {
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
  const pnpExcl = pnpExcludedOf({ job: x.j, blocked: x.blocked })
  if (anyRouteOf({ j: x.j, isQc, pnpExcl })) {
    pushTeerChip({ out, x })
    pushPnpChip({ out, x, pnpExcl })
    pushEeChip({ out, x })
    pushAipChip({ out, x })
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
  if (x.isQc || x.pnpExcl) {
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
 * 2026-09-28 写哪条通道、叫什么名字走 pnp 桶(pnpChannelKeyOf / pnpNameOf),与表格格子、弹框通道卡同一处判。
 * 2026-09-29 走不了的岗红胶囊直接写原因(pnpBlockOf,与表格格子同一个词);清单排除照旧走下面那条(与 AIP 合并的写法不动)。
 * 2026-09-30 改走 pnpBlockCellOf(与表格格子同一个词:五个码写「不符合」,职业不收照写)。
 * 2026-10-01 Frank「这个地方不应该显示职业不受理,应该只显示是否是指定雇主」:AIP 胶囊只写指定雇主,两条合写「本省不受理」那支撤 —— 这一枚只说省提名(「不符合」)。
 *
 * @param a 收集器、入参与省提名排除判定。
 * @returns 无。
 */
function pushPnpChip(a: ChipPushBlockIn): void {
  if (a.x.j.pnpEligible === true) {
    const key = pnpChannelKeyOf({ job: a.x.j, defaults: a.x.pnpIndex.defaults })
    let text = a.x.t('cell.pnpSkilledProv', { p: a.x.j.province })
    if (key !== TEXT_NONE) {
      text = pnpNameOf({ key, t: a.x.t })
    }
    a.out.push(pnpChipOf({ x: a.x, tone: CHIP.amber, text }))
    return
  }
  const block = pnpBlockCellOf({ job: a.x.j, t: a.x.t })
  if (block !== TEXT_NONE) {
    a.out.push(pnpChipOf({ x: a.x, tone: CHIP.red, text: block }))
    return
  }
  if (a.pnpExcl === false) {
    return
  }
  a.out.push(pnpChipOf({ x: a.x, tone: CHIP.red, text: a.x.t('cell.pnpExcl') }))
}

/**
 * 造省提名那一枚胶囊:可点与否跟表格那一格同一个判据(pnpActiveOf,2026-09-28 起 pnp 桶的 pnpCellActiveOf),不只看这一列点不点得开
 * (2026-09-26 /fe 首页 Frank 止血:弹框里没卡可出的,胶囊字照显示、不给点 —— 手机是主流量,卡上与表格一个样)。
 *
 * @param x 胶囊排的入参、语义色档与显示文本。
 * @returns 胶囊规格。
 */
function pnpChipOf(x: PnpChipIn): ChipSpec {
  const act = cellActionable(COL.pnp) && pnpCellActiveOf({ job: x.x.j, blocked: x.x.blocked, index: x.x.pnpIndex })
  return { tone: x.tone, text: x.text, k: COL.pnp, tip: TEXT_NONE, act }
}

/**
 * EE 类别胶囊(休眠类别灰,上次抽选月在悬停说明)。
 * 2026-09-21 Frank「EE 类别应该只有这些」:胶囊与表格格子同规 —— 正文只出类别名,年月收进悬停。
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
    a.out.push(chipOf({ tone: CHIP.gray, text: name, k: COL.ee, tip }))
    return
  }
  a.out.push(chipOf({ tone: CHIP.blue, text: name, k: COL.ee, tip: TEXT_NONE }))
}

/**
 * 大西洋试点胶囊。两条都命中排除时不出(那一枚已经由省提名胶囊说了「本省不受理」)。
 * 2026-10-01 Frank「这个地方不应该显示职业不受理,应该只显示是否是指定雇主」:只出「指定雇主」一种(与表格格子同),「职业不受理」红胶囊撤。
 *
 * @param a 收集器与入参。
 * @returns 无。
 */
function pushAipChip(a: ChipPushIn): void {
  if (a.x.j.aip === true) {
    a.out.push(chipOf({ tone: CHIP.orange, text: a.x.t('cell.aipYes'), k: COL.aip, tip: TEXT_NONE }))
  }
}

/**
 * 试点社区胶囊(E6-11:值 = 类型缩写,社区名/口径进弹框)与魁省胶囊。
 * 2026-09-30 魁省门槛弹框:魁省胶囊从省码「QC」改成与表格那一格同一个字(「PSTQ 高技能」这类),点开省提名弹框看门槛卡
 * (可点判据同表格,pnpChipOf);紫色照旧。
 *
 * @param a 收集器、入参与魁省判定。
 * @returns 无。
 */
function pushPilotChip(a: ChipPushQcIn): void {
  if (hasText(a.x.j.pilot)) {
    a.out.push(chipOf({ tone: CHIP.sky, text: a.x.j.pilot, k: COL.pilot, tip: TEXT_NONE }))
  }
  if (a.isQc) {
    const text = qcCellNameOf({ t: a.x.t, noc: a.x.j.noc, index: a.x.pnpIndex })
    a.out.push(pnpChipOf({ x: a.x, tone: CHIP.purple, text }))
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
 * 2026-09-23 同一个职业的几个码(「软件开发」三码)名字一样,只出一次。
 * 2026-10-06 多于 NOC_LABEL_LIST_MAX 个名字时收成「首个等 N 个」(访客第 3 题全选一整类后,14 个名字连成一枚标签横贯整行)。
 *
 * @param x NOC 多值、译名取值函数、界面语言。
 * @returns 顿号/逗号连接的人话名;没选职业时给空串。
 */
export function nocLabelOf(x: NocLabelIn): string {
  const names: string[] = []
  for (const raw of x.fNoc.split(COMMA)) {
    const code = raw.trim()
    if (code === TEXT_NONE) {
      continue
    }
    let name = x.nameOf(code)
    if (name === TEXT_NONE) {
      name = code
    }
    if (names.includes(name) === false) {
      names.push(name)
    }
  }
  if (names.length === 0) {
    return TEXT_NONE
  }
  if (names.length > NOC_LABEL_LIST_MAX) {
    return x.t(NOC_MORE_KEY, { first: names.slice(0, 1).join(TEXT_NONE), n: names.length, rest: names.length - 1 })
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
 * 纯函数:按「① 表头第一 → ② 内容第二 → ③ 余量给最长那列」把可分宽度分给各列
 * (Frank「列宽应该优先考虑 title 宽度,其次是内容宽度」)。
 * ① 表头永不折行、永不截断,顺带保底:再挤也不把一个词拦腰断成「Newfoundlan / d」。
 * ④ 总宽恒等于容器宽 → **永不横滚**;只有「表头都放不下」或用户手动拖宽才允许滚。
 * 2026-09-23 拖列撤,钉死的宽(pinned)随删,只剩「表头都放不下」一种会滚。
 *
 * @param x 各列的量宽结果与可分宽度。
 * @returns 各列像素,和恒等于可分宽度(除非表头都放不下)。
 */
export function allocateColWidths(x: AllocateIn): Record<string, number> {
  const out: Record<string, number> = {}
  if (x.cols.length === 0) {
    return out
  }
  const flex: Alloc[] = x.cols
  const room = x.avail
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
    lines = jdSplitLongLines(trimAll(clipped.replace(JD_EMPHASIS_RE, SPACE).split(NEWLINE)))
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
 * 带真实换行的正文里,把「单独太长的那几行」再断开(2026-09-19 Frank 实拍 restaurant supervisor 帖:整帖有换行,
 * 但职责与要求两节被源头压成了一行六百多字的一坨,行内全是「 - 项」):只对超过 JD_LONG_LINE_LEN 的行走猜测式断行,
 * 其余行原样 —— 原帖自己的分段不动。
 *
 * @param lines 按原换行切好的行。
 * @returns 长行已断开的行序列。
 */
function jdSplitLongLines(lines: string[]): string[] {
  const out: string[] = []
  for (const l of lines) {
    if (l.length <= JD_LONG_LINE_LEN) {
      out.push(l)
      continue
    }
    for (const part of jdGuessLines(l)) {
      out.push(part)
    }
  }
  return out
}

/**
 * 压平老坨帖的猜测式断行:无空格粘边 → 已知标签 → HR 破折号变体 → 「* 项」→ 行内圆点 → 行内短横项(2026-09-19)→
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
    .replace(JD_DASH_ITEM_RE, NEWLINE)
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
 * 2026-09-22 Frank「该加粗的地方也没有加粗,不能智能判断吗」(RBC 帖的 What will you do / Must have / Nice to have
 * 全素着):白名单之外加一道保守启发 —— 看着像节头的短行(jdGuessHeadOf,要看下一行)也给子节头档。
 *
 * @param x 一行与它的下一行。
 * @returns 这一行的展示行。
 */
export function jdLineViewOf(x: JdLineViewIn): JdLineView {
  const l = x.line
  if (l === TEXT_NONE) {
    return { kind: JD_KIND.gap, text: TEXT_NONE, label: TEXT_NONE }
  }
  if (l.startsWith(JD_BULLET_MARK)) {
    return { kind: JD_KIND.bullet, text: l, label: TEXT_NONE }
  }
  const head = jdBareHeadOf(l)
  const low = head.toLowerCase()
  if (JD_TOP_HEADS.has(low)) {
    return { kind: JD_KIND.h1, text: head, label: TEXT_NONE }
  }
  if (JD_SUB_HEADS.has(low)) {
    return { kind: JD_KIND.h2, text: head, label: TEXT_NONE }
  }
  if (l.startsWith(JD_HEAD_MARK)) {
    return { kind: JD_KIND.h2, text: head, label: TEXT_NONE }
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
  if (jdGuessHeadOf(x)) {
    return { kind: JD_KIND.h2, text: l, label: TEXT_NONE }
  }
  return { kind: JD_KIND.text, text: l, label: TEXT_NONE }
}

/**
 * 白名单外「看着像节头」的保守判定(2026-09-22):2~8 个词、4~60 字、不含数字与标点(数字行 / 地址行 / 句子出局),
 * 且**下一行**是列表项或 ≥80 字的长段 —— 节头后面必然跟内容;「Full time」这类孤零零的值行跟不出内容,不会中。
 *
 * @param x 一行与它的下一行。
 * @returns 像节头 = true。
 */
function jdGuessHeadOf(x: JdLineViewIn): boolean {
  const l = x.line
  if (l.length < JD_GUESS_MIN_LEN || l.length > JD_GUESS_MAX_LEN) {
    return false
  }
  if (JD_GUESS_BAD_RE.test(l)) {
    return false
  }
  const words = l.split(SPACE).length
  if (words < JD_GUESS_MIN_WORDS || words > JD_GUESS_MAX_WORDS) {
    return false
  }
  if (x.next.startsWith(JD_BULLET_MARK)) {
    return true
  }
  return x.next.length >= JD_GUESS_NEXT_PARA_LEN
}

/**
 * 剥掉行首的节头记号;没有记号的行原样返回。
 *
 * 剥完再过白名单,是为了让 Job Bank 那套固定小节维持原来的档位(大节头仍是大节头);
 * 白名单不认、但数据层标了记号的,走子节头档。
 *
 * @param l 一行。
 * @returns 不带记号的那一行。
 */
function jdBareHeadOf(l: string): string {
  if (l.startsWith(JD_HEAD_MARK)) {
    return l.slice(JD_HEAD_MARK.length)
  }
  return l
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
 * 整理版一行若只是个裸标签(剥掉「- 」后形如「Preferred:」),给出节内小标题字(不带冒号);否则给空串。
 * 2026-10-02 Frank「这个应该是一个 title 吧」(Maarut 帖 REQS 节里「- Preferred:」被渲成一条要求):
 * 口径同原帖轨的裸标签行(JD_BARE_LABEL_RE),版式同它的子节头。
 *
 * @param l 一行(整理版原文)。
 * @returns 小标题字;不是小标题给空串。
 */
export function jdSubheadOf(l: string): string {
  const m = jdStripDash(l).match(JD_BARE_LABEL_RE)
  if (m == null) {
    return TEXT_NONE
  }
  const [, head] = m
  return String(head)
}

/**
 * 小标题那一行出什么字:有对照译文就出译文(去行尾冒号),没有出原文小标题。
 * 2026-10-02 Frank「preferred 改成中文」:小标题与节头一样按界面语出,底下不再另挂一行对照。
 *
 * @param p 小标题那一行。
 * @returns 小标题字。
 */
export function jdSubheadTextOf(p: JdPair): string {
  if (p.zh !== TEXT_NONE) {
    return p.zh.replace(JD_SUBHEAD_COLON_RE, TEXT_NONE)
  }
  return jdSubheadOf(p.en)
}

/**
 * 一节的行按小标题收拾(2026-10-02 Frank「有就加 没有就不加这一项」「Experience 这叫什么 preferred」):
 * 小标题底下的条目若与本节前面某条同词起头(「Experience」对「Experience an asset」)= 模型把同一条又抄一遍,丢掉;
 * 丢完一条不剩的小标题整个不出(占位行 jdPairsOf 已丢,存量 4688 条整理版的「Preferred:」底下本就空)。
 * 「Preferred」是整理提示词定死的标记,对照位换成界面语词条,对照开关关着也按界面语出。
 *
 * @param x 取词函数与这一节的行。
 * @returns 收拾后的行。
 */
export function jdSubgroupsOf(x: JdSubgroupsIn): JdPair[] {
  const out: JdPair[] = []
  const seen: string[] = []
  const group: JdGroup = { head: null, items: [] }
  for (const p of x.pairs) {
    if (jdSubheadOf(p.en) !== TEXT_NONE) {
      pushGroup({ out, group })
      group.head = subheadPairOf({ t: x.t, p })
      group.items = []
      continue
    }
    const key = jdItemKeyOf(p.en)
    if (group.head != null && isRepeatItem({ key, seen })) {
      continue
    }
    seen.push(key)
    if (group.head == null) {
      out.push(p)
    } else {
      group.items.push(p)
    }
  }
  pushGroup({ out, group })
  return out
}

/**
 * 小标题那一行:提示词定死的「Preferred」对照位换界面语词条,其余原样。
 *
 * @param x 取词函数与小标题那一行。
 * @returns 小标题那一行。
 */
function subheadPairOf(x: SubheadPairIn): JdPair {
  if (jdSubheadOf(x.p.en).toLowerCase() === JD_PREFERRED_HEAD) {
    return { en: x.p.en, zh: x.t('jd.preferred') }
  }
  return x.p
}

/**
 * 条目比对用的键:剥「- 」、去行尾标点、转小写。
 *
 * @param en 一行原文。
 * @returns 比对键。
 */
function jdItemKeyOf(en: string): string {
  return jdStripDash(en).replace(JD_ITEM_TAIL_RE, TEXT_NONE).toLowerCase()
}

/**
 * 这一条是不是前面某条的重抄:与前面某条相同,或是它开头的整词。
 *
 * @param x 这一条的键与前面各条的键。
 * @returns 是重抄。
 */
function isRepeatItem(x: RepeatItemIn): boolean {
  for (const s of x.seen) {
    if (s === x.key || s.startsWith(x.key + SPACE)) {
      return true
    }
  }
  return false
}

/**
 * 收起手上这一组:有小标题且底下还有条目才落进结果;没有小标题的组条目早已落过。
 *
 * @param x 结果与手上这一组。
 * @returns 无。
 */
function pushGroup(x: PushGroupIn): void {
  if (x.group.head == null || x.group.items.length === 0) {
    return
  }
  x.out.push(x.group.head)
  for (const p of x.group.items) {
    x.out.push(p)
  }
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
 * 懒取 JD 正文。#126 同岗会话缓存:三处调用点(事实块 / JD 弹框 / 详情页 JD 区)共用,
 * 同一岗反复开关不重复打端点烧额度。命中缓存时 freeLeft = null(没消耗,额度行不刷新)。
 * #134(Frank 报障「点了一些工作发现都是空的」):429 曾掉进「空」分支 —— 额度一用完,
 * 之后每个岗都显示「本站暂未收录正文」,把限流谎报成缺数据(最恶的一种静默失败:
 * 用户以为站没数据)。三态分明:402 = 免费额度用完 · 429 = 匿名 IP 池用完 ·
 * 其它非 2xx = 取数失败(不是「没有」)。
 *
 * 2026-09-20 改键:会话缓存与服务端找行都按岗位号(原按原帖链接 —— HireAC 91 条岗共用一个登录门户网址,
 * 开过一条,其余 90 条弹框里全是它的正文;生产实撞)。入参顺势收成一参形,调用点(本域两处 + advisor 一处)同批改。
 *
 * @param x 原帖链接、岗位号与中断信号(组件卸载时掐掉在途请求)。
 * @returns 三态分明的取数结果。
 */
export async function fetchJobText(x: FetchJobTextIn): Promise<JobTextOut> {
  const key = String(x.id)
  const hit = CACHE.jobText.get(key)
  if (hit != null) {
    return { status: TEXT_STATUS.ok, text: hit, freeLeft: null }
  }
  const init: RequestInit = {}
  if (x.signal != null) {
    init.signal = x.signal
  }
  const res = await fetch(URL_API_JOB_TEXT + encodeURIComponent(x.applyUrl) + URL_API_JOB_TEXT_ID + key, init)
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
    CACHE.jobText.set(key, text)
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
 * 面包屑的职业分类路径段。沿革:原是「省 › 大 › 中 › 小」,同名相邻跳过、不铺重复;2026-09-23 职业分类改两级,
 * 改成「省 › 大类 › 职业」—— 职业段显示人话短名,点了回板上按这个职业码筛(`?noc=`,与问卷 / 规划页深链同一个参数)。
 *
 * @param x 取词函数、本岗大类、职业码与职业名取值函数。
 * @returns 路径段。
 */
export function catSegsOf(x: CatSegsIn): CrumbSeg[] {
  const out: CrumbSeg[] = []
  if (x.broad !== TEXT_NONE && x.broad !== UNCAT) {
    out.push({ txt: catTextOf({ t: x.t, v: x.broad }), href: URL_BOARD_BROAD + encodeURIComponent(x.broad) })
  }
  const name = x.occName(x.noc)
  if (name !== TEXT_NONE) {
    out.push({ txt: name, href: URL_BOARD_NOC + encodeURIComponent(x.noc) })
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
 * 2026-10-02(Frank「这个默认列 改成 职业」实拍职业名被截):08-29 样式迁进 jobs.module.css 后,外框类 `jtTableWrap` 与量宽类 `jtMeasure`
 * 都没人挂了 —— 外框永远找不到、这里永远给 null,线上列宽一个多月停在首屏比例种子(大分类能折行看不出,换成不折行的职业列才露馅)。
 * 外框改认表格的父元素(tableWrapOf),量宽类改挂模块类 `css.measure`。
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
  const wrap = tableWrapOf(head)
  if (wrap == null || wrap.clientWidth === 0) {
    return null
  }
  const prevLayout = table.style.tableLayout
  const prevWidth = table.style.width
  const prevMin = table.style.minWidth
  table.classList.add(cssOf(css.measure))
  table.style.tableLayout = LAYOUT_AUTO
  table.style.width = WIDTH_MAX_CONTENT
  table.style.minWidth = WIDTH_ZERO
  const measured = contentPass({ keys: x.keys, head, table, pad: x.pad })
  table.classList.remove(cssOf(css.measure))
  table.style.width = WIDTH_MIN_CONTENT
  wordPass({ keys: x.keys, table, pad: x.pad, measured })
  table.style.tableLayout = prevLayout
  table.style.width = prevWidth
  table.style.minWidth = prevMin
  return { measured, wrapW: wrap.clientWidth }
}

/**
 * 表格外框 = 表格的父元素(BoardTable 里 div 直接包 table;可分宽度读它的 clientWidth)。
 * 2026-10-02 换掉全局类选择器 `.jtTableWrap`(样式迁模块后没人挂它,外框永远找不到,见 measureColWidths)。
 *
 * @param head 表头行。
 * @returns 外框;表头不在表里给 null。
 */
export function tableWrapOf(head: HTMLElement): HTMLElement | null {
  const table = head.closest(TABLE_SEL)
  if (table == null) {
    return null
  }
  return table.parentElement
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
 * @param x 筛选各格的读写口与要落的筛选。
 * @returns 无。
 */
export function applyFiltersTo(x: ApplyFiltersIn): void {
  for (const [k, s] of Object.entries(x.fState)) {
    const v = x.f[k]
    if (typeof v === 'string' && v !== TEXT_NONE) {
      s.set(v)
    }
  }
}

/**
 * 折叠区里有几项被选中(徽标计数)。
 *
 * @param x 筛选各格。
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
  return n
}

/**
 * 窄屏折叠区的徽标计数(2026-09-26 /fe 首页 Frank 看效果图点头):EE 类别下拉在手机上收进「更多筛选」,
 * 选了它也要进徽标;宽屏它在常用一行,不进(foldActiveOf 照旧)。
 *
 * @param x 筛选各格。
 * @returns 计数。
 */
export function foldActiveNarrowOf(x: FilterCountIn): number {
  const n = foldActiveOf(x)
  if (slotOf({ fState: x.fState, k: FK.ee }) !== TEXT_NONE) {
    return n + 1
  }
  return n
}

/**
 * 有没有任何筛选在生效(「已选」行与横幅数字口径都看它)。
 *
 * @param x 筛选各格。
 * @returns 有 = true。
 */
export function anyFilterOf(x: FilterCountIn): boolean {
  for (const slot of Object.values(x.fState)) {
    if (slot.v !== TEXT_NONE) {
      return true
    }
  }
  return false
}

/**
 * 用户自己设没设过筛选(2026-09-26 /fe 首页 Frank 看效果图点头:「清除筛选」只在这时出,窄屏):
 * 进板时预选的本省(按时区或上次所选,homeProvPickOf)不算;地址栏带来的条件算(那是链接给的,不是预选)。
 * 蕴含 anyFilterOf;没预选省时两者等价。
 *
 * @param x 筛选各格与进板时预选的省('' = 没预选)。
 * @returns 设过 = true。
 */
export function userFilterOf(x: UserFilterIn): boolean {
  for (const [k, slot] of Object.entries(x.fState)) {
    if (slot.v !== TEXT_NONE && (k !== FK.prov || slot.v !== x.homeProv)) {
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
 * @param x 筛选各格。
 * @returns 无。
 */
export function clearFiltersIn(x: ClearFiltersIn): void {
  for (const slot of Object.values(x.fState)) {
    slot.set(TEXT_NONE)
  }
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
 * 大/中/小类来自 noc_categories;EE 类别来自 ee_categories(2026-09-14 Frank「加个筛选放在大类前面」,不联动);
 * 来源来自 sources(2026-09-15 Frank「一个是渠道 一个是来源」,不联动;渠道是枚举,选项在 OPTS_ORIGIN)。
 * 大类按行业顺序(BROAD_SLUGS = etl/noc_buckets.BROADS 的镜像),不用 uniq 的字母序 ——
 * 对中文那是按码位排的,等于乱序;清单外的值(未分类)垫底。
 *
 * 2026-09-23 职业分类改两级:中 / 小类两组换成「职业」一组(职业维度 noc_openings,跟着大类与 EE 类别联动)。
 *
 * @param x 维度表与当前的省/市/大类/EE 类别。
 * @returns 七组选项。
 */
export function filterOptsOf(x: FilterOptsIn): FilterOpts {
  const code = provCodeOf(x.prov)
  const nc = ncByEeOf({ dims: x.dims, ee: x.ee })
  return {
    prov: provOptsOf(x.dims),
    city: cityOptsOf({ dims: x.dims, code }),
    district: distOptsOf({ dims: x.dims, code, city: x.city }),
    broad: broadOptsOf(nc),
    occ: occOptsOf({ dims: x.dims, broad: x.broad, ee: x.ee }),
    ee: eeOptsOf(x.dims),
    source: sourceOptsOf(x.dims),
  }
}

/**
 * 分类树按 EE 类别收窄(2026-09-14 Frank「这个应该需要联动吧」):选了类别只留该类别在招岗落到的大类,
 * 中/小类随大类一起收窄;'' = 全部不动。
 *
 * @param x 维度表与当前 EE 类别。
 * @returns 收窄后的分类树行。
 */
function ncByEeOf(x: NcByEeIn): NocCatRow[] {
  if (x.ee === TEXT_NONE) {
    return x.dims.nocCategories
  }
  const broads = new Set<string>()
  for (const b of x.dims.eeBroads) {
    if (b.label === x.ee) {
      broads.add(b.broad)
    }
  }
  const out: NocCatRow[] = []
  for (const c of x.dims.nocCategories) {
    if (broads.has(c.broad)) {
      out.push(c)
    }
  }
  return out
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
 * 职业清单(2026-09-23 职业分类改两级,取代中 / 小分类两个下拉):职业维度已按在招数从多到少排好;
 * 选了大类只留这个大类的职业,选了 EE 类别再按 EE 名单收窄(名单是官方的职业码清单)。
 *
 * @param x 维度表、当前大类与 EE 类别。
 * @returns 职业码。
 */
function occOptsOf(x: OccOptsIn): string[] {
  const groups = occGroupsOf(x.dims)
  const inEe = new Set<string>()
  for (const c of x.dims.eeCategories) {
    if (c.label === x.ee) {
      inEe.add(c.noc)
    }
  }
  const out: string[] = []
  for (const o of x.dims.occupations) {
    if (x.broad !== TEXT_NONE && o.broad !== x.broad) {
      continue
    }
    if (x.ee !== TEXT_NONE && inEe.has(o.noc) === false) {
      continue
    }
    const rep = groups.get(o.noc)
    if (rep != null && rep !== o.noc) {
      continue
    }
    out.push(o.noc)
  }
  return out
}

/**
 * 职业码 → 所在职业的代表码(2026-09-23 职业 = 中文短名相同的一组码,「软件开发」三个码就是一组;与查询层 lib/jobs
 * 的 nocGroup 展开同一个口径)。代表码 = 组里在招最多的那个(职业维度已按在招数排好);大维度包没到时谁也不合,一码一组。
 *
 * @param dims 维度表。
 * @returns 职业码 → 代表码。
 */
export function occGroupsOf(dims: JobDims): Map<string, string> {
  const nameOf = new Map<string, string>()
  for (const row of dims.nocDescriptions) {
    if (row.titleZhShort !== TEXT_NONE) {
      nameOf.set(row.noc, row.titleZhShort)
    }
  }
  const repOf = new Map<string, string>()
  const out = new Map<string, string>()
  for (const o of dims.occupations) {
    const name = nameOf.get(o.noc)
    if (name == null) {
      out.set(o.noc, o.noc)
      continue
    }
    const rep = repOf.get(name)
    if (rep == null) {
      repOf.set(name, o.noc)
      out.set(o.noc, o.noc)
    } else {
      out.set(o.noc, rep)
    }
  }
  return out
}

/**
 * 「职业」下拉的当前值(2026-09-23):问卷 / 规划页的深链可能带好几个职业码(逗号隔开),下拉只认一个职业 ——
 * 几个码折成代表码后只剩一个(同一个职业的组员,如「软件开发」三个码)就给这个代表码;真是好几个职业给空串
 * (下拉显示「全部职业」,多值由职业胶囊显示与撤掉)。
 *
 * @param x 筛选各格与职业组(occGroupsOf)。
 * @returns 代表码;'' = 没选或多个职业。
 */
export function occSlotOf(x: OccSlotIn): string {
  const reps = new Set<string>()
  for (const raw of slotOf({ fState: x.fState, k: FK.noc }).split(COMMA)) {
    const code = raw.trim()
    if (code === TEXT_NONE) {
      continue
    }
    const rep = x.groups.get(code)
    if (rep == null) {
      reps.add(code)
    } else {
      reps.add(rep)
    }
  }
  if (reps.size !== 1) {
    return TEXT_NONE
  }
  for (const rep of reps) {
    return rep
  }
  return TEXT_NONE
}

/**
 * 「已选」行职业胶囊该显示的职业码(2026-09-23 Frank「不需要加这个吧」:单个职业已由常用一行的「职业」下拉显示,
 * 再挂胶囊是重复;胶囊只留给下拉表达不了的多值 —— 问卷 / 规划页深链带的几个职业码)。
 *
 * @param x 筛选各格与职业组。
 * @returns 职业码(可能多值);'' = 不出胶囊。
 */
export function chipNocOf(x: OccSlotIn): string {
  if (occSlotOf(x) !== TEXT_NONE) {
    return TEXT_NONE
  }
  return slotOf({ fState: x.fState, k: FK.noc })
}

/**
 * EE 类别清单(维度表一类多行,按首现去重保官方顺序 —— 不走 uniq 的字母序,对中文那是码位乱序;
 * 值 = 数据层 label)。
 *
 * @param dims 维度表。
 * @returns EE 类别。
 */
function eeOptsOf(dims: JobDims): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of dims.eeCategories) {
    if (seen.has(c.label) === false) {
      seen.add(c.label)
      out.push(c.label)
    }
  }
  return out
}

/**
 * 来源清单(sources 维度表按名排好的顺序;值 = 数据层来源标签,板名本身不译)。
 *
 * @param dims 维度表。
 * @returns 来源名。
 */
function sourceOptsOf(dims: JobDims): string[] {
  const out: string[] = []
  for (const s of dims.sources) {
    out.push(s.name)
  }
  return out
}

/**
 * 分页签名:筛选/搜索/排序/切匹配视图变化 → 回第 0 页(取数 effect 随之重拉替换)。
 *
 * @param x 当前筛选与排序。
 * @returns 签名串。
 */
export function pageSigOf(x: PageSigIn): string {
  return filterSig(x.cur) + SIG_SEP + x.sort.key + SIG_SEP + x.sort.dir
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
 * 2026-09-23 职业胶囊改走 makeOccName(与「职业」下拉同名),这里只剩手机卡的灰注。
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
 * 造「按职业码取职业名」的取值函数(2026-09-23 职业分类改两级):「职业」下拉、职业列、面包屑、类别弹框与职业胶囊
 * 走这一个出口 —— 界面语言的短名,一路回退完整译名、官方英文名(lib/noc 的 pickName),同一个职业处处同一个名字。
 * 胶囊原走 makeNocName(给完整译名,英文界面给空串、只好显示码);手机卡的灰注照旧走 makeNocName。
 *
 * @param x 职业描述行与界面语言。
 * @returns 职业码 → 职业名;描述行里没有给空串。
 */
export function makeOccName(x: OccNameIn): (code: string) => string {
  const byCode = new Map<string, NocDescFact>()
  for (const row of x.rows) {
    byCode.set(row.noc, row)
  }
  return function occName(code: string): string {
    const row = byCode.get(code)
    if (row == null) {
      return TEXT_NONE
    }
    return pickName({ row, lang: x.lang })
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
 * @param x 筛选各格。
 * @returns 存库的条件对象。
 */
export function saveFiltersOf(x: FilterCountIn): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  for (const [k, slot] of Object.entries(x.fState)) {
    if (k !== FK.noc) {
      out[k] = slot.v
    }
  }
  return out
}

/**
 * /api/jobs 的查询串:筛选参数与 URL/快照同一个出口(fState 一张表)。
 *
 * @param x 当前筛选、排序与页号。
 * @returns 查询串。
 */
export function jobsQueryOf(x: JobsQueryIn): string {
  const sp = filterParamsOf(x.cur)
  sp.set(P_SORT, x.sort.key)
  sp.set(P_DIR, x.sort.dir)
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
 * 从地址栏摘掉一个查询参数(不留历史)。
 * 2026-10-03 付费闭环批 A1 本地测试:已登录还带着 `?oauth=fail` 落回(同一次登录两条回调一成一败)时用。
 *
 * @param name 参数名。
 * @returns 无。
 */
export function dropUrlParam(name: string): void {
  const sp = new URLSearchParams(window.location.search)
  if (sp.has(name) === false) {
    return
  }
  sp.delete(name)
  replaceQuery(sp)
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
 * 五节整理版 → 逐节的展示行。J3 五节整理版(2026-07-19 Frank 批):节头加粗独立行,
 * 节内一条一行(W 规范:禁「·」「/」杂糅);(not stated) → 「原帖未提及」灰字,缺节不脑补。
 * trans = 同结构译文(行位保真)→ 节内按行号逐句对照。
 * #155(Frank「这两个字也是重复的」):首节 ROLE 的小标题「这活干什么」紧贴大标题「职位描述」,
 * 两行说同一件事 —— 首节不出小标题,正文直接跟在大标题下面;其余四节照旧有小标题分区。
 * #161(Frank「这个地方缺 title 吧」):#155 的作用域开大了 —— JD 弹框那个容器上方只有
 * 「✨ AI 整理…」一行灰注、**没有大标题**,砍掉首节小标题后正文就裸奔了。改成按容器决定:
 * underTitle = 紧跟大标题(详情页)才省略,默认照常出小标题。
 * 2026-09-16 Frank「这个有 bug」(对照开关关着,薪资与地点仍挂中文行):本地补的薪资对照(单位换算)只在译文在屏时出,
 * 跟开关走,不再无条件补。
 *
 * @param x 整理版文本、取词函数、译文与三样兜底。
 * @returns 五节的展示行。
 */
export function jdSectionViewsOf(x: JdSectionsIn): JdSectionView[] {
  const secs = jdParseSecs(x.text)
  const tSecs = jdTransSecsOf(x.trans)
  const paired = x.trans !== TEXT_NONE
  const out: JdSectionView[] = []
  for (const [m, key] of JD_SECS) {
    let pairs = jdSubgroupsOf({ t: x.t, pairs: jdPairsOf({ body: strOf(secs[m]), trans: strOf(tSecs[m]) }) })
    if (m === JD_SEC_PAY && paired) {
      pairs = payPairsZhOf({ t: x.t, pairs })
    }
    const payFallback = jdPayFallbackOf({ pairs, fallbackPay: payFallbackFor({ m, fallbackPay: x.fallbackPay }) })
    let payFallbackZh = TEXT_NONE
    if (paired) {
      payFallbackZh = payFallbackZhOf({ t: x.t, text: payFallback })
    }
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
      payFallback,
      payFallbackZh,
      applyUrl: x.applyUrl,
      applyEmail: x.applyEmail,
      noneText: x.t('act.f.none'),
      officialText: x.t('act.seeOfficial'),
    })
  }
  return out
}

/**
 * 薪资节里模型没给对照的行(纯数字行「$18–$25/hr」翻译器常原样返回或跳过,Frank 2026-09-14「这种为什么每次都漏翻译」):
 * 本地按单位补一行对照(/hr → /小时,/yr → /年);模型把「$22/hr」原样当译文交回来的也算没译(Frank「为什么有时候翻译有时候不翻译」:
 * 有时它跳过、有时原样回,原样回那档以前被当成已译);真译过的行不动。
 *
 * @param x 取词函数与这一节的行。
 * @returns 补过对照的行。
 */
export function payPairsZhOf(x: PayPairsZhIn): JdPair[] {
  const out: JdPair[] = []
  for (const p of x.pairs) {
    if (p.zh !== TEXT_NONE && p.zh !== p.en) {
      out.push(p)
      continue
    }
    out.push({ en: p.en, zh: payFallbackZhOf({ t: x.t, text: p.en }) })
  }
  return out
}

/**
 * 帖面薪资兜底行的界面语版(2026-09-14 Frank「薪资福利这个也需要加翻译」):只换单位(/hr → /小时,/yr → /年),
 * 数字不动;换完和原文一样(英文界面)就给空串,不重复出。
 *
 * @param x 取词函数与兜底薪资原文。
 * @returns 界面语版;无需另出给空串。
 */
export function payFallbackZhOf(x: PayFallbackZhIn): string {
  if (x.text === TEXT_NONE) {
    return TEXT_NONE
  }
  const out = x.text.replace(UNIT_HR_RE, x.t('unit.perHr')).replace(UNIT_YR_RE, x.t('unit.perYr'))
  if (out === x.text) {
    return TEXT_NONE
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
 * 标题区那行小字的字:在看整理版 =「查看原帖」,在看原帖 =「返回整理版」。
 *
 * @param x 取词函数与现在看的是不是原帖。
 * @returns 小字文案。
 */
export function origLinkLabelOf(x: OrigLinkLabelIn): string {
  if (x.showOrig) {
    return x.t('act.backFmt')
  }
  return x.t('act.viewOrig')
}

/**
 * 职位名下面那行日期的格(2026-09-26 Frank 看过效果图点头;详情页 H1 下、职位弹框标题下同一件 JobDates):
 * 发布一格(库里有发布日才出)、截止一格(发帖方写了截止日且没过期才出)。来源没给截止日就只出发布一格,不编「预计截止」。
 * 过期口径 = lib/jobs 的 isExpiredJob(与 JobPosting 同一条,已下架也算过期),「今天」按多伦多日期,截止日当天还算在期。
 *
 * @param x 本岗、取词函数与此刻。
 * @returns 0 ~ 2 格,发布在前。
 */
export function jobDatesOf(x: JobDatesOfIn): JobDateCell[] {
  const cells: JobDateCell[] = []
  if (x.job.datePosted !== TEXT_NONE) {
    cells.push({ k: DATE_CELL.posted, label: x.t('detail.posted'), iso: x.job.datePosted })
  }
  if (x.job.validThrough !== TEXT_NONE && isExpiredJob({ job: x.job, today: todayOf(x.now) }) === false) {
    cells.push({ k: DATE_CELL.closes, label: x.t('detail.closes'), iso: x.job.validThrough })
  }
  return cells
}

/**
 * 多伦多今天的日期 'YYYY-MM-DD'(站点时区口径归 lib/time:fmtLocal 按渥太华时间出「日期 时分」,ymd 裁到日期)。
 * 与库里收录口径 SQL.SEO_JOB_OK、过期关帖比的是同一个「今天」。
 *
 * @param now 此刻(毫秒)。
 * @returns 日期串。
 */
function todayOf(now: number): string {
  return ymd(fmtLocal(new Date(now).toISOString()))
}

/**
 * 中文对照开关的字:在途 / 失败 / 平时「中文对照」。
 * 2026-09-16 Frank 效果图点头「可以,就这样做」:钮改开关,开 / 关由轨道表达,字不再随开关说「显示 / 收起」;
 * 原「收起 / 展开」两支(cat.hideZh / cat.showZh)撤。在途加倍类 transBusyClsOf 随之撤(开关件禁用自带降透明)。
 *
 * @param x 取词函数与取数态。
 * @returns 开关的字。
 */
export function transLabelOf(x: TransLabelIn): string {
  if (x.status === TRANS_LOADING) {
    return x.t('cat.translating')
  }
  if (x.status === TRANS_ERROR) {
    return x.t('cat.transErr')
  }
  return x.t('cat.pair')
}

/**
 * 开关上该显的取数态:开关关着一律当 idle(2026-09-17 Frank「自动拨开去掉,但是后台要自动翻译」:
 * 后台在译 / 译挂了都不打扰关着的开关 —— 不显「翻译中…」也不禁用;拨开了才把真实在途 / 失败态摆出来)。
 *
 * @param x 开关开合与真实取数态。
 * @returns 开关上该显的取数态。
 */
export function transStatusShownOf(x: TransStatusShownIn): TransStatus {
  if (x.showTrans === false) {
    return TRANS_IDLE
  }
  return x.status
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
 * 工作地点的界面语版(2026-09-14):市名用 cities 表人工核定译名(没核定照英文,Frank「可以」),省用 i18n 省译名;
 * 英文界面或省译名缺给空串。
 * 2026-09-16 Frank「这个有 bug」:对照开关关着(或译文还没回)时不出,跟正文对照行同进同退。
 *
 * @param x 取词函数、本岗、界面语言与对照在不在屏。
 * @returns 界面语版;'' = 不出对照行。
 */
export function jdLocationZhOf(x: JdLocationZhIn): string {
  if (x.shown === false || x.job.province === TEXT_NONE) {
    return TEXT_NONE
  }
  const key = JD_LOC_PROV_KEY + x.job.province.toUpperCase()
  const provZh = x.t(key)
  const provEn = PROV_NAMES[x.job.province.toUpperCase()]
  if (provZh === TEXT_NONE || provZh === key || provZh === provEn) {
    return TEXT_NONE
  }
  if (x.job.city === TEXT_NONE) {
    return provZh
  }
  return jdCityLocalOf({ job: x.job, lang: x.lang }) + LOC_SEP + provZh
}

/**
 * 市名的界面语版:中文 / 韩文界面取核定译名,没核定或英文界面照英文。
 *
 * @param x 本岗与界面语言。
 * @returns 市名。
 */
export function jdCityLocalOf(x: JdCityLocalIn): string {
  if (x.lang === LANG_ZH && x.job.cityZh !== TEXT_NONE) {
    return x.job.cityZh
  }
  if (x.lang === LANG_KO && x.job.cityKo !== TEXT_NONE) {
    return x.job.cityKo
  }
  return x.job.city
}

/**
 * 「工作地点」节的英文行(合成节只有一行;2026-09-14)。
 *
 * @param sec 这一节。
 * @returns 英文地点;没有给空串。
 */
export function jdLocationTextOf(sec: JdSectionView): string {
  const first = sec.pairs[0]
  if (first == null) {
    return TEXT_NONE
  }
  return first.en
}

/**
 * 「工作地点」节的对照行。
 *
 * @param sec 这一节。
 * @returns 对照;没有给空串。
 */
export function jdLocationZhTextOf(sec: JdSectionView): string {
  const first = sec.pairs[0]
  if (first == null) {
    return TEXT_NONE
  }
  return first.zh
}

/**
 * 「工作地点」节(2026-09-14 Frank「应该单独一个分类吧」):不是原帖分出来的,由岗位地点字段合成一节,排在最前。
 *
 * @param x 取词函数、地点两版与节形状要的两格。
 * @returns 一节;没有地点给 null。
 */
export function jdLocationSectionOf(x: JdLocationSectionIn): JdSectionView | null {
  if (x.location === TEXT_NONE) {
    return null
  }
  return {
    m: JD_SEC_LOC,
    head: x.t('act.f.loc'),
    mode: SEC_MODE.lines,
    pairs: [{ en: x.location, zh: x.locationZh }],
    bullets: false,
    payFallback: TEXT_NONE,
    payFallbackZh: TEXT_NONE,
    applyUrl: x.applyUrl,
    applyEmail: x.applyEmail,
    noneText: x.t('act.f.none'),
    officialText: x.t('act.seeOfficial'),
  }
}

/**
 * 职位描述顶上的工作地点一句(2026-09-14 Frank「职位描述里也应该显示工作地点吧」):有街址出街址(它已含市省邮编),
 * 否则「市, 省全名」;都没有给空串。
 *
 * @param job 本岗。
 * @returns 一句地点;'' = 不出。
 */
export function jdLocationOf(job: JobFact): string {
  if (job.address !== TEXT_NONE) {
    return job.address
  }
  const prov = PROV_NAMES[job.province.toUpperCase()]
  if (prov == null) {
    return job.city
  }
  if (job.city === TEXT_NONE) {
    return prov
  }
  return job.city + LOC_SEP + prov
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
 * 投递主钮的钮面文案。投递方式在途时用中性「投递」占位 —— 别先显「前往投递」再闪成
 * 「邮件投递」(Frank 问「为什么有的是前往有的是邮箱」,闪变加剧困惑)。
 * 2026-10-03 付费闭环批 B1:外链投递撤(站上在架岗都有投递邮箱,mart 判「全」加了邮箱格),
 * 钮面固定「投递」;原 applyLabelOf 三态(在途「投递」/「邮件投递」/「前往投递」)撤,上面那句留作当初为什么。
 * 本函数改判整条投递栏出不出:在架岗邮箱到手或还在查就出(在途照旧出钮 —— 邮箱随懒查到手,钮面不变、不闪),
 * 查完仍没有就整栏不出(连占位一起,不在屏底留一条空栏);已下架岗照旧看有没有原帖链接(「看官网」)。
 * 2026-10-04 改判(Frank「照这样改」):邮箱改成登录用户点投递时才查,开页不查 —— 在架岗一律出(站上在架岗都有邮箱,
 * 数据层已保证,提交 f31b26dd);已下架岗照旧。
 * 2026-10-05 改判(Frank「已经下架了,就不要在有按钮点击了吧」):已下架岗整栏不出,灰色「看官网」钮撤(08-03 原判理由照录在 applybar.tsx 文件头)。
 *
 * @param job 本岗。
 * @returns 出 = true。
 */
export function applyBarShownOf(job: JobFact): boolean {
  return job.status !== STATUS_CLOSED
}


/**
 * 投递栏的类:整页窄屏那一档改 fixed 贴屏底。
 * 2026-09-27 起整页恒挂 fixed 那一档的类,窄不窄由 CSS 断点切(首帧与服务端同一棵树,治手机职位页水合 #418)。
 *
 * @param onPage 在不在整页里。
 * @returns 类名。
 */
export function barClsOf(onPage: boolean): string {
  if (onPage) {
    return cssOf(css.bar) + SPACE + cssOf(css.barFixed)
  }
  return cssOf(css.bar)
}

/**
 * 职位详情页要现算的那几样:面包屑的省段与分类路径、职位名译名、相似职位的兜底链。
 * 职位名译名(Frank「job 名称也需要翻译」):雇主原始岗名多是英文且不规范,挂 NOC 官方职业名的
 * 界面语言译名作对照(#151 口径,与公司页在招职位同款);英文界面 / 无译名 = 空,不渲。
 * 兜底链的文案定长,不把职业名插进句子 —— NOC 官方职业名可以长到
 * 「Machine operators and related workers in pulp and paper production and wood processing…」,
 * 塞进句子手机上折三行;范围交给链接目标,措辞与分组小标题「同省同职业」同一套词。
 * 2026-09-23 Frank「统一成标题译名」「应该优先使用详情下的翻译 更准吧」:职位名译名改成标题译名 —— 这一岗库里存好的 →
 * 按岗懒翻的(x.trans,与职位弹框同一台 useTitleTrans)→ 都没有才退回职业名(titleSubOf,与手机卡同一个)。
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
    segs: catSegsOf({
      t: x.t,
      broad: x.job.broad,
      noc: x.job.noc,
      occName: makeOccName({ rows: x.dims.nocDesc, lang: x.lang }),
    }),
    alias: titleSubOf({
      row: x.job,
      lang: x.lang,
      lazy: x.trans,
      noc: aliasOf({ row: nocRowOf({ dims: x.dims, noc: x.job.noc }), lang: x.lang, title: x.job.title }),
    }),
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
 * 2026-09-23 起它只是灰字的最后一档(titleSubOf 的职业名兜底):这一岗还没有标题译名时才出职业名。
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
 * 2026-09-21 改判:在招岗也出(Frank「之前不是,下面还要加一个相似职位吗」「参考一下公司弹框」;来由见职位详情页门的文件头)——
 * 有行或有兜底链就出,不再看状态。
 *
 * @param x 相似职位与兜底链。
 * @returns 出 = true。
 */
export function showRelatedOf(x: ShowRelatedIn): boolean {
  return x.related.sameCompany.length > 0 || x.related.sameOcc.length > 0 || x.fallbackHref !== TEXT_NONE
}

/**
 * 相似职位两组的埋点来源格:下架页与在招页分开记(两种页的点击意图不同,混记看不出哪张卡在干活)。
 *
 * @param status 本岗状态。
 * @returns 来源格。
 */
export function relatedFromOf(status: string): string {
  if (status === STATUS_CLOSED) {
    return TRACK_FROM_CLOSED
  }
  return TRACK_FROM_OPEN
}

/**
 * 兜底链的埋点来源格。
 *
 * @param status 本岗状态。
 * @returns 来源格。
 */
export function relatedNoneFromOf(status: string): string {
  if (status === STATUS_CLOSED) {
    return TRACK_FROM_CLOSED_NONE
  }
  return TRACK_FROM_OPEN_NONE
}

/**
 * 正文区画没画出东西(2026-09-21 Frank「先一个小框，然后在放大。然后页面在一部分一部分渲染出来」):与 JdContent 的三个分支同口径 ——
 * 额度到头的一句 / 原站拦抓取的空态 / 取到正文且不在途。弹框里接在正文下面的两张卡等它为真才露出来(之前先挂着取数),
 * 不再出现「相关职位卡先到、正文来了又被顶下去」。
 *
 * @param d JD 身体状态机。
 * @returns 正文区有东西 = true。
 */
export function jdShownOf(d: JobBodyPanel): boolean {
  return d.status === JD_LIMITED || d.status === JD_EMPTY || (d.status === JD_DONE && d.pending === false)
}

/**
 * 相关职位接口的响应 → 两组瘦行(2026-09-21 职位描述弹框走客户端取);没回来 / 少了哪组给 null(卡不出)。
 * 弹框里不出兜底链,fallbackLevel 恒 null。
 *
 * @param j 接口响应。
 * @returns 两组瘦行或 null。
 */
export function toRelatedJobs(j: RelatedJson | null): RelatedJobs | null {
  if (j == null) {
    return null
  }
  const co = j.sameCompany
  const occ = j.sameOcc
  if (co == null || occ == null) {
    return null
  }
  return {
    sameCompany: co.map(toRelatedJob),
    sameCompanyTotal: relJsonTotalOf({ total: j.sameCompanyTotal, n: co.length }),
    sameOcc: occ.map(toRelatedJob),
    sameOccTotal: relJsonTotalOf({ total: j.sameOccTotal, n: occ.length }),
    fallbackLevel: null,
  }
}

/**
 * 线格式里一组的总数:带了合法数字用它,缺键 / 不像样退这一组的行数(老响应兼容)。
 *
 * @param x 线格式总数与这一组的行数。
 * @returns 总数。
 */
function relJsonTotalOf(x: RelJsonTotalIn): number {
  if (typeof x.total === 'number' && Number.isFinite(x.total) && x.total >= 0) {
    return x.total
  }
  return x.n
}

/**
 * 相关职位一组按页续取的接口地址(跳过几条由 pager 桶 usePagedFold 续在后面;2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」)。
 *
 * @param x 本岗号与哪一组。
 * @returns 地址。
 */
export function relPageUrlOf(x: RelPageUrlIn): string {
  const q = new URLSearchParams()
  q.set(P_REL_ID, String(x.jobId))
  q.set(P_REL_GROUP, x.group)
  return URL_API_JOB_RELATED_PAGE + q.toString()
}

/**
 * 相关职位接口回来的一行 → 瘦行(线格式逐格收窄:缺的串给空串,岗位号不是数给 0)。
 *
 * @param r 线格式的一行。
 * @returns 瘦行。
 */
export function toRelatedJob(r: RelatedJobJson): RelatedJobFact {
  let id = 0
  if (typeof r.id === 'number') {
    id = r.id
  }
  return {
    id,
    title: strOf(r.title),
    company: strOf(r.company),
    city: strOf(r.city),
    province: strOf(r.province),
    salaryText: strOf(r.salaryText),
    titleZh: strOf(r.titleZh),
    titleKo: strOf(r.titleKo),
  }
}

/**
 * 弹框栈上「叠开一条职位」的手柄(2026-09-21:职位板点行、字段弹框里点职位、详情页点相关职位都往上叠)。
 *
 * @param stack 弹框栈。
 * @returns 手柄。
 */
export function makePushJobLayer(stack: PeekStackRef): (j: JobFact) => void {
  return function pushJobLayer(j: JobFact): void {
    stack.push({ kind: LAYER_JOB, job: j })
  }
}

/**
 * 弹框栈上「叠开一家公司」的手柄(详情页公司信息卡点公司名)。
 *
 * @param stack 弹框栈。
 * @returns 手柄。
 */
export function makePushCoLayer(stack: PeekStackRef): (peek: CompanyPeek) => void {
  return function pushCoLayer(peek: CompanyPeek): void {
    stack.push({ kind: LAYER_CO, co: peek })
  }
}

/**
 * 字段弹框里点相似雇主:字段弹框让位,公司弹框叠上(2026-09-19 口径;2026-09-21 起进弹框栈)。
 *
 * @param x 字段弹框的写口与弹框栈。
 * @returns 手柄。
 */
export function makePopupToCo(x: PopupToCoIn): (peek: CompanyPeek) => void {
  return function popupToCo(peek: CompanyPeek): void {
    x.setPopup(null)
    x.stack.push({ kind: LAYER_CO, co: peek })
  }
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
 * 收藏钮的类:已收藏加一档琥珀(钮本体 2026-09-05 收进 button 桶 mini 档,这里只剩修饰档)。
 *
 * @param on 已收藏没。
 * @returns 类名。
 */
export function actBtnClsOf(on: boolean): string {
  if (on) {
    return cssOf(css.actBtnOn)
  }
  return TEXT_NONE
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
    bgClick: view.kind === KIND.text && view.href !== TEXT_NONE,
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
  if (PRO_COLS.has(x.k) && x.b.plan.isPro === false) {
    return null
  }
  return makeFieldOpen({ onField: x.b.onField, job: x.job, k: x.k, title: x.view.pop })
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
  if (c.active && c.bgClick) {
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
 * 2026-09-26 /fe 首页 Frank「首屏整表替换」:首屏本省闸没放开时加挂闸类(真藏不藏由闸的开关定,见 jobs.module.css);
 * 入参由单个布尔改成两格。
 *
 * @param x 换血中没与首屏本省闸。
 * @returns 类名。
 */
export function cardsClsOf(x: CardsClsIn): string {
  let cls = cssOf(css.cards)
  if (x.swapping) {
    cls = cls + SPACE + cssOf(css.dim)
  }
  if (x.gate !== HOME_GATE_OFF) {
    cls = cls + SPACE + cssOf(css.homeGate)
  }
  return cls
}

/**
 * 表身(各行)的类:首屏本省闸没放开时挂闸类(真藏不藏由闸的开关定,见 jobs.module.css)。
 *
 * @param gate 首屏本省闸。
 * @returns 类名;放开给空串。
 */
export function rowsClsOf(gate: HomeGate): string {
  if (gate === HOME_GATE_OFF) {
    return TEXT_NONE
  }
  return cssOf(css.homeGate)
}

/**
 * 板根的类:水合后已预选了省、本省那一页还在路上时挂 .homeGateOn,就地把闸的两个开关置上
 * (客户端跳转进板没有首帧脚本,靠这一档把全国过渡态压住)。
 *
 * @param gate 首屏本省闸。
 * @returns 类名。
 */
export function pageClsOf(gate: HomeGate): string {
  if (gate === HOME_GATE_ON) {
    return cssOf(css.page) + SPACE + cssOf(css.homeGateOn)
  }
  return cssOf(css.page)
}

/**
 * 「更新中」提示出不出:换血中照旧出;首屏本省闸没放开时也出(闸没真开着时由 CSS 藏住,见 .homeTip)。
 *
 * @param x 换血中没与首屏本省闸。
 * @returns 出 = true。
 */
export function loadTipOnOf(x: LoadTipIn): boolean {
  return x.on || x.gate !== HOME_GATE_OFF
}

/**
 * 「更新中」提示的类:换血中是原样那一条;只因首屏本省闸而出的那一条加挂 .homeTip(闸真开着才看得见)。
 *
 * @param on 换血中没。
 * @returns 类名。
 */
export function loadTipClsOf(on: boolean): string {
  if (on) {
    return cssOf(css.loadTip)
  }
  return cssOf(css.loadTip) + SPACE + cssOf(css.homeTip)
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
 * 整格的点击:只有整格可点的格子(bgClick,字是外链的省 / 市 / 地址)才把手柄挂在格子上。
 *
 * @param c 这一格的展示行。
 * @returns 点击手柄;不给 = null。
 */
export function tdClickOf(c: BoardCellView): ClickFn | null {
  if (c.bgClick) {
    return c.onClick
  }
  return null
}

/**
 * 字上的点击:整格不可点(bgClick 假)时,点击落在字上;整格可点的格子字是外链,不给。
 *
 * @param c 这一格的展示行。
 * @returns 点击手柄;不给 = null。
 */
export function hitClickOf(c: BoardCellView): ClickFn | null {
  if (c.bgClick) {
    return null
  }
  return c.onClick
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
 * 2026-09-23 Frank「统一成标题译名」「应该优先使用详情下的翻译 更准吧」:职位名下那条改成标题译名 ——
 * 这一岗库里存好的(详情页 / 弹框按岗翻的,多词标题批量翻的)→ 这一页批量懒翻的(x.titleMap)→ 都没有才退回职业名(titleSubOf)。
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
    note: titleSubOf({
      row: x.job,
      lang: x.b.lang,
      lazy: lazyTitleOf({ map: x.titleMap, title: x.job.title }),
      noc: aliasOf({
        row: nocRowOf({ dims: { nocDesc: x.b.data.dims.nocDescriptions, nocCategories: [] }, noc: x.job.noc }),
        lang: x.b.lang,
        title: x.job.title,
      }),
    }),
    companyHref: URL_JOBS_QUERY + encodeURIComponent(x.job.company),
    salary: x.job.salaryText,
    city: L.city,
    prov: x.job.province,
    cityHref: mapsUrl(mapQuery({ field: COL.city, job: x.job })),
    provHref: mapsUrl(mapQuery({ field: COL.province, job: x.job })),
    cityText: L.city,
    provText: L.prov,
    chips: chipSpecsOf({
      j: x.job,
      t: x.b.t,
      blocked: x.b.blocked,
      pnpIndex: x.b.cellCtx.pnpIndex,
      eeCats: x.b.data.dims.eeCategories,
    }),
    saved,
    starLabel: saveLabelOf({ t: x.b.t, saved }),
    star: starOf(saved),
    aging: x.job.status !== STATUS_CLOSED,
    ageText: makeAgeText({ t: x.b.t }),
    nameOf,
  }
}

/**
 * 手机卡要批量懒翻的职位名(2026-09-23):只在窄屏要 —— 卡片只在 ≤640px 出(桌面 display:none,表格不出灰字),
 * 桌面别白翻;库里已有界面语言译名的不要(untranslatedOf 挑)。
 *
 * @param x 这一页的行、界面语言与是不是窄屏。
 * @returns 要翻的一组职位名。
 */
export function cardTitlesOf(x: CardTitlesIn): string[] {
  if (x.narrow === false) {
    return []
  }
  return untranslatedOf({ rows: x.rows, lang: x.lang })
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
 * 造给筛选界面的那份筛选表(2026-10-04 收口审查,设计稿 10-04「关掉后…开职位弹框、筛选、投递、收藏一律再弹」):
 * 值照抄原表;写口换成过闸的 —— 访客(分层态未登录、本页也没在访客向导里登录过,同收藏那一路的判法)动筛选 / 搜索时
 * 不写值、改开筛选那一路的访客向导。板内自己的写口(水合预选本省、地址栏 / 快照回放、清除)不经这份,照旧写原表。
 *
 * @param x 原表、登录态两样与开向导的口。
 * @returns 写口过闸的筛选表。
 */
export function makeGatedFilters(x: GatedFiltersIn): FilterState {
  const out: FilterState = {}
  for (const [k, slot] of Object.entries(x.fState)) {
    const set = makeGatedSet({ set: slot.set, loggedIn: x.loggedIn, signedIn: x.signedIn, onGate: x.onGate })
    out[k] = { v: slot.v, set }
  }
  return out
}

/**
 * 造过闸的换省手柄(2026-10-04 收口:省下拉那一整套 —— 记下所选省 + 换省 + 清市 / 区 —— 整个过闸,
 * 访客开向导、cookie 也不记;原先只拦住三格写值,cookie 在闸前照记,访客关掉向导刷新一下就落到所选省)。
 *
 * @param x 原表、登录态两样与开向导的口。
 * @returns 过闸的换省手柄。
 */
export function makeGatedProvChange(x: GatedFiltersIn): TextFn {
  return makeGatedSet({ set: makeProvChange(x.fState), loggedIn: x.loggedIn, signedIn: x.signedIn, onGate: x.onGate })
}

/**
 * 造一格过闸的写口:登录了(或本页刚在访客向导里登录过)才真写,访客开向导、值不动。
 * 判在写的那一刻做(向导里注册完、软刷没回来时这一格就该放行)。
 *
 * @param x 原写口、登录态两样与开向导的口。
 * @returns 过闸的写口。
 */
export function makeGatedSet(x: GatedSetIn): TextFn {
  return function gatedSet(v: string): void {
    if (x.loggedIn === false && x.signedIn() === false) {
      x.onGate()
      return
    }
    x.set(v)
  }
}

/**
 * 首屏按设备时区预选本省(2026-09-14 Frank「需不需要基于用户的 IP 优先显示用户所在区域」→ 不用 IP,用时区 →「可以」):
 * 只在 URL 没带省、用户也没亲手动过省(cookie)时做;时区对不上加拿大(国内用户)就维持全国;
 * 东部时区看浏览器语言,法语当魁省其余当安省;海洋三省分不出不预选。列表照发布时间排,只是预选一格。
 *
 * @param x 筛选各格与首屏筛选。
 * @returns 这一回预选了省没(2026-09-26 起交回,原先无返回):预选了 = 本省那一页在路上,首屏本省闸等它落地。
 * 2026-09-14 晚 Frank「全部市 好像和省没联动上」:省槽存的是全名(市联动靠 provCodeOf 全名→码),
 * 这里先前直接写了两位码,壳上显示对、市却退成全国 —— 改成经 PROV_NAMES 换全名再落格。
 * 2026-09-17 改判(Frank 实撞「现在默认不是根据用户的时区 选省份了」→「改:选了具体省才记住」):原规矩「亲手动过一次
 * (含改回全部省)一年内不再预选」作废 —— 选了具体省就记住那个省、下次直接用它(比按时区猜准);改回「全部省」不记,
 * 下次照常按时区预选。
 * 2026-09-19 Frank「我点击看岗位的时候,跳转之后就不要限制省份了吧」:URL 带着搜索词进来(雇主板「看岗位」= `?q=雇主名`)
 * 就不预选省 —— 人是来找这家的岗的,Parks Canada 的岗在 NS / MB,预选安省 = 0 个职位。
 * 2026-09-26 /fe 首页 Frank「首屏整表替换」:「URL 带省 / 带搜索词就不预选」那两道提成 homeGivenOf,首屏本省闸的初值共用它。
 * 2026-09-26 /fe 首页 Frank 看效果图点头(「清除筛选」只在用户自己设了筛选时出,预选的本省不算):「预选哪一省」提成 homeProvPickOf,
 * 本件只剩落格;板上记下预选值、判「用户设没设过」共用它,两处不分叉。
 */
export function applyHomeProvince(x: HomeProvinceIn): boolean {
  const home = homeProvPickOf(x.initial)
  if (home === TEXT_NONE) {
    return false
  }
  setterOf({ fState: x.fState, k: FK.prov })(home)
  return true
}

/**
 * 进板时预选哪一省(applyHomeProvince 落格与板上记预选值共用;口径与沿革见 applyHomeProvince):地址栏带了省或搜索词 = 不预选;
 * 上次亲手选过具体省 = 那一省;否则按设备时区(对不上加拿大、海洋三省分不出 = 不预选)。
 *
 * @param initial 首屏筛选(URL 带来的)。
 * @returns 省全名;'' = 不预选。
 */
export function homeProvPickOf(initial: JobFilters): string {
  if (homeGivenOf(initial)) {
    return TEXT_NONE
  }
  const picked = pickedProvOf()
  if (picked !== TEXT_NONE) {
    return picked
  }
  const prov = homeProvinceOf()
  if (prov === TEXT_NONE) {
    return TEXT_NONE
  }
  const full = PROV_NAMES[prov]
  if (full == null) {
    return TEXT_NONE
  }
  return full
}

/**
 * 地址栏已经说了省或搜索词没 —— 说了就不按时区预选省(applyHomeProvince 与首屏本省闸 homeGateInitOf 共用这一处)。
 *
 * @param initial 首屏筛选(URL 带来的)。
 * @returns 说了 = true。
 */
function homeGivenOf(initial: JobFilters): boolean {
  const given = initial[FK.prov]
  if (typeof given === 'string' && given !== TEXT_NONE) {
    return true
  }
  const asked = initial[FK.q]
  return typeof asked === 'string' && asked !== TEXT_NONE
}

/**
 * 首屏本省闸的初值(2026-09-26 /fe 首页 Frank「首屏整表替换」:SSR 先渲全国 50 行、约 2 秒后按时区换本省,
 * 表行 / 卡片整体跳):地址栏带了省或搜索词 = 不会预选,闸放开;否则挂「待定」—— 设备时区对得上省的,
 * 首帧前那段内联脚本(HomeGate)已把全国过渡态压住。服务端与水合那一遍都按它渲(同一份入参同一个值,水合零差异)。
 *
 * @param initial 首屏筛选(URL 带来的)。
 * @returns 闸的初值。
 */
export function homeGateInitOf(initial: JobFilters): HomeGate {
  if (homeGivenOf(initial)) {
    return HOME_GATE_OFF
  }
  return HOME_GATE_MAYBE
}

/**
 * 首屏本省闸的首帧脚本(HomeGate 原样内联):设备时区对得上省(lib/location 的时区表)就把闸的两个开关置上。
 *
 * @returns 一段自执行脚本的源码。
 */
export function homeGateScriptOf(): string {
  return homeGateJsOf(HOME_GATE_CSS)
}

/**
 * 「还在水合没」这份外部状态的订阅(useSyncExternalStore 要一只):它不会再变(水合完就一直是 false),交回空退订。
 * 首帧脚本只该待在服务端那份 HTML 里 —— React 在客户端造出来的 script 从不执行,留着只是死件(开发态还报一次告警)。
 *
 * @param _onChange 状态变了叫醒 React 的回调(用不上:这份状态不会变)。
 * @returns 退订手柄。
 */
export function subscribeNever(_onChange: ClickFn): ClickFn {
  return stayPut
}

/**
 * 空退订(什么都不用做)。
 *
 * @returns 无。
 */
function stayPut(): void {
  return
}

/**
 * 客户端快照:水合完了、或客户端跳转进来的新挂载 —— 不在水合。
 *
 * @returns false。
 */
export function hydratingClientOf(): boolean {
  return false
}

/**
 * 服务端快照:服务端渲与水合那一遍 —— 在水合。
 *
 * @returns true。
 */
export function hydratingServerOf(): boolean {
  return true
}

/**
 * 水合那一步预选完,首屏本省闸落哪一档:预选了省 = on(本省那一页在路上,第 0 页落地才放开);
 * 没预选 = off(过渡态本就是终态,当场放开)。
 *
 * @param preselected 这一回预选了省没。
 * @returns 闸的下一档。
 */
export function homeGateAfterOf(preselected: boolean): HomeGate {
  if (preselected) {
    return HOME_GATE_ON
  }
  return HOME_GATE_OFF
}

/**
 * 用户上次亲手选的具体省(cookie 里记的省全名)。2026-09-17 改判前的旧值(只记「动过」的标记)与不认识的值一律当没选,
 * 回到按时区预选。
 *
 * @returns 省全名;'' = 没记。
 */
function pickedProvOf(): string {
  try {
    for (const part of document.cookie.split(COOKIE_SEP)) {
      if (part.startsWith(PROV_PICK_COOKIE + COOKIE_EQ)) {
        const v = decodeURIComponent(part.slice(PROV_PICK_COOKIE.length + COOKIE_EQ.length))
        if (Object.values(PROV_NAMES).includes(v)) {
          return v
        }
        return TEXT_NONE
      }
    }
  } catch {
    return TEXT_NONE
  }
  return TEXT_NONE
}

/**
 * 记下用户亲手选的省(一年);改回「全部省」= 把这一格删掉(时效给 0),下次照常按时区预选。
 *
 * @param v 省全名;'' = 全部省。
 * @returns 无。
 */
function markProvPicked(v: string): void {
  let maxAge = PROV_PICK_MAX_AGE_S
  if (v === TEXT_NONE) {
    maxAge = 0
  }
  try {
    document.cookie = cookieStringOf({ name: PROV_PICK_COOKIE, value: encodeURIComponent(v), maxAge })
  } catch {
    return
  }
}

/**
 * 造省下拉的换值手柄:换省要把市与区一起清掉(它们是省的联动下级,留着就成了对不上的条件)。
 * 2026-10-04 收口:职位板上这一整套由 makeGatedProvChange 整个包一层过闸(面板的 onProv),这里收原表 ——
 * 原先省下拉拿过闸那份表调它,闸只拦住了三格写值,记 cookie 在闸前照记,访客刷新一下就按「上次所选」落到那一省。
 *
 * @param fState 筛选各格。
 * @returns 换值手柄。
 */
export function makeProvChange(fState: FilterState): TextFn {
  return function onProv(v: string): void {
    markProvPicked(v)
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
 * 2026-09-23 职业分类改两级:连「职业」一起清(换了大类,原来那个职业多半不在新大类里,留着就筛成零条)。
 *
 * @param fState 筛选各格。
 * @returns 换值手柄。
 */
export function makeBroadChange(fState: FilterState): TextFn {
  return function onBroad(v: string): void {
    setterOf({ fState, k: FK.broad })(v)
    setterOf({ fState, k: FK.mid })(TEXT_NONE)
    setterOf({ fState, k: FK.fine })(TEXT_NONE)
    setterOf({ fState, k: FK.noc })(TEXT_NONE)
  }
}

/**
 * 造 EE 类别下拉的换值手柄:换类别要把大/中/小类一起清掉(大类随类别联动,留着就成了对不上的条件)。
 * 2026-09-23 连「职业」一起清(职业选项按 EE 名单收窄,同理)。中分类下拉随两级分类撤掉,它的换值手柄 makeMidChange 一并删。
 *
 * @param fState 筛选各格。
 * @returns 换值手柄。
 */
export function makeEeChange(fState: FilterState): TextFn {
  return function onEe(v: string): void {
    setterOf({ fState, k: FK.ee })(v)
    setterOf({ fState, k: FK.broad })(TEXT_NONE)
    setterOf({ fState, k: FK.mid })(TEXT_NONE)
    setterOf({ fState, k: FK.fine })(TEXT_NONE)
    setterOf({ fState, k: FK.noc })(TEXT_NONE)
  }
}

/**
 * 造 EE 类别下拉的显示名函数:值是数据层中文 label,过 eeDisplay 换成界面语言。
 *
 * @param t 取词函数。
 * @returns 显示名函数。
 */
export function makeEeLabel(t: TFn): (v: string) => string {
  return function eeLabel(v: string): string {
    return eeDisplay({ t, label: v })
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
 * 2026-09-26 /fe 首页:只有窄屏折叠区里有选中项(EE 类别在手机上收进了折叠区)时,只在窄屏亮。
 *
 * @param x 展开着没与宽屏、窄屏两个徽标计数。
 * @returns 类名。
 */
export function foldBtnClsOf(x: FoldBtnClsIn): string {
  const base = cssOf(css.btn38) + SPACE + cssOf(css.btnRow)
  if (x.fold || x.foldActive > 0) {
    return base + SPACE + cssOf(css.btnOn)
  }
  if (x.foldActiveNarrow > 0) {
    return base + SPACE + cssOf(css.btnOnNarrow)
  }
  return base
}

/**
 * 「更多筛选」宽屏那枚徽标的类(2026-09-26 /fe 首页):窄屏另数一枚(EE 类别在手机上收进了折叠区)且两枚数得不一样时,
 * 这一枚窄屏收起;数得一样就是原来那一枚。
 *
 * @param x 宽屏与窄屏两个计数。
 * @returns 类名。
 */
export function foldNClsOf(x: FoldNClsIn): string {
  if (x.foldActiveNarrow !== x.foldActive) {
    return cssOf(css.foldN) + SPACE + cssOf(css.foldNWide)
  }
  return cssOf(css.foldN)
}

/**
 * 「更多筛选」窄屏那枚徽标的类(只在两枚数得不一样时渲;宽屏收起)。
 *
 * @returns 类名。
 */
export function foldNNarrowClsOf(): string {
  return cssOf(css.foldN) + SPACE + cssOf(css.foldNNarrow)
}

/**
 * 「清除筛选」的类(2026-09-26 /fe 首页 Frank 看效果图点头):用户自己没设过筛选(只有进板时预选的本省)时窄屏收起,
 * 宽屏照旧有筛选就出。
 *
 * @param userFilter 用户自己设没设过筛选(userFilterOf)。
 * @returns 类名。
 */
export function clearClsOf(userFilter: boolean): string {
  if (userFilter) {
    return cssOf(css.clearFilt)
  }
  return cssOf(css.clearFilt) + SPACE + cssOf(css.hideNarrow)
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
 * 字段面板里的逐列勾选(match 列不进选择器 —— 它是「我的匹配」视图专属,勾了也不出列)。
 * 2026-09-23 match 列随「我的匹配」整拆出了列表,这里不再需要跳过它。
 *
 * @param b 职位板整台状态机。
 * @returns 逐列的展示行。
 */
export function colPanelRowsOf(b: JobsBoardPanel): ColOptionView[] {
  const out: ColOptionView[] = []
  for (const c of COLUMNS) {
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
 * 横幅副标的主句。标题数字口径不变:库内真实总数(第 15 轮 #34);筛选/匹配态只报命中数
 * (第 17 轮 #42)。
 *
 * @param x 取词函数、有没有筛选与总数。
 * @returns 主句。
 */
export function subTextOf(x: SubTextIn): string {
  if (x.anyFilter) {
    return x.t('subtitle.hits', { n: x.total })
  }
  return x.t('subtitle.count', { n: x.total })
}

/**
 * 升级弹框的由头文案。免费位用满(ss)说「Pro 可存 5 个」;匹配锁(match)带 FOMO 数字 ——
 * 拿得到今日高匹配数就报数,拿不到只说额度。其余由头不给文案(弹框用它自己的默认话术)。
 * 2026-09-23「我的匹配」整拆:匹配锁那一档随之撤,只剩 ss 一档出文案。
 *
 * @param x 取词函数与由头。
 * @returns 文案;不给给 undefined。
 */
export function upsellReasonOf(x: UpsellReasonIn): string | undefined {
  if (x.upsell === UPSELL_SS) {
    return x.t('ss.pro')
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
    email: strOrNull(u?.email),
    displayName: strOrNull(u?.displayName),
    avatar: strOrNull(u?.avatar),
    proUntil: proUntilOf(u),
    isAdmin: adminOf(u),
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
      titleZhShort: strOf(r.titleZhShort),
      titleKoShort: strOf(r.titleKoShort),
      titleEnShort: strOf(r.titleEnShort),
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

/**
 * 是不是管理员(2026-09-14:「重译」钮只对管理员出)。
 *
 * @param u 会话用户;null = 匿名。
 * @returns 是管理员。
 */
export function adminOf(u: SessionUser | null): boolean {
  if (u == null || u.role == null) {
    return false
  }
  return u.role === ROLE_ADMIN
}

/**
 * 职位页移民相关卡两个字段弹框要的维度(2026-10-02):只留 EE 类别、新闻、字段出处三张,其余给空表 ——
 * (同日加通道对照表 pathways:PNP 行主文案要本岗通道的官方原名,几十行)
 * 职位页不需要职位板那一整包,别把城市 / 职业描述整表塞进页面。
 *
 * @param dims 首屏维度全包。
 * @returns 只填三张的维度包。
 */
export function jobImmDimsOf(dims: JobDims): JobDims {
  return {
    provinces: [],
    cities: [],
    districts: [],
    nocCategories: [],
    sources: [],
    experienceLevels: [],
    pnpOccupations: [],
    pnpDraws: [],
    pathways: dims.pathways,
    qcCells: [],
    eeCategories: dims.eeCategories,
    eeBroads: [],
    nocDescriptions: [],
    occupations: [],
    fieldSources: dims.fieldSources,
    news: dims.news,
  }
}

/**
 * 职位页移民相关卡的各行(2026-10-02 Frank「这两个应该可以点击弹框吧」「应该包含 EE PNP AIP 吧」「缺灰字啊」):
 * 薪资一行 + EE / PNP / AIP 三行。三行的值、可点与否都走职位板同一套格子函数(cellViewOf / cellActive),职位板上是长横的这里整行不出;
 * 主文案英文、界面语言译名做灰字(Frank「应该是英文黑字,中文灰字吧」「以后所有都这么弄」)。
 *
 * @param x 本岗、服务端事实、界面语言与分层态。
 * @returns 各行;一行都没有给空表。
 */
export function immRowsOf(x: ImmRowsIn): ImmRow[] {
  const cx = immCellCtxOf({ imm: x.imm, lang: x.lang, plan: x.plan })
  const cxEn = immCellCtxOf({ imm: x.imm, lang: LANG_EN, plan: x.plan })
  const rows: ImmRow[] = []
  const wage = immWageRowOf({ job: x.job, wageLow: x.imm.wageLow, t: cx.t })
  if (wage != null) {
    rows.push(wage)
  }
  for (const k of IMM_COLS) {
    const one = immSignalRowOf({ k, job: x.job, cx, cxEn, pathways: x.imm.dims.pathways })
    if (one != null) {
      rows.push(one)
    }
  }
  return rows
}

/**
 * 移民相关卡的格子上下文(与职位板同形;职业名用不着,给空查表)。
 *
 * @param x 服务端事实、语言与分层态。
 * @returns 格子上下文。
 */
function immCellCtxOf(x: ImmCtxIn): CellCtx {
  return {
    t: makeT(x.lang),
    plan: x.plan,
    blocked: blockedSetsOf(x.imm.pnp),
    pnpIndex: x.imm.pnp.index,
    eeCats: x.imm.dims.eeCategories,
    occName: makeOccName({ rows: [], lang: x.lang }),
    lang: x.lang,
  }
}

/**
 * 薪资一行:主文案薪资原文;灰字中位(有就出),有低位门槛时再出低位与一句说明(2026-10-02 Frank「低位工资要显示吗」)。
 *
 * @param x 本岗、低位门槛与取词函数。
 * @returns 这一行;没有薪资给 null。
 */
function immWageRowOf(x: ImmWageIn): ImmRow | null {
  if (hasText(x.job.salaryText) === false) {
    return null
  }
  const p = provName({ t: x.t, code: x.job.province, localeOnly: true })
  const subs: string[] = []
  const median = immMoneyOf({ job: x.job, hourly: x.job.wageMedHourly, annual: x.job.wageMedAnnual })
  if (median !== TEXT_NONE) {
    subs.push(x.t('imm.median', { p, v: median }))
  }
  const low = immMoneyOf({ job: x.job, hourly: x.job.wageLowHourly, annual: x.job.wageLowAnnual })
  if (x.wageLow && low !== TEXT_NONE) {
    subs.push(x.t('imm.low', { p, v: low }))
    subs.push(x.t('imm.lowNote'))
  }
  return { key: COL.salary, label: x.t('col.salary'), main: x.job.salaryText, subs, col: null }
}

/**
 * 中位 / 低位的一个数:薪资原文是时薪就写时薪,否则写年薪(与职位板中位两列同一写法)。
 *
 * @param x 本岗与两种口径的数。
 * @returns 显示文本;没有给空串。
 */
function immMoneyOf(x: ImmMoneyIn): string {
  if (x.job.salaryText.endsWith(UNIT_HOUR)) {
    if (x.hourly == null) {
      return TEXT_NONE
    }
    return SIGN_DOLLAR + String(x.hourly) + UNIT_HOUR
  }
  if (x.annual == null) {
    return TEXT_NONE
  }
  return SIGN_DOLLAR + String(Math.round(x.annual / K_DIVISOR)) + UNIT_K_YEAR
}

/**
 * EE / PNP / AIP 的一行:值照职位板那一格(英文做主文案,界面语言的字不同才做灰字);格子是长横整行不出。
 *
 * @param x 列键、本岗与两份格子上下文。
 * @returns 这一行;职位板上是长横给 null。
 */
function immSignalRowOf(x: ImmSignalIn): ImmRow | null {
  const cellEn = cellViewOf({ k: x.k, j: x.job, cx: x.cxEn }).text
  if (cellEn === TEXT_NONE || cellEn === DASH) {
    return null
  }
  const en = immNameEnOf({ k: x.k, job: x.job, cxEn: x.cxEn, cellEn, pathways: x.pathways })
  const local = cellViewOf({ k: x.k, j: x.job, cx: x.cx }).text
  const subs: string[] = []
  if (x.cx.lang !== LANG_EN && local !== en) {
    subs.push(local)
  }
  let col: JobColKey | null = null
  if (cellActive({ k: x.k, j: x.job, cx: x.cx })) {
    col = x.k
  }
  return { key: x.k, label: x.cx.t(K_COL + x.k), main: en, subs, col }
}

/**
 * 信号行的英文主文案:EE 类别用官方英文类别名(ee_categories.name_en,2026-10-02 Frank「可以」加列;库里还没灌就退回职位板英文格);
 * PNP 用本岗通道在通道对照表里的官方原名(同日 Frank「这个 也不对啊」:「NB Skilled Worker」是站内短名;与省提名弹框「本岗能走的通道」卡同一个名);
 * AIP 就是职位板英文那一格。英文界面不出灰字。
 *
 * @param x 列键、本岗、英文格子上下文与职位板英文那一格的字。
 * @returns 主文案。
 */
function immNameEnOf(x: ImmNameEnIn): string {
  if (x.k === COL.pnp) {
    const channel = pnpChannelOf({ job: x.job, pathways: x.pathways })
    if (channel != null && channel.officialName !== TEXT_NONE) {
      return channel.officialName
    }
    return x.cellEn
  }
  if (x.k !== COL.ee) {
    return x.cellEn
  }
  for (const c of x.cxEn.eeCats) {
    if (c.label === x.job.eeCategory && c.nameEn !== TEXT_NONE) {
      return c.nameEn
    }
  }
  return x.cellEn
}

/**
 * 移民相关卡一行的点击:打开这一列的弹框。
 *
 * @param x 弹框写口与列键。
 * @returns 点击回调。
 */
export function makeOpenImm(x: OpenImmIn): () => void {
  return function openImm(): void {
    x.open(x.col)
  }
}

/**
 * 移民相关卡开着的那一列 → 字段弹框的分组(查 FIELD_GROUP,与职位板 makeFieldRouter 同一张表);省提名另走 PnpModal,这里给 null。
 *
 * @param col 开着的列;null = 没开。
 * @returns 字段弹框分组;不走字段弹框给 null。
 */
export function immGroupOf(col: JobColKey | null): PopupState['group'] | null {
  if (col == null) {
    return null
  }
  const d = FIELD_GROUP[col]
  if (d == null || d === DISPOSITION_NONE || d === DISPOSITION_MAP || d === GROUP_PNP) {
    return null
  }
  return d
}

/**
 * 页面门 SSR 带来的整理版译文里,这一语那一格(2026-10-06 立:中 / 韩界面首屏就铺,不等页面活过来再要)。
 *
 * @param x 页面门取到的两格与界面语言。
 * @returns 这一语的译文;英文界面、没取(弹框)、库里没有或版本过期 = null。
 */
export function ssrTransOf(x: SsrTransIn): string | null {
  if (x.ssr == null || x.lang === LANG_EN) {
    return null
  }
  let got = x.ssr.zh
  if (x.lang === LANG_KO) {
    got = x.ssr.ko
  }
  if (got === TEXT_NONE) {
    return null
  }
  return got
}
