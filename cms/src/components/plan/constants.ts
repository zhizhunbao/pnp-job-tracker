/**
 * plan 域(/plan/pr 决策页)的死值:接口地址、埋点名、地址参数、正则、档位映射、
 * 列宽预算、i18n 键的可拼前缀,以及三张带举证与拍板记录的口径表。
 * 2026-08-28 换装批自 Decision.tsx 的散值收拢挂注释(值一个不改);
 * 第二段(ScoreLineCard 与 QuizForm)已于同日并入,按同样的分段续在各段尾。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */

/**
 * 登录态真相接口。pullAndMerge 无参调用受「登录迹象 cookie」那道闸限制,而那枚 cookie
 * 换浏览器/清过站点数据就没有 —— 2026-08-16 实撞:Frank 本地登录着,页面却「已答 0/11」。
 * 所以登录态一律以这个接口为准。
 */
export const URL_ME = '/api/users/me'

/**
 * 该职业分省竞争面的接口地址头(后接编码过的 5 位职业码)。省级那张表随页面 SSR,
 * 这张要等他答完职业才知道查谁,所以按 NOC 懒取。
 */
export const URL_OCC_COMPETITION_HEAD = '/api/jobs/competition?noc='

/**
 * 职业档粗筛与个人档初评共用的判定接口(POST 上行答案与加分项)。
 */
export const URL_RULING_PROFILE = '/api/ruling/profile'

/**
 * 冷门职业按码补全名字的接口地址头(后接编码过的 5 位职业码)。
 */
export const URL_QUIZ_NOC_HEAD = '/api/quiz?noc='

/**
 * 官方分值表按省懒取的接口地址头(后接编码过的省码串)。2026-08-12 起分值表
 * **不再随页面下发**(192 行 ≈ 88KB,只有答完题的人才看得到)。
 */
export const URL_POINTS_FACTORS_HEAD = '/api/points/factors?provs='

/**
 * 带 cookie 发请求(登录态接口要它)。
 */
export const CRED_INCLUDE = 'include'

/**
 * POST 方法名。
 */
export const METHOD_POST = 'POST'

/**
 * 请求体类型的头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 请求体的 MIME。
 */
export const MIME_JSON = 'application/json'

/**
 * 进页面埋点(带不带岗各记各的)。
 */
export const TRACK_OPEN = 'dp-open'

/**
 * 基础卷收卷埋点(走完省份页与「完成」旁路都记这一个)。
 */
export const TRACK_QUIZ_DONE = 'dp-quiz-done'

/**
 * 估分段答完埋点。
 */
export const TRACK_SCORE_DONE = 'dp-score-done'

/**
 * 直接落在估分段的入口埋点。
 */
export const TRACK_SCORE_START = 'dp-score-start'

/**
 * 打开问卷(改答案)埋点。
 */
export const TRACK_QUIZ_EDIT = 'dp-quiz-edit'

/**
 * 清空答案埋点。
 */
export const TRACK_QUIZ_RESET = 'dp-quiz-reset'

/**
 * 把岗位所在省并进目标省的埋点。
 */
export const TRACK_ADD_JOB_PROV = 'dp-add-job-prov'

/**
 * 把省外更优的那个省并进目标省的埋点。
 */
export const TRACK_ADD_OUTSIDE_PROV = 'dp-add-outside-prov'

/**
 * 职业不匹配时「重挑岗位」的埋点。
 */
export const TRACK_REPICK = 'dp-repick-job'

/**
 * 初评行「查岗位」的埋点。
 */
export const TRACK_ACT_JOBS = 'dp-act-jobs'

/**
 * 初评行「查雇主」的埋点。
 */
export const TRACK_ACT_EMP = 'dp-act-emp'

/**
 * 带岗态判定卡里「建档案」的埋点(tv 前缀 = 三项判定面板那一族)。
 */
export const TRACK_BUILD_PROFILE = 'tv-build-profile'

/**
 * 埋点属性名:带不带岗。
 */
export const TRACK_JOB_KEY = 'job'

/**
 * 埋点属性名:哪个省。
 */
export const TRACK_PROV_KEY = 'prov'

/**
 * 埋点属性名:哪一行通道。
 */
export const TRACK_ROW_KEY = 'key'

/**
 * 埋点布尔属性的真值(埋点值只收字符串)。
 */
export const TRACK_FLAG_ON = '1'

/**
 * 埋点布尔属性的假值。
 */
export const TRACK_FLAG_OFF = '0'

/**
 * 自动唤起问卷的地址参数名。它是处境页那条入口带来的一次性入口,读过就从地址栏抹掉
 * (2026-08-16 Frank「已经选完了,每次刷新不要再弹框了」)。
 */
export const P_QUIZ = 'quiz'

/**
 * 自动唤起问卷参数的开值。
 */
export const P_QUIZ_ON = '1'

/**
 * 答完题之后要跳去哪的地址参数名(只认站内路径)。
 */
export const P_NEXT = 'next'

/**
 * 站内路径的判据(单斜杠开头,排除 `//host` 这种协议相对的站外地址)。
 */
export const INTERNAL_PATH_RE = /^\/(?!\/)/

/**
 * 查询串的起始记号(拼回地址栏时用)。
 */
export const QUERY_HEAD = '?'

/**
 * 职位板按通道筛选的地址(重挑岗位那颗钮)。
 */
export const URL_JOBS_PNP = '/jobs?pnp=yes'

/**
 * 职位板地址的查询段起始(后接通道自带的筛选串)。
 */
export const URL_JOBS_HEAD = '/jobs?'

/**
 * 职位板按省筛选的地址头(通道没有自带筛选串时用)。
 */
export const URL_JOBS_PROV_HEAD = '/jobs?prov='

/**
 * 追加省筛选的参数(接在已有查询串后面)。
 */
export const PARAM_PROV = '&prov='

/**
 * 追加职业筛选的参数。2026-08-16「查岗位应该带着条件查」「在招是显示多少就查多少」:
 * 档案里选了几个职业就带几个,与「在招」那个数同一把尺。
 */
export const PARAM_NOC = '&noc='

/**
 * 多个职业码之间的分隔(职位板的多值参数口径)。
 */
export const NOC_SEP = ','

/**
 * 官方指定雇主名录的地址头(后接制度名)。指定雇主是硬门槛的制度才给这条 ——
 * 普通省提名没有「指定雇主」这回事,给了等于凭空发明一道门槛。
 */
export const URL_EMP_DESIGNATED_HEAD = '/employers/designated?program='

/**
 * 该省该职业在招雇主的地址头(后接省码)。普通省提名给的是这一条:他要投的人。
 */
export const URL_EMP_HIRING_HEAD = '/employers/hiring?prov='

/**
 * 在招雇主地址的职业参数。
 */
export const PARAM_NOC_SINGLE = '&noc='

/**
 * 两位省码的判据(区域线拆省后 province 是省码,'FED' 这类区域名走另一条分支)。
 */
export const PROV_CODE_RE = /^[A-Z]{2}$/

/**
 * 5 位职业码的判据(职位板的 noc 多值参数只收真码)。
 */
export const NOC_CODE_RE = /^\d{5}$/

/**
 * 全部缺口键的形状:`pv.gate.<闸名>.gap`(#324 逐行差异要它,blockedBy 只有第一道闸)。
 * 具名捕获组 gate = 闸名,不按位置取。
 */
export const GAP_KEY_RE = /^pv\.gate\.(?<gate>[a-z]+(?:\.[a-zA-Z]+)?)\.gap$/

/**
 * 中文通道名前面那截省名(走查 #293 的第二步剥省名:「安大略省 雇主担保」→「雇主担保」)。
 */
export const ZH_PROV_PREFIX_RE = /^[一-龥]{1,4}省\s+/

/**
 * 「名字里已自带制度名」的判据前半(后接制度名与后半,拼成一个整正则)。
 * 中文态的 EE/AIP/RCIP 自名已经带括号,不重复追加。
 */
export const PROGRAM_PAREN_HEAD = '[((]\\s*'

/**
 * 「名字里已自带制度名」的判据后半。
 */
export const PROGRAM_PAREN_TAIL = '\\s*[))]'

/**
 * 中文界面的语言码(顿号、全角括号跟着它走)。
 */
export const LANG_ZH = 'zh'

/**
 * 中文界面的枚举分隔(全站禁「·」杂糅,枚举用顿号)。
 */
export const SEP_ZH = '、'

/**
 * 其余界面的枚举分隔。
 */
export const SEP_EN = ', '

/**
 * 「没有」的空文本(取名取不到、译名不出、省码缺席时的返回值)。
 */
export const TEXT_NONE = ''

/**
 * 「这一格没有数据」的横杠。0 与它意思不同:0 是「没有」,横杠是「我们没这个数」。
 */
export const TEXT_DASH = '—'

/**
 * 竞争比的尾巴(「7.9:1」的后半)。
 */
export const RATIO_TAIL = ':1'

/**
 * 查不到职业名时退回码本身的前缀。用户明明选过职业,这一格不能写「待填写」。
 */
export const NOC_LABEL_HEAD = 'NOC '

/**
 * 职业名缓存键的分隔(键 = `<语言>:<职业码>`)。
 */
export const CACHE_KEY_SEP = ':'

/**
 * 名次圆牌上给「本岗所在省」补充行用的记号 —— 它不冒充名次,所以不给数字。
 */
export const RANK_EXTRA_MARK = '·'

/**
 * 手机卡标题里名次与通道名之间的分隔。
 */
export const RANK_NUM_SEP = '. '

/**
 * 中文态制度名的左括号(全角)。
 */
export const PAREN_ZH_OPEN = '('

/**
 * 中文态制度名的右括号(全角)。
 */
export const PAREN_ZH_CLOSE = ')'

/**
 * 其余语言制度名的左括号(半角带前导空格)。
 */
export const PAREN_EN_OPEN = ' ('

/**
 * 其余语言制度名的右括号。
 */
export const PAREN_EN_CLOSE = ')'

/**
 * 千分位的地区口径(全站数字一律 en-CA)。
 */
export const LOCALE_CA = 'en-CA'

/**
 * 竞争卡明细里各项之间的间隔(全角空格 —— 一行几项并列,不用「·」也不用「/」)。
 */
export const GAP_FULL = '　'

/**
 * Esc 键的平台键名(打错是静默失效所以起名)。
 */
export const KEY_ESC = 'Escape'

/**
 * keydown 事件名(平台定值,打错是静默失效)。
 */
export const EV_KEYDOWN = 'keydown'

/**
 * 题区的类名(quiz 域 QuizStyle 下发的全局类,答题壳与本页共用同一个名字)。
 */
export const QUIZ_PAD_CLS = 'plQuizPad'

/**
 * 题区的选择器(把题区顶回视口时用;打错是静默失效所以起名)。
 */
export const QUIZ_PAD_SEL = '.plQuizPad'

/**
 * 滚动对齐位:题区顶边对齐视口顶。
 */
export const SCROLL_BLOCK_START = 'start'

/**
 * 滚动行为:一步到位不做动画(每翻一题都补一次平滑滚动,看着就是闪)。
 */
export const SCROLL_BEHAVIOR_AUTO = 'auto'

/**
 * 分值卡重挂键各段之间的分隔。
 */
export const SCORE_KEY_SEP = ':'

/**
 * 无岗态分值卡重挂键的首段(带岗态用岗位 id)。
 */
export const SCORE_KEY_PROFILE = 'profile'

/**
 * 省码串各段之间的分隔(懒取分值表的参数口径)。
 */
export const PROV_KEY_SEP = ','

/**
 * 本页正文轨的上内衬档。
 */
export const SHELL_TOP = 16

/**
 * 本页正文轨的下内衬档。
 */
export const SHELL_BOTTOM = 40

/**
 * banner 与顶栏高亮共用的模块名。
 */
export const MODULE_PATHWAYS = 'pathways'

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」)——
 * ghost 底最素,视觉全由本域的加倍类定形。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 关闭钮的无障碍名(上线以来就是英文死值,与 modal 域同口径)。
 */
export const CLOSE_ARIA = 'close'

/**
 * 基础卷的题数之外还要算上的两步:选职业与选目标省。它们不在字段库的题单里,
 * 但用户确实要答,所以计数里必须占两格。
 */
export const STEP_EXTRA = 2

/**
 * 职业档粗筛态初评表摆几行(没答条件,门槛列不出,横向空间让给通道名)。
 */
export const PLAN_ROWS_COARSE = 6

/**
 * 个人档态初评表摆几行。
 */
export const PLAN_ROWS_FULL = 5

/**
 * 5 位职业码里 TEER 那一位的位置(第 2 个字符)。
 */
export const TEER_POS = 1

/**
 * 目标省摆得下几个省名。选多了就缩写(2026-08-16 Frank「这个要对齐」):
 * 十个省名全列会把这一格撑成三行,同排另外两格只有一行 —— 格子高度被它带跑。
 */
export const PROV_SHOWN_MAX = 2

/**
 * 进度条百分比的满值。
 */
export const PERCENT_MAX = 100

/**
 * 年份视图竞争比的舍入基数(保留一位小数,与 04e 口径一致)。
 */
export const RATIO_ROUND = 10

/**
 * 竞争卡的年份筛选可选年(2026-08-14 Frank「加上年份筛选」「看 2024 2025 2026 不同年份」)。
 */
export const COMP_YEARS = ['2024', '2025', '2026']

/**
 * 竞争卡年份筛选的默认停留年(2026-08-15 Frank「默认选择 2025 吧」):
 * 最近一个名额与流量都齐的年份;再点一次可回「现行口径」。
 */
export const COMP_YEAR_DEFAULT = '2025'

/**
 * 2024 年的年份键(名额系列按年分格,键是写死的年份串)。
 */
export const YEAR_2024 = '2024'

/**
 * 2025 年的年份键。
 */
export const YEAR_2025 = '2025'

/**
 * 2026 年的年份键。
 */
export const YEAR_2026 = '2026'

/**
 * 存量快照月缺位时的兜底后缀:年末口径(方案C 的 StatCan 季度里,已结束的年份取 12 月)。
 */
export const STOCK_MONTH_TAIL = '-12'

/**
 * 年月串的分隔(流量口径里带它 = 是个「年-月」区间,不是光秃秃一个年份)。
 */
export const DATE_SEP = '-'

/**
 * 学签存量那一格的键。
 */
export const STOCK_STUDY = 'study'

/**
 * 工签存量那一格的键。
 */
export const STOCK_WORK = 'work'

/**
 * 判定可行(能走)。
 */
export const VERDICT_VIABLE = 'viable'

/**
 * 判定判不了(该答的题还没答)。
 */
export const VERDICT_NEEDS_INFO = 'needs-info'

/**
 * 本站收录了这条通道的条文(availability 的正常值);其余值一律当「规则待核对」。
 */
export const AVAIL_OK = 'ok'

/**
 * 被 offer 卡住(它有反事实:拿到 offer 之后这条路怎么判)。
 */
export const BLOCK_OFFER = 'offer'

/**
 * 加拿大身份闸的名字(2026-08-15 拆闸:判的是工签就说工签,不再统称「加拿大身份」)。
 */
export const GATE_STATUS = 'statusInCanada'

/**
 * 闸的必答档(只有必答且写明问什么,才配细分文案键)。
 */
export const GATE_NEED_REQUIRED = 'required'

/**
 * 专业对口那道题的槽名(这条通道有对口闸、而他还没答 → 挂灰提醒)。
 */
export const SLOT_FIELD_MATCH = 'fieldMatch'

/**
 * tier 起算点:毕业拿工签之后(#319 在读学生的经验型 tier)。
 */
export const TIER_AFTER_STUDY = 'after-study'

/**
 * tier 起算点:现在就起算(默认档)。
 */
export const TIER_NOW = 'now'

/**
 * 大西洋试点的制度名(指定雇主是硬门槛)。
 */
export const PROGRAM_AIP = 'AIP'

/**
 * 乡村社区试点的制度名(社区雇主是硬门槛)。
 */
export const PROGRAM_RCIP = 'RCIP'

/**
 * 法语社区试点的制度名(社区雇主是硬门槛)。
 */
export const PROGRAM_FCIP = 'FCIP'

/**
 * SK 那类把经验拆成「近 5 年」的官方因素名。
 */
export const FACTOR_WORK5 = 'work5'

/**
 * SK 那类把经验拆成「6-10 年」的官方因素名。
 */
export const FACTOR_WORK610 = 'work610'

/**
 * 基础卷 offer 题的「已有 offer」档。
 */
export const OFFER_HAS = 1

/**
 * 基础卷 offer 题里等同「还没有 offer」的那几档(面试中 / 没有 / 自雇)。
 * 「不清楚」与没答不在里面 —— 那两种要让分值段照问。
 */
export const OFFER_NONE_BANDS = [2, 3, 4]

/**
 * 各卷「不清楚」那一档的值。法语与总经验答了它 = 不限,分值段照问。
 */
export const BAND_UNKNOWN = 9

/**
 * 语言档 → 分值卡可选的 CLB 值域(index = 基础卷的档值)。语言在基础卷已问精确档,
 * 范围恒为单值,分值卡对应的追问题整题不再出。
 */
export const CLB_RANGE = [[], [0], [4], [5], [6], [7], [8], [9], [10]]

/**
 * 总经验档 → 分值卡可选的年数值域(index = 基础卷的档值)。「不清楚」(9)落空数组 = 不限。
 */
export const TOTAL_EXP_RANGE = [[], [0], [0], [1], [2], [3], [4], [5]]

/**
 * SK 拆段追问时可选的年数全集(仍受总经验封顶,取其中 ≤ 总经验上界的那几个)。
 */
export const SPLIT_YEARS = [0, 1, 2, 3, 4, 5]

/**
 * 分值卡 profile 段的题 → 它对应官方表里的哪个因素。共用题(prov='')先前在**每个**
 * 省页签下都摆,于是 BC 页签下冒出一格「第二语言 CLB」(那是 SK/ON 表才有的
 * language2)—— 2026-08-16 Frank 实拍。
 */
export const PROFILE_FACTOR: Record<string, string[]> = {
  /**
   * 学历题对应官方的 education 因素。
   */
  'profile:edu': ['education'],

  /**
   * 年龄题对应官方的 age 因素。
   */
  'profile:age': ['age'],

  /**
   * 第一语言题:各省表里叫 language 或 language1,两种都认。
   */
  'profile:clb1': ['language', 'language1'],

  /**
   * 第二语言题只对应 language2(BC 没有这个因素,所以 BC 页签下不该出这一格)。
   */
  'profile:clb2': ['language2'],

  /**
   * 近段经验题:各省表里叫 work / work5 / workMonths。
   */
  'profile:expRecent': ['work', 'work5', 'workMonths'],

  /**
   * 远段经验题只对应拆段省的 work610。
   */
  'profile:expOlder': ['work610'],
}

/**
 * 基础卷学历档 → 分值卡口径(index = 选项 value,与 lib/quiz/fields.ts 的 EDU 同一张表)。
 * 学历 2026-08-16 收回基础卷,值由这里带进分值卡,不再让人答第二遍。
 */
export const EDU_OF: Record<number, string> = {
  /**
   * 第 1 档:高中。
   */
  1: 'highschool',

  /**
   * 第 2 档:两年制大专。
   */
  2: 'diploma2y',

  /**
   * 第 3 档:本科。
   */
  3: 'bachelor',

  /**
   * 第 4 档:硕士。
   */
  4: 'master',

  /**
   * 第 5 档:博士。
   */
  5: 'doctorate',
}

/**
 * 基础卷年龄档 → 分值卡口径(index = 选项 value,与 lib/quiz/fields.ts 的 AGE 同一张表)。
 * 取的是各档的代表年龄,不是区间端点。
 */
export const AGE_OF: Record<number, number> = {
  /**
   * 第 1 档的代表年龄。
   */
  1: 23,

  /**
   * 第 2 档的代表年龄。
   */
  2: 28,

  /**
   * 第 3 档的代表年龄。
   */
  3: 33,

  /**
   * 第 4 档的代表年龄。
   */
  4: 38,

  /**
   * 第 5 档的代表年龄。
   */
  5: 43,
}

/**
 * 官方**没有公布**分值表的省(举证责任在我们:一个 URL + 一句原句,同 gateManifest 的规矩)。
 * 不在这张表里的缺省一律按「本站未收录」说 —— 两句话在用户那儿意思相反,不许拿一句混着用。
 *
 * 🔴 口径(2026-08-16 Frank 问「EOI 池子里面不打分吗」时校正):这里能断言的只有
 * 「**没公布**分值/排序办法」,**不是**「池子里不打分」。NS 那份处理政策全文没有一个分数,
 * 但也从没说过自己不排序 —— 池子内部有没有一套不公开的办法,官方没说,我们不知道,
 * 不许替它说没有(CLAUDE.md「官方不公布是需要举证的断言」的同一条线)。
 * NS:2025-11-28 起 NSNP 全通道 + AIP 指定改 EOI,选谁由厅里(LSI)按当期优先级**酌情**定。
 */
export const NO_POINTS_GRID: Record<string, {
  /**
   * 官方那句原话所在的页面地址。
   */
  url: string

  /**
   * 官方原句(quote-anchored:举证靠它,不靠我们的转述)。
   */
  quote: string

  /**
   * 我们抓下这句话的日期(官方改口时好对账)。
   */
  fetched: string
}> = {
  /**
   * 新斯科舍省:官方 EOI 说明页只说「选择时可能参考」的几项,通篇没有分值表。
   */
  NS: {
    url: 'https://liveinnovascotia.com/eoi-process',
    quote:
      'Factors that may guide selection include provincial priorities, remaining allocation, '
      + 'EOI pool volume, and program integrity considerations.',
    fetched: '2026-08-15',
  },
}

/**
 * 初评表名次列的宽。
 */
export const W_PLAN_RANK = '5%'

/**
 * 初评表通道列的宽(粗筛态:门槛两列不出,宽度让给通道名)。
 */
export const W_PLAN_PATH_COARSE = '43%'

/**
 * 初评表通道列的宽(个人档态)。
 */
export const W_PLAN_PATH_FULL = '23%'

/**
 * 初评表竞争列的宽。
 */
export const W_PLAN_RATIO = '13%'

/**
 * 初评表在招列的宽。
 */
export const W_PLAN_JOBS = '11%'

/**
 * 初评表「还差」列的宽。
 */
export const W_PLAN_GAP = '17%'

/**
 * 初评表「还要多久」列的宽。
 */
export const W_PLAN_TIME = '18%'

/**
 * 初评表操作列的宽(粗筛态)。
 */
export const W_PLAN_ACT_COARSE = '20%'

/**
 * 初评表操作列的宽(个人档态)。
 */
export const W_PLAN_ACT_FULL = '16%'

/**
 * 竞争表省份列的宽。
 */
export const W_COMP_PROV = '24%'

/**
 * 竞争表学签存量列的宽(拆分态)。
 */
export const W_COMP_STUDY = '14%'

/**
 * 竞争表工签存量列的宽(拆分态)。
 */
export const W_COMP_WORK = '14%'

/**
 * 竞争表存量合计列的宽(旧库行没带拆分字段时的单列形态)。
 */
export const W_COMP_POOL = '20%'

/**
 * 竞争表名额列的宽。
 */
export const W_COMP_QUOTA = '18%'

/**
 * 竞争表竞争比列的宽。
 */
export const W_COMP_RATIO = '14%'

/**
 * 竞争表流量列的宽。
 */
export const W_COMP_FLOW = '22%'

/**
 * 职业竞争表省份列的宽。
 */
export const W_OCC_PROV = '28%'

/**
 * 职业竞争表在招列的宽。
 */
export const W_OCC_OPEN = '18%'

/**
 * 职业竞争表近 30 天新增列的宽。
 */
export const W_OCC_NEW30 = '18%'

/**
 * 职业竞争表平均在招天数列的宽。
 */
export const W_OCC_DAYS = '18%'

/**
 * 抽选表省份列的宽。
 */
export const W_DRAW_PROV = '24%'

/**
 * 抽选表日期列的宽。
 */
export const W_DRAW_DATE = '20%'

/**
 * 抽选表通道列的宽。
 */
export const W_DRAW_STREAM = '32%'

/**
 * 抽选表邀请数列的宽。
 */
export const W_DRAW_INV = '12%'

/**
 * 抽选表分数线列的宽。
 */
export const W_DRAW_SCORE = '12%'

/**
 * 初评表名次列的 key。
 */
export const COL_RANK = 'rank'

/**
 * 初评表通道列的 key。
 */
export const COL_PATH = 'path'

/**
 * 竞争列的 key(初评表与竞争表共用同一个名字,两张表各自成域不冲突)。
 */
export const COL_RATIO = 'ratio'

/**
 * 初评表在招列的 key。
 */
export const COL_JOBS = 'jobs'

/**
 * 初评表「还差」列的 key。
 */
export const COL_GAP = 'gap'

/**
 * 初评表「还要多久」列的 key。
 */
export const COL_TIME = 'time'

/**
 * 初评表操作列的 key。
 */
export const COL_ACT = 'act'

/**
 * 省份列的 key(竞争表与职业竞争表共用)。
 */
export const COL_PROVINCE = 'province'

/**
 * 竞争表学签存量列的 key。
 */
export const COL_POOL_STUDY = 'poolStudy'

/**
 * 竞争表工签存量列的 key。
 */
export const COL_POOL_WORK = 'poolWork'

/**
 * 竞争表存量合计列的 key。
 */
export const COL_POOL = 'pool'

/**
 * 竞争表名额列的 key。
 */
export const COL_QUOTA = 'quota'

/**
 * 竞争表流量列的 key。
 */
export const COL_FLOW = 'flow'

/**
 * 职业竞争表在招列的 key。
 */
export const COL_OPEN = 'open'

/**
 * 职业竞争表近 30 天新增列的 key。
 */
export const COL_NEW30 = 'new30'

/**
 * 职业竞争表平均在招天数列的 key。
 */
export const COL_DAYS = 'days'

/**
 * 抽选表省份列的 key。
 */
export const COL_DRAW_PROV = 'prov'

/**
 * 抽选表日期列的 key。
 */
export const COL_DRAW_DATE = 'date'

/**
 * 抽选表通道列的 key。
 */
export const COL_DRAW_STREAM = 'stream'

/**
 * 抽选表邀请数列的 key。
 */
export const COL_DRAW_INV = 'inv'

/**
 * 抽选表分数线列的 key。
 */
export const COL_DRAW_SCORE = 'score'

/**
 * 数字列右对齐(全站表格口径:能比大小的数竖着对齐)。
 */
export const ALIGN_RIGHT = 'right'

/**
 * 条件格网格的 id 前缀(摘要卡那一张)。
 */
export const GRID_ID_COND = 'dpCond'

/**
 * 条件格网格的 id 前缀(估分卡里按省摆的那一张)。
 */
export const GRID_ID_SCORE = 'slCond'

/**
 * 「规则待核对」态的文案键(本站还没收录这条通道的门槛条文)。
 */
export const KEY_DATA_GAP = 'dp.planDataGap'

/**
 * 「拿到 offer 即可申请」的通用文案键(通道没写自己的说法时用)。
 */
export const KEY_AFTER_OFFER_OK = 'dp.planAfterOfferOk'

/**
 * 「拿到 offer 后还要再攒 N 档」的文案键前缀(后接 tier 档号)。
 */
export const KEY_AFTER_OFFER_TIER = 'dp.planAfterOfferTier'

/**
 * 「拿到 offer 后仍差某道闸」的文案键前缀(后接闸名)。
 */
export const KEY_AFTER_OFFER_GAP = 'dp.planAfterOfferGap.'

/**
 * 「被某道闸卡住」的文案键前缀(后接闸名)。
 */
export const KEY_BLOCKED = 'dp.planBlocked.'

/**
 * 「差 offer」这一档的文案键(答不全时不敢承诺反事实,维持这句)。
 */
export const KEY_BLOCKED_OFFER = 'dp.planBlocked.offer'

/**
 * 「该答的题还没答」的文案键。
 */
export const KEY_NEED_INFO = 'dp.planNeedInfo'

/**
 * 「还要攒多久」的文案键前缀(后接 tier 档号)。
 */
export const KEY_PLAN_TIER = 'dp.planTier'

/**
 * 在读学生的「毕业拿工签之后再攒多久」文案键前缀(后接全职标记与 tier 档号)。
 */
export const KEY_TIER_GRAD = 'dp.planTierGrad'

/**
 * 官方条文写了 full-time 才敢加的「全职」标记(拼在毕业后变体的键里)。
 */
export const KEY_TIER_FULLTIME = 'Ft'

/**
 * 「拿到 offer 起算还要多久」的文案键前缀(后接 tier 档号)。
 */
export const KEY_WAIT_TIER = 'dp.why.wait'

/**
 * 联邦线的区域名文案键(通道没写自己的区域名时用)。
 */
export const KEY_FEDERAL = 'dp.federal'

/**
 * 缺口胶囊的文案键前缀(后接闸名)。
 */
export const KEY_GAP_HEAD = 'dp.why.gap.'

/**
 * 专业对口未答时那枚灰提醒的文案键。
 */
export const KEY_WHY_FIELD = 'dp.why.fieldMatch'

/**
 * 「估分 X < 线 Y」的文案键(够不着线的行门槛列写数字,结论用户自己得)。
 */
export const KEY_BELOW_LINE = 'dp.planBelowLine'

/**
 * 在招岗数的文案键。
 */
export const KEY_JOBS_N = 'dp.planJobsN'

/**
 * 通道名的文案键前缀(后接通道 key)。
 */
export const KEY_PATH_NAME = 'jpw.p.'

/**
 * 省名的文案键前缀(后接两位省码)。
 */
export const KEY_PROV = 'prov.'

/**
 * 「看该省在招岗」的默认文案键(通道没写自己的说法时用)。
 */
export const KEY_SEE_JOBS = 'dp.planSeeJobsAip'

/**
 * 闸名细分后的文案键前缀(后接 asks 的具体许可名)。
 */
export const GATE_KEY_SEP = '.'

/**
 * 一个半角空格。拼在两段字之间(「在招 12」这类)—— 值抽出来是为了让它有地方挂注释,
 * 也免得在 JSX 里写成一个看不见的裸串。
 */
export const TEXT_SPACE = ' '

/**
 * 百分号(进度条宽度拼在数字后面)。
 */
export const PERCENT_SIGN = '%'

/**
 * 进度条无障碍名里「已答/总数」的分隔。
 */
export const BAR_SEP = '/'

/**
 * className 之间的分隔符。DOM 的 class 属性按**空白**切词,拼多个类只能用空格 ——
 * 换成逗号或加号会被浏览器当成一整个类名,整条样式静默失效。
 */
export const CLS_SEP = ' '

/**
 * 重算边界键各段之间的分隔。
 */
export const KEY_JOIN_SEP = '|'

/**
 * 官方表版本串之间的分隔(拼进分值卡重挂键)。
 */
export const GUIDE_SEP = ','

/**
 * 没答那一格的中文占位。上线以来就是内联死值 —— 要不要收进 lib/i18n 的三语表,
 * 第二段已并入;收进三语表归 i18n 批,本批只把它归位到常量。
 */
export const TEXT_UNPARSED_ZH = '待填写'

/**
 * 没答那一格的英文占位(口径同上)。
 */
export const TEXT_UNPARSED_EN = 'Not completed'

/**
 * 时薪那道题在分值卡存档里的「答过了」标记键。
 */
export const TICK_WAGE = 'job:wage'

/**
 * BC 工作地区那道题在分值卡存档里的「答过了」标记键。
 */
export const TICK_AREA = 'job:bcArea'

/**
 * 初评表名次列的表头(一个井号,列名不占宽)。
 */
export const COL_RANK_LABEL = '#'

/**
 * 职业那一格的条件格 key(点它开选职业专属页,不是一道字段库的题)。
 */
export const KEY_TILE_OCC = 'occ'

/**
 * 目标省那一格的条件格 key(点它开选目标省专属页)。
 */
export const KEY_TILE_PROV = 'prov'

/**
 * 本页问的是哪一种决策(取题单要它)。
 */
export const DECISION_PR = 'pr'

/**
 * 本页问的是哪一段题(基础段;估分段的题由分值卡自己出)。
 */
export const STAGE_BASIC = 'basic'

/**
 * 基础题最后一题的钮文案键(决策页 = 看结果;缺省会沿用报告页的「出报告」)。
 */
export const KEY_DONE_NEXT = 'plan.next'

/**
 * 入口钮「改答案」态的文案键(整卷答满)。
 */
export const KEY_BTN_BACK = 'plan.back'

/**
 * 入口钮「继续作答」态的文案键(答过一半)。
 */
export const KEY_BTN_RESUME = 'dp.resume'

/**
 * 入口钮「开始评估」态的文案键(一题没答)。
 */
export const KEY_BTN_START = 'dp.start'

/**
 * 弹框基础段的标题键。
 */
export const KEY_QUIZ_TITLE = 'dp.quiz'

/**
 * 弹框估分段的标题键。
 */
export const KEY_SCORE_TITLE = 'sl.title'

/**
 * 选目标省页重挂键的尾段。
 */
export const PROV_STEP_KEY = 'provinces'

/**
 * 基础题页重挂键的尾段:从后面返回,落在最后一题。
 */
export const FORM_KEY_END = 'end'

/**
 * 基础题页重挂键的尾段:点条件格直达那道题(后接题名)。
 */
export const FORM_KEY_FOCUS_HEAD = 'f:'

/**
 * 基础题页重挂键的尾段:落在第一道没答的题。
 */
export const FORM_KEY_AUTO = 'auto'

/**
 * 分值卡里「远段经验」那道题的名字(不拆段的表把它藏起来)。
 */
export const KEY_INPUT_EXP_OLDER = 'expOlder'

/**
 * 分值卡里「学历」那道题的名字(基础卷问过就藏)。
 */
export const KEY_INPUT_EDU = 'edu'

/**
 * 分值卡里「年龄」那道题的名字(基础卷问过就藏)。
 */
export const KEY_INPUT_AGE = 'age'

/**
 * 分值卡里「第二语言」那道题的名字(法语题供档后就藏)。
 */
export const KEY_INPUT_CLB2 = 'clb2'

/**
 * 达标档:绿字浅绿底。
 */
export const TONE_OK = 'ok'

/**
 * 信息档:蓝字浅蓝底。
 */
export const TONE_INFO = 'info'

/**
 * 缺口档:琥珀字浅琥珀底。
 */
export const TONE_WARN = 'warn'

/**
 * 静音档:灰字灰底(本站没收录条文那一枚)。
 */
export const TONE_MUTE = 'mute'

/**
 * 钮的原生 type(不写会被表单当提交钮)。
 */
export const BTN_TYPE = 'button'

/**
 * 关闭钮上那个叉。
 */
export const CLOSE_MARK = '×'

/**
 * 注册闸弹的是注册态(与顶栏同一个 AuthModal;08-09 拍板「别跳页」)。
 */
export const AUTH_MODE_REGISTER = 'register'

/**
 * 出处链接新开页(官方原句要能对照着看,不打断本页答题)。
 */
export const TARGET_BLANK = '_blank'

/**
 * 基础题条件格的前半段题单(职业格与目标省格各有专属页,不在这张表里)。
 * 组序 = 类别名,gated = 这道题有题级显隐(不该问的人不摆一个永远「待填写」的格)。
 * 顺序即条件格的书写顺序,不随答案变动而跳。
 */
export const SUMMARY_FIELDS_HEAD = [
  { name: 'status', group: 'who', label: 'dp.sum.status', gated: false },
  { name: 'permitBand', group: 'who', label: 'dp.sum.permit', gated: true },
  { name: 'resProv', group: 'who', label: 'dp.sum.resProv', gated: true },
  { name: 'eduBand', group: 'edu', label: 'dp.sum.edu', gated: false },
  { name: 'ageBand', group: 'who', label: 'dp.sum.age', gated: false },
  { name: 'clbBand', group: 'lang', label: 'dp.sum.clb', gated: false },
  { name: 'totalExpBand', group: 'work', label: 'dp.sum.totalExp', gated: false },
  { name: 'expBand', group: 'work', label: 'dp.sum.canExp', gated: false },
]

/**
 * 基础题条件格的后半段题单(排在目标省格之后)。
 * 2026-08-12 加的 offer 与加拿大学历两题也要回显 —— 卡头写着「已答 6/8」而下面只摆 6 格,
 * 数和格子就对不上;法语题(FCIP 的定义性门槛)全员都问,所以格子也无条件摆 ——
 * 2026-08-15 首版漏了这一格,题问了、答案也存了(计数都对),就是回显没有,
 * 人在格子里找不到自己答过的那道题。
 */
export const SUMMARY_FIELDS_TAIL = [
  { name: 'offerBand', group: 'work', label: 'dp.sum.offer', gated: false },
  { name: 'canadaEduBand', group: 'edu', label: 'dp.sum.canadaEdu', gated: false },
  { name: 'fieldMatchBand', group: 'edu', label: 'dp.sum.fieldMatch', gated: true },
  { name: 'eduProv', group: 'edu', label: 'dp.sum.eduProv', gated: true },
  { name: 'eduYearsBand', group: 'edu', label: 'dp.sum.eduYears', gated: true },
  { name: 'frenchBand', group: 'lang', label: 'dp.sum.french', gated: false },
]

/**
 * 条件格的组序代号(固定成「身份 → 教育 → 语言 → 职业经验 → 目标」,不跟着题序跑)。
 */
export const GROUP_ORDER = ['who', 'edu', 'lang', 'work', 'goal']

/**
 * 估分线卡只列该省最近几轮抽选。再往前的线是另一个政策周期的事,摆出来会被当成同一把尺;
 * 而没有分数线的轮次压根不进这张表 —— 拿它当 0 比就是编。
 */
export const LINE_DRAWS_MAX = 6

/**
 * 估分线卡省页签的 aria id 前缀(与面板 id 对上;同页多组选项卡各给各的前缀)。
 */
export const TAB_ID_LINE_PROV = 'slProv'

/**
 * 差值为正时的正号(你的分高出这条线)。
 */
export const SIGN_PLUS = '+'

/**
 * 差值为负时的负号。用 U+2212 真减号而不是连字符:等宽数字里连字符只有半格宽,
 * 正负两行竖着排会错位。
 */
export const SIGN_MINUS = '−'

/**
 * 抽选线表的日期列身份。
 */
export const COL_LINE_DATE = 'date'

/**
 * 抽选线表的通道列身份。
 */
export const COL_LINE_STREAM = 'stream'

/**
 * 抽选线表的分数线列身份。
 */
export const COL_LINE_CUT = 'cut'

/**
 * 抽选线表的「你」列身份(你的分与这条线差多少)。
 */
export const COL_LINE_YOU = 'you'

/**
 * 抽选线表的日期列宽。四列写死百分比,永不横滚。
 */
export const W_LINE_DATE = '18%'

/**
 * 抽选线表的通道列宽。官方原名最长,宽度全给它 —— 走查 #297:原名不许截断,放不下就换行。
 */
export const W_LINE_STREAM = '52%'

/**
 * 抽选线表的分数线列宽。
 */
export const W_LINE_CUT = '15%'

/**
 * 抽选线表的「你」列宽。
 */
export const W_LINE_YOU = '15%'

/**
 * 题单的探索段(报告页那一档)。基础段的常量是上面的 STAGE_BASIC。
 */
export const STAGE_EXPLORE = 'explore'

/**
 * 「公告」类抽选:官方只发了一条通知,没有实际的邀请轮次。
 * 它不进估分线卡 —— 一条没有线的记录混在分数线里,读的人会以为那一轮的线是空。
 */
export const DRAW_KIND_NOTICE = 'notice'

/**
 * 估分结论的达标态:下界已经 >= 官方线(判定归 lib/points 的 lineStateOf)。
 */
export const LINE_ABOVE = 'above'

/**
 * 估分结论的欠缺态:上界仍然 < 官方线。
 */
export const LINE_BELOW = 'below'

/**
 * 抽选线一行的行身份分隔(日期 + 序号 —— 同一天可能有多轮,光靠日期分不开)。
 */
export const LINE_ROW_KEY_SEP = ':'

/**
 * 取题单时不分批(字段库支持按批取题,答题器一次要全量:题级显隐会当场增减清单,
 * 分批取会让被裁掉的题在批与批之间漏掉)。
 */
export const STEP_BATCH_ALL = 0

/**
 * 大温地区(Area 1)成员市镇。官方 PDF 只写「Metro Vancouver Regional District」,
 * 成员名单是公开事实 —— 按它把用户填的城市落成 BC 官方的工作地区档。
 */
export const MVRD_CITIES = ['vancouver', 'surrey', 'burnaby', 'richmond', 'coquitlam', 'delta', 'langley',
  'maple ridge', 'new westminster', 'north vancouver', 'port coquitlam', 'port moody', 'pitt meadows',
  'white rock', 'west vancouver', 'bowen island', 'anmore', 'belcarra', 'lions bay', 'tsawwassen']

/**
 * 紧邻大温的第二档(Area 2)市镇。
 */
export const AREA2_CITIES = ['squamish', 'abbotsford', 'agassiz', 'mission', 'chilliwack']

/**
 * BC 工作地区档:大温(Area 1)在官方档位表里的序号。它是**保守默认** ——
 * 不知道城市时落这一档(0 分),不许用有利默认把分数吹上去。
 */
export const AREA_MVRD = 0

/**
 * BC 工作地区档:紧邻大温(Area 2)在官方档位表里的序号。
 */
export const AREA_NEAR = 1

/**
 * BC 工作地区档:其余地区在官方档位表里的序号。
 */
export const AREA_REST = 2

/**
 * 年龄下拉的选项档。打分按选中值算,预填吸附也以此为准 —— 两处必须同一张表,
 * 不然显示的年龄与实际参与打分的年龄就分叉了。
 */
export const AGE_OPTIONS = [17, 19, 25, 30, 34, 38, 42, 45, 48, 52]

/**
 * #304 offer 前提因子族:这些因子在官方表里全以「有 offer」为前提(AB 的 offer/offerSector/
 * offerArea/regulated、SK 的 offer)。闸门只认**基础卷**的 hasJobOffer(ctx.hasOffer):
 * true=开;false/没答=关 —— 没答不等于有。关闸时整族不出题、勾选不计分;存量勾选留在档里
 * 不删,基础卷改回「有」即恢复参与。按键族识别,别的省加同名因子自动生效。
 */
export const OFFER_PREMISE_FACTORS = ['offer', 'offerSector', 'offerArea', 'regulated']

/**
 * 分值卡学历档 → 字段库 eduBand(fields.ts 的 EDU 阶梯:1 高中 / 2 大专或证书 / 3 本科 /
 * 4 硕 / 5 博)。tradeCert/cert1y/diploma2y 在字段库里同属「大专或证书」一档 —— 判定引擎
 * 按 eduBand 消费,这里答了就写回统一答案(单一来源),不然「答了白答」(引擎收不到 edu,
 * CRS 永远估不出)。
 */
export const EDU_KEY_BAND: Record<string, number> = {
  /**
   * 高中及以下。
   */
  highschool: 1,

  /**
   * 一年证书 —— 字段库里与大专同档。
   */
  cert1y: 2,

  /**
   * 两年大专。
   */
  diploma2y: 2,

  /**
   * 技工证 —— 字段库里与大专同档。
   */
  tradeCert: 2,

  /**
   * 本科。
   */
  bachelor: 3,

  /**
   * 硕士。
   */
  master: 4,

  /**
   * 博士。
   */
  doctorate: 5,
}

/**
 * 年龄 → 字段库 ageBand 的档界(逐档取「不超过 max 就是这一档」)。
 * 写回统一答案用,判定引擎(profile-pathways)只认 ageBand。
 */
export const AGE_BAND_STEPS = [
  { max: 24, band: 1 },
  { max: 30, band: 2 },
  { max: 35, band: 3 },
  { max: 40, band: 4 },
]

/**
 * 超过最后一档的年龄落这一档。
 */
export const AGE_BAND_LAST = 5

/**
 * 官方表的因素名:总经验(不拆段的省用这一个)。
 */
export const FACTOR_WORK = 'work'

/**
 * 官方表的因素名:AB EOI 按月计的经验。它走引擎自动换算,不进手选清单 ——
 * 否则又把经验问第二遍。
 */
export const FACTOR_WORK_MONTHS = 'workMonths'

/**
 * 官方表的因素名:学历。
 */
export const FACTOR_EDUCATION = 'education'

/**
 * 官方表的因素名:语言(不分第一/第二语言的省用这一个;它也是双语加分那条 bonus 的因素名)。
 */
export const FACTOR_LANGUAGE = 'language'

/**
 * 官方表的因素名:第一语言。
 */
export const FACTOR_LANGUAGE1 = 'language1'

/**
 * 官方表的因素名:第二语言。
 */
export const FACTOR_LANGUAGE2 = 'language2'

/**
 * 官方表的因素名:年龄。
 */
export const FACTOR_AGE = 'age'

/**
 * 官方表的因素名:雇主 offer。
 */
export const FACTOR_OFFER = 'offer'

/**
 * 官方表的因素名:时薪。
 */
export const FACTOR_WAGE = 'wage'

/**
 * 官方表的因素名:工作地区。
 */
export const FACTOR_AREA = 'area'

/**
 * 官方表的因素名:TEER 档。岗位语境给得出 TEER 时按岗位落档,不问人。
 */
export const FACTOR_TEER_CAT = 'teerCat'

/**
 * 官方表的因素名:职业大类。岗位语境给得出 5 位职业码时按首位落档,不问人。
 */
export const FACTOR_OCC_CAT = 'occCat'

/**
 * 官方表的因素名:加拿大学历完成地(#305 可由基础卷答案推导)。
 */
export const FACTOR_EDU_LOCATION = 'eduLocationCanada'

/**
 * 官方表的因素名:加拿大经验所在地(#305 可由基础卷答案推导)。
 */
export const FACTOR_WORK_LOCATION = 'workLocationCanada'

/**
 * 手选清单的排除名单:这些因素已有 profile / 岗位语境的自动映射,再摆一遍就是把同一件事
 * 问第二遍。workMonths 也在里面(AB EOI 按月计经验走引擎换算)。
 */
export const AUTO_FACTORS = [FACTOR_WORK, FACTOR_WORK5, FACTOR_WORK610, FACTOR_WORK_MONTHS, FACTOR_EDUCATION,
  FACTOR_LANGUAGE, FACTOR_LANGUAGE1, FACTOR_LANGUAGE2, FACTOR_AGE, FACTOR_OFFER]

/**
 * 算分时已有 profile / 岗位映射、不走用户直选档位的因素。比上面那张少一个 workMonths ——
 * 算分侧本来就没有它的档位行要跳过。
 */
export const MAPPED_FACTORS = [FACTOR_WORK, FACTOR_WORK5, FACTOR_WORK610, FACTOR_EDUCATION,
  FACTOR_LANGUAGE, FACTOR_LANGUAGE1, FACTOR_LANGUAGE2, FACTOR_AGE, FACTOR_OFFER]

/**
 * 官方表一行的种类:档位行(选一档得一档的分)。
 */
export const KIND_ROW = 'row'

/**
 * 官方表一行的种类:规则行(BC 时薪那种按公式算的)。
 */
export const KIND_RULE = 'rule'

/**
 * 官方表一行的种类:加分项(勾上就加,可以多条同时成立)。
 */
export const KIND_BONUS = 'bonus'

/**
 * 卑诗省码。BC 的工作地区档有本站的社区映射兜底,别的省没有 —— 地区那一题只对它免问。
 */
export const PROV_BC = 'BC'

/**
 * 纽芬兰与拉布拉多省码。它的分制是 EE Skilled Worker 100 分制,适用范围要单独说明。
 */
export const PROV_NL = 'NL'

/**
 * 官方档位文字里的数字(含小数)。档位文字自己写着区间(「Less than $20」「$20 to $24.99」),
 * 按它读,前端不替官方编档。
 */
export const LABEL_NUM_RE = /\d+(?:\.\d+)?/g

/**
 * 官方档位文字的「低于」写法。
 */
export const LABEL_UNDER_RE = /less than|under/i

/**
 * 官方档位文字的「及以上」写法。
 */
export const LABEL_OVER_RE = /or higher|or more|and above/i

/**
 * 官方档位文字里逐位取数字(TEER 档与职业大类那两行按数字集合判命中)。
 */
export const LABEL_DIGIT_RE = /\d/g

/**
 * 分制全名结尾括号里自报的通道名(如「OINP EOI points (Ontario Workforce Priority stream)」)。
 * 声明了通道的省只认同一条通道的抽选记录 —— 拿别的通道的线判你差多少分是编。
 */
export const SYSTEM_STREAM_RE = /\((?<stream>[^)]+)\)\s*$/

/**
 * 学历完成地行文里的「在另一个省完成」。按行文识别,不赌官方表的行序。
 */
export const ANOTHER_PROV_RE = /another province/i

/**
 * 双语加分那一条的行文特征。
 */
export const BILINGUAL_RE = /both english and french/i

/**
 * 双语加分的门槛分,从官方行文里解析(如 AB 的 4)。解析不出就照旧出题,不猜。
 */
export const LANG_THRESHOLD_RE = /(?:CLB|NCLC)[^0-9]*(?<n>\d+)/i

/**
 * 一屏最多摆几条加分项(2026-08-11 Frank「一页问题小于等于 4,太多看麻了,而且要相关」)。
 * 现有最大的组是 3 条;这道闸是给以后加省的数据留的,别让某个省一屏冒出 8 条。
 */
export const BONUS_CHUNK_MAX = 4

/**
 * BC 时薪规则的默认起算时薪(官方规则串坏了才用得上)。
 */
export const WAGE_FLOOR_DEFAULT = 16

/**
 * BC 时薪规则的默认封顶时薪。
 */
export const WAGE_CAP_DEFAULT = 70

/**
 * BC 时薪分的默认上限(官方行没写 factorMax 时用)。
 */
export const WAGE_POINTS_MAX = 55

/**
 * BC 时薪「每整元 1 分」的起算点:时薪取整减去它就是这一项的分。
 */
export const WAGE_POINT_BASE = 15

/**
 * 基础卷「有加拿大学历」那一档。
 */
export const CANADA_EDU_HAS = 1

/**
 * 基础卷「没有加拿大学历」那一档。答了它 → 学历完成地两行必然全否,整题不再问。
 */
export const CANADA_EDU_NONE = 2

/**
 * 基础卷加拿大经验「没有」那一档(0 个月)。答了它 → 经验所在地两行必然全否。
 */
export const EXP_BAND_NONE = 1

/**
 * 答题态下分值卡撑满题卡的全局类(样式住 quiz 桶的答题壳)。
 */
export const CLS_QUIZ_FILL = 'qzFill'

/**
 * 省页签的「全收起」哨兵:点开着的那一行就是收起,与「还没选过」区分得开。
 */
export const PROV_CLOSED = '__closed'

/**
 * 分值卡 profile 段题 key 的前缀(与省级题的「省码:因素」形分得开)。
 */
export const KEY_SCORE_PROFILE_HEAD = 'profile:'

/**
 * 官方因素名 → 文案键的可拼前缀。
 */
export const KEY_PS_FACTOR_HEAD = 'ps.f.'

/**
 * 学历档 → 文案键的可拼前缀。
 */
export const KEY_PS_EDU_HEAD = 'ps.edu.'

/**
 * 各省估分选项卡的 aria id 前缀(同页多组选项卡各给各的前缀)。
 */
export const TAB_ID_SCORE_PROV = 'ps-prov'

/**
 * 时薪回显的货币头。
 */
export const RATE_HEAD = '$'

/**
 * 时薪回显的单位尾。
 */
export const RATE_TAIL = '/hr'

/**
 * 单条加分项退回是/否单选时,「是」那一颗的选项 key。
 */
export const CHOICE_YES = 'yes'

/**
 * 单条加分项退回是/否单选时,「否」那一颗的选项 key。
 */
export const CHOICE_NO = 'no'

/**
 * 数字输入框的 type。
 */
export const INPUT_NUMBER = 'number'

/**
 * 勾选框的 type。
 */
export const INPUT_CHECKBOX = 'checkbox'

/**
 * 官方规则串读不出来时的空规则(按官方默认值走)。
 */
export const RULE_EMPTY = '{}'

/**
 * 加分项题 key 的段数(省码:因素:批 三段)。条件格回显靠段数认出这是不是加分题。
 */
export const BONUS_KEY_PARTS = 3

/**
 * 勾选键里因素名所在的段序(省码:因素:序号)。
 */
export const TICK_KEY_FACTOR_POS = 1

/**
 * 「你的条件」里第一语言 CLB 那一格的键。
 */
export const KEY_INPUT_CLB1 = 'clb1'

/**
 * 「你的条件」里近段经验那一格的键。
 */
export const KEY_INPUT_EXP_RECENT = 'expRecent'

/**
 * 经验年数的顶档:官方表只分到「5 年及以上」,选项文字也换成那一句。
 */
export const EXP_YEARS_MAX = 5

/**
 * CLB 档位文字的前缀(官方口径本身就叫 CLB,不译)。
 */
export const CLB_LABEL_HEAD = 'CLB '

/**
 * CLB 的候选值:0 = 还没考(不是「零分」,是没成绩)。
 */
export const CLB_VALUES = [0, 4, 5, 6, 7, 8, 9, 10]

/**
 * 一份分数来自岗位事实(时薪、地区、TEER、职业大类)。
 */
export const SOURCE_JOB = 'job'

/**
 * 一份分数来自他自报的条件。
 */
export const SOURCE_PROFILE = 'profile'

/**
 * 一份分数来自加分项勾选。
 */
export const SOURCE_TICK = 'tick'

/**
 * 「你的条件」一格的形态:下拉。
 */
export const FIELD_SELECT = 'select'

/**
 * 热门职业榜一次取多少行 —— /plan/pr 的门在 SSR 里取好,答题器的职业候选用它。
 */
export const TOP_NOCS_LIMIT = 24

/**
 * SSR 先算那一版判定的等待上限(毫秒)。
 * 🔴 **SSR 不许阻塞页面**:判定拿不到/慢了就当没有,首屏照出,客户端再取(它本来就会取)。
 *    数据面有单件缓存(实测 getVerdictData 冷 2.3s、热 0ms;名录冷 97ms、热 0ms)——
 *    热进程里这一步几乎免费,但**冷启那一次不能让整页跟着等**,更不能因为它挂了页面就白屏。
 */
export const SSR_WIRE_MS = 1500

/**
 * 判定线格上「这是一条错」的那一格的键名(`{ error: … }`)。页面门拿它探测线格:
 * 身上有这个键 = 判定没算成,SSR 那一版当没有(首屏照出,客户端再取)。
 * 探测用**键在不在**而不是比值 —— 错的内容会变(话术、错误码),而「有没有这一格」是契约。
 * 这一格是与 `/api/ruling/verdict` 共用的那条线格的一部分,改名要连它一起改。
 */
export const WIRE_ERROR_KEY = 'error'

/**
 * 决策页(/plan/pr)的 SEO 头。住这里而不是页面门里:门里不留死值常量,页面门只
 * `export const metadata = PLAN_PR_META` 一行转发(2026-08-29 Frank「框架导出的内容
 * 也一律来自桶」,形照 start 的 START_META)。
 */
export const PLAN_PR_META = {
  /**
   * 浏览器标签与搜索结果标题。
   */
  title: 'PR assessment — per-job verdict, latest PNP draws | Offer2PR',

  /**
   * 搜索结果摘要(英文优先 —— 88% 流量来自 Google;中文一句压在后面)。
   * 说的是这一页的两样免费硬事实:各省最近抽选分数线,与逐岗的三项判定。
   */
  description:
    'Employer offer → provincial nomination: latest draw cutoffs by province and a per-job three-part verdict.'
    + ' 雇主 offer → 省提名:各省最近抽选分数线与逐岗三项判定。',
}
