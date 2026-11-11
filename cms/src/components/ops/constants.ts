/**
 * ops 组件域的死值:侧栏结构、路径、删除文案与样式类名(内部页,文案只有中文,同 funnel)。
 * 2026-11-10 Frank「内部页也要三语,界面字不进 lib」撤上一句:带 `_TEXT` 与 NAV_ARIA 的值都是词条键,文字住 lib/i18n 三语文件。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */

/**
 * 运维页根路径。
 */
export const PATH_OPS = '/ops'

/**
 * 路径分隔。
 */
export const PATH_SEP = '/'

/**
 * 运维页标题。
 */
export const TITLE_TEXT = 'ops.title'

/**
 * 侧栏的无障碍名。
 */
export const NAV_ARIA = 'ops.title'

/**
 * 没有文字。
 */
export const TEXT_NONE = ''

/**
 * 没有时刻。
 */
export const ISO_NONE = ''

/**
 * 表的空态。
 */
export const EMPTY_TEXT = 'ops.empty'

/**
 * 全站白卡的类名。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 全站卡头的类名。
 */
export const CARD_HEAD_CLS = 'mcardHead'

/**
 * 类名分隔。
 */
export const CLS_SEP = ' '

/**
 * 没有条数的导航项。
 */
export const NAV_COUNT_NONE = 0

/**
 * 每页几行(同就业把脉的 CARD_PAGE_SIZE)。
 */
export const OPS_PAGE_SIZE = 10

/**
 * 表格最小宽度。
 */
export const TABLE_MIN_W = 640

/**
 * banner 的配色档。
 */
export const BANNER_MODULE = 'home'

/**
 * Shell 上下距。
 */
export const SHELL_TOP = 0

/**
 * Shell 下距。
 */
export const SHELL_BOTTOM = 0

/**
 * 卡片正文里各段的分隔。
 */
export const NOTE_SEP = ', '

/**
 * 删除接口。
 */
export const API_REMOVE = '/api/ops/remove'

/**
 * POST。
 */
export const METHOD_POST = 'POST'

/**
 * 请求头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON。
 */
export const MIME_JSON = 'application/json'

/**
 * 删除钮的样式档。
 */
export const DEL_BTN_KIND = 'secondary'

/**
 * 删除钮文字。
 */
export const DEL_TEXT = 'ops.del'

/**
 * 取消钮文字。
 */
export const CANCEL_TEXT = 'ops.cancel'

/**
 * 确认框标题。
 */
export const DEL_ASK_TEXT = 'ops.delAsk'

/**
 * 删除失败的胶囊。
 */
export const DEL_FAIL_TEXT = 'ops.delFail'

/**
 * 删除失败胶囊的变体。
 */
export const VAR_BAD = 'bad'

/**
 * 单元格种类:胶囊。
 */
export const CELL_TAGS = 'tags'

/**
 * 单元格种类:删除。
 */
export const CELL_DEL = 'del'

/**
 * 单元格种类:复制报错。
 */
export const CELL_COPY = 'copy'

/**
 * 复制报错钮文字。
 */
export const COPY_TEXT = 'ops.copy'

/**
 * 复制成功提示。
 */
export const COPY_OK_TEXT = 'ops.copyOk'

/**
 * 复制失败提示。
 */
export const COPY_FAIL_TEXT = 'ops.copyFail'

/**
 * 提示档:成功。
 */
export const TOAST_OK = 'ok'

/**
 * 提示档:失败。
 */
export const TOAST_ERR = 'err'

/**
 * 单元格种类:主名加灰字。
 */
export const CELL_NAMED = 'named'

/**
 * 单元格种类:文字。
 */
export const CELL_TEXT = 'text'

/**
 * 总览的侧栏名。
 */
export const CAT_REPORT_TEXT = 'ops.cat.report'

/**
 * 侧栏分类:调度。
 */
export const CAT_SCHEDULE = 'schedule'

/**
 * 侧栏分类:队列。
 */
export const CAT_QUEUE = 'queue'

/**
 * 侧栏分类:费用。
 */
export const CAT_FEE = 'fee'

/**
 * 队列分类名。
 */
export const CAT_QUEUE_TEXT = 'ops.cat.queue'

/**
 * 费用分类名。
 */
export const CAT_FEE_TEXT = 'ops.cat.fee'

/**
 * 事件操作接口。
 */
export const API_ALERT = '/api/ops/alert'

/**
 * 单元格种类:事件操作。
 */
export const CELL_ACT = 'act'

/**
 * 事件操作失败的提示。
 */
export const ACT_FAIL_TEXT = 'ops.actFail'

/**
 * 操作钮的样式档。
 */
export const ACT_BTN_KIND = 'secondary'

/**
 * 侧栏分类:事件。
 */
export const CAT_INCIDENT = 'incident'

/**
 * 事件分类名。
 */
export const CAT_INCIDENT_TEXT = 'ops.cat.incident'

/**
 * 侧栏分类:AI 通道。
 */
export const CAT_CHANNEL = 'channel'

/**
 * AI 通道分类名。
 */
export const CAT_CHANNEL_TEXT = 'ops.cat.channel'
