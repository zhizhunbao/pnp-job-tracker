/**
 * coop 组件域的常量(校内板页 /coop;2026-09-13 立域,设计稿 docs/design/coop域-20260913.md 第五轮)。
 * Frank 定形:一级导航「校内板」,单校无 tab,表照职位板形态只留六列,手机卡形照雇主板。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */

/**
 * 页面 SEO 头(静态 B 形,门里一行转发)。
 */
export const COOP_META = {
  /**
   * 标签页标题。
   */
  title: '校内板 Campus board | Offer2PR',

  /**
   * 搜索摘要。
   */
  description: 'Algonquin College HireAC 校内岗位板在招帖:雇主、城市、工时,每日更新。',
}

/**
 * 图版配色档(与职位板同档:校内板是职位板的姊妹面)。
 */
export const BANNER_MODULE = 'jobs'

/**
 * 壳上留白(照雇主板)。
 */
export const SHELL_TOP_PX = 16

/**
 * 壳下留白(照雇主板)。
 */
export const SHELL_BOTTOM_PX = 40

/**
 * 表每页行数(职位板同档)。
 */
export const PAGE_SIZE = 20

/**
 * 学校名(副题主文案;首校 Algonquin,加校再谈按校分表)。
 */
export const SCHOOL_NAME = 'Algonquin College'

/**
 * 校内板系统名(副题)。
 */
export const BOARD_NAME = 'HireAC'

/**
 * 详情页路由前缀(校内帖也在 jobs 表,落职位详情页)。
 */
export const DETAIL_PATH = '/jobs/'

/**
 * 工时词的词条前缀(职位板同一份:emp.full / emp.part)。
 */
export const K_EMP = 'emp.'

/**
 * 表格操作小钮走 button 桶的 mini 档(与职位板 / 雇主板操作列同一颗钮)。
 */
export const MINI_BTN_KIND = 'mini'

/**
 * 城市与省码之间的空格(紧凑格「Ottawa ON」)。
 */
export const CITY_SEP = ' '

/**
 * 空串(没值的格)。
 */
export const TEXT_NONE = ''

/**
 * 列身份:发布时间。
 */
export const COL_DATE = 'datePosted'

/**
 * 列身份:雇主。
 */
export const COL_COMPANY = 'company'

/**
 * 列身份:职位。
 */
export const COL_TITLE = 'title'

/**
 * 列身份:市。
 */
export const COL_CITY = 'city'

/**
 * 列身份:工时。
 */
export const COL_HOURS = 'empHours'

/**
 * 列身份:操作。
 */
export const COL_ACTS = 'actions'
