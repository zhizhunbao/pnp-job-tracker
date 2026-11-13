/**
 * gate 桶子桶 school 的常量:教育经历那一段「搜学校」的接口地址、起搜字数、防抖与选项取值。
 * 2026-11-12:学校那一格边打字边搜指定院校名单,选中后带出所在省与公立私立。子桶不取父桶,同名的几枚各自抄。
 *
 * @author Frank
 * @time 2026-11-12 19:30:00
 */

/**
 * 没有 / 没填的空文本。
 */
export const TEXT_NONE = ''

/**
 * 搜学校接口(lib/quiz 的 quizSchoolsRoute),后接检索词。
 */
export const URL_SCHOOLS = '/api/quiz/schools?q='

/**
 * 检索词至少几个字才搜(同服务端 SCHOOL_Q_MIN)。
 */
export const SCHOOL_Q_MIN = 2

/**
 * 停手多久才发请求(毫秒)。
 */
export const SCHOOL_DEBOUNCE_MS = 250

/**
 * 没在搜(没有哪一段的学校格在打字)时「正在搜第几段」的值。
 */
export const SCHOOL_AT_NONE = -1

/**
 * 教育经历「院校所在地」下拉认的省码(同父桶 EDU_PROVS 去掉国外;名单里的地区不在其中,选中时所在地不动)。
 */
export const SCHOOL_PROVS: string[] = ['ON', 'QC', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE']

/**
 * 「公立或私立」下拉的取值:公立。
 */
export const KIND_PUBLIC = 'public'

/**
 * 「公立或私立」下拉的取值:私立。
 */
export const KIND_PRIVATE = 'private'

/**
 * 学校名至多几个字(同父桶 EDU_SCHOOL_LEN)。
 */
export const SCHOOL_LEN = 120

/**
 * 界面语:中文(这时候结果行的灰字出中文译名)。
 */
export const LANG_ZH = 'zh'

/**
 * 词条键前缀:公立 / 私立(后接取值)。
 */
export const K_KIND_HEAD = 'fit.kind.'

/**
 * 结果行灰字里各样之间的连接符。
 */
export const SUB_SEP = ', '
