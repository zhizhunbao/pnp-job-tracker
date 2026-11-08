/**
 * me 桶子桶 jobs 的死值(「我的求职」一页;2026-11-07 自 myjobs 桶与 account 桶的五题弹框在新域重写,接口与深链照旧)。
 * 2026-10-06 Frank「先做我的求职」「这个不应该拆成多个字段吗」「进度这个用户会自己点吗」→ 拆成职位板那样的多列,进度只读;
 * 同日「也重新改一下」(我的收藏)→ 同一套列与格子。数据口 lib/myjobs。
 * 2026-11-07 照 Fluent 2 效果图(docs/design/我的/我的框架-20261107.md 2.1 / 1.1):三张卡换成一条页签
 * 「今日推荐 N / 我的收藏 N / 我的投递 N」,一行只留一颗主钮(推荐 / 收藏「投递」、投递「打开」),「删除」钮撤。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 我的投递清单接口。
 */
export const URL_APPLIED = '/api/myjobs/applied'

/**
 * 我的收藏清单接口。
 */
export const URL_SAVED = '/api/myjobs/saved'

/**
 * 职位页地址前缀(后接职位 id)。
 */
export const JOB_HREF_HEAD = '/jobs/'

/**
 * 请求带 cookie(登录态)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 投递进度的字样与胶囊档:键 = 投递表 status,labelKey = 词条,tag = tag 桶的档(只读显示)。
 * 2026-10-07 B2:我的求职改读投递表,加 sent(已投递)与 bounced(退信)两档;10-08 加 draft(草稿)、queued(待投)、replied(雇主回复)。
 * mailto 年代收藏表上的 applied / interview / offer 三档仍认(收藏表老行)。
 * 2026-10-10 批 2(16d,Frank「需要」):「草稿」改叫「未发出」(与「已投」成对);「待投」并进「未发出」。
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
 * 我的投递顶上那排阶段筛选(照 LinkedIn 的 Saved / In Progress / Applied / Interview 带计数):键 = 筛哪一类(all = 不筛),
 * labelKey = 词条;顺序即从左到右。
 * 2026-10-10 批 2(16d):剩 全部 / 未发出 / 已投 / 雇主回复 / 退信;除「全部」外计数为 0 的不出(照效果图)。
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
 * 草稿的投递状态值(操作格出「继续」、没有投递日期)。
 */
export const ST_DRAFT = 'draft'

/**
 * 「已下架」胶囊的档(tag 桶 warn:橙)。
 */
export const CLOSED_TAG = 'warn'

/**
 * 我的投递那张清单。
 */
export const KIND_APPLIED = 'applied'

/**
 * 我的收藏那张清单。
 */
export const KIND_SAVED = 'saved'

/**
 * 「继续」「投递」的钮档(蓝底主行动)。
 */
export const PRIMARY_KIND = 'primary'

/**
 * 「打开」的钮档(白底描边)。
 */
export const OPEN_KIND = 'secondary'

/**
 * 空串(没有链接 / 没有字样)。
 */
export const TEXT_NONE = ''

/**
 * 公司弹框里职位描述用的职业说明表(本页不带,给空表;同雇主板)。
 */
export const NOC_DESC_NONE = []

/**
 * 今日推荐先列几条,其余点「显示更多」再列(2026-10-12 Frank「这两个要不要合成一个 然后点击显示更多,列出来这个收费部分」;
 * 与免费号每天看得见的条数同数)。
 */
export const PICKS_FIRST = 3

/**
 * 英文界面语(通道名英文行取词用)。
 */
export const LANG_EN = 'en'

/**
 * 中文界面语(公司名懒翻译名落中文格)。
 */
export const LANG_ZH = 'zh'

/**
 * 韩文界面语(公司名懒翻译名落韩文格)。
 */
export const LANG_KO = 'ko'

/**
 * 公司名懒翻:要翻的名字连成一串当依赖签名时的分隔(公司名里不会有换行)。
 */
export const CO_SEP = '\n'

/**
 * 通道键没有时(这一岗不走省提名)通道格出的长横。
 */
export const CHAN_NONE = '—'

/**
 * 旧深链的查询参数名(`?sec=favs`:「我的收藏」页签撤了,落「我的求职」后直接切到「我的收藏」页签)。
 */
export const QP_SEC = 'sec'

/**
 * 旧深链「我的收藏」的值。
 */
export const SEC_FAVS = 'favs'

/**
 * 分区白卡的全局类(main.css 的 cardMd)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 「解锁其余 N 条」的钮档。
 * 2026-10-13 Frank「换个颜色比较火的」→ 付费琥珀实底(button 桶 pro 档,全站付费同一色)。
 * 2026-11-07 Frank「现在都按 Azure 的来」:盖在打码行上的大钮撤,换表下一行里的常规大小主钮(蓝底主行动)。
 */
export const UPGRADE_KIND = 'primary'

/**
 * 「换一批」的钮档(白底描边次要钮;2026-10-13)。2026-11-07 Frank「现在都按 Azure 的来」:钮从表上方挪到页签那一行右端。
 */
export const SWAP_KIND = 'secondary'

/**
 * 列身份:职位。
 */
export const COL_TITLE = 'title'

/**
 * 列身份:公司。
 */
export const COL_COMPANY = 'company'

/**
 * 列身份:地点(2026-11-07 Frank「现在都按 Azure 的来」:原「地址」列(完整地址一行)改「市, 省码」)。
 */
export const COL_PLACE = 'place'

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
 * 列身份:通道(2026-10-12 Frank「这个为什么推荐?也没有吸引力?要不改成通道列吧」)。
 */
export const COL_CHAN = 'chan'

/**
 * 列身份:推荐原因。
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
 * 网页端表格的最小宽(列多,窄了横滚不挤成竖排)。
 */
export const TABLE_MIN_W = 1000

/**
 * 页签身份:今日推荐。
 */
export const TAB_PICKS = 'picks'

/**
 * 页签身份:我的收藏。
 */
export const TAB_SAVED = 'saved'

/**
 * 页签身份:我的投递。
 */
export const TAB_APPLIED = 'applied'

/**
 * 页签条与面板的 id 前缀(aria 对应用)。
 */
export const TABS_ID = 'mj-tabs'

/**
 * 页签条的无障碍名词条(「我的求职」)。
 */
export const TABS_ARIA_KEY = 'sj.title'

/**
 * 我的收藏不跟着「投出一封」重拉(旧件只重挂投递表;收藏清单拉一次就够)。
 */
export const GEN_NONE = 0

/**
 * 手机一条底行「截止 月-日」的词条(新词条,待 lead 补进 i18n)。
 */
export const DUE_KEY = 'mj.due'

/**
 * 年-月-日里「月-日」从第几个字起(YYYY-MM-DD 的第 5 位)。
 */
export const MD_FROM = 5

/**
 * 手机一条底行地点「市, 省码」的分隔。
 */
export const PLACE_SEP = ', '

/**
 * 档案接口(进「我的求职」先弹五题要看档案五样空着没有)。
 */
export const URL_PROFILE = '/api/quiz/profile'

/**
 * 档案回包里没有 profile 格时抛的错文。
 */
export const PF_ERR_EMPTY = 'no profile'


/**
 * 「补全档案」提示条:空着两样以内的那句(2026-11-07 照 Azure 的 MessageBar,代替进页自动弹五题)。
 */
export const FILL_KEY = 'mj.fill'

/**
 * 「补全档案」提示条:空着多于两样的那句(点名前两样,再说一共几项)。
 */
export const FILL_MORE_KEY = 'mj.fillMore'

/**
 * 「补全档案」提示条上「去补全」的词条。
 */
export const FILL_GO_KEY = 'mj.fillGo'

/**
 * 提示条里几样名字之间的分隔词条(中文顿号、英韩逗号)。
 */
export const FILL_SEP_KEY = 'mj.fillSep'

/**
 * 提示条最多点名几样。
 */
export const FILL_NAME_MAX = 2

/**
 * 档案里空着的那一样 → 「我的档案」左列名字的词条(题键与 gate 桶 GATE_STEP_* 同值)。
 */
export const FILL_LABEL_KEYS = [
  {
    /**
     * 目标。
     */
    step: 'goal',

    /**
     * 「目标」。
     */
    key: 'pf.goal',
  },
  {
    /**
     * 专业。
     */
    step: 'major',

    /**
     * 「专业」。
     */
    key: 'pf.majors',
  },
  {
    /**
     * 想做的工作。
     */
    step: 'job',

    /**
     * 「想做的工作」。
     */
    key: 'pf.jobs',
  },
  {
    /**
     * 所在地。
     */
    step: 'prov',

    /**
     * 「所在地」。
     */
    key: 'pf.where',
  },
  {
    /**
     * 英文姓名。
     */
    step: 'name',

    /**
     * 「英文姓名」。
     */
    key: 'pf.name',
  },
] as const

/**
 * 认不出的题键按「我的档案」整页的名字说(走不到;留一格兜住类型)。
 */
export const FILL_LABEL_FALLBACK = 'pf.title'

/**
 * 提示条的档(notice 桶 info:浅蓝)。
 */
export const FILL_NOTICE_KIND = 'info'

/**
 * 提示条 ✕ 的 aria-label(照 modal 桶 CLOSE_ARIA:英文死值)。
 */
export const FILL_CLOSE_ARIA = 'close'

/**
 * 定制样式钮的统一底座:ghost 底最素(提示条上「去补全」与 ✕;与 nav / tag 桶同名同义,各家一份)。
 */
export const PLAIN_BTN_KIND = 'ghost'
