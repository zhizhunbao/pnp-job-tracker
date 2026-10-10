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
 * 投递一节的起始态接口(后接职位 id)。
 */
export const URL_START_HEAD = '/api/apply/start?job='

/**
 * 「我的」页地址栏里的职位 id 参数(/account?sec=sjobs&job=<id>)。
 * 2026-10-09 A 批投递搬进弹框:这个参数只当旧深链认(邮件、收藏夹里存的),落在「我的」页时照样弹投递框;
 * 原「发出后洗掉职位 id 的落点」URL_SJOBS 随投递区退役(发出后弹框切到已投递一步,地址由关框时收拾)。
 */
export const P_JOB = 'job'

/**
 * 投递弹框的地址参数(任意页 `?apply=<职位号>` 弹投递框;2026-10-09 A 批,docs/design/投递向导-照Azure-20261008.md 故事 1)。
 */
export const P_APPLY = 'apply'

/**
 * 旧深链 `?job=` 只在这一页认(别的页的 job 参数不是投递)。
 */
export const PATH_ACCOUNT = '/account'

/**
 * 浏览器前进 / 后退事件名(手机返回键关投递框;设计稿故事 2b)。
 */
export const EV_POPSTATE = 'popstate'

/**
 * 站内「投递框开 / 关」事件名(开关框只改地址栏,不触发页面导航;宿主听它重读地址栏)。
 */
export const EV_APPLY_NAV = 'offer2pr:apply-nav'

/**
 * 站内「要投这一岗」事件名(职位桶点投递时广播,宿主收到就开框;职位桶不直接取本桶的 openApply ——
 * 本桶取 account 桶,account 桶取职位桶,直接取就成环。值与 jobs 的 EV_APPLY_OPEN 相同,各域自抄)。
 */
export const EV_APPLY_OPEN = 'offer2pr:apply-open'

/**
 * 站内「投递发出去了」事件名(弹框挂在全站骨架上,「我的」页听它刷新投递表、写成功条)。
 */
export const EV_APPLY_SENT = 'offer2pr:apply-sent'

/**
 * 投递框的尺寸记忆键(10-09 Frank「所有弹框 都能放大缩小 拖动,保持一致」:与职位 / 公司 / 省提名弹框共用一份记住的宽高;
 * 值与 advisor 的 ADV_PREF 相同,各域自抄)。
 */
export const APPLY_MODAL_PREF = 'adv_modal_pref'

/**
 * 投递框没有记忆时的宽(px;照公司弹框)。
 */
export const APPLY_MODAL_W = 900

/**
 * 投递框没有记忆时的高(px;照公司弹框)。
 */
export const APPLY_MODAL_H = 760


/**
 * 投递框标题栏灰色小标的词条键。
 */
export const KICKER_KEY = 'ap.kicker'

/**
 * 白卡分区的全局类名(main.css 第 9 段;与公司弹框「基本信息」同一张卡,companies 的 CARD_MD_CLS 同值,各域自抄)。
 * 2026-10-09 Frank「最好改成 section 布局吧,类似于其他的弹框」。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 分区小标题的全局类名(main.css 第 9 段;companies 的 CARD_HEAD_CLS 同值,各域自抄)。
 */
export const CARD_HEAD_CLS = 'mcardHead'

/**
 * 「职位信息」分区的标题词条键。
 */
export const SEC_JOB_KEY = 'ap.secJob'

/**
 * 「职位信息」分区四行的词条键:职位、公司、城市、省份(市和省分开,10-09 Frank「省市 分开」)。
 */
export const ROW_KEYS = {
  /**
   * 职位名那一行。
   */
  title: 'ap.rowTitle',

  /**
   * 公司那一行。
   */
  company: 'ap.rowCompany',

  /**
   * 城市那一行。
   */
  city: 'ap.rowCity',

  /**
   * 省份那一行。
   */
  province: 'ap.rowProv',
}

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
 * 取数状态:没登录(会话过期,或没登录点了邮件里的 `?apply=` 深链)—— 框上叠登录框,登录完重取。2026-10-09 A 批测试实撞:
 * 原先落「取不到」,只摆一行「刷新再试」,刷新也没用。
 */
export const LOAD_AUTH = 'auth'

/**
 * 登录框的初始档:登录(深链多半是老用户从邮件点进来;框里照旧能切注册)。
 */
export const AUTH_LOGIN = 'login'

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
 * PDF 的 MIME:逐项检查的简历行只有 PDF 才站内弹框预览,.docx 仍新开标签页(浏览器自己下载)。
 * 2026-10-08 Frank「这两个应该都是可以弹框,并且可以替换吧」。
 */
export const MIME_PDF = 'application/pdf'

/**
 * 逐项检查求职信行「改信」钮的词条键(投递区 = 回第 2 步;今日待投 = 开改信弹框)。
 */
export const EDIT_KEY = 'ap.edit'

/**
 * 邮件形预览「主题」行的词条键(2026-10-08 Frank「这个不能改成类似于邮件那种吗」)。
 */
export const SUBJECT_KEY = 'ap.subject'

/**
 * 邮件形预览「附件」行的词条键。
 */
export const ATTACH_KEY = 'ap.attach'

/**
 * 逐项检查简历行换简历下拉的尺寸档。
 */
export const PICK_SELECT_SIZE = 'sm' as const

/**
 * 换简历下拉至少要几份才出(只有一份没得换)。
 */
export const PICK_MIN = 2

/**
 * 英文姓名框的浏览器自动填充类别(全名)。
 */
export const AUTOCOMPLETE_NAME = 'name'

/**
 * 英文姓名最长几个字(与 lib/apply 的 NAME_RE、apply_prefs.sender_name 同值)。
 */
export const NAME_MAX_LEN = 60

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
 * 逐项检查「改信」钮的样式档(次要钮;与 queue 桶同字,各域各抄一份)。
 */
export const BTN_SECONDARY = 'secondary'

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
 * 没登录回的状态码。
 */
export const HTTP_UNAUTH = 401

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
 * 2026-10-09 A 批:回到「我的求职」并弹投递框(`?apply=`)。
 */
export const URL_BACK_HEAD = '/account?sec=sjobs&apply='

/**
 * 投递真发出去那一下的埋点名(第一方漏斗白名单 apply-sent;只计数,不带岗位号、公司名)。
 */
export const TRACK_APPLY_SENT = 'apply-sent'

/**
 * 逐项检查:收件人一项(词条键即项名;2026-10-08 Frank「再投递之前 有让用户一项一项检查吗」—— 发给真雇主收不回,
 * 发出前四项逐一打勾才放行,手动投递第 3 步与「今日待投」同一个组件)。
 */
export const CHECK_TO = 'ap.to'

/**
 * 逐项检查:简历一项。
 */
export const CHECK_RESUME = 'ap.resume'

/**
 * 逐项检查:求职信一项。
 */
export const CHECK_LETTER = 'ap.letter'

/**
 * 逐项检查:署名一项。
 */
export const CHECK_SIGN = 'ap.sign'


/**
 * 逐项检查里「打开简历」的词条键。
 */
export const VIEW_KEY = 'ap.view'

/**
 * 逐项检查里「查看 PDF」的词条键。
 */
export const PDF_KEY = 'ap.pdf'

/**
 * 简历原件地址的查询头(后接简历 id;同「我的简历」)。
 */
export const Q_ID_HEAD = '?id='

/**
 * 勾选框的 input 类型。
 */
export const INPUT_CHECKBOX = 'checkbox'

/**
 * 逐项检查的值在哪儿允许折行:下划线之后(文件名 Cover_Letter_Markham_NS_Dental.pdf 只在 _ 后断,不断在词中间)。
 */
export const BREAK_AFTER_RE = /(?<=_)/
