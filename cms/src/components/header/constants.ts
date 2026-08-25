/**
 * header 域的死值。路径常量的真相在 app/ 的文件系统路由 —— 这里起名是为了
 * 打错当场红(路径闸),不是第二份真相。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */

/**
 * 桌面下拉的延时关(ms):hover 离开后留一口气,斜着移进面板不至于闪关。
 */
export const HOVER_CLOSE_MS = 150

/**
 * 抽屉推主页面的位移(与抽屉同宽 —— push 而非 overlay,2026-08-09 Frank
 * 「点击的时候要有一个推动主页面的动画」)。
 */
export const PUSH_X = 'translateX(min(68vw, 280px))'

/**
 * 推主页面的过渡曲线。
 */
export const PUSH_TRANSITION = 'transform .24s cubic-bezier(.4,0,.2,1)'

/**
 * 回弹后摘 transition 的等待(ms):动画放完再摘,不然回弹没有动画。
 */
export const PUSH_RESET_MS = 300

/**
 * 身份接口(SSR 只知道有没有票据,是谁要问它)。
 */
export const API_ME = '/api/users/me'

/**
 * 首页(职位板)。
 */
export const PATH_HOME = '/'

/**
 * 就业把脉(E13-03 三页合一)。
 */
export const PATH_START = '/start'

/**
 * 拿 PR 评估(判定合一批2:/pathways 301 并入决策页)。
 */
export const PATH_PLAN_PR = '/plan/pr'

/**
 * 雇主板(指定名录 + 在招雇主)。
 */
export const PATH_EMPLOYERS = '/employers/designated'

/**
 * 职业库。
 */
export const PATH_OCC = '/occupations'

/**
 * 资料库·官方资源。
 */
export const PATH_RESOURCES = '/resources'

/**
 * 常见案例(2026-08-13 从决策页迁出成独立页)。
 */
export const PATH_CASES = '/cases'

/**
 * 移民新闻。
 */
export const PATH_NEWS = '/news'

/**
 * 政策时间线。
 */
export const PATH_TIMELINE = '/timeline'

/**
 * 高亮键:就业把脉。
 */
export const A_START = 'start'

/**
 * 高亮键:地区统计(并入把脉高亮)。
 */
export const A_STATS = 'stats'

/**
 * 高亮键:榜单(并入把脉高亮)。
 */
export const A_RANK = 'rank'

/**
 * 高亮键:职位板。
 */
export const A_JOBS = 'jobs'

/**
 * 高亮键:我的匹配(板内视图,并入职位高亮)。
 */
export const A_MATCH = 'match'

/**
 * 高亮键:拿 PR 评估。
 */
export const A_PATHWAYS = 'pathways'

/**
 * 高亮键:雇主板。
 */
export const A_EMPLOYERS = 'employers'

/**
 * 高亮键:移民新闻。
 */
export const A_NEWS = 'news'

/**
 * 账户区三态:身份未知(不在 SessionProvider 下的存量路径才会出现)。
 */
export const ACCT_LOADING = 'loading'

/**
 * 账户区三态:未登录。
 */
export const ACCT_OUT = 'out'

/**
 * 账户区三态:已登录(email 可能还没到,见 AccountLite 的占位圆)。
 */
export const ACCT_IN = 'in'

/**
 * 主内容区的选择器(抽屉推的就是它;layout 的 <main> 是唯一一个)。
 */
export const SEL_MAIN = 'main'

/**
 * 站点品牌标(枫叶 + 站名)。头栏 logo 与窄屏抽屉头共用同一处 —— 它是**品牌**不是文案:
 * 三语念的是同一个名字,搬进 i18n 只会多三份一模一样的值。
 */
export const BRAND_MARK = '🍁 Offer2PR'

/**
 * 登录弹框的开合态:空串 = 关着(AuthOpen = '' | 'login' | 'register',这是「关」那一个)。
 * 用空串而不是 null,是因为另外两个值本身就是「开在哪一页」,一个字符串从头管到尾,
 * 渲染那行只判 `auth !== ''` —— 宪法钦定的判空写法,不写 `!auth`。
 */
export const AUTH_CLOSED = ''

/**
 * 登录弹框开在「登录」页(2026-08-09 Frank「为什么要跳到 jobtable 页面再弹框」——
 * 就地开框,这个值就是开哪一页)。
 */
export const AUTH_LOGIN = 'login'

/**
 * 登录弹框开在「注册」页(头栏「注册」钮的 openRegister 设的就是它)。值不能随手改:
 * 它原样当 AuthModal 的 mode 交出去,对面收的是 auth 域的 AuthInitMode
 * ('login' | 'register' | 'reset' 字面量联合),两边不同字 tsc 当场红。
 */
export const AUTH_REGISTER = 'register'

/**
 * 空身份壳的邮箱:空串 = **有票据但身份还没到**,不是「没登录」(那是 ACCT_OUT)。
 * AccountLite 靠它分出占位圆那一帧 —— 不能让 Avatar 拿空 email 兜底成「?」
 * (2026-08-17 Frank「会先变成问号」)。
 */
export const EMAIL_UNKNOWN = ''

/**
 * aria-hidden 的真值。占位圆是纯装饰,读屏要跳过它;React 的 aria-* 收字符串,
 * 写 'true' 与渲染出的 HTML 一字不差(写布尔 React 也会转成这个串,不如照实写)。
 */
export const ARIA_TRUE = 'true'

/**
 * 登录钮的变体:ghost —— 头栏里两枚钮并排,登录是次要出口,不跟注册钮抢主色。
 */
export const KIND_LOGIN = 'ghost'

/**
 * 注册钮的变体:primary —— 注册是这站的转化入口,头栏唯一的主行动就是它。
 */
export const KIND_REGISTER = 'primary'

/**
 * 抽屉分组键:资料库(职业库/官方资源/常见案例)。抽屉单开 —— 展开哪一组靠这个键
 * 比对,与桌面导航的「资料库 ▾」是同一组。
 */
export const GRP_LIB = 'lib'

/**
 * 抽屉分组键:资讯(移民新闻、政策时间线)。给 DrawerGroup 当 groupKey,与 openGrp
 * 比对决定这一组展不展开 —— 值只要与 GRP_LIB 不撞名就行(它不进 DOM、不进 URL),
 * 取 `info` 是照桌面导航「资讯 ▾」的名,两处对着读得出是同一组。
 */
export const GRP_INFO = 'info'

/**
 * 抽屉「没有组展开」态:空串 = 两组全收着(再点一次开着的那组也回到它)。
 */
export const GRP_NONE = ''
