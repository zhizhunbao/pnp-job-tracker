/**
 * assistant 组件桶的常量:全站右下角对话助手的入口与对话面板(2026-11-14 Frank「开始做吧」「照表做」)。
 * 服务端在 lib/assistant:GET /api/assistant/ready 探活,POST /api/assistant/chat 一轮问答。
 * 界面字全在 lib/i18n 的 asst.* 词条,这里只放词条键、接口地址、状态码与读屏角色。
 *
 * @author Frank
 * @time 2026-11-14 12:00:00
 */

/**
 * 探活接口:盒子在线才回 ready=true。
 */
export const READY_URL = '/api/assistant/ready'

/**
 * 一轮问答接口。
 */
export const CHAT_URL = '/api/assistant/chat'

/**
 * 发问用的方法。
 */
export const METHOD_POST = 'POST'

/**
 * 请求头:正文是 JSON。
 */
export const JSON_HEADERS = {
  /**
   * 正文类型。
   */
  'content-type': 'application/json',
}

/**
 * 超过限流的状态码。
 */
export const STATUS_LIMIT = 429

/**
 * 盒子不在线的状态码。
 */
export const STATUS_OFFLINE = 503

/**
 * 一轮的结果:答上了。
 */
export const SEND_OK = 'ok'

/**
 * 一轮的结果:今天聊得太多。
 */
export const SEND_LIMIT = 'limit'

/**
 * 一轮的结果:盒子不在线(收起入口)。
 */
export const SEND_OFFLINE = 'offline'

/**
 * 一轮的结果:没连上或模型没答上来。
 */
export const SEND_NET = 'net'

/**
 * 访客说的。
 */
export const ROLE_USER = 'user'

/**
 * 助手说的。
 */
export const ROLE_BOT = 'assistant'

/**
 * 没有文字。
 */
export const TEXT_NONE = ''

/**
 * 站内相对地址的开头;回包里的链接不是这个开头的不渲。
 */
export const PATH_HEAD = '/'

/**
 * 两个斜杠开头的是别的站(省了协议头的写法),不算站内地址。
 */
export const NET_PATH_HEAD = '//'

/**
 * 每轮两条消息(一问一答):带几轮历史 × 它 = 带几条。
 */
export const MSGS_PER_TURN = 2

/**
 * 页面键 → 页名词条键。键与 lib/assistant 页面清单 PAGE_ROUTE 的 13 个键一一对应(单测守着);
 * 回包里不在这张表里的键不渲(没有页名)。
 */
export const PAGE_LABEL: Record<string, string> = {
  /**
   * 职位板。
   */
  jobs: 'asst.page.jobs',

  /**
   * 雇主板。
   */
  employers: 'asst.page.employers',

  /**
   * 职业页。
   */
  occupations: 'asst.page.occupations',

  /**
   * 通道页。
   */
  streams: 'asst.page.streams',

  /**
   * 申请步骤。
   */
  steps: 'asst.page.steps',

  /**
   * 官方新闻。
   */
  news: 'asst.page.news',

  /**
   * 官方资源导航。
   */
  resources: 'asst.page.resources',

  /**
   * 定价。
   */
  pricing: 'asst.page.pricing',

  /**
   * 档案与简历。
   */
  profile: 'asst.page.profile',

  /**
   * 我的求职。
   */
  applications: 'asst.page.applications',

  /**
   * 收件箱。
   */
  inbox: 'asst.page.inbox',

  /**
   * 我的订阅。
   */
  alerts: 'asst.page.alerts',

  /**
   * 账户设置。
   */
  settings: 'asst.page.settings',
}

/**
 * 等回复超过这么久加一句「还在想」(Fluent 2 Wait UX 的 Timing thresholds:超三秒要给一句文字)。
 */
export const SLOW_MS = 3000

/**
 * 没有出错。
 */
export const ERR_NONE = 'none'

/**
 * 出错:今天聊得太多。
 */
export const ERR_LIMIT = 'limit'

/**
 * 出错:没连上。
 */
export const ERR_NET = 'net'

/**
 * 出错一档 → 提示词条键。
 */
export const ERR_KEY = {
  /**
   * 没有出错(不出提示,键不会被取)。
   */
  none: 'asst.err.net',

  /**
   * 今天聊得太多。
   */
  limit: 'asst.err.limit',

  /**
   * 没连上。
   */
  net: 'asst.err.net',
}

/**
 * 键盘按下事件名。
 */
export const EVT_KEYDOWN = 'keydown'

/**
 * Esc:关面板。
 */
export const KEY_ESC = 'Escape'

/**
 * 回车:发送(按着 Shift 是换行)。
 */
export const KEY_ENTER = 'Enter'

/**
 * 面板的读屏角色。
 */
export const ROLE_DIALOG = 'dialog'

/**
 * 对话区的读屏角色:日志(新内容往后加)。
 */
export const ROLE_LOG = 'log'

/**
 * 出错提示的读屏角色:马上播报。
 */
export const ROLE_ALERT = 'alert'

/**
 * 对话区的播报档:新回复等读屏读完手上的再报。
 */
export const ARIA_POLITE = 'polite'

/**
 * 埋点:开面板。
 */
export const EV_OPEN = 'assistant-open'

/**
 * 埋点:发出一条。
 */
export const EV_SEND = 'assistant-send'

/**
 * 圆钮与关闭钮用最素的钮底(视觉全由本域的类定形;与 toast 的 PLAIN_BTN_KIND 同值,各域自抄)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 入口那只小猫的图(2026-11-14 Frank「右下角可不可以放一个3d 的小动物」「小猫有吗」「用这只猫」;本站自画的矢量图,住 public/img)。
 */
export const DOCK_IMG_SRC = '/img/assistant-cat.svg'

/**
 * 小猫图的边长(px;样式里手机上再收一档)。
 */
export const DOCK_IMG_PX = 72

/**
 * 关闭钮里图标的边长。
 */
export const CLOSE_ICON_PX = 18

/**
 * 输入框默认几行高。
 */
export const INPUT_ROWS = 2

/**
 * 拼类名的分隔符。
 */
export const CLS_SEP = ' '
