/**
 * 城市详情页组件桶的死值(2026-09-12 批三首件:/city/[prov]/[city] 一城一页;
 * Frank「不用出效果图 你觉得应该出什么」→ 概览 + 行业分布 + 通道 + DLI 名单四块,
 * 骨架照职位详情页规:Shell 套壳 + 右上返回 + H1 + 白卡)。
 *
 * @author Frank
 * @time 2026-09-12 02:30:00
 */

/**
 * 返回钮的兜底落点(把脉页城市段锚)。
 */
export const URL_BACK = '/start#pl-city'

/**
 * 壳的顶距(照公司详情页)。
 */
export const SHELL_TOP = 14

/**
 * 职位板按城市筛的地址头(看岗位钮;与把脉页城市段同形,来源标记区分)。
 */
export const URL_HOME_CITY_HEAD = '/?city='

/**
 * 城市详情页看岗位钮的来源标记。
 */
export const CITY_PAGE_UTM_TAIL = '&utm_source=city_page'

/**
 * 空文案。
 */
export const TEXT_NONE = ''

/**
 * 缺格显示的杠。
 */
export const DASH_MARK = '—'

/**
 * 通道值的枚举分隔(顿号 —— 站规:枚举用顿号)。
 */
export const CHANNEL_SEP = '、'

/**
 * AIP 通道名(cities 快照没有 AIP 打标列,凑通道值时按 aipJobs > 0 补这个名)。
 */
export const CHANNEL_AIP = 'AIP'

/**
 * 千分位的地区码。
 */
export const NUM_LOCALE = 'en-CA'

/**
 * 金额前缀。
 */
export const CURRENCY_MARK = '$'

/**
 * 百分号。
 */
export const PCT_MARK = '%'

/**
 * DLI 表毕业可申工签格的勾。
 */
export const CHECK_MARK = '✓'

/**
 * 时薪文案的小数位。
 */
export const HOURLY_DIGITS = 2

/**
 * 行业组名的 i18n 键头(与把脉页四段同一份词条;键头常量各域自抄)。
 */
export const KEY_IND_HEAD = 'pulse.ind.'

/**
 * H1 灰注里「英文名 省码」的空格连接符。
 */
export const SPACE_SEP = ' '

/**
 * 界面语言字面量:中文(三字面量各域自抄)。
 */
export const LANG_ZH = 'zh'

/**
 * 界面语言字面量:韩文。
 */
export const LANG_KO = 'ko'

/**
 * 概览行键:在招。
 */
export const FACT_OPEN = 'open'

/**
 * 概览行键:近 7 天发布。
 */
export const FACT_NEW7 = 'new7'

/**
 * 概览行键:中位年薪。
 */
export const FACT_WAGE = 'wage'

/**
 * 概览行键:人口。
 */
export const FACT_POP = 'pop'

/**
 * 概览行键:失业率。
 */
export const FACT_UNEMP = 'unemp'

/**
 * 概览行键:专属通道。
 */
export const FACT_CHANNEL = 'channel'

/**
 * 行业分布列键:行业。
 */
export const COL_IND = 'ind'

/**
 * 行业分布/DLI 表列键:在招。
 */
export const COL_OPEN = 'open'

/**
 * 行业分布列键:中位时薪。
 */
export const COL_WAGE_H = 'wageH'

/**
 * 行业分布列键:中位年薪。
 */
export const COL_WAGE = 'wage'

/**
 * DLI 表列键:院校名。
 */
export const COL_NAME = 'name'

/**
 * DLI 表列键:类型。
 */
export const COL_TYPE = 'type'

/**
 * DLI 表列键:毕业可申工签。
 */
export const COL_GRAD = 'grad'
