/**
 * apply 子桶 letter 的常量:求职信页的接口、单选项键、小注词条;末段几条与父桶同值、各自抄(子桶不取父桶)。
 * 2026-10-10 Frank「大于 1000 就 拆 子桶」:apply 桶首个子桶。
 * 同日 Frank「两处都改吧」:单选项不再列给别的岗写过的信(信里是别家公司名),只列这一岗的草稿、本次在框里上传 / 改写的、
 * 不附求职信 —— 拉写过的信那一族(loadLetters / pastOptsOf、信清单接口地址、「写于」小注与键头、两格 past 状态)撤回。
 *
 * @author Frank
 * @time 2026-10-10 18:00:00
 */

/**
 * 写信接口回「不是 Pro」的码(同 lib/apply 的 E_PRO;402)。
 * 2026-10-10 投递框三步(Frank「用户只要一点击,就弹收费」):原试用码 trial、试用余量与黄条的词条键、升级钮词条键、
 * 黄条色档(E_TRIAL / TRIAL_LEFT_KEY / TRIAL_OUT_KEY / TRIAL_REASON_KEY / UPGRADE_KEY / NOTICE_WARN)随试用撤。
 */
export const E_PRO = 'pro'

/**
 * 文件抽字接口(上传求职信复用简历抽字那一个,不另建表:抽出来的字就是这一岗的信)。
 */
export const URL_EXTRACT = '/api/resume/extract'

/**
 * 求职信单选项:不附求职信(只发简历)。
 */
export const OPT_NONE = 'none'

/**
 * 「不附求职信」那一项(名字与小注界面取词;形同 types 的 LetterOpt)。
 */
export const OPT_NONE_ITEM = {
  /**
   * 选项键。
   */
  key: OPT_NONE,

  /**
   * 名字(界面取词)。
   */
  name: '',

  /**
   * 小注词条键(界面取词)。
   */
  subKey: '',

  /**
   * 小注日期。
   */
  subAt: '',

  /**
   * 正文(不附 = 空)。
   */
  text: '',
}

/**
 * 求职信单选项:这一岗的草稿。
 */
export const OPT_DRAFT = 'draft'

/**
 * 求职信单选项:按职位改写出来的那一封。
 */
export const OPT_AI = 'ai'

/**
 * 求职信单选项键头:刚上传的(后接上传时刻)。
 */
export const OPT_UP_HEAD = 'up'

/**
 * 这一岗草稿那一项的小注词条。
 */
export const DRAFT_SUB_KEY = 'ap.draftOpt'

/**
 * 按 JD 写信的接口(2026-10-07)。
 */
export const URL_LETTER = '/api/apply/letter'

/**
 * 写信接口没回信(网络 / 别的错)的词条。
 */
export const ERR_KEY_WRITE = 'ap.e.write'

/**
 * (以下与父桶 apply/constants.ts 同值,各自抄一份:子桶不取父桶,免得成环。)
 */

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 没有错误。
 */
export const ERR_NONE = ''

/**
 * 接口回得出、页面认得的错误码(其余一律当「没发出去」)。
 */
export const ERR_CODES = [
  'name', 'resume', 'chars', 'long', 'sent', 'draft', 'sameEmail', 'bounced', 'closed', 'noEmail', 'limit', 'busy',
  'mailOff', 'mail',
]

/**
 * 错误词条头(后接接口回的错误码)。
 */
export const ERR_KEY_HEAD = 'ap.e.'

/**
 * 上传没成的词条。
 */
export const ERR_KEY_UPLOAD = 'ap.e.upload'

/**
 * 带上登录 cookie。
 */
export const CRED_INCLUDE = 'include'

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
 * 上传表单里文件那一格的名字(同「我的简历」)。
 */
export const FIELD_FILE = 'file'

/**
 * 「上传于 {d}」的词条(同「我的简历」)。
 */
export const UPLOADED_KEY = 'rf.uploaded'

/**
 * 「按职位改写」钮(2026-10-10 投递框三步:原「按职位重写」挪到卡头右侧,简历与求职信各一颗;不进页自动写,
 * 模型写不成不再塞通用信,给「没写成」一行)。
 */
export const REWRITE_KEY = 'ap.rewriteJob'
