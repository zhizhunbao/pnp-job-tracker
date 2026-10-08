/**
 * 站内投递(代投)域的常量。2026-10-07 Frank「接着做 B2 吧」;设计稿 docs/design/投递页-B2-实施方案-20261005.md
 * 末节「10-05 Frank 拍板与范围收窄」(本批 = 原 B2 + B3:简历选用、求职信模板 + PDF、投递页四步、代发、退信回调;
 * 回信中转与首投三题挪走)。回复地址 = 用户注册邮箱(雇主回信直达用户,不经中转)。
 *
 * @author Frank
 * @time 2026-10-07 01:30:00
 */

/**
 * 默认求职信模板(英文;只写不会错的句子,不替用户编经历 —— 10-04 拍板「求职信第一版只用模板」)。
 * 三处占位:职位名、公司名、英文署名。公司名后接逗号不接句号(公司名常以「Inc.」收尾,接句号成「Inc..」)。
 */
export const COVER_DEFAULT = `Dear Hiring Manager,

I am writing to apply for the {{title}} position at {{company}}, and my resume is attached for your review.

I would welcome the opportunity to discuss how I can contribute to your team. Thank you for your time and consideration.

Sincerely,
{{name}}`

/**
 * 职位名占位。
 */
export const PH_TITLE = '{{title}}'

/**
 * 公司名占位。
 */
export const PH_COMPANY = '{{company}}'

/**
 * 英文署名占位。
 */
export const PH_NAME = '{{name}}'

/**
 * 占位种类:职位名。
 */
export const SPAN_TITLE = 'title'

/**
 * 占位种类:公司名。
 */
export const SPAN_COMPANY = 'company'

/**
 * 占位种类:英文署名。
 */
export const SPAN_NAME = 'name'

/**
 * 三种占位与它的种类(填信时按模板里出现的先后逐处找)。
 */
export const PLACEHOLDERS = [
  { ph: PH_TITLE, kind: SPAN_TITLE },
  { ph: PH_COMPANY, kind: SPAN_COMPANY },
  { ph: PH_NAME, kind: SPAN_NAME },
]

/**
 * 信最长字数(与 applications.cover_text / apply_prefs.cover_template 的 CHECK 同值)。
 */
export const COVER_MAX = 4000

/**
 * 英文署名:只许 WinAnsi 能编码的西文字母(含常见重音字母,去掉 × ÷)、空格与 .'-,2~60 字
 * (10-05 拍板 Q2;审查 #17:ł、ș 这类写不进 PDF,不收)。
 */
export const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ .'-]{2,60}$/

/**
 * WinAnsi(PDF 标准字体)能写的字:可打印 ASCII、Latin-1 补充段,外加 cp1252 的 0x80–0x9F 那 27 个字。
 */
export const WINANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'

/**
 * 换行(信里的段落分隔,PDF 逐行排)。
 */
export const NEWLINE = '\n'

/**
 * Windows 换行(文本框可能交回 \r\n,统一成 \n)。
 */
export const CRLF_RE = /\r\n?/g

/**
 * 每人 24 小时最多发几封(防刷;Resend 免费档每天 100 封全站共用)。
 */
export const USER_DAY_MAX = 20

/**
 * 全站 24 小时最多发几封(给提醒信与找回密码留出余量:Resend 免费档每天 100 封)。
 */
export const SITE_DAY_MAX = 80

/**
 * 同一用户给同一个雇主邮箱投别的岗的冷却天数(审查 #4:mart 同组副本 / 跨来源重发是不同岗位号,同一封别投两次)。
 */
export const SAME_EMAIL_DAYS = 30

/**
 * 每人每日发送请求的进程内限额键前缀(在 DB 计数之外再挡一层连点)。
 */
export const SEND_LIMIT_PREFIX = 'apply-send:'

/**
 * 每人每日发送请求的进程内上限。
 */
export const SEND_LIMIT_DAILY = 40

/**
 * 每 IP 每日发送请求的进程内限额键前缀。
 */
export const SEND_IP_PREFIX = 'apply-send-ip:'

/**
 * 每 IP 每日发送请求的进程内上限(直播观众共用运营商出口,放宽到每人的 5 倍)。
 */
export const SEND_IP_DAILY = 200

/**
 * 测试号邮箱后缀(@test.local):这类账号投递时收件人改投 Resend 的测试收件地址,不发给真雇主。
 */
export const TEST_SUFFIX = '@test.local'

/**
 * Resend 的测试收件地址(收下、不投递、后台能看日志)。
 */
export const TEST_TO = 'delivered@resend.dev'

/**
 * 代发的发件地址(域 offer2pr.com 已在 Resend 验证;env RESEND_APPLY_FROM 可覆盖)。
 */
export const APPLY_FROM_ADDR = process.env.RESEND_APPLY_FROM || 'apply@offer2pr.com'

/**
 * 发件显示名的后半(「<英文名> via Offer2PR」)。
 */
export const FROM_VIA = ' via Offer2PR'

/**
 * 发件人「显示名 <地址>」的左括号。
 */
export const FROM_LT = ' <'

/**
 * 发件人「显示名 <地址>」的右括号。
 */
export const FROM_GT = '>'

/**
 * 邮件标题模板。
 */
export const SUBJECT_TPL = 'Application for {{title}} - {{name}}'

/**
 * 邮件正文末尾的来源说明(纯文本)。
 */
export const MAIL_FOOT = '\n\n--\nSent via Offer2PR (offer2pr.com). Resume and cover letter attached.'

/**
 * 求职信 PDF 文件名头(后接公司名的西文段)。
 */
export const COVER_FILE_HEAD = 'Cover_Letter_'

/**
 * 简历附件名尾(前接英文署名的西文段)。
 */
export const RESUME_FILE_TAIL = '_Resume'

/**
 * PDF 扩展名。
 */
export const EXT_PDF = '.pdf'

/**
 * Word 扩展名。
 */
export const EXT_DOCX = '.docx'

/**
 * PDF 的 MIME。
 */
export const MIME_PDF = 'application/pdf'

/**
 * 文件名里只留西文字母数字,其余折成下划线。
 */
export const FILE_SAFE_RE = /[^A-Za-z0-9]+/g

/**
 * 下划线。
 */
export const UNDERSCORE = '_'

/**
 * 文件名西文段为空时的兜底词。
 */
export const FILE_FALLBACK = 'Employer'

/**
 * 去掉组合附加符号(NFKD 之后把重音拆出来再删,发件头只留 ASCII)。
 */
export const COMBINING_RE = /[\u0300-\u036f]/g

/**
 * Unicode 兼容分解(把重音拆成基字 + 组合符号)。
 */
export const NFKD = 'NFKD'

/**
 * 非 ASCII 字符。
 */
export const NON_ASCII_RE = /[^\x20-\x7E]/g

/**
 * PDF 页面:Letter 宽(pt)。
 */
export const PAGE_W = 612

/**
 * PDF 页面:Letter 高(pt)。
 */
export const PAGE_H = 792

/**
 * PDF 页边距(pt,一英寸)。
 */
export const MARGIN = 72

/**
 * PDF 正文字号。
 */
export const FONT_SIZE = 11

/**
 * PDF 行距。
 */
export const LEADING = 16

/**
 * 空格(排版拆词用)。
 */
export const SPACE = ' '

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 职位已下架的状态值(jobs.status)。
 */
export const JOB_CLOSED = 'closed'

/**
 * 中文界面。
 */
export const LANG_ZH = 'zh'

/**
 * 韩文界面。
 */
export const LANG_KO = 'ko'

/**
 * 查询参数:职位 id。
 */
export const P_JOB = 'job'

/**
 * 投递行状态:草稿。
 */
export const ST_DRAFT = 'draft'

/**
 * 投递行状态:已发出。
 */
export const ST_SENT = 'sent'

/**
 * 清单响应的缓存头:只给本人,哪一层都不许存。
 */
export const CACHE_PRIVATE = 'private, no-store'

/**
 * 错误码:要登录。
 */
export const E_AUTH = 'auth'

/**
 * 错误码:职位不存在。
 */
export const E_JOB = 'job'

/**
 * 错误码:职位已下架。
 */
export const E_CLOSED = 'closed'

/**
 * 错误码:这一岗没有投递邮箱。
 */
export const E_NO_EMAIL = 'noEmail'

/**
 * 错误码:请求体不对。
 */
export const E_BODY = 'body'

/**
 * 错误码:英文署名不合规。
 */
export const E_NAME = 'name'

/**
 * 错误码:信里有写不进 PDF 的字。
 */
export const E_CHARS = 'chars'

/**
 * 错误码:信太长。
 */
export const E_LONG = 'long'

/**
 * 错误码:还没选简历(或那一份已删)。
 */
export const E_RESUME = 'resume'

/**
 * 错误码:已经投过(或正在发)。
 */
export const E_SENT = 'sent'

/**
 * 错误码:近 N 天给同一个雇主邮箱投过别的岗。
 */
export const E_SAME_EMAIL = 'sameEmail'

/**
 * 错误码:雇主邮箱退过信。
 */
export const E_BOUNCED = 'bounced'

/**
 * 错误码:今天投满了(每人 / 全站)。
 */
export const E_LIMIT = 'limit'

/**
 * 错误码:发信没配(本地 dev 没 Resend 密钥)。
 */
export const E_MAIL_OFF = 'mailOff'

/**
 * 错误码:发信失败。
 */
export const E_MAIL = 'mail'

/**
 * AI 按 JD 写信的免费试用用完了(402;回包带兜底模板信,前端出升级条;2026-10-07 批 C)。
 */
export const E_TRIAL = 'trial'

/**
 * 退信回调:Resend 的事件名 —— 退信。
 */
export const EV_BOUNCED = 'email.bounced'

/**
 * 退信回调:Resend 的事件名 —— 被投诉(当退信处理,同一邮箱不再投)。
 */
export const EV_COMPLAINED = 'email.complained'

/**
 * 退信名单种类:退信。
 */
export const KIND_BOUNCED = 'bounced'

/**
 * 退信名单种类:被抑制 / 投诉。
 */
export const KIND_SUPPRESSED = 'suppressed'

/**
 * Svix 签名头:消息 id。
 */
export const HDR_SVIX_ID = 'svix-id'

/**
 * Svix 签名头:时间戳。
 */
export const HDR_SVIX_TS = 'svix-timestamp'

/**
 * Svix 签名头:签名(空格隔开的若干个 v1,<base64>)。
 */
export const HDR_SVIX_SIG = 'svix-signature'

/**
 * Svix 密钥前缀(后面是 base64)。
 */
export const SVIX_SECRET_HEAD = 'whsec_'

/**
 * Svix 签名版本前缀。
 */
export const SVIX_V1 = 'v1,'

/**
 * 点号(Svix 签名原文 = id.ts.body)。
 */
export const DOT = '.'

/**
 * 验签算法(Web Crypto 名;浏览器与 Node 都有全局 crypto.subtle,本域 functions 经桶进浏览器包,不 import node:crypto)。
 */
export const HMAC_NAME = 'HMAC'

/**
 * 摘要算法(Web Crypto 名)。
 */
export const SHA_256 = 'SHA-256'

/**
 * 导入原始密钥的格式名。
 */
export const KEY_RAW = 'raw'

/**
 * 密钥用途:只验签。
 */
export const KEY_USAGE_VERIFY = 'verify'

/**
 * base64 编码名。
 */
export const B64 = 'base64'

/**
 * 时间戳允许的偏差(秒;防重放)。
 */
export const SVIX_TOLERANCE_S = 300

/**
 * 毫秒换秒。
 */
export const MS_PER_S = 1000

/**
 * 幂等键头。
 */
export const IDEM_HEAD = 'apply-'

/**
 * 幂等键里内容哈希取前几位(审查 #2:改信重发不撞 24 小时)。
 */
export const IDEM_HASH_LEN = 16

/**
 * 幂等键分隔。
 */
export const IDEM_SEP = '-'

/**
 * 内容哈希的十六进制编码名。
 */
export const HEX = 'hex'

/**
 * 内容哈希各段之间的分隔(换行:各段本身已归一过换行,不会混成一段)。
 */
export const HASH_SEP = '\n'

/**
 * Resend 的测试收件地址:退信(测试号邮箱本地部分含 bounce 时改投它,用来验退信回调)。
 */
export const TEST_BOUNCE_TO = 'bounced@resend.dev'

/**
 * 测试号邮箱本地部分里表示「要测退信」的词。
 */
export const TEST_BOUNCE_MARK = 'bounce'

/**
 * 退信回调:Resend 的事件名 —— 被抑制(收件方在 Resend 的抑制名单上)。
 */
export const EV_SUPPRESSED = 'email.suppressed'

/**
 * 退信种类:永久退信(只有它记进退信名单;临时退信只留痕)。
 */
export const BOUNCE_PERMANENT = 'Permanent'

/**
 * 错误码:全站今天的发信额度用完了(Resend 免费档每天 100 封)。
 */
export const E_BUSY = 'busy'

/**
 * 错误码:还没有草稿(没走过第 2 步)。
 */
export const E_DRAFT = 'draft'

/**
 * 错误码:退信回调签名或时间戳不对。
 */
export const E_SIG = 'signature'

/**
 * 投递行状态:正在发。
 */
export const ST_SENDING = 'sending'

/**
 * 投递行状态:退信。
 */
export const ST_BOUNCED = 'bounced'

/**
 * 投递信正文:称呼。
 */
export const MAIL_HELLO = 'Dear Hiring Manager,'

/**
 * 投递信正文:第一段起手(后接职位名;2026-10-07 自 components/jobs 的 mailto 正文搬来,改成附简历与求职信;
 * 公司名不进这句 —— 收件的就是这家公司,且公司名常以「Inc.」收尾,接句号成「Inc..」)。
 */
export const MAIL_BODY_HEAD = 'I would like to apply for your "'

/**
 * 职位名之后的引号与名词。
 */
export const MAIL_BODY_QUOTE = '" position'

/**
 * 城市省份前的介词。
 */
export const MAIL_BODY_IN = ' in '

/**
 * 第一段句号。
 */
export const MAIL_BODY_DOT = '.'

/**
 * 附件那一句。
 */
export const MAIL_ATTACH = 'Please find my resume and cover letter attached.'

/**
 * 落款。
 */
export const MAIL_REGARDS = 'Best regards,'

/**
 * 地点两段之间的分隔(城市, 省)。
 */
export const LOC_SEP = ', '

/**
 * HTML 正文的换行标签。
 */
export const HTML_BR = '<br>'

/**
 * HTML 要转义的字符。
 */
export const HTML_ESC_RE = /[&<>"']/g

/**
 * HTML 转义表。
 */
export const HTML_ESC: Record<string, string> = {
  /**
   * 和号。
   */
  '&': '&amp;',

  /**
   * 小于号。
   */
  '<': '&lt;',

  /**
   * 大于号。
   */
  '>': '&gt;',

  /**
   * 双引号。
   */
  '"': '&quot;',

  /**
   * 单引号。
   */
  "'": '&#39;',
}

/**
 * 发件显示名里要去掉的字(防头注入:引号、反斜杠、尖括号)。
 */
export const FROM_UNSAFE_RE = /["\\<>]/g

/**
 * 制表符(信里换成空格;WinAnsi 写不进制表符)。
 */
export const TAB_RE = /\t/g

/**
 * 文件名西文段最长几个字。
 */
export const FILE_SLUG_MAX = 60

/**
 * 求职信文件名转完为空时的整名。
 */
export const COVER_FILE_FALLBACK = 'Cover_Letter'

/**
 * 简历附件名转完为空时的整名头。
 */
export const RESUME_FILE_FALLBACK = 'Resume'

/**
 * Word 的 MIME(简历附件按它取 .docx 扩展名)。
 */
export const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * 求职信 PDF 的 Content-Disposition 头(本人预览,在浏览器里直接打开)。
 */
export const DISPOSITION_INLINE = 'inline; filename="'

/**
 * Content-Disposition 头尾的引号。
 */
export const DISPOSITION_TAIL = '"'

/**
 * 防嗅探头名。
 */
export const HDR_NOSNIFF = 'X-Content-Type-Options'

/**
 * 防嗅探头值。
 */
export const NOSNIFF = 'nosniff'

/**
 * 草稿接口每人每日限额键前缀(存草稿是失焦 / 切步 / 离页都触发,给宽)。
 */
export const DRAFT_LIMIT_PREFIX = 'apply-draft:'

/**
 * 草稿接口每人每日上限。
 */
export const DRAFT_LIMIT_DAILY = 300

/**
 * 求职信 PDF 接口每人每日限额键前缀。
 */
export const COVER_LIMIT_PREFIX = 'apply-cover:'

/**
 * 求职信 PDF 接口每人每日上限。
 */
export const COVER_LIMIT_DAILY = 300

/**
 * 退信回调的密钥(Frank 亲手填进 Render;没配回 503)。
 */
export const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || ''

/**
 * 写求职信用哪个模型(2026-10-07 Frank「可以先用 qwen 真有人付钱再说」「然后随时切换」):
 * Render 上改环境变量 APPLY_LETTER_PROVIDER 就切(friend = 朋友的 qwen,anthropic = Claude,ollama = 本地);没配走 friend。
 */
export const LETTER_PROVIDER_ENV = process.env.APPLY_LETTER_PROVIDER || 'friend'

/**
 * 认得的模型通道(环境变量不在里面就按 friend)。
 */
export const LETTER_PROVIDERS = ['friend', 'anthropic', 'ollama'] as const

/**
 * 写信的输出上限(token;一封二百来词的信用不到一半)。
 */
export const LETTER_TOKENS_MAX = 700

/**
 * 写信的温度(要贴着简历事实写,不要发挥;2026-10-07 实测 0.4 会把 JD 职责安到候选人头上,降到 0.2)。
 */
export const LETTER_TEMPERATURE = 0.2

/**
 * 喂给模型的 JD 截到几个字(与简历、系统提示合起来不超朋友网关的 20000 字上限)。
 */
export const LETTER_JD_MAX = 7000

/**
 * 喂给模型的简历截到几个字。
 */
export const LETTER_RESUME_MAX = 9000

/**
 * 模型写回来的信短于这么多字当没写成(退回模板信)。
 */
export const LETTER_MIN_LEN = 120

/**
 * 写信接口每人每日限额键前缀(每次都要调模型,给紧一点)。
 */
export const LETTER_LIMIT_PREFIX = 'apply-letter:'

/**
 * 写信接口每人每日上限。
 */
export const LETTER_LIMIT_DAILY = 40

/**
 * 消息角色:系统。
 */
export const ROLE_SYSTEM = 'system'

/**
 * 消息角色:用户。
 */
export const ROLE_USER = 'user'

/**
 * 模型偶尔漏出来的 markdown 记号(粗体、标题井号)。
 */
export const MD_MARK_RE = /\*\*|__|^#+\s*/gm

/**
 * 思考型模型漏出来的 think 段。
 */
export const THINK_RE = /<think>[\s\S]*?<\/think>/g

/**
 * 连着三个以上的换行(压成一个空行)。
 */
export const BLANKS_RE = /\n{3,}/g

/**
 * 落款词后面多出来的空行(模型常把「Sincerely,」和署名隔开;收成紧挨着)。
 */
export const CLOSING_GAP_RE = /(Sincerely,|Best regards,|Kind regards,|Regards,)\n{2,}/g

/**
 * 落款词后面紧跟一个换行(替换串:$1 = 落款词)。
 */
export const CLOSING_TIGHT = '$1\n'

/**
 * 一个空行。
 */
export const BLANK_LINE = '\n\n'

/**
 * 附件接口的查询参数:投递行 id。
 */
export const P_ID = 'id'

/**
 * 附件接口的查询参数:要哪一个(resume / cover)。
 */
export const P_KIND = 'kind'

/**
 * 附件种类:求职信(其余一律当简历)。
 */
export const KIND_COVER = 'cover'

