/**
 * gate 桶子桶 work 的常量:工作经历一段的格名、各格的上限、年月的写法与摘要里的连接符。
 * 2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,能搜索的就弹框搜索」:「做过的工作」从一串职业码改成一段一个框
 * (职业、职位名称、公司、城市、起止年月、做了什么);子桶不取父桶,同名的几枚各自抄。
 *
 * @author Frank
 * @time 2026-11-12 16:00:00
 */

/**
 * 没选 / 没填的空文本(同父桶 TEXT_NONE)。
 */
export const TEXT_NONE = ''

/**
 * 工作经历至多几段(同 lib/quiz CV_WORK_MAX)。
 */
export const WORK_ROWS_MAX = 8

/**
 * 一行字的格(职位名称、公司、城市)至多几个字(同 lib/quiz CV_LINE_LEN)。
 */
export const WORK_LINE_LEN = 120

/**
 * 「做了什么」至多几个字(同 lib/quiz CV_TEXT_LEN)。
 */
export const WORK_DESC_LEN = 2000

/**
 * 一段至多挂几个职业码(同 lib/quiz CV_NOCS_MAX;同一个职业在分类里至多这么多码)。选职业框里一次点上来的码比它多
 * (点了「全选」),不是在选一个职业,这一下不算。
 */
export const WORK_NOCS_MAX = 6

/**
 * 年月输入框至多几个字(2021-03)。
 */
export const WORK_YM_LEN = 7

/**
 * 年月输入框里不许出现的字:数字和连字符以外的。
 */
export const WORK_YM_BAD_RE = /[^\d-]/g

/**
 * 存档时的年月:四位年份,可带两位月份(同 lib/quiz CV_YM_RE)。
 */
export const WORK_YM_RE = /^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/

/**
 * 格名:职位名称。
 */
export const WORK_F_TITLE = 'title'

/**
 * 格名:公司。
 */
export const WORK_F_ORG = 'org'

/**
 * 格名:城市。
 */
export const WORK_F_CITY = 'city'

/**
 * 格名:开始年月。
 */
export const WORK_F_FROM = 'from'

/**
 * 格名:结束年月。
 */
export const WORK_F_TO = 'to'

/**
 * 格名:做了什么。
 */
export const WORK_F_DESC = 'desc'

/**
 * 没在选职业(选职业框关着)时「正在给第几段选」的值。
 */
export const WORK_AT_NONE = -1

/**
 * 摘要一行里各样之间的连接符。
 */
export const WORK_SUM_SEP = ', '

/**
 * 摘要里起止年月之间的连接符。
 */
export const WORK_YM_SEP = '–'

/**
 * 词条键:结束年月空着时摘要里写的「至今」。
 */
export const K_WORK_NOW = 'pf.w.now'

/**
 * 摘要里职业名字还没取到时的占位(同父桶 FORM_NAME_WAIT)。
 */
export const WORK_NAME_WAIT = '…'
