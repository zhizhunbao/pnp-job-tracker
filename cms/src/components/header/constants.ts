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
