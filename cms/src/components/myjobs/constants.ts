/**
 * 「我的」页两张岗位清单(myjobs 组件桶)的常量:我的求职、我的收藏。
 * 2026-10-06 Frank「先做我的求职」「这个不应该拆成多个字段吗」「进度这个用户会自己点吗」→ 拆成职位板那样的多列,进度只读;
 * 同日「也重新改一下」(我的收藏)→ 同一套列与格子。数据口 lib/myjobs。
 * 2026-10-08 照 AIApply 重设计(docs/design/我的模块-照AIApply-20261007.md):我的求职列草稿、操作格「继续」;我的收藏能投的行
 * 「打开」换成「投递」;空态一行 + 「去职位板」。
 * 2026-10-08 晚 Frank「这图看着还是不专业啊」→ 进度板(docs/design/我的模块-求职进度板调研-20261008.md 结论,五家参考站共同形):
 * 通用表换成一岗一张横卡(公司首字母块 / 职位 / 公司 / 城市 / 状态胶囊 / 日期 / 材料 / 一颗下一步钮),顶上一排阶段胶囊带计数。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */

/**
 * 我的求职清单接口。
 */
export const URL_APPLIED = '/api/myjobs/applied'

/**
 * 我的收藏清单接口。
 */
export const URL_SAVED = '/api/myjobs/saved'

/**
 * 取消收藏:收藏记录的 DELETE 地址前缀(Payload REST,本人可删)。
 */
export const URL_SAVED_JOB_HEAD = '/api/saved-jobs/'

/**
 * 职位页地址前缀(后接职位 id)。
 */
export const JOB_HREF_HEAD = '/jobs/'

/**
 * 请求带 cookie(登录态)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 取消收藏的请求方法。
 */
export const METHOD_DELETE = 'DELETE'

/**
 * 投递进度的字样与胶囊档:键 = 投递表 status,labelKey = 词条,tag = tag 桶的档(只读显示)。
 * 2026-10-07 B2:我的求职改读投递表,加 sent(已投递)与 bounced(退信)两档;10-08 加 draft(草稿)、queued(待投)、replied(雇主回复)。
 * mailto 年代收藏表上的 applied / interview / offer 三档仍认(收藏表老行)。
 */
export const STAGES = [
  {
    st: 'applied',
    labelKey: 'sj.st.applied',
    tag: 'info',
  },
  {
    st: 'interview',
    labelKey: 'sj.st.interview',
    tag: 'ok',
  },
  {
    st: 'offer',
    labelKey: 'sj.st.offer',
    tag: 'ok',
  },
  {
    st: 'sent',
    labelKey: 'ap.applied',
    tag: 'info',
  },
  {
    st: 'replied',
    labelKey: 'mj.replied',
    tag: 'ok',
  },
  {
    st: 'bounced',
    labelKey: 'mj.bounced',
    tag: 'bad',
  },
  {
    st: 'draft',
    labelKey: 'mj.draft',
    tag: 'gray',
  },
  {
    st: 'queued',
    labelKey: 'mj.queued',
    tag: 'gray',
  },
] as const

/**
 * 我的求职顶上那排阶段胶囊(照 LinkedIn 的 Saved / In Progress / Applied / Interview 带计数):键 = 筛哪一类(all = 不筛),
 * labelKey = 词条;顺序即从左到右。
 */
export const STAGE_FILTERS = [
  {
    key: 'all',
    labelKey: 'mj.all',
  },
  {
    key: 'draft',
    labelKey: 'mj.draft',
  },
  {
    key: 'queued',
    labelKey: 'mj.queued',
  },
  {
    key: 'sent',
    labelKey: 'ap.applied',
  },
  {
    key: 'replied',
    labelKey: 'mj.replied',
  },
  {
    key: 'bounced',
    labelKey: 'mj.bounced',
  },
] as const

/**
 * 阶段筛选的默认档:不筛。
 */
export const STAGE_ALL = 'all'

/**
 * 草稿的投递状态值(操作格出「继续」、附件格空、日期是最近改动)。
 */
export const ST_DRAFT = 'draft'

/**
 * 队列里(智能投递挑的、信已写好)的投递状态值:同草稿出「继续」;2026-10-08。
 */
export const ST_QUEUED = 'queued'

/**
 * 「已下架」胶囊的档(tag 桶 warn:橙)。
 */
export const CLOSED_TAG = 'warn'

/**
 * 没有胶囊(只收藏没投)。
 */
export const TAG_NONE = ''

/**
 * 日期一行的词条:发出去的「投递于 {d}」。
 */
export const KEY_APPLIED_ON = 'mj.appliedOn'

/**
 * 日期一行的词条:草稿 / 待投「最近改于 {d}」。
 */
export const KEY_EDITED_ON = 'mj.editedOn'

/**
 * 日期一行的词条:收藏「发布于 {d}」。
 */
export const KEY_POSTED_ON = 'mj.postedOn'

/**
 * 拼 className 时各类之间的分隔符(HTML 的 class 按空白切词)。
 */
export const CLS_SEP = ' '

/**
 * 我的求职那张清单。
 */
export const KIND_APPLIED = 'applied'

/**
 * 我的收藏那张清单。
 */
export const KIND_SAVED = 'saved'

/**
 * 投递区的地址头(后接职位 id):草稿「继续」、收藏行「投递」都去「我的求职」上方的投递区。
 */
export const URL_APPLY_HEAD = '/account?sec=sjobs&job='

/**
 * 空态「去职位板」的去处。
 */
export const URL_BOARD = '/jobs'

/**
 * 「继续」「投递」「去职位板」的钮档(蓝底主行动)。
 */
export const PRIMARY_KIND = 'primary'

/**
 * 「打开」的钮档(白底描边)。
 */
export const OPEN_KIND = 'secondary'

/**
 * 「取消收藏」「公司名」的钮档(ghost 最素,样子由本桶的类定:button 桶的 linkText 档没有样式类,渲染当场抛)。
 */
export const TEXT_KIND = 'ghost'

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
 * 空串(没有链接 / 没有字样)。
 */
export const TEXT_NONE = ''

/**
 * 公司首字母块的配色几档(按公司名字符和取模;同一家公司永远同一色)。
 */
export const AVATAR_COLORS = 7

/**
 * 首字母块配色类的名头(后接 0 ~ AVATAR_COLORS-1;类住 myjobs.module.css)。
 */
export const AVATAR_CLS_HEAD = 'c'

/**
 * 没有公司名时首字母块里的字。
 */
export const AVATAR_NONE = '?'

/**
 * 阶段胶囊的钮档(ghost 最素,样子由本桶的类定)。
 */
export const PLAIN_KIND = 'ghost'

/**
 * 公司弹框层的种类(advisor 的 PeekStack 按它分职位层 / 公司层)。
 */
export const LAYER_CO = 'company'

/**
 * 弹框栈的层种类:职位描述弹框(2026-10-07 Frank「这两个应该弹框啊」:职位名点了叠开,不跳页)。
 */
export const LAYER_JOB = 'job'

/**
 * 公司弹框里职位描述用的职业说明表(本页不带,给空表;同雇主板)。
 */
export const NOC_DESC_NONE = []
