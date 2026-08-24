/**
 * auth 域的死值。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */

/**
 * Google 钮开关:env 未配(后端凭据未上线)不渲染。NEXT_PUBLIC_* 是构建期内联的
 * 死值,所以这算常量不算运行时状态。
 */
export const GOOGLE_ON = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID != null
  && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !== ''

/**
 * 四态之:登录。
 */
export const MODE_LOGIN = 'login'

/**
 * 四态之:注册。
 */
export const MODE_REGISTER = 'register'

/**
 * 四态之:找回密码(输邮箱)。
 */
export const MODE_FORGOT = 'forgot'

/**
 * 四态之:重置密码(邮件链接落地)。
 */
export const MODE_RESET = 'reset'

/**
 * 提交收场之:找回邮件已(声称)发出。
 */
export const FLOW_SENT = 'sent'

/**
 * 提交收场之:已登录成功。
 */
export const FLOW_DONE = 'done'

/**
 * 提交收场之:报错。
 */
export const FLOW_ERR = 'err'

/**
 * 密码强度档:太短(不可提交)。
 */
export const PW_LV_SHORT = 0

/**
 * 密码强度档:弱。
 */
export const PW_LV_WEAK = 1

/**
 * 密码强度档:中。
 */
export const PW_LV_MEDIUM = 2

/**
 * 密码强度档:强。
 */
export const PW_LV_STRONG = 3

/**
 * Payload 字段级报错的状态码(400 = 响应体里带 email/password 的具体原因)。
 */
export const HTTP_BAD_REQUEST = 400

/**
 * 统一基础问卷的宿主路径(/plan/pr 自己就是问卷宿主)。
 */
export const QUIZ_PATH = '/plan/pr'

/**
 * Google G 的品牌红(官方定值,下同 —— 品牌四色不许换)。
 */
export const G_RED = '#EA4335'

/**
 * Google G 的品牌蓝。
 */
export const G_BLUE = '#4285F4'

/**
 * Google G 的品牌黄。
 */
export const G_YELLOW = '#FBBC05'

/**
 * Google G 的品牌绿。
 */
export const G_GREEN = '#34A853'

/**
 * Google G 红瓣的 svg 路径(官方图形数据,原样拼接)。
 */
export const G_PATH_RED = 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 '
  + '14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'

/**
 * Google G 蓝瓣的 svg 路径。
 */
export const G_PATH_BLUE = 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 '
  + '5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'

/**
 * Google G 黄瓣的 svg 路径。
 */
export const G_PATH_YELLOW = 'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19'
  + 'C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'

/**
 * Google G 绿瓣的 svg 路径。
 */
export const G_PATH_GREEN = 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 '
  + '2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'

/**
 * 密码最短位数(服务端同款;只有「太短」拦提交,强度条是引导不是闸门,避免误伤转化)。
 */
export const PW_MIN_LEN = 8

/**
 * 「长密码补强」阈值:两类字符 + 这个长度也算强。
 */
export const PW_LONG_LEN = 12

/**
 * 判「强」的字符类数(大写/小写/数字/符号里占几类)。
 */
export const PW_CLASSES_STRONG = 3

/**
 * 判「中」的字符类数。
 */
export const PW_CLASSES_MEDIUM = 2

/**
 * 强度条四档的文案键(下标 = PwLevel;档色在 auth.module.css 的 .lv0-.lv3)。
 */
export const PW_METER_KEYS = ['acct.pw.short', 'acct.pw.weak', 'acct.pw.medium', 'acct.pw.strong']

/**
 * 界面语言在 localStorage 里的键(与 lib/i18n 同源读法 —— 注册时把语言随档存下,
 * 邮件才能按本人语言发)。
 */
export const LOCALE_KEY = 'jobs.lang'

/**
 * 读不到语言时的兜底(中文流量为主)。
 */
export const LOCALE_DEFAULT = 'zh'

/**
 * Google 回跳失败的 URL 参数名(?oauth=fail 落回登录框给可见提示)。
 */
export const OAUTH_PARAM = 'oauth'

/**
 * 回跳失败参数的值。
 */
export const OAUTH_FAIL = 'fail'

/**
 * 首字母头像的色板(由名字稳定 hash 选色,同一人恒定色)。
 */
export const AVATAR_PALETTE = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5']

/**
 * 头像默认直径(px)。
 */
export const AVATAR_SIZE_DEFAULT = 36

/**
 * 账户菜单钮里的头像直径(px)。
 */
export const AVATAR_SIZE_MENU = 28

/**
 * 首字母字号占直径的比例。
 */
export const AVATAR_FONT_RATIO = 0.44

/**
 * hash 的乘数(经典 31 进制字符串 hash)。
 */
export const HASH_BASE = 31

/**
 * 账户区定宽槽:与 Header 的 ACCT_SLOT_W 同值。两处差 1px,登录态导航整排就平移 1px
 * (2026-07-31 实撞过 52px 错位)—— 常量留在 Header,这里按值对齐避免循环 import。
 */
export const SLOT_W = 32
