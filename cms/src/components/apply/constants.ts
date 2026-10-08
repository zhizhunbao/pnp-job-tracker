/**
 * 投递页组件桶的常量(2026-10-07 B2;/apply/<id> 四步:简历 → 求职信 → 预览 → 已投递)。
 * 同日 Frank「投递不应该跳到我的投递页面吗」→「投递整个放进『我的』」→ 问「我的求职和投递有什么区别」后「合成一个」:
 * 独立页 /apply/<id> 撤,四步并进「我的求职」那一节,摆在投递记录表上方(/account?sec=sjobs&job=<id>);
 * 发出后四步收起、表刷新出这一岗;起始态改由 /api/apply/start 取。
 * 设计稿 docs/design/投递页-B2-实施方案-20261005.md 末节「10-05 拍板」;效果图 docs/design/img/付费闭环-投递页-*-20261003.png
 * (10-07 起第 1 步换成「我的简历」原件卡片 + 英文姓名,预览一步在页面上直接显示信的正文、PDF 链接放次要位置)。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */

/**
 * 步骤:简历与英文姓名。
 */
export const STEP_RESUME = 'resume'

/**
 * 步骤:求职信。
 */
export const STEP_LETTER = 'letter'

/**
 * 步骤:预览。
 */
export const STEP_PREVIEW = 'preview'

/**
 * 步骤:已投递。
 */
export const STEP_DONE = 'done'

/**
 * 前三步的顺序(步数行与上一步按它走;已投递不算一步)。
 */
export const STEP_ORDER = [STEP_RESUME, STEP_LETTER, STEP_PREVIEW]

/**
 * 已经发出去的投递状态(落「已投递」)。
 */
export const SENT_STATUSES = ['sent', 'replied', 'bounced', 'sending']

/**
 * 职位页路径头(职位卡标题链接)。
 */
export const URL_JOB_HEAD = '/jobs/'

/**
 * 投递一节的起始态接口(后接职位 id)。
 */
export const URL_START_HEAD = '/api/apply/start?job='

/**
 * 发出后把地址栏的职位 id 洗掉的落点(刷新不再出投递区)。
 */
export const URL_SJOBS = '/account?sec=sjobs'

/**
 * 「我的」页地址栏里的职位 id 参数(/account?sec=sjobs&job=<id>)。
 */
export const P_JOB = 'job'

/**
 * 投递区的取数状态:地址栏没带职位(只看投递记录表,投递区不出)。
 */
export const LOAD_NONE = 'none'

/**
 * 取数状态:在取。
 */
export const LOAD_BUSY = 'busy'

/**
 * 取数状态:取不到(网络 / 非 2xx)。
 */
export const LOAD_FAIL = 'fail'

/**
 * 取数状态:到了。
 */
export const LOAD_OK = 'ok'

/**
 * 取不到的词条(同「我的」页其余几节)。
 */
export const FAIL_KEY = 'mj.fail'

/**
 * 没投过而岗已下架的词条。
 */
export const CLOSED_KEY = 'ap.e.closed'

/**
 * 这一岗已于某日投递的词条(2026-10-08:从职位页点进已投过的岗,投递区摆这一行,不再空白)。
 */
export const SENT_ON_KEY = 'ap.sentOn'

/**
 * 正在发、还没有发出时刻时摆的那一行(同接口的「已经投过了」)。
 */
export const SENT_KEY = 'ap.e.sent'

/**
 * 没投过而库里没有投递邮箱的词条。
 */
export const NO_EMAIL_KEY = 'ap.e.noEmail'

/**
 * 本人的简历清单。
 */
export const URL_RESUME_FILES = '/api/resume/files'

/**
 * 存草稿接口。
 */
export const URL_DRAFT = '/api/apply/draft'

/**
 * 求职信 PDF 接口(后接职位 id)。
 */
export const URL_COVER_HEAD = '/api/apply/cover?job='

/**
 * 代发接口。
 */
export const URL_SEND = '/api/apply/send'

/**
 * 写请求的方法:改。
 */
export const METHOD_PUT = 'PUT'

/**
 * 写请求的方法:发。
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
 * 带上登录 cookie。
 */
export const CRED_INCLUDE = 'include'

/**
 * 新标签页打开(求职信 PDF)。
 */
export const TARGET_BLANK = '_blank'

/**
 * 英文姓名框的浏览器自动填充类别(全名)。
 */
export const AUTOCOMPLETE_NAME = 'name'

/**
 * 英文姓名最长几个字(与 lib/apply 的 NAME_RE、apply_prefs.sender_name 同值)。
 */
export const NAME_MAX_LEN = 60

/**
 * 城市与省码之间的分隔。
 */
export const LOC_SEP = ', '

/**
 * 主钮在前三步各叫什么(词条键)。
 */
export const NEXT_KEY: Record<string, string> = {
  /**
   * 第 1 步:下一步。
   */
  resume: 'ap.next',

  /**
   * 第 2 步:预览。
   */
  letter: 'ap.preview',

  /**
   * 第 3 步:发送。
   */
  preview: 'ap.send',
}

/**
 * 错误词条头(后接接口回的错误码)。
 */
export const ERR_KEY_HEAD = 'ap.e.'

/**
 * 接口回得出、页面认得的错误码(其余一律当「没发出去」)。
 */
export const ERR_CODES = [
  'name', 'resume', 'chars', 'long', 'sent', 'draft', 'sameEmail', 'bounced', 'closed', 'noEmail', 'limit', 'busy',
  'mailOff', 'mail',
]

/**
 * 英文姓名不合规的词条(第 1 步本地先判,不等接口)。
 */
export const ERR_KEY_NAME = 'ap.e.name'

/**
 * 一份简历都没有的词条。
 */
export const ERR_KEY_RESUME = 'ap.e.resume'

/**
 * 认不得的错误码落到的词条。
 */
export const ERR_FALLBACK = 'ap.e.mail'

/**
 * 没有错误。
 */
export const ERR_NONE = ''

/**
 * 坏字之间的分隔(给人看的一行)。
 */
export const CHAR_SEP = ' '

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 离页事件名(存草稿;审查 #8)。
 */
export const EV_PAGEHIDE = 'pagehide'

/**
 * 「上一步」钮的样式档(幽灵钮灰字,同首访向导的钮组)。
 */
export const BTN_GHOST = 'ghost'

/**
 * 「PDF」次要链接的样式档(链接色文字钮)。
 */
export const BTN_LINK = 'linkText'

/**
 * 按 JD 写信的接口(2026-10-07)。
 */
export const URL_LETTER = '/api/apply/letter'

/**
 * 上传简历的接口(同「我的简历」;PUT 不带 id = 新加一份)。
 */
export const URL_RESUME_FILE = '/api/resume/file'

/**
 * 上传表单里文件那一格的名字(同「我的简历」)。
 */
export const FIELD_FILE = 'file'

/**
 * 文件框收哪些(同「我的简历」:PDF 与 Word)。
 */
export const RESUME_ACCEPT = '.pdf,.docx'

/**
 * 文件框的类型。
 */
export const INPUT_FILE = 'file'

/**
 * 单选框的类型(按岗选简历)。
 */
export const INPUT_RADIO = 'radio'

/**
 * 单选组的名字。
 */
export const RADIO_NAME = 'apply-resume'

/**
 * 上传满了(到上限)回的状态码。
 */
export const HTTP_CONFLICT = 409

/**
 * 「上传于 2026-10-06」取日期的长度。
 */
export const DATE_LEN = 10

/**
 * 「上传于 {d}」的词条(同「我的简历」)。
 */
export const UPLOADED_KEY = 'rf.uploaded'

/**
 * 默认那份的小标(同「我的简历」)。
 */
export const DEFAULT_KEY = 'rf.default'

/**
 * 「添加简历」(同「我的简历」)。
 */
export const ADD_KEY = 'rf.add'

/**
 * 文件要求一行(同「我的简历」:PDF 或 Word,5 MB 以内)。
 */
export const UP_SUB_KEY = 'rf.upSub'

/**
 * 满了的词条(同「我的简历」)。
 */
export const ERR_KEY_FULL = 'rf.full'

/**
 * 上传没成的词条。
 */
export const ERR_KEY_UPLOAD = 'ap.e.upload'

/**
 * 写信接口没回信(网络 / 别的错)的词条。
 */
export const ERR_KEY_WRITE = 'ap.e.write'

/**
 * 模型没按 JD 写成、先给了通用信的提示词条。
 */
export const ERR_KEY_TEMPLATE = 'ap.e.template'

/**
 * 「按职位重写」钮。
 */
export const REWRITE_KEY = 'ap.rewrite'

/**
 * 写信时的进度一句。
 */
export const WRITING_KEY = 'ap.writing'

/**
 * 加载中的一句(全站同词)。
 */
export const LOADING_KEY = 'act.loadingText'

/**
 * 写信接口回「试用用完」的码(同 lib/apply 的 E_TRIAL;402,回包带兜底模板信;2026-10-07 批 C)。
 */
export const E_TRIAL = 'trial'

/**
 * 「AI 试用还剩 N 次」的词条键。
 */
export const TRIAL_LEFT_KEY = 'ap.trialLeft'

/**
 * 试用用完时信框上那条提示的词条键。
 */
export const TRIAL_OUT_KEY = 'ap.trialOut'

/**
 * 升级框里「为什么弹」那一行的词条键。
 */
export const TRIAL_REASON_KEY = 'ap.trialReason'

/**
 * 升级钮的词条键(全站同一个「升级 Pro」)。
 */
export const UPGRADE_KEY = 'up.cta2'

/**
 * 试用用完那条提示的色档(notice 四色里的黄)。
 */
export const NOTICE_WARN = 'warn'

/**
 * 付完回到本岗投递区的地址头(后接职位 id)。
 */
export const URL_BACK_HEAD = '/account?sec=sjobs&job='

/**
 * 投递真发出去那一下的埋点名(第一方漏斗白名单 apply-sent;只计数,不带岗位号、公司名)。
 */
export const TRACK_APPLY_SENT = 'apply-sent'
