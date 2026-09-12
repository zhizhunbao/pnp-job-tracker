/**
 * 城市详情页组件桶的函数(标题双行、概览行、行业分布与 DLI 名单的行列构造)。
 * 文案格式化四小件(千分位 / 年薪 / 时薪 / 百分比)本桶自带 —— 与把脉页 start 桶的同名格式化
 * 是复制(2026-09-12 记欠账:格式化件该收拢成通用叶,与 start 桶同批去重)。
 *
 * @author Frank
 * @time 2026-09-12 02:30:00
 */
import {
  CHANNEL_AIP, CHANNEL_SEP, CHECK_MARK, CITY_PAGE_UTM_TAIL, COL_GRAD, COL_IND, COL_NAME, COL_OPEN, COL_TYPE,
  COL_WAGE, COL_WAGE_H,
  CURRENCY_MARK, DASH_MARK, FACT_CHANNEL, FACT_NEW7, FACT_OPEN, FACT_POP, FACT_UNEMP, FACT_WAGE, HOURLY_DIGITS,
  KEY_IND_HEAD, LANG_KO, LANG_ZH, NUM_LOCALE,
  PCT_MARK, SPACE_SEP,
  TEXT_NONE, URL_HOME_CITY_HEAD,
} from './constants'
import type {
  CityTitleIn, CityTitleOut, FactRow, FactRowsIn, GroupColsIn, GroupRow, GroupRowsIn, LocalNameIn, SchoolColsIn,
  SchoolRow, SchoolRowsIn,
} from './types'
import type { Col } from '@/components/table'

/**
 * H1 双行:界面语言译名主文案 + 「英文名 省码」灰注(照城市显示约定;
 * 主文案已是英文时灰注只剩省码,免得同词说两遍)。
 *
 * @param x 城市基面与界面语言。
 * @returns 主文案与灰注。
 */
export function cityTitleOf(x: CityTitleIn): CityTitleOut {
  const main = localNameOf({ city: x.city.city, zh: x.city.cityZh, ko: x.city.cityKo, lang: x.lang })
  if (main === x.city.city) {
    return { main, note: x.city.province }
  }
  return { main, note: x.city.city + SPACE_SEP + x.city.province }
}

/**
 * 界面语言的城市名(译名缺席回英文名)。
 *
 * @param x 三名与语言。
 * @returns 主文案。
 */
function localNameOf(x: LocalNameIn): string {
  if (x.lang === LANG_ZH && x.zh !== TEXT_NONE) {
    return x.zh
  }
  if (x.lang === LANG_KO && x.ko !== TEXT_NONE) {
    return x.ko
  }
  return x.city
}

/**
 * 职位板按城市筛的地址(看岗位钮;来源标记与把脉页区分)。
 *
 * @param city 城英文名。
 * @returns 地址。
 */
export function cityJobsHrefOf(city: string): string {
  return URL_HOME_CITY_HEAD + encodeURIComponent(city) + CITY_PAGE_UTM_TAIL
}

/**
 * 概览行清单(在招 / 近 7 天 / 中位年薪 / 人口 / 失业率 / 专属通道;缺格显杠不空行 ——
 * 概览行数固定,读者两城对照时格子对格子)。
 *
 * @param x 取词函数、城市基面与试点通道名。
 * @returns 概览行。
 */
export function factRowsOf(x: FactRowsIn): FactRow[] {
  return [
    { key: FACT_OPEN, label: x.t('stats.openJobs'), value: numOrDashOf(x.city.openJobs) },
    { key: FACT_NEW7, label: x.t('stats.new7d'), value: numOrDashOf(x.city.new7d) },
    { key: FACT_WAGE, label: x.t('pulse.city.wage'), value: wageOrDashOf(x.city.medianWageAnnual) },
    { key: FACT_POP, label: x.t('pulse.city.pop'), value: numOrDashOf(x.city.population) },
    { key: FACT_UNEMP, label: x.t('pulse.city.unemp'), value: pctOrDashOf(x.city.unempRate) },
    { key: FACT_CHANNEL, label: x.t('city.channel'), value: channelTextOf(x) },
  ]
}

/**
 * 专属通道值:试点通道名 + AIP(有 AIP 在招岗即算)按顿号拼;都没有显杠。
 *
 * @param x 城市基面与试点通道名。
 * @returns 通道文案。
 */
function channelTextOf(x: FactRowsIn): string {
  const parts: string[] = []
  for (const p of x.pilotTypes) {
    parts.push(p)
  }
  if (x.city.aipJobs != null && x.city.aipJobs > 0) {
    parts.push(CHANNEL_AIP)
  }
  if (parts.length === 0) {
    return DASH_MARK
  }
  return parts.join(CHANNEL_SEP)
}

/**
 * 行业分布表的行(一组一行,按在招降序;组名照把脉页同词)。
 *
 * @param x 取词函数与组行。
 * @returns 展示行。
 */
export function groupRowsOf(x: GroupRowsIn): GroupRow[] {
  const out: GroupRow[] = []
  for (const g of x.groups) {
    out.push({
      key: g.broad,
      label: x.t(KEY_IND_HEAD + g.broad),
      n: g.n,
      nText: numOrDashOf(g.n),
      hourlyText: hourlyOrDashOf(g.hourly),
      wageText: wageOrDashOf(g.wage),
    })
  }
  out.sort(byGroupOpenDesc)
  return out
}

/**
 * 行业分布的行序:在招降序。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 比较值。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byGroupOpenDesc(a: GroupRow, b: GroupRow): number {
  return b.n - a.n
}

/**
 * 行业分布表的列(行业 / 在招 / 中位时薪 / 中位年薪)。
 *
 * @param x 取词函数。
 * @returns 列声明。
 */
export function groupColsOf(x: GroupColsIn): Col<GroupRow>[] {
  return [
    { key: COL_IND, label: x.t('city.byIndCol'), sort: groupLabelOf, render: groupLabelOf },
    { key: COL_OPEN, label: x.t('pulse.city.open'), nowrap: true, sort: groupOpenSortOf, render: groupOpenTextOf },
    { key: COL_WAGE_H, label: x.t('pulse.city.wageH'), nowrap: true, render: groupHourlyTextOf },
    { key: COL_WAGE, label: x.t('pulse.city.wage'), nowrap: true, render: groupWageTextOf },
  ]
}

/**
 * 行业分布行的组名(排序键与格文案同源)。
 *
 * @param r 一行。
 * @returns 组名。
 */
function groupLabelOf(r: GroupRow): string {
  return r.label
}

/**
 * 行业分布在招排序键。
 *
 * @param r 一行。
 * @returns 在招数。
 */
function groupOpenSortOf(r: GroupRow): number {
  return r.n
}

/**
 * 行业分布在招格文案。
 *
 * @param r 一行。
 * @returns 千分位数字。
 */
function groupOpenTextOf(r: GroupRow): string {
  return r.nText
}

/**
 * 行业分布中位时薪格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
function groupHourlyTextOf(r: GroupRow): string {
  return r.hourlyText
}

/**
 * 行业分布中位年薪格文案。
 *
 * @param r 一行。
 * @returns 文案。
 */
function groupWageTextOf(r: GroupRow): string {
  return r.wageText
}

/**
 * 行业分布行身份。
 *
 * @param r 一行。
 * @returns 组键。
 */
export function groupRowKeyOf(r: GroupRow): string {
  return r.key
}

/**
 * DLI 名单表的行(公立在前的库序照抄;类型与工签格文案化)。
 *
 * @param x 取词函数与名单。
 * @returns 展示行。
 */
export function schoolRowsOf(x: SchoolRowsIn): SchoolRow[] {
  const out: SchoolRow[] = []
  for (const s of x.schools) {
    let typeText = x.t('city.priv')
    if (s.isPublic) {
      typeText = x.t('city.pub')
    }
    let gradText = DASH_MARK
    if (s.gradProgram) {
      gradText = CHECK_MARK
    }
    out.push({ key: s.name, name: s.name, typeText, gradText })
  }
  return out
}

/**
 * DLI 名单表的列(院校 / 类型 / 可申工签)。
 *
 * @param x 取词函数。
 * @returns 列声明。
 */
export function schoolColsOf(x: SchoolColsIn): Col<SchoolRow>[] {
  return [
    { key: COL_NAME, label: x.t('city.school'), sort: schoolNameOf, render: schoolNameOf },
    { key: COL_TYPE, label: x.t('city.schoolType'), nowrap: true, sort: schoolTypeOf, render: schoolTypeOf },
    { key: COL_GRAD, label: x.t('pulse.city.dliGrad'), nowrap: true, render: schoolGradOf },
  ]
}

/**
 * DLI 行的院校名(排序键与格文案同源)。
 *
 * @param r 一行。
 * @returns 院校名。
 */
function schoolNameOf(r: SchoolRow): string {
  return r.name
}

/**
 * DLI 行的类型文案。
 *
 * @param r 一行。
 * @returns 公立 / 私立。
 */
function schoolTypeOf(r: SchoolRow): string {
  return r.typeText
}

/**
 * DLI 行的工签格文案。
 *
 * @param r 一行。
 * @returns 勾 / 杠。
 */
function schoolGradOf(r: SchoolRow): string {
  return r.gradText
}

/**
 * DLI 行身份。
 *
 * @param r 一行。
 * @returns 院校名。
 */
export function schoolRowKeyOf(r: SchoolRow): string {
  return r.key
}

/**
 * 千分位整数;没有显杠。
 *
 * @param n 数;没有 null。
 * @returns 文案。
 */
function numOrDashOf(n: number | null): string {
  if (n == null) {
    return DASH_MARK
  }
  return n.toLocaleString(NUM_LOCALE)
}

/**
 * 年薪(币记 + 千分位);没有显杠。
 *
 * @param n 年薪;没有 null。
 * @returns 文案。
 */
function wageOrDashOf(n: number | null): string {
  if (n == null) {
    return DASH_MARK
  }
  return CURRENCY_MARK + n.toLocaleString(NUM_LOCALE)
}

/**
 * 时薪(币记 + 两位小数);没有显杠。
 *
 * @param n 时薪;没有 null。
 * @returns 文案。
 */
function hourlyOrDashOf(n: number | null): string {
  if (n == null) {
    return DASH_MARK
  }
  return CURRENCY_MARK + n.toFixed(HOURLY_DIGITS)
}

/**
 * 百分比(一位小数 + 百分号);没有显杠。
 *
 * @param n 百分点数;没有 null。
 * @returns 文案。
 */
function pctOrDashOf(n: number | null): string {
  if (n == null) {
    return DASH_MARK
  }
  return n.toFixed(1) + PCT_MARK
}

