/**
 * apply 桶子桶 review 的常量(2026-11-09 高质量投递:投递框三屏对照)。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */

/**
 * 空值。
 */
export const TEXT_NONE = ''

/**
 * 步骤接口。
 */
export const URL_STEP = '/api/tailor/step'

/**
 * 现状接口头(后接职位 id)。
 */
export const URL_STATE = '/api/tailor/state?job='

/**
 * 文件接口头(后接职位 id)。
 */
export const URL_FILE = '/api/tailor/file?job='

/**
 * 文件接口的种类尾巴。
 */
export const URL_KIND = '&kind='

/**
 * 文件接口的版本尾巴(重新生成后换一份)。
 */
export const URL_GEN = '&v='

/**
 * 发信接口。
 */
export const URL_SEND = '/api/apply/send'

/**
 * 存署名接口。
 */
export const URL_NAME = '/api/apply/name'

/**
 * 存手改求职信的接口。
 */
export const URL_COVER = '/api/tailor/cover'

/**
 * 存手改简历的接口。
 */
export const URL_RESUME = '/api/tailor/resume'

/**
 * 修改简历里一格输入框的行数。
 */
export const CV_ROWS = 5

/**
 * POST。
 */
export const METHOD_POST = 'POST'

/**
 * PATCH。
 */
export const METHOD_PATCH = 'PATCH'

/**
 * PUT。
 */
export const METHOD_PUT = 'PUT'

/**
 * 带登录态。
 */
export const CRED_INCLUDE = 'include'

/**
 * 内容类型头。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON。
 */
export const MIME_JSON = 'application/json'

/**
 * 步骤:拆要求。
 */
export const STEP_PLAN = 'plan'

/**
 * 步骤:写简历。
 */
export const STEP_RESUME = 'resume'

/**
 * 步骤:写求职信。
 */
export const STEP_COVER = 'cover'

/**
 * 步骤:核对。
 */
export const STEP_AUDIT = 'audit'

/**
 * 一轮最多走几步(防接口回错时死循环)。
 */
export const STEP_LOOP_MAX = 14

/**
 * 面板:简历。
 */
export const PANE_RESUME = 'resume'

/**
 * 面板:求职信。
 */
export const PANE_COVER = 'cover'

/**
 * 面板:职位描述。
 */
export const PANE_JD = 'jd'

/**
 * 进度词条:各步。
 */
export const STAGE_KEYS: Record<string, string> = {
  /**
   * 拆要求。
   */
  plan: 'tr.stagePlan',

  /**
   * 写简历。
   */
  resume: 'tr.stageResume',

  /**
   * 写求职信。
   */
  cover: 'tr.stageCover',

  /**
   * 核对。
   */
  audit: 'tr.stageAudit',
}

/**
 * 错误码 → 词条。
 */
export const ERR_KEYS: Record<string, string> = {
  /**
   * 试用用完。
   */
  pro: 'tr.errPro',

  /**
   * 没有基础简历。
   */
  base: 'tr.errBase',

  /**
   * 职位没有描述。
   */
  noJd: 'tr.errJd',

  /**
   * 次数超限。
   */
  limit: 'tr.errLimit',

  /**
   * 改写多次仍不合格。
   */
  resumeBad: 'tr.errResume',
}

/**
 * 其余失败的词条。
 */
export const ERR_DEFAULT = 'tr.errLlm'

/**
 * 手改的内容里有写不进 PDF 的字的词条。
 */
export const ERR_CHARS = 'tr.errChars'

/**
 * 接口回「内容不合格」的状态码。
 */
export const HTTP_UNPROCESSABLE = 422

/**
 * 试用用完的错误码。
 */
export const ERR_PRO = 'pro'

/**
 * 发信失败的词条。
 */
export const ERR_SEND = 'tr.errSend'

/**
 * 英文姓名不合规的词条。
 */
export const ERR_NAME = 'tr.errName'

/**
 * 序号圆点的宽(屏幕像素,按字号收)。
 */
export const NUM_MAX = 12

/**
 * 序号和文字之间的留白(2026-11-09 Frank「注意一下序号和文字的间距」)。
 */
export const NUM_GAP = 4

/**
 * 序号占行高的比例。
 */
export const NUM_RATIO = 0.9

/**
 * 序号字号占行高的比例。
 */
export const NUM_FONT_RATIO = 0.72

/**
 * 序号字号上限。
 */
export const NUM_FONT_MAX = 8.5

/**
 * 高亮的底相对字号的高。
 */
export const HL_H_RATIO = 1.25

/**
 * 高亮的底相对基线往上的比例。
 */
export const HL_UP_RATIO = 0.95

/**
 * 宽屏最大缩放。
 */
export const SCALE_MAX = 1.3

/**
 * 手机放大倍数。
 */
export const ZOOM_NARROW = 2.1

/**
 * 三屏改竖排的断点(2026-11-10 Frank「这两个字太小了吧」:窗口不够宽时三栏并排,每份 PDF 只剩两百来像素、字没法看;
 * 原先只在手机 640 以下才竖排。和样式里的 1100 一致)。
 */
export const NARROW_W = 1100

/**
 * 竖排时没放大的最大缩放(平板和半屏窗口上占满宽度会大得过头)。
 */
export const STACK_SCALE_MAX = 1.5

/**
 * 页面内容四周留白。
 */
export const PAGE_PAD = 6

/**
 * 算缩放时给序号与内边距留的宽。
 */
export const AVAIL_GAP = 44

/**
 * 量字宽用的字体。
 */
export const MEASURE_FONT = '100px Arial'

/**
 * 画布标签。
 */
export const CANVAS_TAG = 'canvas'

/**
 * 2d 上下文。
 */
export const CTX_2D = '2d'

/**
 * 白底。
 */
export const PAPER_WHITE = '#fff'

/**
 * 像素单位。
 */
export const PX = 'px'

/**
 * 换行。
 */
export const NEWLINE = '\n'

/**
 * 职位描述里一条的圆点(原文自带的也是它)。
 */
export const JD_BULLET = '•'

/**
 * 一行里句子之间的断点:句末标点后面跟着空白和大写字母。
 */
export const JD_SENT_SPLIT_RE = /(?<=[.!?])\s+(?=[A-Z])/

/**
 * 职位描述里小标题那一行的行首标记(数据层给的)。
 */
export const JD_HEAD_MARK = '## '

/**
 * 空白折叠。
 */
export const WS_RE = /\s+/g

/**
 * 一个空格。
 */
export const ONE_SPACE = ' '

/**
 * 胶囊颜色的种数。
 */
export const COLOR_N = 12

/**
 * 颜色类名头。
 */
export const COLOR_HEAD = 'c'

/**
 * 没有序号的高亮(无依据的句子)。
 */
export const NUM_NONE = 0

/**
 * 无依据的句子的序号字。
 */
export const NUM_BAD = '!'

/**
 * 胶囊「未覆盖」的变体。
 */
export const TAG_BAD = 'bad'

/**
 * 标签:提醒。
 */
export const TAG_WARN = 'warn'

/**
 * 胶囊:提示(底行的剩余额度)。
 */
export const TAG_INFO = 'info'

/**
 * 按钮:次要。
 */
export const BTN_SECONDARY = 'secondary'

/**
 * 按钮:弱。
 */
export const BTN_GHOST = 'ghost'

/**
 * 提示:失败。
 */
export const NOTICE_ERR = 'err'

/**
 * 提示:说明。
 */
export const NOTICE_INFO = 'info'

/**
 * 胶囊小注的词条:简历没写到。
 */
export const NEED_RESUME = 'tr.needResume'

/**
 * 胶囊小注的词条:求职信没写到。
 */
export const NEED_COVER = 'tr.needCover'

/**
 * 胶囊小注的词条:两份都没写到。
 */
export const NEED_BOTH = 'tr.needBoth'

/**
 * 读屏:进度。
 */
export const ROLE_STATUS = 'status'

/**
 * 按钮类型。
 */
export const TYPE_BUTTON = 'button'

/**
 * 文件标头分隔。
 */
export const NAME_SEP = ', '

/**
 * 第几个职位起弹升级框:试用用完的词条。
 */
export const UPSELL_KEY = 'tr.errPro'

/**
 * 全站卡片类。
 */
export const CLS_CARD_MD = 'cardMd'

/**
 * 卡头类。
 */
export const CLS_MCARD_HEAD = 'mcardHead'

/**
 * 补充经历输入框的行数。
 */
export const FILL_ROWS = 10

/**
 * 修改求职信输入框的行数。
 */
export const COVER_ROWS = 18

/**
 * 标签和值之间的分隔。
 */
export const COLON_SEP = ': '

/**
 * 序号圆点相对高亮左边的微调。
 */
export const NUM_LEFT_NUDGE = 2

/**
 * 序号圆点上下居中的除数。
 */
export const NUM_CENTER_DIV = 2

/**
 * PDF 面板的左边距。
 */
export const SHEET_LEFT_PAD = 8

/**
 * 画布挂载点的标记值。
 */
export const DATA_CV_ON = '1'

/**
 * 画布挂载点的选择器。
 */
export const SEL_CV = '[data-cv]'

/**
 * 高亮选择器的头(后接序号)。
 */
export const SEL_N_HEAD = '[data-n="'

/**
 * 高亮选择器的尾。
 */
export const SEL_N_TAIL = '"]'

/**
 * 滚到选中项时的停靠方式。
 */
export const BLOCK_NEAREST = 'nearest'

/**
 * 发出后的埋点事件名。
 */
export const TRACK_SENT = 'apply-sent'

/**
 * 文字项上字段的键。
 */
export const KEY_STR = 'str'

/**
 * 序号留白的基准(与缩放相乘)。
 */
export const NUM_GAP_BASE = 14

/**
 * 内边距算两边。
 */
export const PAD_SIDES = 2

/**
 * 内容框在基线上方多留的高。
 */
export const BOX_UP = 12

/**
 * 内容框在基线下方多留的高。
 */
export const BOX_DOWN = 4

/**
 * 判断句头在不在左边时的容差。
 */
export const RECT_EPS = 0.5

/**
 * 整句都被别的引文占了时,只放序号的那一块往左让几个容差(排在占它的那句的句头前面)。
 */
export const HEAD_ONLY_NUDGE = 2

/**
 * 两页之间的缝(屏幕像素;和样式里画布之间的上边距一致)。
 */
export const PAGE_GAP = 8

/**
 * PDF 变换矩阵里竖向缩放的第一格。
 */
export const MAT_C = 2

/**
 * PDF 变换矩阵里竖向缩放的第二格。
 */
export const MAT_D = 3

/**
 * PDF 变换矩阵里的横坐标格。
 */
export const MAT_E = 4

/**
 * PDF 变换矩阵里的纵坐标格。
 */
export const MAT_F = 5

/**
 * 整理版的节标记 → 节名词条(与职位详情页整理版同一套词条;各桶各抄一份)。
 * 2026-11-11 Frank「用整理版 测试一下」:职位描述面板改读整理版,节头按界面语言显示。
 */
export const JD_SEC_KEYS: Record<string, string> = {
  /**
   * 工作内容。
   */
  '[ROLE]': 'act.f.role',

  /**
   * 硬性要求。
   */
  '[REQS]': 'act.f.reqs',

  /**
   * 薪资福利。
   */
  '[PAY]': 'act.f.pay',

  /**
   * 工作形式。
   */
  '[WORKHOURS]': 'act.f.hours',

  /**
   * 公司简介。
   */
  '[COMPANY]': 'act.f.company',

  /**
   * 怎么申请。
   */
  '[APPLY]': 'act.f.apply',
}

/**
 * 进三屏(按职位改写的核对屏)的埋点事件名(2026-11-11 任务书第 48 条)。
 */
export const TRACK_REVIEW = 'apply-review'

/**
 * 在三屏里点「发送」的埋点事件名(与父桶的 TRACK_SEND_CLICK 同值,各自抄)。
 */
export const TRACK_SEND_CLICK = 'apply-send-click'
