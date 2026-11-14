/**
 * gate 桶子桶 fill 的常量:把档案里空着的格子自动填上(从简历填写、传简历后自己填、投出后补两格)要的接口地址、
 * 标记字段、提示词条、页面事件名与埋点取值。
 * 2026-11-13 Frank「别等一周啊 都做完」:子桶不取父桶,要用的常量各自抄;「从简历填写」独用的那几枚
 * (接口地址、错误码词条、什么也没填上的词条)自父桶 constants 原样搬来。
 *
 * @author Frank
 * @time 2026-11-13 21:00:00
 */

/**
 * 空串:没填、没有。
 */
export const TEXT_NONE = ''

/**
 * 从简历提取档案建议的接口(2026-11-09「我的」第一批)。
 */
export const URL_PREFILL = '/api/resume/prefill'

/**
 * POST。
 */
export const METHOD_POST = 'POST'

/**
 * 带 cookie 发请求。
 */
export const CRED_INCLUDE = 'include'

/**
 * 来自简历标记里字段与值的分隔(同父桶 FROM_SEP)。
 */
export const FROM_SEP = ':'

/**
 * 来自简历标记的字段:做过的工作(同父桶 FROM_WORK)。
 */
export const FROM_WORK = 'workNocs'

/**
 * 来自简历标记的字段:专业(同父桶 FROM_MAJORS)。
 */
export const FROM_MAJORS = 'majors'

/**
 * 来自简历标记的字段:英文姓名(同父桶 FROM_NAME)。
 */
export const FROM_NAME = 'name'

/**
 * 接口错误码 → 提示词条。
 */
export const FILL_ERR_KEYS: Record<string, string> = {
  /**
   * 还没有简历。
   */
  noResume: 'pf.fillNoResume',

  /**
   * 扫描件。
   */
  scan: 'pf.fillScan',

  /**
   * 文件读不出。
   */
  parse: 'pf.fillParse',

  /**
   * 超过每日次数。
   */
  limit: 'pf.fillLimit',
}

/**
 * 其余失败(模型层、网络)的提示词条。
 */
export const FILL_ERR_DEFAULT = 'pf.fillLlm'

/**
 * 什么也没填上的提示词条。
 */
export const FILL_NONE_KEY = 'pf.fillNone'

/**
 * 提示:普通的颜色(同父桶 FILL_KIND_INFO)。
 */
export const FILL_KIND_INFO = 'info'

/**
 * 提示:失败的颜色(同父桶 FILL_KIND_ERR)。
 */
export const FILL_KIND_ERR = 'err'

/**
 * 简历上传成了的页面事件名(「我的」页基础简历卡上传或替换成功后发,同 me 桶子桶 base 的 EV_UPLOADED)。
 */
export const EV_UPLOADED = 'o2p-resume-uploaded'

/**
 * 投递框里传简历成了的页面事件名(同 apply 桶的 EV_UPLOADED;另起一个名字,「我的档案」听上一个会开修改面板,投递中不该弹)。
 */
export const EV_UPLOADED_APPLY = 'o2p-apply-resume-uploaded'

/**
 * 后台把档案填好并存成了的页面事件名(2026-11-14 Frank「都改成自动点击 但是可以修改」:档案页听它重取档案,正文当场换新;
 * 用户想改照旧点「修改」)。
 */
export const EV_AUTO_DONE = 'o2p-profile-auto'

/**
 * 「投递发出去了」的页面事件名(同 apply 桶的 EV_APPLY_SENT)。
 */
export const EV_APPLY_SENT = 'offer2pr:apply-sent'

/**
 * 传简历后自己读的那一份提取结果留给修改面板用多久(毫秒):「我的档案」页传完简历会开修改面板并自动从简历填写,
 * 它在这段时间里点到就用同一份,不再读第二遍。
 */
export const PREFILL_HOLD_MS = 120000

/**
 * 职业码的样子(NOC 2021 五位数字);不是这样的不往「想做的工作」里填。
 */
export const NOC_RE = /^\d{5}$/

/**
 * 档案自动填写的埋点事件名(lib/funnel 第一方白名单里有它)。
 */
export const TRACK_AUTO = 'profile-auto'

/**
 * 埋点取值:读简历后填上了至少一项并存成。
 */
export const AUTO_RESUME_OK = 'resume-ok'

/**
 * 埋点取值:读成了但没有空格可填。
 */
export const AUTO_RESUME_NONE = 'resume-none'

/**
 * 埋点取值:读简历或保存失败。
 */
export const AUTO_RESUME_FAIL = 'resume-fail'

/**
 * 埋点取值:投出后补上了想做的工作或省份并存成。
 */
export const AUTO_APPLY_OK = 'apply-ok'

/**
 * 留痕里说哪一步没成:提取接口回了错(后面接错误码与状态码)。
 */
export const AUTO_AT_PREFILL = 'prefill '

/**
 * 留痕里说哪一步没成:档案没取到。
 */
export const AUTO_AT_SEED = 'profile not loaded'

/**
 * 留痕里说哪一步没成:答案档没推上去。
 */
export const AUTO_AT_SAVE = 'answers not saved'

/**
 * 留痕里错误码与状态码之间的分隔。
 */
export const AUTO_LOG_SEP = ' '
