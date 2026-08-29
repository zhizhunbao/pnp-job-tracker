/**
 * resume 域(简历对照 JD)的死值:三条接口地址与两个去处、请求的固定头与字段名、
 * 可传的文件后缀、两张错误码到文案键的映射表、表格两列的身份与列宽、显示用的记号。
 * 2026-08-28 换装批自 ResumeMatchModal.tsx 的散值收拢挂注释(值一个不改)。
 *
 * @author Frank
 * @time 2026-08-28 17:53:00
 */

/**
 * 拉档案的地址(打开弹框时预填上次存下的简历正文;失败静默 —— 存档只是便利,不挡功能)。
 */
export const URL_ME = '/api/users/me'

/**
 * 文件抽纯文本的地址(pdf/docx 走它;E11-07 的解析器,内存即弃)。
 */
export const URL_EXTRACT = '/api/resume/extract'

/**
 * 简历对照 JD 的地址(G3 主接口)。
 */
export const URL_MATCH = '/api/resume/match'

/**
 * 登录墙那行字的去处(直达登录,匿名不给对照 —— 同时喂注册漏斗)。
 */
export const URL_LOGIN = '/?login=1'

/**
 * 打码区升级钮的去处(带来路 `from=match`,好数清这个功能带来多少付费点击)。
 */
export const URL_PRICING = '/pricing?from=match'

/**
 * 两条写接口的方法名。
 */
export const METHOD_POST = 'POST'

/**
 * 带 cookie 发请求(三条接口都要登录态)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 请求头:内容类型(对照接口发 JSON;上传走 FormData 不设这个头,浏览器自己带 boundary)。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 请求体的内容类型。
 */
export const MIME_JSON = 'application/json'

/**
 * 上传表单里装文件的字段名(与 lib/resume 那边的 FIELD_FILE 同名同义,两边各自声明)。
 */
export const FIELD_FILE = 'file'

/**
 * 文件选择器能选的后缀(md/txt 浏览器直读,pdf/docx 交给服务端解析)。
 */
export const FILE_ACCEPT = '.pdf,.docx,.md,.markdown,.txt'

/**
 * 后缀分隔符(从文件名尾部取后缀用)。
 */
export const EXT_SEP = '.'

/**
 * 浏览器自己就能读成文本的后缀(其余后缀一律送 `/api/resume/extract`)。
 */
export const TEXT_EXTS = ['md', 'markdown', 'txt']

/**
 * 文件输入框的 type(选文件那一个,自己不出面 —— 由上传钮点它)。
 */
export const INPUT_FILE = 'file'

/**
 * 存档勾选框的 type。
 */
export const INPUT_CHECKBOX = 'checkbox'

/**
 * 粘贴框的行数(9 行 ≈ 一屏能看清的简历片段,再高弹框就要滚)。
 */
export const PASTE_ROWS = 9

/**
 * 弹框宽档(md = 560;左右两栏表格要摆得下两列字)。
 */
export const MODAL_SIZE = 'md'

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 「没有」的空文本(没错误、没预填时刻、没重写建议时的值)。
 */
export const TEXT_NONE = ''

/**
 * 忙碌记号(点下去到结果回来之间挂在钮文字前;一个记号胜过一句「请稍候」)。
 */
export const BUSY_MARK = '… '

/**
 * 命中记号(简历里找得到这条要求)。
 */
export const HIT_MARK = '✓ '

/**
 * 缺失记号(简历里没找到这条要求 —— 缺的排在前面,那才是要补的)。
 */
export const MISS_MARK = '✗ '

/**
 * 左列(工作要求)的列身份。
 */
export const COL_REQ_KEY = 'req'

/**
 * 右列(简历现状)的列身份。
 */
export const COL_RES_KEY = 'res'

/**
 * 左列列宽:要求原文长,先分它 42%,剩下的留给右列的判定与备注。
 */
export const COL_REQ_WIDTH = '42%'

/**
 * 埋点事件名:用户按下「对照」(#102 账单教训之后,这个功能每次调用都要数得清)。
 */
export const EV_MATCH_RUN = 'jd-match-run'

/**
 * 对照接口的错误码 → 文案键。每个错误码说自己的实话(2026-08-03 Frank 实撞:
 * noJd 被笼统报成「稍后再试」,而重试根本没用)。tooLong/busy 是端点迁移时
 * route 新发的两个码:tooLong = 重试没用得删内容,busy = 重试有用。
 */
export const MATCH_ERR_KEY: Record<string, string> = {
  /**
   * 登录态没了(会话过期):去登录。
   */
  auth: 'rm.login',

  /**
   * 上游模型忙/超时:等几秒重试有用。
   */
  busy: 'rm.busy',

  /**
   * 今天的免费次数用完了。
   */
  limit: 'rm.limit',

  /**
   * 这个岗还没有拿到职位描述全文(重试没用,换个岗)。
   */
  noJd: 'rm.noJd',

  /**
   * 简历 + JD 太长,超过模型的上限:删掉一些再试。
   */
  tooLong: 'rm.tooLong',

  /**
   * 简历文本太短,贴完整一些。
   */
  tooShort: 'rm.tooShort',
}

/**
 * 对照失败的兜底文案键(错误码不在上表里 —— 那多半是上游抽风,重试可能有用)。
 */
export const MATCH_ERR_KEY_DEFAULT = 'rm.err'

/**
 * 抽文本接口的错误码 → 文案键。
 */
export const FILE_ERR_KEY: Record<string, string> = {
  /**
   * 这份 PDF 没有文字层(扫描件):只能直接粘贴文本。
   */
  scan: 'rm.fileScan',

  /**
   * 文件超过 5MB。
   */
  size: 'rm.fileSize',
}

/**
 * 抽文本失败的兜底文案键(读不出文本:换个文件或直接粘贴)。
 */
export const FILE_ERR_KEY_DEFAULT = 'rm.fileErr'

/**
 * 类名之间的分隔(拼多类时用)。
 */
export const CLS_SEP = ' '
