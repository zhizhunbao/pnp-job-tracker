/**
 * rankings 页面域从组件体里迁出来的函数:榜名与口径注、导航各格、更新时间、
 * **洗行**(事实行 → 展示行)、两张表的列组与取值器,以及这一页交给 Next 的 SEO 主体。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」;2026-08-27 打回 make*Cell 工厂后
 * 再收一刀:要 t 才算得出的显示值(列名、卡上的标签、通道三语名)**全部在洗行时算好挂到
 * 展示行上**,单元格组件退成顶层哑组件。
 * 依赖方向:本文件 → 各单元格组件(单向;它们只认 constants/types/css,不回引本文件
 * —— 否则 import/no-cycle 当场红)。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { eeDisplay, streamDisplay } from '@/lib/jobs'
import { BROAD_SLUGS } from '@/lib/stats'
import { ymd } from '@/lib/time'
import { cssOf } from '@/components/css'
import {
  COL_AVG_KEY, COL_CITY_KEY, COL_COMPANY_KEY, COL_DATE_KEY, COL_EE_KEY, COL_GO_KEY, COL_GO_LABEL,
  COL_LMIA_KEY, COL_NAMED_KEY, COL_OPEN_KEY, COL_PNP_KEY, COL_PROV_KEY, COL_RANK_KEY, COL_RANK_LABEL,
  COL_SALARY_KEY, COL_SCORE_KEY, COL_TITLE_KEY, DAILY_META_EN, DASH_MARK, KEY_BROAD_HEAD, KEY_NOTE_DAILY,
  KEY_NOTE_HEAD, KEY_TITLE_DAILY, KEY_TITLE_HEAD, LABEL_GAP, LOC_SEP, META_DAILY_DESC_HEAD,
  META_DAILY_DESC_TAIL, META_DAILY_TITLE_HEAD, META_DAILY_TITLE_TAIL, META_SEG_PLAIN, META_SEG_TAIL,
  RANK_MARK, RANK_META, SLUG_DAILY, SLUG_DAILY_HEAD, SLUG_SPONSOR, SLUG_WEEKLY, TARGET_BLANK, TEXT_NONE,
  TITLE_GAP, URL_JOBS_SEARCH_HEAD, URL_RANK_HEAD, DATE_LOCALE, DATE_TZ,
} from './constants'
import { EeCell } from './eecell'
import { GoCell } from './gocell'
import { LmiaCell } from './lmiacell'
import { PnpCell } from './pnpcell'
import { ProvCell } from './provcell'
import { TitleCell } from './titlecell'
import type {
  BoardsIn, CellRowsIn, CompanyCellRowIn, CompanyCellRowsIn, CompanyColsIn, ColsIn, JobCellRowIn, NoteIn,
  RankCardLink, RankCol, RankCompanyCellRow, RankJobCardParts, RankJobCellRow, RankRow, RankTabRow,
  RankTitleIn, RankingMeta, RankingMetaIn, TabRowsIn, UpdatedIn,
} from './types'
import css from './rankings.module.css'

/**
 * 这一榜是不是公司口径(最可能担保雇主榜)。整页的表形、卡形与列组都按它分叉。
 *
 * @param slug 榜 slug。
 * @returns 是公司榜就给 true,其余一律职位榜。
 */
export function isCompanyBoard(slug: string): boolean {
  return slug === SLUG_SPONSOR
}

/**
 * 榜名。每日分类榜(E9-02)= 通用榜名 + 大类人话名;slug 表只有一份
 * (lib/stats 的 BROAD_SLUGS,它自己镜像 etl/noc_buckets.SLUGS),这里不再抄一遍。
 *
 * @param x 取词函数与榜 slug。
 * @returns 这一榜的显示名。
 */
export function rankTitleOf(x: RankTitleIn): string {
  if (x.slug.startsWith(SLUG_DAILY) === false) {
    return x.t(KEY_TITLE_HEAD + x.slug)
  }
  const zh = broadNameOf(x.slug)
  if (zh === TEXT_NONE) {
    return x.t(KEY_TITLE_DAILY)
  }
  return x.t(KEY_TITLE_DAILY) + TITLE_GAP + x.t(KEY_BROAD_HEAD + zh)
}

/**
 * 每日分类榜 slug 里那一段大类的中文名(它同时是大类文案的键尾)。
 *
 * @param slug 榜 slug。
 * @returns 大类中文名;这一段不在大类表里就给空串(榜名只出通用名)。
 */
function broadNameOf(slug: string): string {
  const code = slug.replace(SLUG_DAILY_HEAD, TEXT_NONE)
  for (const [broadCode, broadZh] of BROAD_SLUGS) {
    if (broadCode === code) {
      return broadZh
    }
  }
  return TEXT_NONE
}

/**
 * 导航要列的榜:每日总榜 + 每日各分类榜 + 周榜,只留当天真有数据的那几张。
 * 当前榜恒在(站着的这一榜不许从导航消失);周榜也恒在(它是这一组榜单的落点,
 * 没有它用户就没有回到主榜的路)。
 * B2:sponsor-likely 从榜单 tab 里摘出去了 —— 它先并进 /employers?sort=skilled 由担保雇主页
 * 承接,货架页 2026-08-08 下架后路由 301 直指把脉页橱窗。
 *
 * @param x 当前榜与当天有数据的榜。
 * @returns 导航要列的榜 slug 清单。
 */
export function boardsOf(x: BoardsIn): string[] {
  const all = [SLUG_DAILY]
  for (const [broadCode] of BROAD_SLUGS) {
    all.push(SLUG_DAILY_HEAD + broadCode)
  }
  all.push(SLUG_WEEKLY)
  const out = []
  for (const board of all) {
    if (board === x.slug || x.slugs.includes(board) || board === SLUG_WEEKLY) {
      out.push(board)
    }
  }
  return out
}

/**
 * 洗导航各格(榜名、地址与当前态)。
 *
 * @param x 导航要列的榜、当前榜与取词函数。
 * @returns 导航各格。
 */
export function toRankTabRows(x: TabRowsIn): RankTabRow[] {
  const out = []
  for (const board of x.boards) {
    out.push({
      slug: board,
      label: rankTitleOf({ t: x.t, slug: board }),
      href: URL_RANK_HEAD + board,
      current: board === x.slug,
    })
  }
  return out
}

/**
 * 「更新于」那一行。口径 = 榜内最新发布日(第 11 轮 #30),但**不超过今天**
 * (第 12 轮 #32:帖面日期是 ET 时区可到「明天」,「更新于未来」损口径可信度)——
 * 用 ET 当天封顶,理由见 constants 的 DATE_TZ。
 *
 * @param x 取词函数与本榜的行。
 * @returns 整句「更新于 …」。
 */
export function updatedTextOf(x: UpdatedIn): string {
  const today = new Date().toLocaleDateString(DATE_LOCALE, { timeZone: DATE_TZ })
  const maxPosted = maxPostedOf(x.items)
  let updated = today
  if (maxPosted !== TEXT_NONE && maxPosted < today) {
    updated = maxPosted
  }
  return x.t('rank.updated', { d: updated })
}

/**
 * 榜内最新的发布日(纯日期)。
 *
 * @param items 本榜的全部行。
 * @returns `YYYY-MM-DD`;一行都没记日期时给空串。
 */
function maxPostedOf(items: RankRow[]): string {
  let max = TEXT_NONE
  for (const r of items) {
    if (r.datePosted !== TEXT_NONE && r.datePosted > max) {
      max = r.datePosted
    }
  }
  return ymd(max)
}

/**
 * 这一榜的口径注。#198(Frank「删掉」周榜口径注):文案表里那条是空串,
 * 于是这里也给空串 —— 调用方据此整行不渲。
 *
 * @param x 取词函数与榜 slug。
 * @returns 口径注;这一榜没有口径注时给空串。
 */
export function noteTextOf(x: NoteIn): string {
  let key = KEY_NOTE_HEAD + x.slug
  if (x.slug.startsWith(SLUG_DAILY)) {
    key = KEY_NOTE_DAILY
  }
  const text = x.t(key)
  if (text === key) {
    return TEXT_NONE
  }
  return text
}

/**
 * 洗一整页公司榜的事实行。
 *
 * @param x 本榜的行与取词函数。
 * @returns 展示行。
 */
export function toRankCompanyCellRows(x: CompanyCellRowsIn): RankCompanyCellRow[] {
  const out = []
  for (const r of x.items) {
    out.push(toRankCompanyCellRow({ r, t: x.t, showNamed: x.showNamed }))
  }
  return out
}

/**
 * 命中岗数这一列出不出。第 2 轮 #7 核查:LMIA 强雇主与省提名清单命中长期不重叠
 * (全库 436 命中岗,30 强全 0)—— 整列 0 像坏数据,全零时藏列;哪天数据重叠了自动恢复,
 * 排序键不受影响(ETL 侧)。
 *
 * @param items 本榜的全部行。
 * @returns 有任意一行命中过就给 true。
 */
export function showNamedOf(items: RankRow[]): boolean {
  for (const r of items) {
    if (r.namedJobs != null && r.namedJobs > 0) {
      return true
    }
  }
  return false
}

/**
 * 洗一行公司榜事实:名次成文本、缺数格按各自的口径补横杠或留空,
 * 顺带把卡片上那几条标签也取好。
 *
 * @param x 这一行、取词函数与「命中岗数列出不出」。
 * @returns 展示行。
 */
export function toRankCompanyCellRow(x: CompanyCellRowIn): RankCompanyCellRow {
  const lmiaText = positiveTextOf(x.r.lmiaPositions)
  let lmiaSubText = TEXT_NONE
  if (lmiaText !== TEXT_NONE) {
    lmiaSubText = x.r.lmiaQuarter
  }
  return {
    key: String(x.r.rank),
    rankText: String(x.r.rank),
    rankMark: RANK_MARK + x.r.rank,
    rankSort: x.r.rank,
    company: x.r.company,
    companySort: x.r.company.toLowerCase(),
    officialUrl: x.r.officialUrl,
    province: x.r.province,
    prov: { text: x.r.province, cls: TEXT_NONE },
    provSort: emptyToNullOf(x.r.province),
    lmia: { text: lmiaText, cls: cssOf(css.okStrong) },
    lmiaQuarter: x.r.lmiaQuarter,
    lmiaSubText,
    lmiaSort: x.r.lmiaPositions,
    namedText: countTextOf(x.r.namedJobs),
    namedSort: x.r.namedJobs,
    showNamed: x.showNamed,
    openText: countTextOf(x.r.openJobs),
    cardOpenText: dashTextOf(x.r.openJobs),
    openSort: x.r.openJobs,
    avgText: dashTextOf(x.r.avgScore),
    avgSort: x.r.avgScore,
    goHref: URL_JOBS_SEARCH_HEAD + encodeURIComponent(x.r.company),
    goLabel: x.t('rank.viewJobs'),
    lmiaLabel: x.t('rank.col.lmia'),
    quarterLabel: x.t('dir.col.quarter'),
    namedLabel: x.t('rank.col.namedJobs'),
    openLabel: x.t('rank.col.openJobs'),
    avgLabel: x.t('rank.col.avgScore'),
  }
}

/**
 * 可空数值 → 正数文本。🔴 0 与 null 一样交回空串:LMIA 获批数是官方历史事实,
 * 「这一家没有记录」与「获批 0 个」在展示上同为「没有这一项」,都渲横杠。
 *
 * @param n 数值;null = 库里没有记录。
 * @returns 数字文本;没有记录或 0 时给空串。
 */
function positiveTextOf(n: number | null): string {
  if (n == null) {
    return TEXT_NONE
  }
  if (n === 0) {
    return TEXT_NONE
  }
  return String(n)
}

/**
 * 可空数值 → 文本(0 照显示 —— 库里真的一个都没有,不是缺数)。
 *
 * @param n 数值;null = 这一格不属于这一行(岗行不填公司列)。
 * @returns 数字文本;null 时给空串,格子留空。
 */
function countTextOf(n: number | null): string {
  if (n == null) {
    return TEXT_NONE
  }
  return String(n)
}

/**
 * 可空数值 → 文本,缺数时给横杠(卡片上没有列名撑着,空格子读不出是「没有」)。
 *
 * @param n 数值;null = 缺数。
 * @returns 数字文本或横杠。
 */
function dashTextOf(n: number | null): string {
  if (n == null) {
    return DASH_MARK
  }
  return String(n)
}

/**
 * 空串 → null(排序键的口径:没有值的行恒沉底)。
 *
 * @param text 原文本。
 * @returns 原文本;空串时给 null。
 */
function emptyToNullOf(text: string): string | null {
  if (text === TEXT_NONE) {
    return null
  }
  return text
}

/**
 * 公司榜的列组:名次、公司、省、LMIA、(命中岗数)、在招、均分、去职位板。
 * #199(Frank「多余的跳转都删掉」):公司名 ↗ 官网外链在表格里已撤,纯文字。
 *
 * @param x 取词函数与「命中岗数列出不出」。
 * @returns 列组。
 */
export function companyColsOf(x: CompanyColsIn): RankCol<RankCompanyCellRow>[] {
  const cols: RankCol<RankCompanyCellRow>[] = [
    {
      key: COL_RANK_KEY,
      label: COL_RANK_LABEL,
      nowrap: true,
      className: cssOf(css.dim),
      sort: companyRankSortOf,
      render: companyRankOf,
    },
    {
      key: COL_COMPANY_KEY,
      label: x.t('rank.col.company'),
      className: cssOf(css.strong),
      sort: companyNameSortOf,
      render: companyNameOf,
    },
    { key: COL_PROV_KEY, label: x.t('col.province'), nowrap: true, sort: companyProvSortOf, render: ProvCell },
    { key: COL_LMIA_KEY, label: x.t('rank.col.lmia'), nowrap: true, sort: companyLmiaSortOf, render: LmiaCell },
  ]
  if (x.showNamed) {
    cols.push({
      key: COL_NAMED_KEY,
      label: x.t('rank.col.namedJobs'),
      className: cssOf(css.warn),
      sort: companyNamedSortOf,
      render: companyNamedOf,
    })
  }
  cols.push({ key: COL_OPEN_KEY, label: x.t('rank.col.openJobs'), sort: companyOpenSortOf, render: companyOpenOf })
  cols.push({ key: COL_AVG_KEY, label: x.t('rank.col.avgScore'), sort: companyAvgSortOf, render: companyAvgOf })
  cols.push({ key: COL_GO_KEY, label: COL_GO_LABEL, nowrap: true, render: GoCell })
  return cols
}

/**
 * 公司榜的行身份。
 *
 * @param r 这一行展示行。
 * @returns 行键。
 */
export function companyRowKeyOf(r: RankCompanyCellRow): string {
  return r.key
}

/**
 * 公司榜「#」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 名次文本。
 */
function companyRankOf(r: RankCompanyCellRow): string {
  return r.rankText
}

/**
 * 公司榜「#」列的排序键。
 *
 * @param r 这一行展示行。
 * @returns 名次。
 */
function companyRankSortOf(r: RankCompanyCellRow): number {
  return r.rankSort
}

/**
 * 公司榜「公司」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 公司名。
 */
function companyNameOf(r: RankCompanyCellRow): string {
  return r.company
}

/**
 * 公司榜「公司」列的排序键。
 *
 * @param r 这一行展示行。
 * @returns 小写公司名。
 */
function companyNameSortOf(r: RankCompanyCellRow): string {
  return r.companySort
}

/**
 * 公司榜「省」列的排序键。
 *
 * @param r 这一行展示行。
 * @returns 省码;跨省雇主给 null。
 */
function companyProvSortOf(r: RankCompanyCellRow): string | null {
  return r.provSort
}

/**
 * 公司榜「LMIA 获批职位」列的排序键(#21:第一排序键上榜可见)。
 *
 * @param r 这一行展示行。
 * @returns 获批职位数;没有记录给 null。
 */
function companyLmiaSortOf(r: RankCompanyCellRow): number | null {
  return r.lmiaSort
}

/**
 * 公司榜「省提名清单岗」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 命中岗数文本。
 */
function companyNamedOf(r: RankCompanyCellRow): string {
  return r.namedText
}

/**
 * 公司榜「省提名清单岗」列的排序键。
 *
 * @param r 这一行展示行。
 * @returns 命中岗数;没有记录给 null。
 */
function companyNamedSortOf(r: RankCompanyCellRow): number | null {
  return r.namedSort
}

/**
 * 公司榜「在招」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 在招岗数文本。
 */
function companyOpenOf(r: RankCompanyCellRow): string {
  return r.openText
}

/**
 * 公司榜「在招」列的排序键。
 *
 * @param r 这一行展示行。
 * @returns 在招岗数;没有记录给 null。
 */
function companyOpenSortOf(r: RankCompanyCellRow): number | null {
  return r.openSort
}

/**
 * 公司榜「移民价值分」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 平均分文本。
 */
function companyAvgOf(r: RankCompanyCellRow): string {
  return r.avgText
}

/**
 * 公司榜「移民价值分」列的排序键。
 *
 * @param r 这一行展示行。
 * @returns 平均分;没算过给 null。
 */
function companyAvgSortOf(r: RankCompanyCellRow): number | null {
  return r.avgSort
}

/**
 * 洗一整页职位榜的事实行。
 *
 * @param x 本榜的行与取词函数。
 * @returns 展示行。
 */
export function toRankJobCellRows(x: CellRowsIn): RankJobCellRow[] {
  const out = []
  for (const r of x.items) {
    out.push(toRankJobCellRow({ r, t: x.t }))
  }
  return out
}

/**
 * 洗一行职位榜事实:地点拼成一格、通道与类别取三语显示名、缺数按表格/卡片各自的
 * 口径补横杠或留空,卡片页脚那句带标签的分数也在这里算好。
 *
 * @param x 这一行与取词函数。
 * @returns 展示行。
 */
export function toRankJobCellRow(x: JobCellRowIn): RankJobCellRow {
  const parts = []
  if (x.r.city !== TEXT_NONE) {
    parts.push(x.r.city)
  }
  if (x.r.province !== TEXT_NONE) {
    parts.push(x.r.province)
  }
  let pnpText = TEXT_NONE
  if (x.r.pnpStream !== TEXT_NONE) {
    pnpText = streamDisplay({ t: x.t, label: x.r.pnpStream })
  }
  let eeText = TEXT_NONE
  if (x.r.eeCategory !== TEXT_NONE) {
    eeText = eeDisplay({ t: x.t, label: x.r.eeCategory })
  }
  let footer = TEXT_NONE
  if (x.r.score != null) {
    footer = x.t('rank.col.score') + LABEL_GAP + String(x.r.score)
  }
  let salaryText = DASH_MARK
  if (x.r.salaryText !== TEXT_NONE) {
    salaryText = x.r.salaryText
  }
  return {
    key: String(x.r.rank),
    rankText: String(x.r.rank),
    rankMark: RANK_MARK + x.r.rank,
    rankSort: x.r.rank,
    title: x.r.title,
    titleSort: x.r.title.toLowerCase(),
    applyUrl: x.r.applyUrl,
    company: x.r.company,
    companySort: x.r.company.toLowerCase(),
    where: parts.join(LOC_SEP),
    citySort: emptyToNullOf(x.r.city),
    salaryText,
    cardSalary: x.r.salaryText,
    salarySort: x.r.salaryAnnual,
    pnp: { text: pnpText, cls: cssOf(css.small) },
    ee: { text: eeText, cls: cssOf(css.small) },
    scoreText: dashTextOf(x.r.score),
    scoreSort: x.r.score,
    dateText: ymd(x.r.datePosted),
    dateSort: emptyToNullOf(x.r.datePosted),
    cardFooter: footer,
  }
}

/**
 * 职位榜的列组:名次、职位、公司、城市、薪资、PNP、EE、移民价值分、发布时间。
 * #199(Frank「拆成两列」):PNP/EE 合并列拆成两列,与主表列名同源。
 *
 * @param x 取词函数。
 * @returns 列组。
 */
export function jobColsOf(x: ColsIn): RankCol<RankJobCellRow>[] {
  return [
    {
      key: COL_RANK_KEY,
      label: COL_RANK_LABEL,
      nowrap: true,
      className: cssOf(css.dim),
      sort: jobRankSortOf,
      render: jobRankOf,
    },
    { key: COL_TITLE_KEY, label: x.t('col.title'), sort: jobTitleSortOf, render: TitleCell },
    { key: COL_COMPANY_KEY, label: x.t('col.company'), sort: jobCompanySortOf, render: jobCompanyOf },
    { key: COL_CITY_KEY, label: x.t('col.city'), nowrap: true, sort: jobCitySortOf, render: jobWhereOf },
    {
      key: COL_SALARY_KEY,
      label: x.t('col.salary'),
      nowrap: true,
      className: cssOf(css.ok),
      sort: jobSalarySortOf,
      render: jobSalaryOf,
    },
    { key: COL_PNP_KEY, label: x.t('col.pnp'), render: PnpCell },
    { key: COL_EE_KEY, label: x.t('col.ee'), render: EeCell },
    {
      key: COL_SCORE_KEY,
      label: x.t('rank.col.score'),
      className: cssOf(css.strong),
      sort: jobScoreSortOf,
      render: jobScoreOf,
    },
    {
      key: COL_DATE_KEY,
      label: x.t('col.datePosted'),
      nowrap: true,
      className: cssOf(css.date),
      sort: jobDateSortOf,
      render: jobDateOf,
    },
  ]
}

/**
 * 职位榜的行身份。
 *
 * @param r 这一行展示行。
 * @returns 行键。
 */
export function jobRowKeyOf(r: RankJobCellRow): string {
  return r.key
}

/**
 * 职位榜「#」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 名次文本。
 */
function jobRankOf(r: RankJobCellRow): string {
  return r.rankText
}

/**
 * 职位榜「#」列的排序键。
 *
 * @param r 这一行展示行。
 * @returns 名次。
 */
function jobRankSortOf(r: RankJobCellRow): number {
  return r.rankSort
}

/**
 * 职位榜「职位」列的排序键。
 *
 * @param r 这一行展示行。
 * @returns 小写职位名。
 */
function jobTitleSortOf(r: RankJobCellRow): string {
  return r.titleSort
}

/**
 * 职位榜「公司」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 公司名。
 */
function jobCompanyOf(r: RankJobCellRow): string {
  return r.company
}

/**
 * 职位榜「公司」列的排序键。
 *
 * @param r 这一行展示行。
 * @returns 小写公司名。
 */
function jobCompanySortOf(r: RankJobCellRow): string {
  return r.companySort
}

/**
 * 职位榜「城市」列的取值(城市与省一格,缺哪段就少哪段)。
 *
 * @param r 这一行展示行。
 * @returns 地点。
 */
function jobWhereOf(r: RankJobCellRow): string {
  return r.where
}

/**
 * 职位榜「城市」列的排序键(按城市排 —— 看的是城市,排的也该是城市)。
 *
 * @param r 这一行展示行。
 * @returns 城市;没记城市给 null。
 */
function jobCitySortOf(r: RankJobCellRow): string | null {
  return r.citySort
}

/**
 * 职位榜「薪资」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 薪资原文;帖面没写时给横杠。
 */
function jobSalaryOf(r: RankJobCellRow): string {
  return r.salaryText
}

/**
 * 职位榜「薪资」列的排序键(年化 —— 时薪与年薪要排在同一把尺上)。
 *
 * @param r 这一行展示行。
 * @returns 年化薪资;折不出年薪给 null。
 */
function jobSalarySortOf(r: RankJobCellRow): number | null {
  return r.salarySort
}

/**
 * 职位榜「移民价值分」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 分数文本;没算过给横杠。
 */
function jobScoreOf(r: RankJobCellRow): string {
  return r.scoreText
}

/**
 * 职位榜「移民价值分」列的排序键。
 *
 * @param r 这一行展示行。
 * @returns 分数;没算过给 null。
 */
function jobScoreSortOf(r: RankJobCellRow): number | null {
  return r.scoreSort
}

/**
 * 职位榜「发布时间」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 纯日期。
 */
function jobDateOf(r: RankJobCellRow): string {
  return r.dateText
}

/**
 * 职位榜「发布时间」列的排序键。
 *
 * @param r 这一行展示行。
 * @returns 发布时间;没记日期给 null。
 */
function jobDateSortOf(r: RankJobCellRow): string | null {
  return r.dateSort
}

/**
 * 职位卡各插槽的值。缺席 = 那一格不渲(card 域的插槽契约就是「不传就不出」)——
 * 2026-08-11(Frank「都改成一套」)榜单职位卡改吃全站唯一那张 JobCard,
 * 槽位映射:#排名 → action(标题行右上),移民价值分 → footer(带标签)。
 *
 * @param r 这一行展示行。
 * @returns 职位卡各插槽的值。
 */
export function toRankJobCard(r: RankJobCellRow): RankJobCardParts {
  const title: RankCardLink = { text: r.title }
  if (r.applyUrl !== TEXT_NONE) {
    title.href = r.applyUrl
    title.target = TARGET_BLANK
  }
  const parts: RankJobCardParts = { title }
  if (r.company !== TEXT_NONE) {
    parts.company = { text: r.company }
  }
  if (r.cardSalary !== TEXT_NONE) {
    parts.salary = r.cardSalary
  }
  if (r.where !== TEXT_NONE) {
    parts.location = r.where
  }
  if (r.dateText !== TEXT_NONE) {
    parts.date = r.dateText
  }
  if (r.cardFooter !== TEXT_NONE) {
    parts.footer = r.cardFooter
  }
  return parts
}

/**
 * 榜单页交给 Next 的 SEO 主体(E5-02,PRD F8:SEO 主体 = generateMetadata)。
 * 固定两榜各有自己的一份;每日榜是一族,按大类拼。白名单外的 slug 一个键都不发 ——
 * 那条路的尽头是 404,发一个空标题反而把它渲成一个「有标题的错页」。
 *
 * @param x Next 传进来的路由段。
 * @returns 这一榜的 title 与 description。
 */
export async function rankingMetaOf(x: RankingMetaIn): Promise<RankingMeta> {
  const { slug } = await x.params
  const hit = RANK_META[slug]
  if (hit != null) {
    return { title: hit.title, description: hit.desc }
  }
  if (slug.startsWith(SLUG_DAILY)) {
    return dailyMetaOf(slug)
  }
  return {}
}

/**
 * 每日分类榜(E9-02)的 SEO 主体:slug 段 → 英文大类名 → 拼进 title 与 description。
 * 没收录英文大类名时退回不带大类的通用文案,不硬拼一个英文名。
 *
 * @param slug 榜 slug。
 * @returns 这一榜的 title 与 description。
 */
function dailyMetaOf(slug: string): RankingMeta {
  const code = slug.replace(SLUG_DAILY_HEAD, TEXT_NONE)
  let seg = META_SEG_PLAIN
  const cat = DAILY_META_EN[code]
  if (cat != null) {
    seg = cat + META_SEG_TAIL
  }
  return {
    title: META_DAILY_TITLE_HEAD + seg + META_DAILY_TITLE_TAIL,
    description: META_DAILY_DESC_HEAD + seg + META_DAILY_DESC_TAIL,
  }
}
