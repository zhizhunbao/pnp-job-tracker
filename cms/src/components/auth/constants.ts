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
 * 认证四条流全走 POST:每一次都是「提交一件事」(建号、换票据、发一封邮件),
 * 不是把某个 URL 的内容替换成什么(那才轮到 PUT);而且密码必须待在请求体里 ——
 * 走 GET 会把它写进 URL,浏览器历史、服务器日志、Referer 一路留痕。
 */
export const HTTP_POST = 'POST'

/**
 * 请求体的 Content-Type。四条流的 body 都是 JSON.stringify 出来的,不声明这一行,
 * 服务端会按别的解析器去读,拿到的字段全是空。
 */
export const MIME_JSON = 'application/json'

/**
 * fetch 的 cookie 开关:Payload 的登录票据是响应里的 httpOnly Set-Cookie,
 * include = 请求带上已有 cookie、响应回来的 Set-Cookie 也收下。
 * 找回邮件那条不涉及票据,所以它没写这一格。
 */
export const CREDENTIALS_INCLUDE = 'include'

/**
 * 重置密码时手上没有邮件 token 的写法:原样把空串发上去,由服务端判无效。
 * 空串在这一格的意思是「链接里没带 token」—— 前端自己抢着判,等于再编一套失败理由。
 */
/**
 * 头像色兜底:调色板空(不可能态,开灯批的显式落空)时不给色。
 */
export const AVATAR_COLOR_NONE = ''

export const TOKEN_NONE = ''

/**
 * 注册失败但响应体读不出来时的占位(网络断在半路,或对方回的根本不是 JSON)。
 * 它照样交给 registerErrKeyOf 去匹配,匹配不上就落到 generic 那条文案 ——
 * 空串在这一格的意思是「没有字段级理由可讲」,不是「没有错」。
 */
export const BODY_NONE = ''

/**
 * 统一基础问卷的宿主路径(/plan/pr 自己就是问卷宿主)。
 */
export const QUIZ_PATH = '/plan/pr'

/**
 * 统一题库里「拿枫叶卡」这个决定的 id:登录/注册后要不要先补问卷,判的就是这个
 * 决定的基础题答全了没有。别的决定各有自己的题面,这一处只认 pr。
 */
export const QUIZ_DECISION_PR = 'pr'

/**
 * 题库的阶段之「基础」:只有基础题缺了才拦人,探索题(explore)是用户自己愿意
 * 往下答的部分,缺了不打扰(登录后连着弹两屏问卷,人就走了)。
 */
export const QUIZ_STAGE_BASIC = 'basic'

/**
 * 问卷模式的查询参数名:/plan/pr 带上它才直接展开问卷,不带就是普通的决定页。
 */
export const P_QUIZ = 'quiz'

/**
 * 问卷模式的开关值。URL 参数只有字符串,所以「开」写成 '1' 而不是 true;
 * 「关」的写法是根本不带这个参数,没有 '0'。
 */
export const QUIZ_ON = '1'

/**
 * 职位 id 的查询参数名:从 /plan/pr?job=… 进来的人答完还要回到那个岗位上,
 * 跳问卷时把它原样带过去。
 */
export const P_JOB = 'job'

/**
 * 答完问卷后的回跳参数名:从别的页面(职位板等)进来的人按它回原处。
 * 与 P_JOB 二选一 —— 本来就站在问卷宿主页上的人不需要「回哪去」。
 */
export const P_NEXT = 'next'

/**
 * Google 整页 OAuth 的回跳参数前缀。问号、参数名、等号连成一个值,是因为这一处是
 * 手拼字符串(后面直接接 encodeURIComponent 的结果),没走 URLSearchParams。
 */
export const QS_RETURN_TO = '?returnTo='

/**
 * 回跳路径的兜底:站点根。调用方给的 returnTo 只要不是站内绝对路径就换成它 ——
 * 宁可把人送回首页,也不能拿一个外站地址当回跳(开放重定向)。
 */
export const PATH_ROOT = '/'

/**
 * 站内绝对路径的判据:以一个斜杠开头,且下一个字符不是斜杠。
 * 只查开头那一个斜杠会放 `//evil.com` 进来 —— 在浏览器眼里那是协议相对的外站地址。
 */
export const SAFE_PATH_RE = /^\/(?!\/)/

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
 * G 图标的边长(px)。svg 的 width/height 属性收的是字符串,所以是 '16' 不是 16;
 * 16 是它在钮里与文字齐平的那一档。
 */
export const G_ICON_PX = '16'

/**
 * G 图标的坐标系:上面四条官方路径画在 48x48 的格子里,viewBox 把整个格子映射到
 * G_ICON_PX 那个边长。动这一格等于裁剪官方图形。
 */
export const G_VIEW_BOX = '0 0 48 48'

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
 * 数「用了几类字符」的四支探针:小写、大写、数字、非字母数字(符号)。
 * 只数命中几支,顺序不参与判定 —— 三支算强,两支加长度算中(阈值见上面两条)。
 */
export const PW_CLASS_RES = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/]

/**
 * 强度条四档的文案键(下标 = PwLevel;档色在 auth.module.css 的 .lv0-.lv3)。
 */
export const PW_METER_KEYS = ['acct.pw.short', 'acct.pw.weak', 'acct.pw.medium', 'acct.pw.strong']

/**
 * 强度档文案与「补强提示」之间的分隔,两侧的空格属于这个值(拼出来是同一行里的
 * 两截话,不是两条并列信息)。只有弱、中两档拼这一截,强档没有可补的。
 */
export const PW_HINT_SEP = ' · '

/**
 * 提交钮的文案键:登录态。四条流各有自己的钮字,submitKeyOf 按态取(下同)——
 * 键写在这里而不是内联在函数里,是因为它同时是「这条流存不存在」的名单。
 */
export const KEY_SUBMIT_LOGIN = 'acct.login'

/**
 * 提交钮的文案键:注册态。刻意不是 acct.register(那条只有「注册」两个字)——
 * 这一钮按下去 runAuthFlow 先建号、紧接着自动登录,所以三语落文案都把两步写全
 * (「注册并登录」/ Create account & sign in),免得人建完号还在找登录入口。
 */
export const KEY_SUBMIT_REG = 'acct.submitReg'

/**
 * 提交钮的文案键:找回密码态(钮上是「发送」,人还没登录)。
 */
export const KEY_SUBMIT_FORGOT = 'acct.forgotSend'

/**
 * 提交钮的文案键:重置密码态。与注册那条同构,落文案是「设置新密码并登录」——
 * reset 这条流成功后 runAuthFlow 不再补一次登录请求,票据由 reset-password 的响应
 * 直接下发(fetch 那一格写了 CREDENTIALS_INCLUDE 就是为了收它),所以钮上敢写「并登录」。
 */
export const KEY_SUBMIT_RESET = 'acct.resetBtn'

/**
 * 页脚切换钮的文案键:当前在注册,钮上写「去登录」。
 */
export const KEY_TO_LOGIN = 'acct.toLogin'

/**
 * 页脚切换钮的文案键:当前在登录,钮上写「去注册」。
 */
export const KEY_TO_REG = 'acct.toReg'

/**
 * 判「这个邮箱已经注册过」的探针:Payload 400 的响应体是字段级报错的 JSON 串,
 * 里面会出现 email / already / registered / exist 这几个字眼之一。
 * 大小写不敏感 —— 那串字由库和框架各自生成,大小写不由我们定。
 */
export const REGISTER_EXISTS_RE = /email|already|registered|exist/i

/**
 * 判「密码不合服务端规矩」的探针:同样查 Payload 400 的响应体,出现 password 字样
 * 就整条归为密码类报错(长度、字符集都算)。故意只认一个词 —— 具体规矩由服务端定,
 * 前端抄一份细则迟早对不上;认不出就落 KEY_ERR_GENERIC,不猜。
 */
export const REGISTER_WEAK_PW_RE = /password/i

/**
 * 报错文案键:邮箱已注册。三语落文案都带下一步(「该邮箱已注册,请直接登录」),
 * 不是干报一句错 —— 注册页最常见的死路就是本人早有号却在这儿反复试密码。
 * 它与 KEY_ERR_WEAK_PW 是 registerErrKeyOf 认得出的仅有两条具体理由,其余落兜底那条。
 */
export const KEY_ERR_EXISTS = 'acct.err.exists'

/**
 * 报错文案键:密码不合格。前端长度不够、服务端回的密码类报错,两处都用它。
 */
export const KEY_ERR_WEAK_PW = 'acct.err.weakPw'

/**
 * 报错文案键:说不出具体原因的失败。兜底那条 —— 不猜原因,猜错等于骗用户。
 */
export const KEY_ERR_GENERIC = 'acct.err.generic'

/**
 * 报错文案键:邮箱或密码不对。登录失败一律用它,不分「查无此号」与「密码错」——
 * 分开说等于告诉外人哪些邮箱在本站注册过(账号枚举)。
 */
export const KEY_ERR_CRED = 'acct.err.cred'

/**
 * 报错文案键:重置链接无效或已过期(邮件里的 token 用过一次就作废)。
 */
export const KEY_ERR_RESET_BAD = 'acct.resetBad'

/**
 * umami 的注册成功事件名:漏斗里「注册」那一格数的就是它,
 * 改名等于把改名前后的数据断成两截。
 */
export const EVENT_SIGNUP = 'signup'

/**
 * 邮箱框的 type:交给浏览器做基本格式校验,手机上还会换成带 @ 的键盘。
 */
export const INPUT_TYPE_EMAIL = 'email'

/**
 * 密码框的 type:输入打码,并让密码管理器认出这是密码位。
 */
export const INPUT_TYPE_PASSWORD = 'password'

/**
 * 邮箱框的 autocomplete:让浏览器填已存的账号邮箱。与 INPUT_TYPE_EMAIL 同值不同事 ——
 * 一个说这控件是什么,一个说该往里填什么。
 */
export const AUTOCOMPLETE_EMAIL = 'email'

/**
 * 注册与重置时密码框的 autocomplete:告诉密码管理器「这是要设的新密码」,
 * 它才会提议生成一个,而不是把旧密码填进来。
 */
export const AUTOCOMPLETE_NEW_PW = 'new-password'

/**
 * 登录时密码框的 autocomplete:填已经存下的那一个。
 * 与上面一条填反的代价是用户每次登录都得手打密码。
 */
export const AUTOCOMPLETE_CURRENT_PW = 'current-password'

/**
 * 邮箱框的占位。example.com 是 RFC 2606 留给文档示例的域名,永远不会是真站,
 * 不会有人把它错当成我们的收信地址。
 */
export const EMAIL_PLACEHOLDER = 'you@example.com'

/**
 * 密码框的占位:八个圆点,数目就是最短位数(PW_MIN_LEN)—— 形状本身在说
 * 「至少八位」,不用再写一句话。
 */
export const PW_PLACEHOLDER = '••••••••'

/**
 * 提交中钮上的字。省略号是不用翻译的忙碌记号:钮字本来按态取自 i18n,
 * 忙的那一下换成它,三语读者都读得懂。
 */
export const SUBMIT_BUSY_LABEL = '…'

/**
 * 非提交钮的 type。button 元素不写 type 时默认是 submit,页脚那几个切换钮一旦
 * (现在或以后)落进 form 里,点一下就是一次提交 —— 显式写死。
 */
export const BTN_TYPE_BUTTON = 'button'

/**
 * 报错提醒框的色:notice 域四色里的红。与 FLOW_ERR 同值不同事 ——
 * 那个是一次提交的收场,这个是提醒框的颜色。
 */
export const NOTICE_ERR = 'err'

/**
 * 成功提醒框的色:notice 域四色里的绿。找回邮件发出那一页用它。
 */
export const NOTICE_OK = 'ok'

/**
 * 登录弹框的宽档:三档里最窄的 sm。表单只有邮箱、密码两个字段,
 * 再宽就是一屏空白。
 */
export const MODAL_SIZE_SM = 'sm'

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
 * 首字母头像取不到名字时的字:昵称、邮箱都缺席(或只有空白)时显示问号。
 * 它同时是拿去算底色的那个字符串,所以这类账号会得到同一个颜色。
 */
export const INITIAL_FALLBACK = '?'

/**
 * hash 的乘数(经典 31 进制字符串 hash)。
 */
export const HASH_BASE = 31

/**
 * 账户页路径(账户菜单的条目去处,下同 —— 打错是静默 404,所以全部起名)。
 */
export const PATH_ACCOUNT = '/account'

/**
 * 账户页·收藏节。
 */
export const PATH_ACCOUNT_FAVS = '/account?sec=favs'

/**
 * 账户页·存查节。
 */
export const PATH_ACCOUNT_SJOBS = '/account?sec=sjobs'

/**
 * 账户页·档案节。
 */
export const PATH_ACCOUNT_PROFILE = '/account?sec=profile'

/**
 * 账户页·订阅节。
 */
export const PATH_ACCOUNT_SAVED = '/account?sec=saved'

/**
 * 匹配视图入口。
 */
export const PATH_MATCH = '/?view=match'

/**
 * Google 整页 OAuth 的入口。
 */
export const PATH_GOOGLE_AUTH = '/api/auth/google'

/**
 * Payload 用户接口:注册(POST 建号)。
 */
export const API_USERS = '/api/users'

/**
 * Payload 用户接口:登录。
 */
export const API_LOGIN = '/api/users/login'

/**
 * Payload 用户接口:登出。
 */
export const API_LOGOUT = '/api/users/logout'

/**
 * Payload 用户接口:发找回邮件。
 */
export const API_FORGOT = '/api/users/forgot-password'

/**
 * Payload 用户接口:重置密码。
 */
export const API_RESET = '/api/users/reset-password'

/**
 * mousedown 事件名(平台定值,点外面关弹层用)。
 */
export const EV_MOUSEDOWN = 'mousedown'

/**
 * ARIA 的「菜单」记号:头像钮用它声明「点开是个菜单」(aria-haspopup),
 * 弹层用它声明「我就是那个菜单」(role)—— 同一个词,一处说因一处说果。
 */
export const ARIA_MENU = 'menu'

/**
 * ARIA 的「真」。首字母色块用 aria-hidden 把自己整个藏起来:它只是名字首字母的
 * 图形复述,读屏器读旁边的名字就够了,读一遍「W」是噪音。
 * ARIA 属性在 HTML 里收的是字符串('true' / 'false'),不是布尔。
 */
export const ARIA_TRUE = 'true'

/**
 * 昵称与邮箱都缺席时的展示兜底(em dash 占位)。
 */
export const NAME_FALLBACK = '—'

/**
 * 邮箱的分隔符(取 @ 前缀当短名用)。
 */
export const MAIL_AT = '@'

/**
 * Pro 层级的展示词(到期日拼接见 accountmenu;「·」分隔待 Frank 对文案铁律拍板)。
 */
export const PRO_LABEL = 'Pro'

/**
 * 品牌头的枫叶。登录弹框是品牌触点(用户拍板保留),这一枚叶子跟着站名一起出现,
 * 不是可有可无的装饰。
 */
export const BRAND_LEAF = '🍁'

/**
 * 站名。品牌词不翻译也不随语言变,三语页面上都是同一个词,所以它住常量不住 i18n。
 */
export const BRAND_NAME = 'Offer2PR'

/**
 * 账户头像钮的 title 缺省:昵称与邮箱都不知道时不挂 tooltip。
 * 空串在这一格的意思是「没有可显示的名字」,不是「名字是空的」。
 */
export const TITLE_NONE = ''

/**
 * Pro 到期日的缺省:免费号,或者知道是 Pro 但不知道到期日。
 * 弹层拿它判要不要渲那一行(见 AccountMenuPopIn.proUntil 的注释)。
 */
export const PRO_UNTIL_NONE = ''

/**
 * 表单字段的空初值:用户还没输入。
 * 与「输入过又清空」在类型上无从区分,但在流程上只出现在挂载那一刻。
 */
export const FIELD_EMPTY = ''

/**
 * 没有错误可报。每次提交前、切换模式后都要复位成它 ——
 * 留着上一次的错误比不报错更糟(用户以为这次也失败了)。
 */
export const ERR_NONE = ''

/**
 * URL 查询串的前导问号。只在**确有参数**时才拼上 ——
 * 空参数时留一个孤零零的 `?` 会让地址栏看着像出了错。
 */
export const QS_PREFIX = '?'

/**
 * 「回到登录」用的模式名。`sent`(已发出重置邮件)那屏的返回落在登录而不是上一屏 ——
 * 用户走到这一步的目的就是登录,退回忘密表单只会让他再填一次。
 */
export const MODE_BACK_TO = 'login'

/**
 * 没有查询串。与 QS_PREFIX 配对:参数删光之后地址栏该是干净的路径,
 * 不是一个孤零零的问号。
 */
export const QS_NONE = ''

/**
 * `history.replaceState` 的第二参。规范里它是「新条目的标题」,但**所有浏览器都忽略它** ——
 * 传空串是 MDN 给的写法(传别的字符串既不生效也不报错,只会让读的人以为它有用)。
 */
export const HISTORY_TITLE_UNUSED = ''
