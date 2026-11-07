/**
 * 生成简历域的常量 —— 草稿各格的长度上限、英文简历的版式词(分区标题、月份、Present)、PDF 版面尺寸。
 * 内容与分区照 Job Bank Resume Builder 的传统模板(2026-11-07 Frank「以后都按这个来」:内容照领域权威,界面照微软)。
 *
 * @author Frank
 * @time 2026-11-07 15:00:00
 */

// =========================================================================
// 1. 草稿
// =========================================================================

/**
 * 单行格(职位名、雇主、城市、邮箱……)最长几个字。
 */
export const CV_LINE_MAX = 120

/**
 * 多行格(工作描述、简介、技能)最长几个字(Job Bank 描述框 4,000)。
 */
export const CV_TEXT_MAX = 4000

/**
 * 每个分区最多几条。
 */
export const CV_ITEMS_MAX = 20

/**
 * 年份:四位数字。
 */
export const YEAR_RE = /^\d{4}$/

/**
 * 月份下限。
 */
export const MONTH_MIN = 1

/**
 * 月份上限。
 */
export const MONTH_MAX = 12

/**
 * 空串:格子没填。
 */
export const TEXT_NONE = ''

/**
 * 日期写法:起止(工作、教育、志愿)。
 */
export const KIND_RANGE = 'range'

/**
 * 日期写法:一个时间(证书、奖项)。
 */
export const KIND_ONE = 'one'

/**
 * 日期写法:不写(自定义分区)。
 */
export const KIND_NONE = 'none'

// =========================================================================
// 2. 版式
// =========================================================================

/**
 * 分区标题:个人简介。
 */
export const HEAD_SUMMARY = 'PROFESSIONAL SUMMARY'

/**
 * 分区标题:工作经历。
 */
export const HEAD_WORK = 'WORK EXPERIENCE'

/**
 * 分区标题:教育经历。
 */
export const HEAD_EDU = 'EDUCATION'

/**
 * 分区标题:技能。
 */
export const HEAD_SKILLS = 'SKILLS'

/**
 * 分区标题:证书执照。
 */
export const HEAD_CREDS = 'PROFESSIONAL CREDENTIALS'

/**
 * 分区标题:志愿经历。
 */
export const HEAD_VOLUNTEER = 'VOLUNTEER WORK'

/**
 * 分区标题:奖项荣誉。
 */
export const HEAD_AWARDS = 'AWARDS AND HONOURS'

/**
 * 英文月份缩写(下标 0 = 一月)。
 */
export const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * 「至今」的英文。
 */
export const PRESENT = 'Present'

/**
 * 起止之间。
 */
export const DATE_SEP = ' - '

/**
 * 月份与年份之间。
 */
export const MONTH_YEAR_SEP = ' '

/**
 * 雇主与地点之间。
 */
export const SUB_SEP = ' \u2022 '

/**
 * 城市与省份(国家)之间。
 */
export const PLACE_SEP = ', '

/**
 * 多行格一行一条。
 */
export const LINE_SEP = '\n'

/**
 * 行首的要点记号(用户自己打的 - * \u2022 或中点),去掉后这一行按要点排。
 */
export const BULLET_RE = /^[-*\u2022\u00b7]\s*/

// =========================================================================
// 3. PDF
// =========================================================================

/**
 * Letter 纸宽(pt)。
 */
export const PAGE_W = 612

/**
 * Letter 纸高(pt)。
 */
export const PAGE_H = 792

/**
 * 四边边距(pt;四分之三英寸)。
 */
export const MARGIN = 54

/**
 * 姓名字号。
 */
export const NAME_SIZE = 18

/**
 * 姓名行高。
 */
export const NAME_H = 26

/**
 * 联系方式字号。
 */
export const CONTACT_SIZE = 10

/**
 * 联系方式行高。
 */
export const CONTACT_H = 13

/**
 * 分区标题字号。
 */
export const HEAD_SIZE = 11

/**
 * 分区标题行高(含上方留白)。
 */
export const HEAD_H = 24

/**
 * 分区标题下横线那一行的高。
 */
export const RULE_H = 6

/**
 * 横线粗细(pt)。
 */
export const RULE_W = 0.75

/**
 * 条目标题字号。
 */
export const TITLE_SIZE = 10.5

/**
 * 正文字号(起止、雇主、要点)。
 */
export const BODY_SIZE = 10

/**
 * 正文行高。
 */
export const BODY_H = 13.5

/**
 * 条目之间的留白。
 */
export const ITEM_GAP = 6

/**
 * 分区标题与下一行要一起放下的高(不让标题孤零零落在页底)。
 */
export const HEAD_KEEP = 34

/**
 * 要点记号。
 */
export const BULLET = '\u2022'

/**
 * 要点记号离版心左缘多远。
 */
export const BULLET_X = 4

/**
 * 要点正文离版心左缘多远。
 */
export const BULLET_TEXT_X = 14

/**
 * 条目标题与右端起止之间至少留多宽。
 */
export const DATE_GAP = 12

/**
 * 字的基线比行底高多少(pt)。
 */
export const BASE_LIFT = 3

/**
 * 雇主、地点那一行的灰度(0 黑 1 白)。
 */
export const GRAY = 0.38

/**
 * 黑字的灰度。
 */
export const INK = 0

/**
 * 居中时左右各占一半。
 */
export const HALF = 2
