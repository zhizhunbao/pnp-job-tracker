/**
 * 会话域的死值:票据 cookie 名。
 *
 * @author Frank
 * @time 2026-08-23 00:10:00
 */

/**
 * Payload 会话 cookie 名。payload.config 未配 cookiePrefix → 用默认名;
 * 改名要连 api/auth/google/callback 的 Set-Cookie 一起改(那条自己签同名 token)。
 */
export const SSR_TOKEN_COOKIE = 'payload-token'

/**
 * 站点根 URL(回跳/redirect_uri 一律显式取它 —— 老坑:上生产的绝对 URL 别信 origin 回退)。
 */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

/**
 * Google OAuth 客户端 id(env 未配 = 登录未开通,第 1 跳 404,前端钮同门控不渲染)。
 */
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

/**
 * Google OAuth 客户端密钥(只进服务端 env)。
 */
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

/**
 * Google 同意屏端点。
 */
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

/**
 * code 换 token 端点。
 */
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/**
 * openid 标准 userinfo 端点。
 */
export const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

/**
 * 申请的 scope(openid + 已验证邮箱 + 头像昵称)。
 */
export const OAUTH_SCOPE = 'openid email profile'

/**
 * state 防 CSRF cookie 名(第 1 跳种、回调核对)。
 */
export const STATE_COOKIE = 'g_oauth_state'

/**
 * 回跳目标 cookie 名(E9-04b,Frank 报障「登录后跳到首页,之前那个页面没了」)。
 */
export const RETURN_COOKIE = 'g_oauth_return'

/**
 * 站内路径白名单(以 / 开头且非 //,防 open redirect;可见 ASCII ≤200)。
 */
export const RETURN_RE = /^\/(?!\/)[\x21-\x7e]{0,200}$/

/**
 * 登录迹象 cookie 名 —— 与 lib/quiz 的 LI_COOKIE **同名联动**(#311):token 是 httpOnly,
 * OAuth 又是整页跳转没有客户端登录回调,这里不种迹象的话 Google 用户的答案档同步永远不开闸。
 * 改名要三处一起:这里、quiz/constants 的 LI_COOKIE/LI_RE。
 */
export const LI_COOKIE = 'o2p_li'

/**
 * 新用户 loginProvider 标记(随机密码,用户不持有 —— 走 Google 或忘记密码自设)。
 */
export const PROVIDER_GOOGLE = 'google'

/**
 * 回调路径(redirect_uri = SITE + 它;两跳共用一处)。
 */
export const CALLBACK_PATH = '/api/auth/google/callback'

/**
 * 同意屏 URL 的固定参数(response_type/scope/prompt;动态的三个见 PARAM_*)。
 */
export const CONSENT_STATIC: [string, string][] = [
  ['response_type', 'code'],
  ['scope', OAUTH_SCOPE],
  ['prompt', 'select_account'],
]

/**
 * OAuth 参数名:client_id。
 */
export const PARAM_CLIENT_ID = 'client_id'

/**
 * OAuth 参数名:redirect_uri。
 */
export const PARAM_REDIRECT = 'redirect_uri'

/**
 * OAuth 参数名:state。
 */
export const PARAM_STATE = 'state'

/**
 * 换 token 的 grant_type 值。
 */
export const GRANT_AUTH_CODE = 'authorization_code'

/**
 * 换 token 请求的 HTTP 方法。
 */
export const METHOD_POST = 'POST'

/**
 * 表单编码的 MIME(token 端点要求)。
 */
export const FORM_MIME = 'application/x-www-form-urlencoded'

/**
 * Authorization 头的 Bearer 前缀。
 */
export const BEARER_PREFIX = 'Bearer '

/**
 * https 判定前缀(secureSuffix 用)。
 */
export const HTTPS_PREFIX = 'https'

/**
 * https 站点 cookie 的 Secure 尾缀。
 */
export const SECURE_TAIL = '; Secure'

/**
 * OAuth 流程 cookie 的属性尾(后接 maxAge + Secure)。
 */
export const FLOW_COOKIE_TAIL = '; Path=/; HttpOnly; SameSite=Lax; Max-Age='

/**
 * 会话 cookie 的属性尾(后接 maxAge + Secure;HttpOnly 只给 token 那条另加)。
 */
export const SESSION_COOKIE_TAIL = '; Path=/; SameSite=Lax; Max-Age='

/**
 * token cookie 的 HttpOnly 片段。
 */
export const HTTPONLY_TAIL = '; HttpOnly'

/**
 * cookie 名值对的等号。
 */
export const KV_EQ = '='

/**
 * 会话 token cookie 的名字尾(前缀来自 payload.config)。
 */
export const TOKEN_NAME_TAIL = '-token'

/**
 * 登录迹象 cookie 的名值对(与 quiz 的 LI_SET_ON 同源;见 LI_COOKIE 注释)。
 */
export const LI_PAIR = 'o2p_li=1'

/**
 * Cookie 头取值正则的头半(后接 cookie 名)。
 */
export const COOKIE_RE_HEAD = '(?:^|;\\s*)'

/**
 * Cookie 头取值正则的尾半(捕获组)。
 */
export const COOKIE_RE_TAIL = '=([^;]+)'

/**
 * 站内回跳兜底(首页)。
 */
export const ROOT_PATH = '/'

/**
 * 用户表 collection 名。
 */
export const USERS = 'users'

/**
 * payload.config 未配 cookiePrefix 时的默认前缀。
 */
export const COOKIE_PREFIX_DEFAULT = 'payload'

/**
 * hex 补位字符(随机密码字节转两位 hex)。
 */
export const HEX_PAD = '0'

/**
 * OAuth 参数名:code(回调收授权码)。
 */
export const PARAM_CODE = 'code'

/**
 * OAuth 参数名:error(同意屏拒绝/出错)。
 */
export const PARAM_ERROR = 'error'

/**
 * 流程 cookie 的有效秒数(10 分钟够走完两跳)。
 */
export const FLOW_COOKIE_AGE = 600

/**
 * 登录失败的落点(带 oauth=fail,前端登录框据此提示)。
 */
export const FAIL_PATH = '/?login=1&oauth=fail'

/**
 * Cookie 请求头名。
 */
export const HDR_COOKIE = 'cookie'

/**
 * 第 1 跳的回跳目标参数名(登录钮携带)。
 */
export const PARAM_RETURN_TO = 'returnTo'

/**
 * env 未配 client_id 时第 1 跳的响应体(前端钮同门控不渲染,本路由只是兜底)。
 */
export const MSG_NOT_CONFIGURED = 'Google login not configured'

/**
 * 失败留痕话术：env 没配齐。
 */
export const LOG_ENV_MISSING = 'env missing'

/**
 * 失败留痕话术：同意屏没带回 code。
 */
export const LOG_NO_CODE = 'no code'

/**
 * 失败留痕话术：同意屏拒绝/出错前缀。
 */
export const LOG_CONSENT = 'consent error: '

/**
 * 失败留痕话术：state 不对（CSRF 闸）。
 */
export const LOG_STATE = 'state mismatch'

/**
 * 失败留痕话术：换 token 失败。
 */
export const LOG_TOKEN = 'token exchange failed'

/**
 * 失败留痕话术：邮箱缺失或未验证。
 */
export const LOG_EMAIL = 'email missing/unverified'

/**
 * 失败留痕话术：签会话抛错前缀。
 */
export const LOG_LOGIN = 'login failed: '

/**
 * 登录回调产物的 kind：失败。
 */
export const K_FAIL = 'fail'

/**
 * 登录回调产物的 kind：成功。
 */
export const K_OK = 'ok'

/**
 * http 站点的 cookie 尾缀:空串,什么都不追加(与 SECURE_TAIL 是同一格的两个取值)。
 * 带 `Secure` 的 cookie 浏览器只在 https 下才肯收下,本地 dev 走的是 http ——
 * 不分站点一律加,登录当场断在第一跳而且不报错。所以这里的「没有」必须是真的什么都不拼。
 */
export const SECURE_TAIL_NONE = ''

/**
 * userinfo 还没给出邮箱时的起手值。Google 的响应是外部数据,先按「没有」落地、
 * 逐格判过才敢用;空串同时接住「这格缺席」和「这格不是字符串」两种脏法,
 * 于是下面只留一条拒收线(空 = 不给签会话),不必为两种情形各写一支。
 */
export const EMAIL_NONE = ''

/**
 * 随机密码的 hex 片段之间不插东西:24 个字节各转两位 hex,首尾相接成 48 位的一整串。
 * 插任何分隔符都会让密码里混进非 hex 字符、长度也对不上 —— 而这串密码用户并不持有
 * (走 Google 或忘记密码自设),它唯一的作用就是别让账号留着空密码。
 */
export const HEX_SEP = ''

/**
 * 请求没带 returnTo 时的占位。空串过不了 `RETURN_RE`(它要求以 / 开头),
 * 于是「没带」和「带了个非法值」自动走同一条路:不种回跳 cookie,登录后回首页 ——
 * 少一个分支,也少一次「忘了判空」的机会。
 */
export const RETURN_NONE = ''

/**
 * 删 cookie 时给的值:空串。HTTP 没有「删除 cookie」这个动作 ——
 * 删一条就是**再种一次同名的**、值清空、`Max-Age=0` 让它当场过期
 * (所以调用处一律配 `maxAge: 0`,见 oauthCookie)。
 */
export const COOKIE_DEL_VALUE = ''
