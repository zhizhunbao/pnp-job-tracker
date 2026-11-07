/**
 * me 桶子桶 apps 的死值(只读投递框;2026-11-07 自 myjobs 桶的 appview / 子桶 thread 在新域重写,接口、深链 `?app=` 与
 * 事件名照旧;「已发给 <公司>」成功条 SentNotice 随唯一消费者归 apply 桶)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 我的投递清单接口(框里「职位信息」那张卡按投递行 id 在清单里找那一行)。
 */
export const URL_APPLIED = '/api/myjobs/applied'

/**
 * 一条投递的往来接口(后接投递行 id)。
 */
export const URL_THREAD_HEAD = '/api/inbox/thread?app='

/**
 * 只读投递框的查询参数(`?app=<投递行 id>`;邮件链接、收件箱「打开这次投递」、我的投递「打开」都走这个口)。
 */
export const P_APP = 'app'

/**
 * 开 / 关只读投递框时通知宿主重读地址栏的事件名(与旧 myjobs 桶同名,新旧宿主过渡期互认)。
 */
export const EV_APP_NAV = 'myjobs:app'

/**
 * 浏览器后退 / 前进的事件名(手机返回键先关框)。
 */
export const EV_POPSTATE = 'popstate'

/**
 * fetch 的凭据档:同源带 cookie。
 */
export const CRED_INCLUDE = 'include'

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 草稿的投递状态值(草稿没有附件)。
 */
export const ST_DRAFT = 'draft'

/**
 * 附件接口头(后接投递行 id 与种类;只给本人、只给发出去了的)。
 */
export const URL_FILE_HEAD = '/api/apply/file?id='

/**
 * 附件种类尾:发出去的那份简历。
 */
export const FILE_RESUME_TAIL = '&kind=resume'

/**
 * 附件种类尾:那封求职信(PDF)。
 */
export const FILE_COVER_TAIL = '&kind=cover'

/**
 * 附件在新标签页打开。
 */
export const TARGET_BLANK = '_blank'

/**
 * 只读投递框的尺寸记忆键(10-09 Frank「所有弹框 都能放大缩小 拖动,保持一致」:与投递框、职位 / 公司弹框共用一份
 * 记住的宽高;值与 apply 的 APPLY_MODAL_PREF 相同,各域自抄)。
 */
export const AV_MODAL_PREF = 'adv_modal_pref'

/**
 * 只读投递框没有记忆时的宽(px;照投递框)。
 */
export const AV_MODAL_W = 900

/**
 * 只读投递框没有记忆时的高(px;照投递框)。
 */
export const AV_MODAL_H = 760

/**
 * 「已发出 <时刻>」胶囊的变体(绿:成功)。
 */
export const SENT_TAG = 'ok'

/**
 * 卡标题行的全局类(main.css 的 mcardHead)。
 */
export const CARD_HEAD_CLS = 'mcardHead'

/**
 * 分区白卡的全局类(main.css 的 cardMd)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 空的懒翻表(只读投递框一行一条,不另起懒翻;库里存好的译名照出)。
 */
export const TITLES_NONE: Record<string, string> = {}


