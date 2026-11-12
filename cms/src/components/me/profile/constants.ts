/**
 * me 桶子桶 profile 的死值(我的档案 + 我的通道;2026-11-07 自 account 桶在新域重写,接口、词条键、弹框记尺寸的键照旧)。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */

/**
 * 空串(判空与清空用)。
 */
export const TEXT_NONE = ''

/**
 * fetch 的凭据档:同源带 cookie(档案要认人)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 档案取数接口(quiz 域:答案档五格 + 三语名字 + 投递署名)。
 */
export const URL_PROFILE = '/api/quiz/profile'

/**
 * 全站分区卡的全局类(main.css 的 .cardMd)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 分区小标题的全局类(main.css 的 .mcardHead)。
 */
export const CARD_HEAD_CLS = 'mcardHead'

/**
 * 主按钮档(页标题右边的「修改」)。
 */
export const PRIMARY_KIND = 'primary'

/**
 * 一格多个名字时先摆几个(2026-10-09 Frank「可以」:想做的工作选了十几个把卡撑得一屏放不下,当时定 5 个;
 * 2026-11-07 照 Fluent 效果图改 3 个,下面一行「展开其余 N 个」)。
 */
export const PF_FOLD_N = 3

/**
 * 一格名字折起来时展开钮的量词词条键(2026-10-12 Frank「还有 11 个 改成 展开 / 收起,和其他地方一致」:
 * 换 pager 桶 FoldLine 的「展开 N 个 ▾」,量词照全站「个」)。
 */
export const PF_FOLD_UNIT_KEY = 'fold.u.item'

/**
 * 来自简历标记的字段:专业。
 */
export const PF_FROM_MAJORS = 'majors'

/**
 * 来自简历标记的字段:做过的工作。
 */
export const PF_FROM_WORK = 'workNocs'

/**
 * 来自简历标记的字段:英文姓名。
 */
export const PF_FROM_NAME = 'name'

/**
 * 来自简历胶囊的变体。
 */
export const PF_FROM_TAG_V = 'info'

/**
 * 来自简历胶囊的词条。
 */
export const PF_FROM_TAG_KEY = 'pf.fromResume'

/**
 * 想做的工作不打标记时传的字段(空串 = 不打)。
 */
export const PF_FROM_NONE = ''

/**
 * 「修改」的词条键。
 */
export const PF_EDIT_KEY = 'pf.edit'

/**
 * 没答那一格的词条键。
 */
export const PF_NONE_KEY = 'pf.none'

/**
 * 英文姓名没填的词条键(2026-10-11:姓名是填的不是答的,写「还没填」;另外几行照旧「还没答」)。
 */
export const PF_NONE_NAME_KEY = 'pf.noneName'

/**
 * 取不到的词条键。
 */
export const PF_FAIL_KEY = 'pf.loadFail'

/**
 * 加载占位那一句的词条键。
 */
export const PF_LOADING_KEY = 'act.loadingText'

/**
 * 身份词条键的前缀(同 gate 桶 K_WHO_HEAD;后接身份词)。
 */
export const PF_WHO_HEAD = 'fit.who.'

/**
 * 教育经历一段的三格名(同 gate 桶 EDU_F_*):院校所在地。
 */
export const EDU_F_PROV = 'prov'

/**
 * 教育经历一段的三格名:公立或私立。
 */
export const EDU_F_KIND = 'kind'

/**
 * 教育经历一段的三格名:课程时长。
 */
export const EDU_F_LEN = 'len'

/**
 * 档案几行的标签键(照 Azure Essentials 用短名词,不用整句问题)。
 */
export const PF_ROW_KEYS = {
  /**
   * 目标。
   */
  goal: 'pf.goal',

  /**
   * 专业。
   */
  majors: 'pf.majors',

  /**
   * 想做的工作。
   */
  jobs: 'pf.jobs',

  /**
   * 所在地(城市、省份两个名字上下排)。
   */
  where: 'pf.where',

  /**
   * 英文姓名(投递署名)。
   */
  name: 'pf.name',

  /**
   * 身份(2026-10-13 档案加题)。
   */
  who: 'pf.who',

  /**
   * 教育经历(2026-10-13 档案加题;一段一行)。
   */
  edu: 'pf.edu',

  /**
   * 做过的工作(2026-11-08)。
   */
  work: 'pf.work',

  /**
   * 匹配规则(2026-11-12 Frank「这两个不能合并成一个吗?比如匹配规则 是 按专业,还是按什么其他的一个下拉选」:
   * 原先「匹配依据」「匹配模式」两行并成一行)。
   */
  rule: 'pf.rule',
}

/**
 * 目标档:拿 PR(与 gate 的 GOAL_PR 同值,各域自抄)。
 */
export const PF_GOAL_PR = 1

/**
 * 目标档:先找工作。
 */
export const PF_GOAL_JOBS = 2

/**
 * 「拿 PR」的词条键(与访客向导那张大卡同一句)。
 */
export const PF_GOAL_PR_KEY = 'home.g.pr'

/**
 * 「找工作」的词条键。
 */
export const PF_GOAL_JOBS_KEY = 'home.g.jobs'

/**
 * 「加拿大境外」的词条键(与访客向导那一格同一句)。
 */
export const PF_ABROAD_KEY = 'gate.abroad'

/**
 * 档案接口回了 200 却没带 profile 那一格时抛的错名(留痕用)。
 */
export const PF_ERR_EMPTY = 'no profile'

/**
 * 档案取数状态:在取。
 */
export const PF_LOAD_BUSY = 'busy'

/**
 * 档案取数状态:到了。
 */
export const PF_LOAD_OK = 'ok'

/**
 * 档案取数状态:取不到。
 */
export const PF_LOAD_FAIL = 'fail'

/**
 * 「我的通道」「去回答」开编辑弹框落在哪一题(gate 桶题键;2026-10-13)。
 */
export const PF_START_WHO = 'who'

/**
 * 档案卡卡头的词条键(「我的档案」;2026-11-11 档案页成两栏后每张卡自带卡头)。
 */
export const PF_TITLE_KEY = 'pf.title'

/**
 * 卡头里「修改」的钮档(带框次钮)。
 */
export const SECONDARY_KIND = 'secondary'

/**
 * 一个空格(拼类名)。
 */
export const ONE_SPACE = ' '

/**
 * 「我的通道」没答身份时那一句引导的词条键。
 */
export const MS_ASK_KEY = 'pf.pathsAsk'

/**
 * 「去回答」钮的词条键。
 */
export const MS_ASK_BTN_KEY = 'pf.pathsAskBtn'

/**
 * 一条能走的通道都没有那一句的词条键。
 */
export const MS_EMPTY_KEY = 'pf.pathsEmpty'

/**
 * 「我的通道」表三列的列头词条键。
 */
export const MS_COL_KEYS = {
  /**
   * 通道。
   */
  name: 'pf.pathsCol.name',

  /**
   * 全程。
   */
  total: 'pf.pathsCol.total',

  /**
   * 条件。
   */
  tags: 'pf.pathsCol.tags',
}

/**
 * 「我的通道」卡的省份胶囊(2026-10-13;同资讯页省份卡的序,联邦第一)。
 */
export const MS_PROVS = ['FED', 'BC', 'AB', 'SK', 'MB', 'ON', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'QC']

/**
 * 「我的通道」默认看的省:联邦(档案的所在省不在上面那排时)。
 */
export const MS_PROV_FED = 'FED'

/**
 * 省份胶囊上的字:词条头 `prov.` + 省码(同资讯页省份卡)。
 */
export const MS_PROV_HEAD = 'prov.'

/**
 * 「我的通道」表的最小宽(窄屏横滚)。
 */
export const MS_TABLE_MIN_W = 560

/**
 * 「去回答」钮档(次要钮)。
 */
export const MS_ASK_BTN_KIND = 'secondary'

/**
 * 通道弹框记尺寸的键(窗口形;与原 account 桶同一个键,用户拉过的尺寸接着用)。
 */
export const MS_MODAL_PREF = 'my_streams_modal_pref'

/**
 * 通道弹框默认宽。
 */
export const MS_MODAL_W = 760

/**
 * 通道弹框默认高。
 */
export const MS_MODAL_H = 720

/**
 * 「我的通道」表的三列身份(通道 / 全程 / 条件):通道列。
 */
export const MS_COL_NAME = 'name'

/**
 * 全程列。
 */
export const MS_COL_TOTAL = 'total'

/**
 * 条件列。
 */
export const MS_COL_TAGS = 'tags'

/**
 * 「我的通道」手机卡的断点:窄于 768 一条一张卡(同「我的求职」的 NARROW_MAX)。
 */
export const MS_NARROW_MAX = 767

/**
 * 匹配依据的「学历」值(与 gate 桶同一个值,各家一份)。
 */
export const PF_MATCH_EDU = 'edu'

/**
 * 匹配模式的「严格」值。
 */
export const PF_MODE_STRICT = 'strict'

/**
 * 匹配规则四项的词条(2026-11-12,与修改面板那只下拉同一套字):按做过的工作。
 */
export const PF_RULE_WORK_KEY = 'pf.rule.work'

/**
 * 按做过的工作,只推很接近的。
 */
export const PF_RULE_WORK_STRICT_KEY = 'pf.rule.workStrict'

/**
 * 按我的专业。
 */
export const PF_RULE_EDU_KEY = 'pf.rule.edu'

/**
 * 按我的专业,只推很接近的。
 */
export const PF_RULE_EDU_STRICT_KEY = 'pf.rule.eduStrict'

/**
 * 教育经历一行里几个词的连接符(不用中点)。
 */
export const PF_LIST_SEP = ', '

/**
 * 起止年份之间的连接符(2025 – 2026)。
 */
export const PF_YEAR_SEP = ' – '

/**
 * 只有开始年份时跟在后面的记号(2025 –)。
 */
export const PF_YEAR_OPEN = ' –'

/**
 * 正在取数(aria-busy 的「是」)。
 */
export const BUSY_ON = 'true'
