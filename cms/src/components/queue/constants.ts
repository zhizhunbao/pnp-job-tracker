/**
 * queue 组件桶(「今日待投」:智能投递队列的审核区,照 AIApply 的 Quick Review)的死值。
 * 2026-10-08 Frank「找一个最好的直接抄」:一次一岗,投出 / 跳过 / 改信;Pro 一颗「全部投出」;头上「智能投递」开关。
 * 数据口 lib/queue(/api/queue、/api/queue/prefs、/api/queue/decline),发出走 lib/apply 的 /api/apply/send。
 *
 * @author Frank
 * @time 2026-10-08 15:00:00
 */

/**
 * 队列接口(GET:队列 + 开关 + 条件齐不齐)。
 */
export const URL_QUEUE = '/api/queue'

/**
 * 开关接口(PATCH { autoQueue })。
 */
export const URL_PREFS = '/api/queue/prefs'

/**
 * 代发接口(POST { jobId };队列里的行也能直接发)。
 */
export const URL_SEND = '/api/apply/send'

/**
 * 职位页地址头(卡上职位名链去)。
 */
export const URL_JOB_HEAD = '/jobs/'

/**
 * 没答「想做的工作」时引去答题的地址(答完按 next 回「我的求职」;问卷域认 next)。
 */
export const URL_QUIZ = '/plan/pr?quiz=1&next=%2Faccount%3Fsec%3Dsjobs'

/**
 * 改信接口(PATCH { jobId, cover })。
 */
export const URL_COVER = '/api/queue/cover'

/**
 * 偏好接口里英文署名那一格。
 */
export const FIELD_NAME = 'senderName'

/**
 * 上传简历的接口(同「我的简历」;PUT 不带 id = 新加一份)。
 */
export const URL_RESUME_FILE = '/api/resume/file'

/**
 * 上传表单里文件那一格的名字。
 */
export const FIELD_FILE = 'file'

/**
 * 上传请求的方法。
 */
export const METHOD_PUT = 'PUT'

/**
 * 文件框收哪些(PDF 与 Word)。
 */
export const RESUME_ACCEPT = '.pdf,.docx'

/**
 * 文件框的类型。
 */
export const INPUT_FILE = 'file'

/**
 * 上传满了(到上限)回的状态码。
 */
export const HTTP_CONFLICT = 409

/**
 * 英文姓名最长几个字(与 apply 域的 NAME_RE 同值)。
 */
export const NAME_MAX_LEN = 60

/**
 * 英文姓名框的浏览器自动填充类别。
 */
export const AUTOCOMPLETE_NAME = 'name'

/**
 * 弹框栈的层种类:职位描述弹框(职位名点了叠开,不跳页;同 myjobs 桶)。
 */
export const LAYER_JOB = 'job'

/**
 * 职位描述弹框用的职业说明表(本页不带,给空表;同 myjobs 桶)。
 */
export const NOC_DESC_NONE = []

/**
 * 信最长几个字(与 apply 域的 COVER_MAX 同值)。
 */
export const COVER_MAX = 4000

/**
 * 上传没成的词条。
 */
export const ERR_KEY_UPLOAD = 'ap.e.upload'

/**
 * 满了的词条(同「我的简历」)。
 */
export const ERR_KEY_FULL = 'rf.full'

/**
 * 所在省没存上的词条(2026-10-08 第三轮小白走查:设置清单加「所在省」一行,写进四题答案档;
 * 现档记着「人在境外」时答案档不收省,或会话没了,都落这一条)。
 */
export const ERR_KEY_PROV = 'qu.provFail'

/**
 * 所在省下拉的尺寸档(与清单里的小钮同高)。
 */
export const PROV_SELECT_SIZE = 'sm' as const

/**
 * 没简历时引去「我的简历」。
 */
export const URL_RESUME = '/account?sec=resume'

/**
 * 请求带 cookie(登录态)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 开关请求的方法。
 */
export const METHOD_PATCH = 'PATCH'

/**
 * 发 / 跳过请求的方法。
 */
export const METHOD_POST = 'POST'

/**
 * 请求体类型头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 的 MIME。
 */
export const MIME_JSON = 'application/json'

/**
 * 开关请求体的字段名(与 lib/queue 的 FIELD_AUTO 同字,各域各抄一份)。
 */
export const FIELD_AUTO = 'autoQueue'

/**
 * 取数状态:在取。
 */
export const LOAD_BUSY = 'busy'

/**
 * 取数状态:取不到。
 */
export const LOAD_FAIL = 'fail'

/**
 * 取数状态:到了。
 */
export const LOAD_OK = 'ok'

/**
 * 错误词条头(后接接口回的错误码;与投递区同一套 ap.e.*)。
 */
export const ERR_KEY_HEAD = 'ap.e.'

/**
 * 接口回得出、页面认得的错误码(与投递区同一张表)。
 */
export const ERR_CODES = [
  'name', 'resume', 'chars', 'long', 'sent', 'draft', 'sameEmail', 'bounced', 'closed', 'noEmail', 'limit', 'busy',
  'mailOff', 'mail',
]

/**
 * 认不得的错误码落到的词条。
 */
export const ERR_FALLBACK = 'ap.e.mail'

/**
 * 没有错误。
 */
export const ERR_NONE = ''

/**
 * 开启后轮询队列的间隔(ms)。
 */
export const POLL_MS = 5000

/**
 * 开启后最多等这一轮多久(ms;一个人最多 5 岗、一封信约半分钟)。
 */
export const FIND_MAX_MS = 180000

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 「投出」「全部投出」的钮档(主行动,蓝底)。
 */
export const BTN_PRIMARY = 'primary'

/**
 * 「跳过」的钮档(白底描边)。
 */
export const BTN_SECONDARY = 'secondary'


/**
 * 「已下架」胶囊的档(tag 桶 warn)。
 */
export const CLOSED_TAG = 'warn'
