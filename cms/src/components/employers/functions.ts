/**
 * employers 页面域从组件体里迁出来的函数:显示名与文案、**洗行**(事实行 → 展示行)、
 * 三张表的列组、对照表的维度行、类名预算、筛选手柄工厂与懒取。
 * 2026-09-13 雇主板批二:板改读雇主池 —— 洗行/列组/手柄一族按组 × 省切面、八列、受控排序重写,
 * designated / hiring 双口径与职业/社区抽屉整段退役。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」;2026-08-27 Frank 打回 make*Cell
 * 工厂(「那是把嵌套函数换马甲」)后再收一刀:要 t/lang 才算得出的显示值**全部在洗行时
 * 算好挂到展示行上**(先例:callbacks 节 RankedBlock 的 cost),单元格组件退成顶层哑组件。
 * 依赖方向:本文件 → 各单元格组件(单向;它们只认 constants/types/css 与通用组件域,不回引本文件
 * —— 否则 import/no-cycle 当场红)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { CMP_KEY, POOL_SORT_DEFAULT, POOL_SORTS } from '@/lib/employers'
import { track } from '@/lib/track'
import { btnClsOf } from '@/components/button'
import { cssOf } from '@/components/css'
import { AipCell } from './aipcell'
import { AvgCell } from './avgcell'
import { BriefCell } from './briefcell'
import { CompareLmiaCell } from './comparelmiacell'
import { CompareOpenCell } from './compareopencell'
import { CompareSkilledCell } from './compareskilledcell'
import { ActCell } from './actcell'
import { DesignatedCell } from './designatedcell'
import { OpenCell } from './opencell'
import { SkilledLmiaCell } from './skilledlmiacell'
import { StarCell } from './starcell'
import { WageCell } from './wagecell'
import {
  AIP_MARK, ALIGN_RIGHT, BRIEF_LEN_MAX, BRIEF_TAIL, BROAD_KEY_HEAD, CLS_SEP, COL_ACT_KEY, COL_DESIGNATED_KEY,
  COL_LMIA_KEY, COL_NAME_KEY, COL_OPEN_KEY, COL_SKILLED_KEY, COL_STAR_KEY, COL_VERDICT_KEY, COL_W1_KEY, COL_W2_KEY,
  COL_W4_KEY,
  COL_WAGE_KEY, COL_WHERE_KEY, COMPARE_NAME_SEP, DASH_MARK, DEMO_A_KEY, DEMO_B_KEY, DEMO_C_KEY, DEMO_CO_A, DEMO_CO_B,
  DEMO_CO_C, DEMO_METRIC_KEY, DEMO_NAMED_A, DEMO_NAMED_B, DEMO_NAMED_C, DEMO_OPEN_A, DEMO_OPEN_B, DEMO_OPEN_C,
  DEMO_PROV_A, DEMO_PROV_B, DEMO_PROV_C, DEMO_SKILLED_A, DEMO_SKILLED_B, DEMO_SKILLED_C, DIFF_KEY_HEAD,
  DIFF_TAG, DIFF_VARIANT_NONE, DIM_AIP_KEY, DIM_AVG_KEY, DIM_BRIEF_KEY, DIM_INDUSTRY_KEY, DIM_LMIA_KEY,
  DIM_MATCH_KEY, DIM_NAMED_KEY, DIM_OPEN_KEY, DIM_PROV_KEY, DIM_QUARTER_KEY, DIM_SAL_KEY, DIM_SKILLED_KEY,
  CTL_CLS, EMP_API_URL, EMP_URL, EMPLOYERS_DESC, EMPLOYERS_TITLE_TAIL, ENTRY_ON, EV_FILTER, EV_KIND_NONE,
  EV_KIND_SEARCH, EV_PAGE, EV_PROP_ENTRY, EV_PROP_GROUP, EV_PROP_KEY, EV_PROP_PROV, EV_PROP_SORT, EV_ROW, EV_SEARCH,
  EV_VIEW_JOBS, GROUP_KEY_HEAD, HOME_SEARCH_HEAD, JOBS_SEARCH_HEAD, KEY_SEP, KIND_AIP,
  KIND_LMIA, KIND_NAMED, LANG_KO, LANG_ZH, LINK_SELECTOR,
  META_PROV_RE, META_SCOPE_SEP, MINI_BTN_KIND,
  MONEY_DIV, MONEY_HEAD,
  MONEY_TAIL, PAGE_SIZE_FALLBACK, PCT_MARK, PLUS_MARK, PROV_KEY_HEAD, P_ENTRY, P_GROUP, P_PAGE, P_PROGRAM,
  P_PROV, P_Q, P_SORT, QS_HEAD, STAR_MAX, STAR_OFF, STAR_ON, TAG_OK, TAG_REGION, TEXT_NONE, TONE_DIM, TONE_NG, TONE_OK,
  URL_COMPANY_HEAD, VERDICT_FACTOR_KEY, VERDICT_MET, VERDICT_NG_HEAD, VERDICT_OK_HEAD, VERDICT_PUBLIC, VERDICT_RANK,
  VERDICT_SHORT, VERDICT_UNKNOWN, WAGE_BASE, WHERE_PROV_MAX, WHERE_SEP, W_POOL_ACT, W_POOL_DESIGNATED, W_POOL_LMIA,
  W_POOL_NAME, W_POOL_OPEN, W_POOL_STAR, W_POOL_WAGE, W_POOL_WHERE,
} from './constants'
import { IndustryCell } from './industrycell'
import { LmiaCell } from './lmiacell'
import { MatchCell } from './matchcell'
import { NameCell } from './namecell'
import { NamedCell } from './namedcell'
import { ProvCell } from './provcell'
import { QuarterCell } from './quartercell'
import { SalCell } from './salcell'
import { SkilledCell } from './skilledcell'
import { SponsorNameCell } from './sponsornamecell'
import type {
  AliasIn, BoardUrlIn, CardClickFn, CardClickIn, CellFn, ClearIn, ClickFn, CompareCellRow,
  CompareCellRowIn, CompareCellRowsIn, CompareDemoRow, CompareDim, CompareDimsIn, CompareMatchParts, CompareNamesIn,
  CompareProvParts, CompareRow, DiffVariant, DimValueIn,
  EmpCol, EmployerCellRow, EmployerCellRowIn, EmployerCellRowsIn, EmployerColsIn, EmployersMetaIn, EmployersMetaOut,
  EmpSortState, EntryToggleIn, FilterPickIn, FiltersIn, HeadSortFn,
  ListClsIn, LoadBoardIn, MaxPageIn, MoneyIn,
  NocNameFn, NoteTextIn, PageFn, PickFn, PoolFilters, PoolSort, ProvNameIn, RowWordsIn, SponsorCellRow,
  SponsorCellRowIn, SponsorCellRowsIn, SponsorColsIn, SponsorColsWordsIn, SponsorEmployerRow, SponsorKindIn,
  PricingSetIn, QCommitIn, RowViewIn, SortPickIn, TextByFiltersIn, VerdictFact, VerdictFactIn, VerdictToneIn,
  WhereTextIn, WithIn,
  WordsIn,
} from './types'
import { VerdictCell } from './verdictcell'
import { W1Cell } from './w1cell'
import { W2Cell } from './w2cell'
import { W4Cell } from './w4cell'
import css from './employers.module.css'

/**
 * 省名:字典里有就用人话名,没有原样显示省码 —— 字典缺词不该把省码吞掉。
 *
 * @param x 取词函数与省码。
 * @returns 省名或省码。
 */
export function provNameOf(x: ProvNameIn): string {
  const key = PROV_KEY_HEAD + x.code
  const v = x.t(key)
  if (v === TEXT_NONE || v === key) {
    return x.code
  }
  return v
}

/**
 * 雇主别名:按界面语言取中文/韩文官方标签(英文界面不出别名 —— 名字本身就是英文)。
 *
 * @param x 界面语言与两门别名。
 * @returns 别名;没有则空串。
 */
export function aliasOf(x: AliasIn): string {
  if (x.lang === LANG_ZH) {
    return x.aliasZh
  }
  if (x.lang === LANG_KO) {
    return x.aliasKo
  }
  return TEXT_NONE
}

/**
 * 年薪的千元文本(`$84K`)。
 *
 * @param x 年薪;null = 无薪资数据。
 * @returns 千元文本;没有则交回空串,由单元格组件渲成灰色横杠。
 */
export function moneyTextOf(x: MoneyIn): string {
  if (x.v == null) {
    return TEXT_NONE
  }
  return MONEY_HEAD + String(Math.round(x.v / MONEY_DIV)) + MONEY_TAIL
}

/**
 * 正数才成文本,0 交回空串(由单元格组件渲成灰色横杠)。LMIA 一族与具名岗数共用这一条口径。
 *
 * @param n 数值。
 * @returns 数字文本或空串。
 */
function positiveTextOf(n: number): string {
  if (n > 0) {
    return String(n)
  }
  return TEXT_NONE
}

/**
 * 可空数值 → 正数文本(null 与 0 都交回空串)。
 *
 * @param n 数值;null = 列未回填。
 * @returns 数字文本或空串。
 */
function maybePositiveTextOf(n: number | null): string {
  if (n == null) {
    return TEXT_NONE
  }
  return positiveTextOf(n)
}

/**
 * 洗一整页雇主板的事实行。
 * @param x 本页的行、取词函数与筛选。
 * @returns 展示行。
 */
export function toEmployerCellRows(x: EmployerCellRowsIn): EmployerCellRow[] {
  const out = []
  for (const r of x.rows) {
    out.push(toEmployerCellRow({ r, t: x.t, f: x.f }))
  }
  return out
}

/**
 * 洗一行雇主池事实:所在地回落省名、星数成星形、水位成带符号百分比、指定与 LMIA 成文案 + 灰注,
 * 顺带把手机卡上的话术与两个落点算出来(2026-09-13 雇主板批二;形照把脉页雇主表 toEmpCellRow)。
 *
 * @param x 这一行、取词函数与筛选。
 * @returns 展示行。
 */
export function toEmployerCellRow(x: EmployerCellRowIn): EmployerCellRow {
  const r = x.r
  const jobsHref = JOBS_SEARCH_HEAD + encodeURIComponent(r.name)
  let companyHref = TEXT_NONE
  if (r.slug != null) {
    companyHref = URL_COMPANY_HEAD + r.slug
  }
  let href = companyHref
  if (href === TEXT_NONE) {
    href = jobsHref
  }
  let industry = TEXT_NONE
  if (r.industry != null) {
    industry = r.industry
  }
  let lmiaNote = TEXT_NONE
  if (r.lmiaSkilled > 0 && r.lmiaLastQuarter != null) {
    lmiaNote = r.lmiaLastQuarter
  }
  const kind = kindOf({ f: x.f })
  return {
    key: r.key + KEY_SEP + r.group,
    name: r.name,
    href,
    hrefTitle: x.t('pulse.act.company'),
    industry,
    where: empWhereTextOf({ t: x.t, r }),
    starText: starTextOf(r.star),
    starTitle: x.t('de.stars', { n: r.star }),
    openText: String(r.openJobs),
    entryNote: entryNoteOf({ t: x.t, r }),
    designatedText: designatedTextOf({ t: x.t, r }),
    programsNote: r.programs.join(x.t('de.sep')),
    lmia: { text: positiveTextOf(r.lmiaSkilled), cls: cssOf(css.teal) },
    lmiaNote,
    wage: { text: wageTextOf(r.wageIndexPct), cls: cssOf(css.num) },
    jobsHref,
    companyHref,
    actJobsText: x.t('pulse.act.jobs'),
    actCompanyText: x.t('pulse.act.company'),
    actBtnCls: actBtnClsOf(),
    cardSalary: x.t('dp.planJobsN', { n: r.openJobs }),
    onView: makeRowView({ kind }),
    onCard: makeCardClick({ href, kind }),
  }
}

/**
 * 埋点分组值:查证态给 search,榜态给行业组键,首屏给 none(低基数枚举,过 lib/funnel 的 PROP_OK)。
 *
 * @param x 当前筛选。
 * @returns 分组值。
 */
function kindOf(x: FiltersIn): string {
  if (x.f.q !== TEXT_NONE) {
    return EV_KIND_SEARCH
  }
  if (x.f.group !== TEXT_NONE) {
    return x.f.group
  }
  return EV_KIND_NONE
}

/**
 * 所在地文本:市 + 省码(紧凑格,站规「省份紧凑格用两位省码」);没市回落省全名;都没有空串。
 *
 * @param x 取词函数与这一行。
 * @returns 所在地。
 */
function empWhereTextOf(x: RowWordsIn): string {
  if (x.r.city !== TEXT_NONE && x.r.province !== TEXT_NONE) {
    return x.r.city + WHERE_SEP + x.r.province
  }
  if (x.r.city !== TEXT_NONE) {
    return x.r.city
  }
  if (x.r.province !== TEXT_NONE) {
    return provNameOf({ t: x.t, code: x.r.province })
  }
  return TEXT_NONE
}

/**
 * 星数 → 星形文本(实心补空心到 STAR_MAX;越界钳到 0..STAR_MAX)。
 *
 * @param n 星数。
 * @returns 五枚星形字符。
 */
function starTextOf(n: number): string {
  const on = Math.max(0, Math.min(STAR_MAX, n))
  return STAR_ON.repeat(on) + STAR_OFF.repeat(STAR_MAX - on)
}

/**
 * 入门占比灰注:有在招且占比 > 0 才出(「入门 40%」)。
 *
 * @param x 取词函数与这一行。
 * @returns 灰注或空串。
 */
function entryNoteOf(x: RowWordsIn): string {
  if (x.r.entryShare == null || x.r.entryShare <= 0) {
    return TEXT_NONE
  }
  return x.t('de.entryN', { n: x.r.entryShare })
}

/**
 * 指定雇主胶囊文案:命中给「指定雇主」,否则空串(渲横杠)。
 *
 * @param x 取词函数与这一行。
 * @returns 文案或空串。
 */
function designatedTextOf(x: RowWordsIn): string {
  if (x.r.designated) {
    return x.t('de.designated')
  }
  return TEXT_NONE
}

/**
 * 工资水位 → 相对基准的带符号百分比(105 → +5%,92 → -8%,100 → 0%);无水位空串(渲横杠)。
 *
 * @param pct 水位;null = 分母缺。
 * @returns 文本或空串。
 */
function wageTextOf(pct: number | null): string {
  if (pct == null) {
    return TEXT_NONE
  }
  const diff = pct - WAGE_BASE
  let sign = TEXT_NONE
  if (diff > 0) {
    sign = PLUS_MARK
  }
  return sign + String(diff) + PCT_MARK
}

/**
 * 雇主板表格「所在地」列的取值(哑:行上已算好)。
 *
 * @param r 这一行展示行。
 * @returns 所在地。
 */
export function empWhereOf(r: EmployerCellRow): string {
  return r.where
}

/**
 * 雇主板的行身份。
 *
 * @param r 这一行展示行。
 * @returns 行键。
 */
export function empRowKeyOf(r: EmployerCellRow): string {
  return r.key
}

/**
 * 雇主板的列组(设计稿七格 + 09-12 拍板把证据拆成「指定雇主」「技能类 LMIA」两枚带排序的列):
 * 雇主 / 所在地 / 星级 / 在招 / 指定雇主 / 技能类 LMIA / 工资水位 / 操作。
 * 列 key = 排序主键(表头点列直接发给服务端);排序在服务端,列上不给取值器,只标 sortable。
 *
 * @param x 取词函数。
 * @returns 列组。
 */
export function employerColsOf(x: EmployerColsIn): EmpCol<EmployerCellRow>[] {
  return [
    { key: COL_NAME_KEY, label: x.t('de.colName'), width: W_POOL_NAME, sortable: true, render: NameCell },
    { key: COL_WHERE_KEY, label: x.t('de.colWhere'), width: W_POOL_WHERE, render: empWhereOf },
    { key: COL_STAR_KEY, label: x.t('de.colStar'), width: W_POOL_STAR, nowrap: true, sortable: true, render: StarCell },
    {
      key: COL_OPEN_KEY,
      label: x.t('de.colOpen'),
      width: W_POOL_OPEN,
      nowrap: true,
      align: ALIGN_RIGHT,
      sortable: true,
      render: OpenCell,
    },
    {
      key: COL_DESIGNATED_KEY,
      label: x.t('de.colDesignated'),
      width: W_POOL_DESIGNATED,
      sortable: true,
      render: DesignatedCell,
    },
    {
      key: COL_LMIA_KEY,
      label: x.t('de.colLmia'),
      width: W_POOL_LMIA,
      nowrap: true,
      align: ALIGN_RIGHT,
      sortable: true,
      render: SkilledLmiaCell,
    },
    {
      key: COL_WAGE_KEY,
      label: x.t('de.colWage'),
      width: W_POOL_WAGE,
      nowrap: true,
      align: ALIGN_RIGHT,
      sortable: true,
      render: WageCell,
    },
    { key: COL_ACT_KEY, label: x.t('col.actions'), width: W_POOL_ACT, nowrap: true, render: ActCell },
  ]
}

/**
 * 操作钮的类:button 桶 mini 档(与职位板 / 把脉页雇主表操作列同一颗钮;哑单元格不 import functions,类随行带过去)。
 *
 * @returns 类名。
 */
function actBtnClsOf(): string {
  return btnClsOf({ kind: MINI_BTN_KIND, sm: false, lg: false, active: false, className: null })
}

/**
 * 表头排序态(由筛选里的排序主键派生;方向服务端定死:名字升序、其余降序)。
 *
 * @param x 当前筛选。
 * @returns 表头要渲的排序态。
 */
export function sortStateOf(x: FiltersIn): EmpSortState {
  if (x.f.sort === COL_NAME_KEY) {
    return { key: x.f.sort, dir: 1 }
  }
  return { key: x.f.sort, dir: -1 }
}

/**
 * 埋点:担保雇主表/卡点雇主名去看在招岗。
 *
 * @returns 无。
 */
export function trackViewJobs(): void {
  track(EV_VIEW_JOBS)
}

/**
 * 这一行在当前人群档下该看哪一份省清单。AIP 视图只列大西洋四省内的岗
 * (指定不跨省;Frank 2026-08-08「AIP 不是只在四个省」)。
 *
 * @param x 行与人群档。
 * @returns 省码清单。
 */
function sponsorProvsOf(x: SponsorKindIn): string[] {
  if (x.kind === KIND_AIP) {
    return x.r.provsAip
  }
  return x.r.provs
}

/**
 * 这一行在当前人群档下的在招岗数。AIP 视图只计四省内的 AIP 岗 ——
 * 全国口径会把安省的 Tim Hortons 岗读成 AIP 可用。
 *
 * @param x 行与人群档。
 * @returns 岗数。
 */
function sponsorOpenOf(x: SponsorKindIn): number {
  if (x.kind === KIND_AIP) {
    return x.r.openJobsAip
  }
  return x.r.openJobs
}

/**
 * 担保雇主的所在地文本。所在地统一省维度(Frank 2026-08-08「怎么有的显示省有的显示市」:
 * 单省带市名造成两种粒度混排)—— 1-3 省列两字码,≥4 省收「N 省」;市级细节归公司弹框。
 *
 * @param x 行、取词函数与人群档。
 * @returns 省码清单文本、「N 省」或横杠。
 */
export function whereTextOf(x: WhereTextIn): string {
  const provs = sponsorProvsOf({ r: x.r, kind: x.kind })
  if (provs.length === 0) {
    return DASH_MARK
  }
  if (provs.length <= WHERE_PROV_MAX) {
    return provs.join(x.t('se.where.sep'))
  }
  return x.t('se.where.multi', { n: provs.length })
}

/**
 * 雇主门槛的判定事实:显示什么话 + 属于哪一档色。
 * 🔴 `unknown` **不是「不满足」**,是我们查不到;`public` = 公共部门旁路 ——
 * 两者共用最弱的那一档色,不许被读成判定结果。
 *
 * @param x 这一行的判定与取词函数。
 * @returns 话与色档。
 */
export function verdictFactOf(x: VerdictFactIn): VerdictFact {
  if (x.v.state === VERDICT_PUBLIC) {
    return { text: x.t('se.verdict.public'), tone: TONE_DIM }
  }
  if (x.v.state === VERDICT_MET) {
    return { text: VERDICT_OK_HEAD + x.t('se.verdict.met'), tone: TONE_OK }
  }
  if (x.v.state === VERDICT_SHORT) {
    const items = verdictFailedTextOf(x)
    return { text: VERDICT_NG_HEAD + x.t('se.verdict.short', { items }), tone: TONE_NG }
  }
  return { text: x.t('se.verdict.unknown'), tone: TONE_DIM }
}

/**
 * 差项清单的人话文本(年限/雇员数)。判定引擎只交回机器名,人话在 i18n 里。
 *
 * @param x 这一行的判定与取词函数。
 * @returns 顿号连起来的差项名。
 */
function verdictFailedTextOf(x: VerdictFactIn): string {
  const items = []
  for (const f of x.v.failed) {
    let key = TEXT_NONE
    const found = VERDICT_FACTOR_KEY[f]
    if (found != null) {
      key = found
    }
    items.push(x.t(key))
  }
  return items.join(x.t('se.where.sep'))
}

/**
 * 表格里「雇主门槛」那一列该用的色档类(带字重:达标绿粗、差项红粗、待核灰常规)。
 *
 * @param x 色档。
 * @returns 类名。
 */
function verdictClsOf(x: VerdictToneIn): string {
  if (x.tone === TONE_OK) {
    return cssOf(css.verdictOk)
  }
  if (x.tone === TONE_NG) {
    return cssOf(css.verdictNg)
  }
  return cssOf(css.verdictDim)
}

/**
 * 手机卡里「雇主门槛」那一条该用的色档类(只有色 —— 粗由卡里那层 `<b>` 定,与原件一致)。
 *
 * @param x 色档。
 * @returns 类名。
 */
function verdictCardClsOf(x: VerdictToneIn): string {
  if (x.tone === TONE_OK) {
    return cssOf(css.vOk)
  }
  if (x.tone === TONE_NG) {
    return cssOf(css.vNg)
  }
  return cssOf(css.vDim)
}

/**
 * 本批有没有一行判得出雇主门槛。B4 的公司事实列(founded_year 等)还没建 DDL 前
 * 每行 verdict.state 恒 'unknown' → 整列/整行都不渲染
 * (容缺先例同 stats 榜「担保率」列:全 null 则整列不出)。
 *
 * @param rows 本批的事实行。
 * @returns 有没有。
 */
export function hasVerdictSignal(rows: SponsorEmployerRow[]): boolean {
  for (const r of rows) {
    if (r.verdict.state !== VERDICT_UNKNOWN) {
      return true
    }
  }
  return false
}

/**
 * 洗一整批担保雇主的事实行。
 *
 * @param x 本批的行、取词函数、语言与人群档。
 * @returns 展示行。
 */
export function toSponsorCellRows(x: SponsorCellRowsIn): SponsorCellRow[] {
  const out = []
  for (const r of x.rows) {
    out.push(toSponsorCellRow({ r, t: x.t, lang: x.lang, kind: x.kind }))
  }
  return out
}

/**
 * 洗一行担保雇主事实:别名按语言取、LMIA 一族算成青绿数值、所在地收成省维度、
 * 雇主门槛算成话与两套色档类(表带字重、卡只有色)。
 *
 * @param x 这一行、取词函数、语言与人群档。
 * @returns 展示行。
 */
export function toSponsorCellRow(x: SponsorCellRowIn): SponsorCellRow {
  const teal = cssOf(css.teal)
  const open = sponsorOpenOf({ r: x.r, kind: x.kind })
  const fact = verdictFactOf({ v: x.r.verdict, t: x.t })
  const provs = sponsorProvsOf({ r: x.r, kind: x.kind })
  let whereSort = TEXT_NONE
  const first = provs[0]
  if (first != null) {
    whereSort = first
  }
  let verdictSort = null
  const rank = VERDICT_RANK[x.r.verdict.state]
  if (rank != null) {
    verdictSort = rank
  }
  return {
    key: x.r.name,
    name: x.r.name,
    href: HOME_SEARCH_HEAD + encodeURIComponent(x.r.name),
    alias: aliasOf({ lang: x.lang, aliasZh: x.r.aliasZh, aliasKo: x.r.aliasKo }),
    onView: trackViewJobs,
    nameSort: x.r.name.toLowerCase(),
    openText: String(open),
    openSort: open,
    w1: { text: positiveTextOf(x.r.lmia1q), cls: teal },
    w1Sort: x.r.lmia1q,
    w2: { text: positiveTextOf(x.r.lmia2q), cls: teal },
    w2Sort: x.r.lmia2q,
    w4: { text: positiveTextOf(x.r.lmia4q), cls: teal },
    w4Sort: x.r.lmia4q,
    lmia: { text: positiveTextOf(x.r.lmiaPositions), cls: teal },
    lmiaSort: x.r.lmiaPositions,
    skilled: { text: maybePositiveTextOf(x.r.lmiaPositionsSkilled), cls: teal },
    skilledSort: x.r.lmiaPositionsSkilled,
    where: whereTextOf({ r: x.r, t: x.t, kind: x.kind }),
    whereSort,
    verdict: { text: fact.text, cls: verdictClsOf({ tone: fact.tone }) },
    verdictCard: { text: fact.text, cls: verdictCardClsOf({ tone: fact.tone }) },
    verdictSort,
  }
}

/**
 * 担保雇主名的排序键。
 *
 * @param r 这一行展示行。
 * @returns 小写雇主名。
 */
export function spNameSortOf(r: SponsorCellRow): string {
  return r.nameSort
}

/**
 * 担保雇主表「在招岗数」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 岗数文本。
 */
export function spOpenOf(r: SponsorCellRow): string {
  return r.openText
}

/**
 * 在招岗数的排序键。
 *
 * @param r 这一行展示行。
 * @returns 岗数。
 */
export function spOpenSortOf(r: SponsorCellRow): number {
  return r.openSort
}

/**
 * 近 1 季获批数的排序键。
 *
 * @param r 这一行展示行。
 * @returns 数值。
 */
export function spW1SortOf(r: SponsorCellRow): number {
  return r.w1Sort
}

/**
 * 近 2 季获批数的排序键。
 *
 * @param r 这一行展示行。
 * @returns 数值。
 */
export function spW2SortOf(r: SponsorCellRow): number {
  return r.w2Sort
}

/**
 * 近 4 季获批数的排序键。
 *
 * @param r 这一行展示行。
 * @returns 数值。
 */
export function spW4SortOf(r: SponsorCellRow): number {
  return r.w4Sort
}

/**
 * LMIA 获批岗位数合计的排序键。
 *
 * @param r 这一行展示行。
 * @returns 数值。
 */
export function spLmiaSortOf(r: SponsorCellRow): number {
  return r.lmiaSort
}

/**
 * 技能类获批数的排序键(🔴 保 null:折 0 = 替官方编数,而 null 恒沉底才排得对)。
 *
 * @param r 这一行展示行。
 * @returns 数值或 null。
 */
export function spSkilledSortOf(r: SponsorCellRow): number | null {
  return r.skilledSort
}

/**
 * 担保雇主表「所在地」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 所在地文本。
 */
export function spWhereOf(r: SponsorCellRow): string {
  return r.where
}

/**
 * 所在地的排序键(按第一个省码 —— 清单本身已按口径去重排好)。
 *
 * @param r 这一行展示行。
 * @returns 首个省码;一个省都没有是空串。
 */
export function spWhereSortOf(r: SponsorCellRow): string {
  return r.whereSort
}

/**
 * 雇主门槛列的排序键:达标/差项排前面(信息量大的先看),待核垫底,公共部门单独一档。
 *
 * @param r 这一行展示行。
 * @returns 权重;表里没有的态是 null(沉底)。
 */
export function spVerdictSortOf(r: SponsorCellRow): number | null {
  return r.verdictSort
}

/**
 * 担保雇主表的行身份。
 *
 * @param r 这一行展示行。
 * @returns 行键。
 */
export function spRowKeyOf(r: SponsorCellRow): string {
  return r.key
}

/**
 * 担保雇主三分表的列组。按人群分表(Frank 2026-08-08 连拍收敛:每表只留纯雇主事实 +
 * 自己那条通道的数值):
 * lmia 表(没工签→要雇主办 LMIA):时间窗/获批量/技能类数值列;担保档药丸列 08-08 四拍撤
 *   (「这个标签也没有必要」—— 与数值列同源重复,#278 ③ 就此了断);
 * named 表(有工签→要打包省提名):二拍撤担保档/「担保过 PR」死列,三拍撤「命中省清单」列
 *   (清单是筛选维度不是雇主属性,只留橱窗清单下拉;streams 字段仍在行上供筛选);
 * aip 表(去海洋省):指定身份即表题,行内只留 在招/所在地。
 * 「下一步」动作列 08-10 Frank 拍掉(「点公司名不就能跳转了吗?为什么还多了一列按钮」):
 * 它的 href 与雇主名列**完全同一个** /?q=<name>,同一落点摆两个入口 = 纯占列宽。
 *
 * @param x 取词函数、人群档与「出不出门槛列」。
 * @returns 列组。
 */
export function sponsorEmployerColsOf(x: SponsorColsIn): EmpCol<SponsorCellRow>[] {
  const cols = sponsorBaseColsOf(x)
  if (x.kind === KIND_LMIA) {
    for (const c of sponsorLmiaColsOf(x)) {
      cols.push(c)
    }
  }
  cols.push(sponsorWhereColOf(x))
  if (x.kind === KIND_NAMED && x.showVerdict) {
    cols.push(sponsorVerdictColOf(x))
  }
  return cols
}

/**
 * 三张表都有的头两列:雇主名与在招岗数。
 *
 * @param x 同 sponsorEmployerColsOf。
 * @returns 两列。
 */
function sponsorBaseColsOf(x: SponsorColsIn): EmpCol<SponsorCellRow>[] {
  return [
    { key: COL_NAME_KEY, label: x.t('dir.col.employer'), sort: spNameSortOf, render: SponsorNameCell },
    {
      key: COL_OPEN_KEY,
      label: sponsorOpenLabelOf(x),
      nowrap: true,
      className: cssOf(css.num),
      sort: spOpenSortOf,
      render: spOpenOf,
    },
  ]
}

/**
 * 在招岗数那一列/那一条的列名(AIP 视图另有一条说明「只计四省内 AIP 岗」的词)。
 *
 * @param x 取词函数与人群档。
 * @returns 列名。
 */
export function sponsorOpenLabelOf(x: SponsorColsWordsIn): string {
  if (x.kind === KIND_AIP) {
    return x.t('se.col.openAip')
  }
  return x.t('se.col.open')
}

/**
 * lmia 表专属的五列数值(近 1/2/4 季、合计、技能类;青绿粗体 = 官方历史事实)。
 *
 * @param x 同 sponsorEmployerColsOf。
 * @returns 五列。
 */
function sponsorLmiaColsOf(x: SponsorColsIn): EmpCol<SponsorCellRow>[] {
  return [
    { key: COL_W1_KEY, label: x.t('se.col.w1'), nowrap: true, sort: spW1SortOf, render: W1Cell },
    { key: COL_W2_KEY, label: x.t('se.col.w2'), nowrap: true, sort: spW2SortOf, render: W2Cell },
    { key: COL_W4_KEY, label: x.t('se.col.w4'), nowrap: true, sort: spW4SortOf, render: W4Cell },
    { key: COL_LMIA_KEY, label: x.t('se.col.lmia'), nowrap: true, sort: spLmiaSortOf, render: LmiaCell },
    {
      key: COL_SKILLED_KEY,
      label: x.t('dir.col.skilled'),
      nowrap: true,
      sort: spSkilledSortOf,
      render: SkilledCell,
    },
  ]
}

/**
 * 所在地列。
 *
 * @param x 同 sponsorEmployerColsOf。
 * @returns 一列。
 */
function sponsorWhereColOf(x: SponsorColsIn): EmpCol<SponsorCellRow> {
  return { key: COL_WHERE_KEY, label: x.t('se.col.where'), sort: spWhereSortOf, render: spWhereOf }
}

/**
 * 雇主门槛列(named 表专属,且整批有信号才出)。
 *
 * @param x 同 sponsorEmployerColsOf。
 * @returns 一列。
 */
function sponsorVerdictColOf(x: SponsorColsIn): EmpCol<SponsorCellRow> {
  return {
    key: COL_VERDICT_KEY,
    label: x.t('se.col.verdict'),
    nowrap: true,
    sort: spVerdictSortOf,
    render: VerdictCell,
  }
}

/**
 * 洗一整批对照雇主的事实行。
 *
 * @param x 要对照的雇主、取词函数与语言。
 * @returns 展示行。
 */
export function toCompareCellRows(x: CompareCellRowsIn): CompareCellRow[] {
  const out = []
  for (const r of x.rows) {
    out.push(toCompareCellRow({ r, t: x.t, lang: x.lang }))
  }
  return out
}

/**
 * 洗一家对比雇主的事实:每一项都算成文本 + 色档类,标签算成文字 + 变体,
 * 匹配两行与简介截断也在这里算完。
 *
 * @param x 这一家、取词函数与语言。
 * @returns 展示行。
 */
export function toCompareCellRow(x: CompareCellRowIn): CompareCellRow {
  const prov = toCompareProv(x)
  const match = toCompareMatch(x)
  return {
    key: x.r.name,
    name: x.r.name,
    website: x.r.website,
    alias: aliasOf({ lang: x.lang, aliasZh: x.r.aliasZh, aliasKo: x.r.aliasKo }),
    industry: { label: industryLabelOf(x), variant: TAG_REGION },
    skilled: { text: maybePositiveTextOf(x.r.lmiaPositionsSkilled), cls: cssOf(css.ok) },
    lmia: { text: compareLmiaTextOf(x.r), cls: TEXT_NONE },
    quarter: { text: x.r.lmiaLastQuarter, cls: TEXT_NONE },
    aip: { label: aipLabelOf(x.r), variant: TAG_OK },
    openText: String(x.r.openJobs),
    openHref: compareOpenHrefOf(x.r),
    avg: { text: compareAvgTextOf(x.r), cls: TEXT_NONE },
    named: { text: positiveTextOf(x.r.namedJobs), cls: cssOf(css.warn) },
    sal: { text: moneyTextOf({ v: x.r.medSalary }), cls: TEXT_NONE },
    provName: prov.name,
    diffLabel: prov.label,
    diffVariant: prov.variant,
    matchHigh: match.high,
    matchMid: match.mid,
    brief: x.r.aiBrief,
    briefText: briefTextOf(x.r),
  }
}

/**
 * 行业大类的标签文字。
 *
 * @param x 这一家与取词函数。
 * @returns 大类人话名;未分类交回空串,由单元格组件渲成灰色横杠。
 */
function industryLabelOf(x: CompareCellRowIn): string {
  if (x.r.industry === TEXT_NONE) {
    return TEXT_NONE
  }
  return x.t(BROAD_KEY_HEAD + x.r.industry)
}

/**
 * AIP 指定的标签文字。
 *
 * @param r 这一家的事实。
 * @returns 对勾;没指定交回空串。
 */
function aipLabelOf(r: CompareRow): string {
  if (r.aip) {
    return AIP_MARK
  }
  return TEXT_NONE
}

/**
 * LMIA 获批岗位数的文本。
 *
 * @param r 这一家的事实。
 * @returns 数字文本;🔴 null(无记录列)交回空串,0 是真的 0 照显示。
 */
function compareLmiaTextOf(r: CompareRow): string {
  if (r.lmiaPositions == null) {
    return TEXT_NONE
  }
  return String(r.lmiaPositions)
}

/**
 * 开放岗平均分的文本。
 *
 * @param r 这一家的事实。
 * @returns 分数;无可平均的岗交回空串。
 */
function compareAvgTextOf(r: CompareRow): string {
  if (r.avgScore == null) {
    return TEXT_NONE
  }
  return String(r.avgScore)
}

/**
 * 对比表「在招岗」那一项的落点。
 *
 * @param r 这一家的事实。
 * @returns 首页按名搜的链;零岗交回空串(不做链 —— 点进去一条都没有的链是空承诺)。
 */
function compareOpenHrefOf(r: CompareRow): string {
  if (r.openJobs === 0) {
    return TEXT_NONE
  }
  return HOME_SEARCH_HEAD + encodeURIComponent(r.name)
}

/**
 * 简介的截断文本(全文另挂 title 悬停看)。
 *
 * @param r 这一家的事实。
 * @returns 截断后的文本(超长时带省略号)。
 */
function briefTextOf(r: CompareRow): string {
  let tail = TEXT_NONE
  if (r.aiBrief.length > BRIEF_LEN_MAX) {
    tail = BRIEF_TAIL
  }
  return r.aiBrief.slice(0, BRIEF_LEN_MAX) + tail
}

/**
 * 对比表「主要省」那一项的三样:省名、难度档文案与标签变体。
 * 难度档未收录时文案交回空串 —— 缺数不猜档(红线:摆事实高亮差异,不下结论)。
 *
 * @param x 这一家与取词函数。
 * @returns 省名、难度档文案与变体。
 */
function toCompareProv(x: CompareCellRowIn): CompareProvParts {
  if (x.r.mainProvince === TEXT_NONE) {
    return { name: TEXT_NONE, label: TEXT_NONE, variant: DIFF_VARIANT_NONE }
  }
  const name = x.t(PROV_KEY_HEAD + x.r.mainProvince)
  if (x.r.diffTier == null) {
    return { name, label: TEXT_NONE, variant: DIFF_VARIANT_NONE }
  }
  let variant: DiffVariant = DIFF_VARIANT_NONE
  const found = DIFF_TAG[x.r.diffTier]
  if (found != null) {
    variant = found
  }
  return { name, label: x.t(DIFF_KEY_HEAD + x.r.diffTier), variant }
}

/**
 * 对比表「与我的匹配」那一项的两行文案。
 *
 * @param x 这一家与取词函数。
 * @returns 高/中匹配两行;未建档/未算时都交回空串,由单元格组件渲成灰色横杠(不是「零匹配」)。
 */
function toCompareMatch(x: CompareCellRowIn): CompareMatchParts {
  if (x.r.matchHigh == null) {
    return { high: TEXT_NONE, mid: TEXT_NONE }
  }
  let mid = 0
  if (x.r.matchMid != null) {
    mid = x.r.matchMid
  }
  return { high: x.t('ce.matchHigh', { n: x.r.matchHigh }), mid: x.t('ce.matchMid', { n: mid }) }
}

/**
 * 有没有雇主带得出「与我的匹配」—— 一家都没有就不出那一行(未建档时不摆一行空)。
 *
 * @param rows 要对照的雇主事实。
 * @returns 有没有。
 */
export function withMatchOf(rows: CompareRow[]): boolean {
  for (const r of rows) {
    if (r.matchHigh != null) {
      return true
    }
  }
  return false
}

/**
 * 对照表的维度行(表里是行、卡里是键值,一份数组两处复用零双写)。
 *
 * @param x 取词函数与「出不出匹配行」。
 * @returns 维度行。
 */
export function compareDimsOf(x: CompareDimsIn): CompareDim[] {
  const dims = compareFactDimsOf(x)
  for (const d of compareMoreDimsOf(x)) {
    dims.push(d)
  }
  return dims
}

/**
 * 前六条维度:行业、技能类获批、LMIA 获批、最近季度、AIP 指定、在招岗。
 * E12-08:裸「知名」维度行退役(wiki 依据降级进公司分知名度维);
 * 担保信号由 skilled 明细行承担。
 *
 * @param x 同 compareDimsOf。
 * @returns 六条维度。
 */
function compareFactDimsOf(x: CompareDimsIn): CompareDim[] {
  return [
    { key: DIM_INDUSTRY_KEY, label: x.t('fact.coSectors'), tip: TEXT_NONE, render: IndustryCell },
    {
      key: DIM_SKILLED_KEY,
      label: x.t('dir.col.skilled'),
      tip: x.t('dir.col.skilled.tip'),
      render: CompareSkilledCell,
    },
    { key: DIM_LMIA_KEY, label: x.t('rank.col.lmia'), tip: TEXT_NONE, render: CompareLmiaCell },
    { key: DIM_QUARTER_KEY, label: x.t('dir.col.quarter'), tip: TEXT_NONE, render: QuarterCell },
    { key: DIM_AIP_KEY, label: x.t('ce.aip'), tip: TEXT_NONE, render: AipCell },
    { key: DIM_OPEN_KEY, label: x.t('rank.col.openJobs'), tip: TEXT_NONE, render: CompareOpenCell },
  ]
}

/**
 * 后五到六条维度:平均分、具名岗、年薪中位、主要省、与我的匹配(可选)、简介。
 *
 * @param x 同 compareDimsOf。
 * @returns 五到六条维度。
 */
function compareMoreDimsOf(x: CompareDimsIn): CompareDim[] {
  const dims: CompareDim[] = [
    { key: DIM_AVG_KEY, label: x.t('rank.col.avgScore'), tip: TEXT_NONE, render: AvgCell },
    { key: DIM_NAMED_KEY, label: x.t('stats.named'), tip: TEXT_NONE, render: NamedCell },
    { key: DIM_SAL_KEY, label: x.t('stats.medSalary'), tip: TEXT_NONE, render: SalCell },
    { key: DIM_PROV_KEY, label: x.t('ce.provDiff'), tip: TEXT_NONE, render: ProvCell },
  ]
  if (x.withMatch) {
    dims.push({ key: DIM_MATCH_KEY, label: x.t('ce.match'), tip: TEXT_NONE, render: MatchCell })
  }
  dims.push({ key: DIM_BRIEF_KEY, label: x.t('ce.brief'), tip: TEXT_NONE, render: BriefCell })
  return dims
}

/**
 * 造一枚「这一列(= 这一家雇主)在某个维度上的值」取值器。
 * 它返回的是**数据访问器,不是单元格组件** —— 对比表的列数由用户选了几家雇主决定,
 * 列身份只能靠闭包带进去(同 table 域的 makeHeadClick / makeGrip)。
 *
 * @param x 这一列代表的雇主(表是转置的:列 = 雇主、行 = 维度)。
 * @returns 维度 → 这一家雇主在该维度上的值。
 */
export function makeDimValue(x: DimValueIn): CellFn<CompareDim> {
  function dimValue(d: CompareDim) {
    return d.render(x.row)
  }
  return dimValue
}

/**
 * 对照表的行身份(维度 key)。
 *
 * @param d 这一维度。
 * @returns 维度 key。
 */
export function dimRowKeyOf(d: CompareDim): string {
  return d.key
}

/**
 * 对照卡的行身份(雇主名)。
 *
 * @param r 这一家的展示行。
 * @returns 行键。
 */
export function compareRowKeyOf(r: CompareCellRow): string {
  return r.key
}

/**
 * 模糊样例表的四行假数据(付费诱导样例;⑤ 价值时刻先例 —— 真值不出服务端,
 * 免费页拿不到也就泄不了)。
 *
 * @param x 取词函数(指标名走 i18n,值是写死的假数)。
 * @returns 四行。
 */
export function compareDemoRowsOf(x: WordsIn): CompareDemoRow[] {
  return [
    { metric: x.t('dir.col.skilled'), a: DEMO_SKILLED_A, b: DEMO_SKILLED_B, c: DEMO_SKILLED_C },
    { metric: x.t('rank.col.openJobs'), a: DEMO_OPEN_A, b: DEMO_OPEN_B, c: DEMO_OPEN_C },
    { metric: x.t('stats.named'), a: DEMO_NAMED_A, b: DEMO_NAMED_B, c: DEMO_NAMED_C },
    { metric: x.t('ce.provDiff'), a: DEMO_PROV_A, b: DEMO_PROV_B, c: DEMO_PROV_C },
  ]
}

/**
 * 模糊样例表的行身份(指标名唯一)。
 *
 * @param r 这一行。
 * @returns 指标名。
 */
export function demoMetricOf(r: CompareDemoRow): string {
  return r.metric
}

/**
 * 模糊样例表里第一家假雇主那一列的取值。
 *
 * @param r 这一行。
 * @returns 假值(整列由列级类糊掉)。
 */
export function demoAOf(r: CompareDemoRow): string {
  return r.a
}

/**
 * 模糊样例表里第二家假雇主那一列的取值。
 *
 * @param r 这一行。
 * @returns 假值。
 */
export function demoBOf(r: CompareDemoRow): string {
  return r.b
}

/**
 * 模糊样例表里第三家假雇主那一列的取值。
 *
 * @param r 这一行。
 * @returns 假值。
 */
export function demoCOf(r: CompareDemoRow): string {
  return r.c
}

/**
 * 模糊样例表的列组:最左一列渲灰色的指标名(它的表头是空的,与原件一致),
 * 右边三列是三家假雇主的模糊值。
 * 假值没有第二种形态(样例数据一定在),所以整列共用一个类就够,不必各配一枚单元格组件。
 *
 * @returns 列组。
 */
export function compareDemoColsOf(): EmpCol<CompareDemoRow>[] {
  const blur = cssOf(css.blur)
  return [
    {
      key: DEMO_METRIC_KEY,
      label: TEXT_NONE,
      nowrap: true,
      className: cssOf(css.dim),
      render: demoMetricOf,
    },
    { key: DEMO_A_KEY, label: DEMO_CO_A, className: blur, render: demoAOf },
    { key: DEMO_B_KEY, label: DEMO_CO_B, className: blur, render: demoBOf },
    { key: DEMO_C_KEY, label: DEMO_CO_C, className: blur, render: demoCOf },
  ]
}

/**
 * 忘掉本地存着的那份对比栏。存取键写在 localStorage,而它在隐私模式下或被浏览器
 * 禁掉时会抛 —— 那时直接返回:清不掉本地那一份,不该把用户卡在这一页。
 *
 * @returns 无。
 */
function forgetCompare(): void {
  try {
    localStorage.removeItem(CMP_KEY)
  } catch {
    return
  }
}

/**
 * 清空对比栏并回名录。
 *
 * @returns 无。
 */
export function clearCompare(): void {
  forgetCompare()
  window.location.href = EMP_URL
}

/**
 * 把对照页 URL `?names=` 那一格切成雇主名清单:按竖线切、逐段去首尾空白、丢掉空段
 * (`a||b` 或结尾多一根竖线,都不该变成一个空名字拿去查库)。
 *
 * @param x URL 上 names 参数的原样值。
 * @returns 去过空白的雇主名清单;参数没带时给空清单。
 */
export function compareNamesOf(x: CompareNamesIn): string[] {
  let raw = TEXT_NONE
  if (x.names != null) {
    raw = x.names
  }
  const names: string[] = []
  for (const part of raw.split(COMPARE_NAME_SEP)) {
    const name = part.trim()
    if (name !== TEXT_NONE) {
      names.push(name)
    }
  }
  return names
}

/**
 * 匹配维度包取不到时的兜底值(对照页 `loadMatchDims(...).catch(noDimsOf)` 用):
 * 维度包只影响「与我的匹配」那一列出不出,取不到就当这一列没有维度可算,
 * 对照表本身照出 —— 不能因为它把整页拖没。签名(零参)由 `Promise.catch` 定死。
 *
 * @returns 恒为 null。
 */
export function noDimsOf(): null {
  return null
}

/**
 * 「清空」钮的类名预算:全局控件高度 + 危险红字(它抹掉用户已经点好的一串筛选)。
 *
 * @returns 拼好的 className。
 */
export function clearBtnClsOf(): string {
  return [CTL_CLS, cssOf(css.clearBtn)].join(CLS_SEP)
}

/**
 * 列表区的类名预算:基座 + 懒取中修饰(半透明 + 屏蔽点击)。
 *
 * @param x 在不在懒取。
 * @returns 拼好的 className。
 */
export function listClsOf(x: ListClsIn): string {
  const cls = [cssOf(css.list)]
  if (x.busy) {
    cls.push(cssOf(css.listBusy))
  }
  return cls.join(CLS_SEP)
}

/**
 * 筛选态 → query 串(全部筛选走 query,深链可分享;缺省值不写:排序星级、页码 0、开关关都不进串)。
 * @param x 当前筛选。
 * @returns 已编码的 query;什么都没筛时空串。
 */
export function qsOf(x: FiltersIn): string {
  const p = new URLSearchParams()
  if (x.f.group !== TEXT_NONE) {
    p.set(P_GROUP, x.f.group)
  }
  if (x.f.prov !== TEXT_NONE) {
    p.set(P_PROV, x.f.prov)
  }
  if (x.f.entry) {
    p.set(P_ENTRY, ENTRY_ON)
  }
  if (x.f.program !== TEXT_NONE) {
    p.set(P_PROGRAM, x.f.program)
  }
  if (x.f.q !== TEXT_NONE) {
    p.set(P_Q, x.f.q)
  }
  if (x.f.sort !== POOL_SORT_DEFAULT) {
    p.set(P_SORT, x.f.sort)
  }
  if (x.f.page > 0) {
    p.set(P_PAGE, String(x.f.page))
  }
  return p.toString()
}

/**
 * 深链地址(`/employers?<query>`)。换筛选用 replaceState 写它 ——
 * 换筛选不该在历史里堆一串条目,也不该整页重载。
 *
 * @param x 已拼好的 query。
 * @returns 深链。
 */
export function boardUrlOf(x: BoardUrlIn): string {
  if (x.qs === TEXT_NONE) {
    return EMP_URL
  }
  return EMP_URL + QS_HEAD + x.qs
}

/**
 * 懒取地址(`/api/employers?<query>`)。
 *
 * @param x 已拼好的 query。
 * @returns API 地址。
 */
export function apiUrlOf(x: BoardUrlIn): string {
  if (x.qs === TEXT_NONE) {
    return EMP_API_URL
  }
  return EMP_API_URL + QS_HEAD + x.qs
}

/**
 * 懒取一页(池表不进 SSR payload,换筛选/翻页/换排序才打 API)。
 * 🔴 失败保底:换回来的东西不成形、或整条请求挂了,就**保留手上这一页**,不白屏 ——
 * 雇主板的用户十有八九是从决策页点过来查一件具体的事,把已经在看的表清掉比慢一点更糟。
 * 中断(用户换得比网快)走同一条路,不区分 —— 它本来就不需要落地。
 *
 * @param x query、中断信号与两个落格。
 * @returns 无(落地走 setData)。
 */
export async function loadBoard(x: LoadBoardIn): Promise<void> {
  try {
    const res = await fetch(apiUrlOf({ qs: x.qs }), { signal: x.signal })
    if (res.ok) {
      x.setData(await res.json())
    }
  } catch {
    return
  } finally {
    x.setLoading(false)
  }
}

/**
 * 造「搜索词落词」的手柄(防抖计时器到点时跑的就是它)。
 * 先记一次 `emp-search` 再把词落进筛选 —— 分组值只有行业组键,搜索词本身不进埋点。
 *
 * @param x 当前筛选、防抖满了的搜索词与落格。
 * @returns 防抖计时器的回调。
 */
export function makeQCommit(x: QCommitIn): ClickFn {
  function commitQuery(): void {
    track(EV_SEARCH, { [EV_PROP_KEY]: kindOf({ f: x.f }) })
    x.setF(withOf({ f: x.f, q: x.q, page: 0 }))
  }
  return commitQuery
}

/**
 * 整份筛选逐格抄一遍,只换给了的几格(禁对象展开 —— 字段写全;所有手柄共用这一枚,免得八格各抄一遍)。
 *
 * @param x 当前筛选与要换的格(缺席 = 不换)。
 * @returns 新的整份筛选。
 */
function withOf(x: WithIn): PoolFilters {
  let group = x.f.group
  if (x.group != null) {
    group = x.group
  }
  let prov = x.f.prov
  if (x.prov != null) {
    prov = x.prov
  }
  let program = x.f.program
  if (x.program != null) {
    program = x.program
  }
  let entry = x.f.entry
  if (x.entry != null) {
    entry = x.entry
  }
  let q = x.f.q
  if (x.q != null) {
    q = x.q
  }
  let sort = x.f.sort
  if (x.sort != null) {
    sort = x.sort
  }
  let page = x.f.page
  if (x.page != null) {
    page = x.page
  }
  return { group, prov, program, noc: x.f.noc, entry, q, sort, page }
}

/**
 * 造换行业组的手柄(顺带回第一页)。
 *
 * @param x 当前筛选与落格。
 * @returns 下拉的 onChange。
 */
export function makeGroup(x: FilterPickIn): PickFn {
  function onGroup(v: string): void {
    track(EV_FILTER, { [EV_PROP_KEY]: EV_PROP_GROUP })
    x.setF(withOf({ f: x.f, group: v, page: 0 }))
  }
  return onGroup
}

/**
 * 造换省的手柄(顺带回第一页)。
 *
 * @param x 当前筛选与落格。
 * @returns 下拉的 onChange。
 */
export function makeProv(x: FilterPickIn): PickFn {
  function onProv(v: string): void {
    track(EV_FILTER, { [EV_PROP_KEY]: EV_PROP_PROV })
    x.setF(withOf({ f: x.f, prov: v, page: 0 }))
  }
  return onProv
}

/**
 * 造「无经验可投」开关的手柄(拨一下取反,回第一页)。
 *
 * @param x 当前筛选与落格。
 * @returns 胶囊的 onClick。
 */
export function makeEntryToggle(x: EntryToggleIn): ClickFn {
  function onEntry(): void {
    track(EV_FILTER, { [EV_PROP_KEY]: EV_PROP_ENTRY })
    x.setF(withOf({ f: x.f, entry: x.f.entry === false, page: 0 }))
  }
  return onEntry
}

/**
 * 造表头点列换排序的手柄:点一列 = 按它排(方向服务端定死);再点当前列 = 回默认星级;
 * 不是排序键的列(所在地、操作)点了不动。
 *
 * @param x 当前筛选与落格。
 * @returns 表头的 onSort。
 */
export function makeSort(x: SortPickIn): HeadSortFn {
  function onSort(key: string): void {
    if (isSortKeyOf(key) === false) {
      return
    }
    let next: PoolSort = POOL_SORT_DEFAULT
    if (key !== x.f.sort) {
      next = key
    }
    track(EV_FILTER, { [EV_PROP_KEY]: EV_PROP_SORT })
    x.setF(withOf({ f: x.f, sort: next, page: 0 }))
  }
  return onSort
}

/**
 * 排序键谓词:列 key 是不是白名单里的排序主键(谓词签名语言规定,一参一型的唯一例外形态)。
 *
 * @param v 列 key。
 * @returns 是否排序主键。
 */
function isSortKeyOf(v: string): v is PoolSort {
  return (POOL_SORTS as readonly string[]).includes(v)
}

/**
 * 造清空筛选的手柄:省 / 开关 / 制度 / 搜索词 / 排序全清,行业组保留(它是板的第一维,不是筛选项)。
 *
 * @param x 当前筛选、落格与搜索草稿落格。
 * @returns 钮的 onClick。
 */
export function makeClear(x: ClearIn): ClickFn {
  function onClear(): void {
    x.setQDraft(TEXT_NONE)
    x.setF(withOf({
      f: x.f, prov: TEXT_NONE, program: TEXT_NONE, entry: false, q: TEXT_NONE, sort: POOL_SORT_DEFAULT, page: 0,
    }))
  }
  return onClear
}

/**
 * 造翻页手柄(只动页码那一格)。
 *
 * @param x 当前筛选与落格。
 * @returns 翻页器的 onPage。
 */
export function makePage(x: FilterPickIn): PageFn {
  function onPage(p: number): void {
    track(EV_PAGE, { [EV_PROP_KEY]: kindOf({ f: x.f }) })
    x.setF(withOf({ f: x.f, page: p }))
  }
  return onPage
}

/**
 * 造整卡点击手柄:手机上整张卡都可点(卡本身 ≥70px,卡内标题链只有 23px 高),
 * 但点在卡内链接上时交给 `<a>` 自己走,不重复导航。
 *
 * @param x 这一行的落点与埋点分组值。
 * @returns 卡的 onCardClick。
 */
export function makeCardClick(x: CardClickIn): CardClickFn {
  function onCardClick(e: React.MouseEvent): void {
    const el = e.target
    if (el instanceof HTMLElement && el.closest(LINK_SELECTOR) != null) {
      return
    }
    track(EV_ROW, { [EV_PROP_KEY]: x.kind })
    window.location.href = x.href
  }
  return onCardClick
}

/**
 * 造「点雇主名」的埋点手柄(emp-row):表格那一列的链接与手机卡标题链共用同一枚,
 * 落点由链接自己的 href 走,这里只记一笔。
 *
 * @param x 埋点分组值。
 * @returns 链接的 onClick。
 */
export function makeRowView(x: RowViewIn): ClickFn {
  function onView(): void {
    track(EV_ROW, { [EV_PROP_KEY]: x.kind })
  }
  return onView
}

/**
 * 有没有任何一格生效的筛选(行业组不算 —— 它是板的第一维)。
 *
 * @param x 当前筛选。
 * @returns 有没有。
 */
export function anyFilterOf(x: FiltersIn): boolean {
  return x.f.prov !== TEXT_NONE || x.f.entry || x.f.program !== TEXT_NONE || x.f.q !== TEXT_NONE
}

/**
 * banner 副题的计数(照职位板:筛过了报「命中 N 家」,否则报「N 家雇主」;选了行业组也算筛过)。
 *
 * @param x 取词函数、当前筛选与总数。
 * @returns 计数文案。
 */
export function noteTextOf(x: NoteTextIn): string {
  if (anyFilterOf({ f: x.f }) || x.f.group !== TEXT_NONE) {
    return x.t('de.hits', { n: x.total })
  }
  return x.t('de.count', { n: x.total })
}

/**
 * 空态说清是哪一种:查证态未命中 = 不在官方指定雇主清单内(防坑定位,站规「≠资格认定」保留族);
 * 筛过了才空 = 查无匹配(改筛选再试)。
 *
 * @param x 取词函数与当前筛选。
 * @returns 空态文案。
 */
export function emptyTextOf(x: TextByFiltersIn): string {
  if (x.f.q !== TEXT_NONE) {
    return x.t('de.notFound')
  }
  return x.t('de.emptyFiltered')
}

/**
 * 造一枚行业组下拉的选项显示名取值器(与把脉页同一套 pulse.ind.* 词条)。
 *
 * @param x 取词函数。
 * @returns 组键 → 组名。
 */
export function makeGroupLabel(x: WordsIn): NocNameFn {
  function groupLabel(v: string): string {
    return x.t(GROUP_KEY_HEAD + v)
  }
  return groupLabel
}

/**
 * 造一枚省下拉的选项显示名取值器。
 *
 * @param x 取词函数。
 * @returns 省码 → 省名。
 */
export function makeProvLabel(x: WordsIn): NocNameFn {
  function provLabel(code: string): string {
    return provNameOf({ t: x.t, code })
  }
  return provLabel
}

/**
 * 总页数(≥1)。pageSize 为 0 时按兜底档算 —— 除以 0 会算出 Infinity 页,翻页器当场废掉。
 *
 * @param x 总行数与每页行数。
 * @returns 总页数。
 */
export function maxPageOf(x: MaxPageIn): number {
  let size = PAGE_SIZE_FALLBACK
  if (x.pageSize > 0) {
    size = x.pageSize
  }
  return Math.max(1, Math.ceil(x.total / size))
}

/**
 * 造一枚开合升级弹框的手柄。
 *
 * @param x 弹框落格与要落成的开合态。
 * @returns 钮的 onClick。
 */
export function makePricingSet(x: PricingSetIn): ClickFn {
  function onPricing(): void {
    x.setPricing(x.open)
  }
  return onPricing
}

/**
 * 拼 `/employers` 的 SEO 头:标题按省码加范围前缀,直达链接进来时标题就说清看的是哪一省。
 * 省码不认(没带或不是两位大写字母)时前缀为空,标题退回固定尾巴 —— 随手编的参数不会被渲进 `<title>`。
 * 2026-09-13 雇主板批二自 designatedMetaOf / hiringMetaOf 合一(两路由 301 合到一块板)。
 *
 * @param x Next 递来的查询参数(await 之后的原样格)。
 * @returns 标题与描述。
 */
export function employersMetaOf(x: EmployersMetaIn): EmployersMetaOut {
  let head = TEXT_NONE
  if (x.prov != null && META_PROV_RE.test(x.prov)) {
    head = x.prov + META_SCOPE_SEP
  }
  return { title: head + EMPLOYERS_TITLE_TAIL, description: EMPLOYERS_DESC }
}
