/**
 * peek 组件桶的常量:职位框 / 公司框的全站宿主(2026-10-09 N 批,Frank「一个全站宿主,并掉各页那 5 套」「别放到 advisor 吧」)。
 * 栈操作名与 modal 桶的弹框总线同值(各域自抄);层的种类与 advisor 渲染件同值(各域自抄)。
 *
 * @author Frank
 * @time 2026-10-09 06:00:00
 */

/**
 * 层的种类:职位框(与 advisor 的 LAYER_JOB 同值)。
 */
export const LAYER_JOB = 'job'

/**
 * 栈操作:叠上一层(与 modal 的 PEEK_PUSH 同值)。
 */
export const OP_PUSH = 'push'

/**
 * 栈操作:换掉最上面一层。
 */
export const OP_SWAP = 'swap'

/**
 * 栈操作:关掉最上面一层。
 */
export const OP_POP = 'pop'

/**
 * 栈操作:按职位号叠开职位框。
 */
export const OP_JOB_ID = 'jobId'

/**
 * 栈操作:全关。
 */
export const OP_CLEAR = 'clear'

/**
 * 按职位号取一整行的接口头(后接职位号;与 companies 的 URL_JOBS_ROW_HEAD 同值)。
 */
export const URL_JOB_ROW_HEAD = '/api/jobs/row?id='

/**
 * 职位页路径头(取不到整行时退去整页)。
 */
export const URL_JOB_HEAD = '/jobs/'

/**
 * 没有哪一页报职业名表时给的空表(公司页、雇主板、「我的」原先也传空表)。
 */
export const NOC_DESC_NONE = []

/**
 * 兜底分层态里的 Pro 到期日:没有(空串,同 toJobPlan)。
 */
export const PRO_UNTIL_NONE = ''
