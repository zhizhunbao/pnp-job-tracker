/**
 * me 桶子桶 settings 的死值。
 *
 * @author Frank
 * @time 2026-11-07 23:55:00
 */

/**
 * 改密码接口。
 */
export const URL_PW = '/api/auth/password'

/**
 * 申请改登录邮箱接口(发确认信)。
 */
export const URL_EMAIL = '/api/auth/email'

/**
 * 提交的方法。
 */
export const METHOD_POST = 'POST'

/**
 * 请求带 cookie(登录态)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 请求头名:内容类型。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 的 MIME。
 */
export const MIME_JSON = 'application/json'

/**
 * 注册来路:Google(lib/auth 同名同值;这类账号不给改)。
 */
export const PROVIDER_GOOGLE = 'google'

/**
 * 新密码至少几位(与注册、lib/auth 同一个下限)。
 */
export const PW_MIN_LEN = 8

/**
 * 面板:都关着。
 */
export const PANEL_NONE = ''

/**
 * 面板:修改密码。
 */
export const PANEL_PW = 'pw'

/**
 * 面板:修改登录邮箱。
 */
export const PANEL_EMAIL = 'email'

/**
 * 空串(没报错、表单清空)。
 */
export const TEXT_NONE = ''

/**
 * 网络断了的结果码。
 */
export const E_NET = 'net'

/**
 * 认不得的结果码落的那句(「没成功,稍后再试」)。
 */
export const NET_KEY = 'set.e.net'

/**
 * 结果码 → 报错词条(服务端 lib/auth 的结果码 + 前端自判的 match / weak;认不得的落 net)。
 */
export const ERR_KEY: Record<string, string> = {
  /**
   * 当前密码不对。
   */
  wrong: 'set.e.wrong',

  /**
   * 新密码太短。
   */
  weak: 'set.e.weak',

  /**
   * 两次新密码不一样。
   */
  match: 'set.e.match',

  /**
   * 邮箱格式不对。
   */
  email: 'set.e.email',

  /**
   * 和现在的登录邮箱一样。
   */
  same: 'set.e.same',

  /**
   * 邮箱已注册。
   */
  taken: 'set.e.taken',

  /**
   * 确认信没发出去。
   */
  mail: 'set.e.mail',

  /**
   * 网络断了或别的。
   */
  net: 'set.e.net',
}

/**
 * 前端自判的结果码:两次新密码不一样。
 */
export const E_MATCH = 'match'

/**
 * 前端自判的结果码:新密码太短。
 */
export const E_WEAK = 'weak'

/**
 * 全站分区白卡(CLAUDE.md「页面与弹框正文一律分区卡」)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 白卡卡头。
 */
export const CARD_HEAD_CLS = 'mcardHead'

/**
 * 行末「修改」钮的样式档。
 */
export const EDIT_KIND = 'secondary'

/**
 * 面板底栏主钮的样式档。
 */
export const PRIMARY_KIND = 'primary'

/**
 * 提示:成功。
 */
export const TOAST_OK = 'ok'

/**
 * 密码框打的点(只是显示,不是真密码)。
 */
export const PW_MASK = '••••••••'

/**
 * 输入类型:密码框。
 */
export const TYPE_PW = 'password'

/**
 * 输入类型:邮箱框。
 */
export const TYPE_EMAIL = 'email'

/**
 * 自动填充提示:当前密码(密码管理器认得出)。
 */
export const AC_CUR_PW = 'current-password'

/**
 * 自动填充提示:新密码。
 */
export const AC_NEW_PW = 'new-password'

/**
 * 自动填充提示:邮箱。
 */
export const AC_EMAIL = 'email'

/**
 * 报错那句的 ARIA 角色(读屏器当场念出来)。
 */
export const ROLE_ALERT = 'alert'

/**
 * 表单格没有灰字提示。
 */
export const HINT_NONE = ''

