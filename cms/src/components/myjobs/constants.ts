/**
 * 「我的」页两张岗位清单(myjobs 组件桶)的常量:我的求职、我的收藏。
 * 2026-10-06 Frank「先做我的求职」「这个不应该拆成多个字段吗」「进度这个用户会自己点吗」→ 拆成职位板那样的多列,进度只读;
 * 同日「也重新改一下」(我的收藏)→ 同一套列与格子。数据口 lib/myjobs。
 * 2026-10-08 照 AIApply 重设计(docs/design/我的/我的求职-20261009.md):我的求职列草稿、操作格「继续」;我的收藏能投的行
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
 * 2026-10-10 批 2(16d,Frank「需要」):「草稿」改叫「未发出」(与「已投」成对);「待投」并进「未发出」(不在后台提前写信之后,
 * 两者都是「点开了没投完」)—— queued 行照旧认,字与档同草稿。
 * 同日 Frank「删吧」(「今日待投 / 智能投递」整条撤):清单接口不再列 queued 行,queued 这一档随之撤。
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
    labelKey: 'mj.unsent',
    tag: 'gray',
  },
] as const

/**
 * 我的求职顶上那排阶段胶囊(照 LinkedIn 的 Saved / In Progress / Applied / Interview 带计数):键 = 筛哪一类(all = 不筛),
 * labelKey = 词条;顺序即从左到右。
 * 2026-10-10 批 2(16d):剩 全部 / 未发出 / 已投 / 雇主回复 / 退信 —— 「待投」那枚撤(queued 行算进未发出,见 byStageOf);
 * 除「全部」外计数为 0 的不出(照效果图)。
 */
export const STAGE_FILTERS = [
  {
    key: 'all',
    labelKey: 'mj.all',
  },
  {
    key: 'draft',
    labelKey: 'mj.unsent',
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
 * 2026-10-09 A 批投递搬进弹框:两处改为就地弹投递框(openApply),这里只剩「有没有去处」的判据与深链形状(`?apply=`)。
 */
export const URL_APPLY_HEAD = '/account?sec=sjobs&apply='

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
 * 公司弹框里职位描述用的职业说明表(本页不带,给空表;同雇主板)。
 */
export const NOC_DESC_NONE = []

/**
 * 今日推荐接口(2026-10-10 批 2;后接 `?prov=` 浏览器按时区预选的省码)。
 */
export const URL_PICKS = '/api/myjobs/picks?prov='

/**
 * 今日推荐接口「不用当天缓存、现算一份」的尾巴(2026-10-11「进我的求职先弹五题」:答完档案重拉要按新答案推)。
 */
export const URL_PICKS_FRESH = '&fresh=1'

/**
 * 推荐理由码 → 胶囊词条(顺序由服务端定;认不得的码不出)。
 */
export const WHY_KEYS: Record<string, string> = {
  /**
   * 能走省提名雇主担保。
   */
  pnp: 'mj.why.pnp',

  /**
   * 薪资高于本省中位。
   */
  wage: 'mj.why.wage',

  /**
   * 职业对口。
   */
  occ: 'mj.why.occ',

  /**
   * 和你收藏的同类。
   */
  saved: 'mj.why.saved',

  /**
   * 和你投过的同类(2026-10-11)。
   */
  applied: 'mj.why.applied',
}

/**
 * 理由胶囊的档(tag 桶 ok:绿)。
 */
export const WHY_TAG = 'ok'

/**
 * 锁住那条的假字纹理(模糊着看不清,真的公司 / 地址 / 薪资不下发;两份轮着用)。
 */
export const LOCK_FILL = {
  /**
   * 第 1、3、5… 条。
   */
  even: {
    company: 'Scarborough Health Network',
    address: '1280 Main St, Toronto, ON M5V 1A1',
    salary: '$23/hr',
  },

  /**
   * 第 2、4、6… 条。
   */
  odd: {
    company: 'Humber River Health',
    address: '2111 Finch Ave W, Toronto, ON M3N 1N1',
    salary: '$24/hr',
  },
} as const

/**
 * 假字纹理有几份(按条数取模轮着用)。
 */
export const LOCK_FILL_N = 2

/**
 * 推送频率下拉的两档(「不发」是下拉的空值档)。
 */
export const PUSH_FREQS = ['daily', 'weekly'] as const

/**
 * 邮箱框最长多少字。
 */
export const EMAIL_MAX = 254

/**
 * 旧深链 `?sec=favs`(「我的收藏」页签撤了)落「我的求职」后滚到的收藏卡锚点。
 */
export const ANCHOR_SAVED = 'mj-saved'

/**
 * 旧深链的查询参数名与值。
 */
export const QP_SEC = 'sec'

/**
 * 旧深链「我的收藏」的值。
 */
export const SEC_FAVS = 'favs'

/**
 * 今日推荐卡的锚点。
 */
export const ANCHOR_PICKS = 'mj-picks'

/**
 * 我的投递卡的锚点。
 */
export const ANCHOR_APPLIED = 'mj-applied'

/**
 * 新岗推送卡的锚点。
 */
export const ANCHOR_PUSH = 'mj-push'

/**
 * 卡标题行的全局类(main.css 的 mcardHead)。
 */
export const CARD_HEAD_CLS = 'mcardHead'

/**
 * 分区白卡的全局类(main.css 的 cardMd)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 「升级 Pro」的钮档(蓝底主行动)。
 */
export const UPGRADE_KIND = 'primary'

/**
 * 「保存」的钮档(白底描边)。
 */
export const SAVE_KIND = 'secondary'

/**
 * 「取消收藏」的钮档(2026-10-10 批 2:收藏行「取消收藏」改带框次钮,16d)。
 */
export const UNSAVE_KIND = 'secondary'

/**
 * 列身份:职位。
 */
export const COL_TITLE = 'title'

/**
 * 列身份:公司。
 */
export const COL_COMPANY = 'company'

/**
 * 列身份:地址。
 */
export const COL_ADDR = 'addr'

/**
 * 列身份:薪资。
 */
export const COL_PAY = 'pay'

/**
 * 列身份:工时。
 */
export const COL_HOURS = 'hours'

/**
 * 列身份:雇佣期。
 */
export const COL_TERM = 'term'

/**
 * 列身份:发布日期。
 */
export const COL_POSTED = 'posted'

/**
 * 列身份:截止日期。
 */
export const COL_DEADLINE = 'deadline'

/**
 * 列身份:为什么推荐。
 */
export const COL_WHY = 'why'

/**
 * 列身份:状态。
 */
export const COL_STATUS = 'status'

/**
 * 列身份:收藏于。
 */
export const COL_SAVED_ON = 'savedOn'

/**
 * 列身份:投递于。
 */
export const COL_APPLIED_ON = 'appliedOn'

/**
 * 列身份:操作。
 */
export const COL_ACT = 'act'

/**
 * 钮身份:继续。
 */
export const ACT_CONT = 'cont'

/**
 * 钮身份:投递。
 */
export const ACT_APPLY = 'apply'

/**
 * 钮身份:打开。
 */
export const ACT_OPEN = 'open'

/**
 * 钮身份:取消收藏。
 */
export const ACT_UNSAVE = 'unsave'

/**
 * 链接身份:简历附件。
 */
export const ACT_RESUME = 'resume'

/**
 * 链接身份:求职信附件。
 */
export const ACT_COVER = 'cover'

/**
 * 手机卡的断点:窄于 768 一岗一张卡,768 起走表格(16d;max-width 取 767)。
 */
export const NARROW_MAX = 767

/**
 * 网页端表格的最小宽(列多,窄了横滚不挤成竖排)。
 */
export const TABLE_MIN_W = 1000

/**
 * 只读投递框的尺寸记忆键(2026-10-10 批 3;10-09 Frank「所有弹框 都能放大缩小 拖动,保持一致」:与投递框、职位 / 公司弹框共用一份
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
 * 空的懒翻表(只读投递框一行一条,不另起懒翻;库里存好的译名照出)。
 */
export const TITLES_NONE: Record<string, string> = {}
