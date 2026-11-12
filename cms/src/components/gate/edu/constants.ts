/**
 * gate 桶子桶 edu 的常量:教育经历一段的格名、三只下拉的选项与词条键前缀、明细的上限与年份写法、按名称与年份推时长的规矩。
 * 2026-11-12 按「大于 1000 就拆子桶」(样张 apply/letter):gate 的 functions.ts 贴线,切出教育经历几段这一族;
 * 与父桶同名的几枚同值、各自抄(子桶不取父桶),只有本子桶在用的(连接符、年份写法、明细条数上限、选项字前缀)自父桶搬来。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */

/**
 * 没选 / 没填的空文本(同父桶 TEXT_NONE)。
 */
export const TEXT_NONE = ''

/**
 * 教育经历「院校所在地」的选项:十省码 + 国外(同父桶 EDU_PROVS,也同 lib/quiz EDU_KEY_RE 的第一格)。
 */
export const EDU_PROVS: string[] = ['ON', 'QC', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE', 'abroad']

/**
 * 院校所在地「国外」的值。
 */
export const EDU_ABROAD = 'abroad'

/**
 * 教育经历「公立或私立」的选项(同父桶 EDU_KINDS)。
 */
export const EDU_KINDS: string[] = ['public', 'private']

/**
 * 教育经历「课程时长」的选项(短到长;同父桶 EDU_LENS)。
 */
export const EDU_LENS: string[] = ['y1', 'y2', 'y3', 'master']

/**
 * 课程时长:一年以内。
 */
export const EDU_LEN_Y1 = 'y1'

/**
 * 课程时长:两年。
 */
export const EDU_LEN_Y2 = 'y2'

/**
 * 课程时长:三年及以上。
 */
export const EDU_LEN_Y3 = 'y3'

/**
 * 课程时长:硕士及以上。
 */
export const EDU_LEN_MASTER = 'master'

/**
 * 证书或学历名称里说明是硕士及以上的整词(不分大小写;2026-11-12 Frank「简历里能抽出来吧」,手填名称时替他推时长用)。
 */
export const EDU_MASTER_RE = /\b(?:masters?|mba|ph\.?d|doctor|doctorate)\b/i

/**
 * 起止年份相差至多几年算「一年以内」(同一年入学毕业差 0,跨年的一年制差 1)。
 */
export const EDU_SPAN_Y1 = 1

/**
 * 起止年份相差几年算「两年」(再多 = 三年及以上)。
 */
export const EDU_SPAN_Y2 = 2

/**
 * 答案档里一段教育经历三格的连接符(「ON.public.y1」;同 10-11 资讯页地址栏的写法)。
 */
export const EDU_SEP = '.'

/**
 * 教育经历一段的三格名:院校所在地。
 */
export const EDU_F_PROV = 'prov'

/**
 * 教育经历一段的三格名:公立或私立。
 */
export const EDU_F_KIND = 'kind'

/**
 * 教育经历一段的三格名:课程时长。
 */
export const EDU_F_LEN = 'len'

/**
 * 教育经历一段的明细格名(2026-11-12 Frank「这部分不能直接显示具体的年份和学历 证书吗?」):证书或学历名称。
 */
export const EDU_F_CRED = 'cred'

/**
 * 教育经历一段的明细格名:学校。
 */
export const EDU_F_SCHOOL = 'school'

/**
 * 教育经历一段的明细格名:开始年份。
 */
export const EDU_F_FROM = 'from'

/**
 * 教育经历一段的明细格名:结束年份。
 */
export const EDU_F_TO = 'to'

/**
 * 答案档里教育经历明细至多几条(同 lib/quiz EDU_LIST_MAX;「+ 再加一段」仍到 EDU_ROWS_MAX 为止,多出来的只会来自「从简历填写」)。
 */
export const EDU_LIST_MAX = 6

/**
 * 证书或学历名称至多几个字(同 lib/quiz)。
 */
export const EDU_CRED_LEN = 80

/**
 * 学校名至多几个字(同 lib/quiz)。
 */
export const EDU_SCHOOL_LEN = 120

/**
 * 年份几位数字。
 */
export const EDU_YEAR_LEN = 4

/**
 * 年份:四位数字(不是的存档时清空)。
 */
export const EDU_YEAR_RE = /^\d{4}$/

/**
 * 年份输入框里要去掉的字:数字以外的。
 */
export const EDU_NON_DIGIT_RE = /\D/g

/**
 * 「公立 / 私立」词条键的前缀。
 */
export const K_KIND_HEAD = 'fit.kind.'

/**
 * 「课程时长」词条键的前缀。
 */
export const K_LEN_HEAD = 'fit.len.'

/**
 * 省码 → 省名词条键的前缀(同父桶 GATE_PROV_OPTS 的 pr.XX)。
 */
export const K_PROV_HEAD = 'pr.'

/**
 * 「加拿大境外」的词条键(院校所在地选「国外」时出这个词;同父桶 GATE_ABROAD_KEY)。
 */
export const GATE_ABROAD_KEY = 'gate.abroad'
