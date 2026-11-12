/**
 * gate 域(访客门)的死值:四道题的步序与题面键、各题的点选项表、弹框档、埋点名、专业取数接口与回职位板的地址拼法。
 * (2026-10-04 改版立时首句末尾是「埋点名与查名接口」;A2 起查名撤、专业取数与回职位板两段加入,收口时首句照现状改写。)
 * 2026-10-04 访客四题改版(方向二「图标卡格」)自 profile 桶整段迁入(原 2026-10-03 付费闭环批 A1 立,
 * 逐条决策注释原样带过来);与 profile 同名同义的几枚(TEXT_NONE、PLAIN_BTN_KIND)是本域自己的一份,各家各管。
 * 同日 A2:专业题由十二枚大类胶囊改成「热门具体专业 + 搜索全部 CIP 2021 专业」(取数口 /api/majors,答案存 class 码),
 * 十二格值表 MAJOR_OPTS 随之删;职业题改用 quiz 桶选职业控件(它自己补名字),预选职业查名的 URL_NOC_FACTS 随之删;
 * 另加注册完回职位板按答案筛的地址拼法(参数名、由头)。
 * 同日收口审查:回职位板改在现有地址上改,多抄几个职位板参数名与「设了谁撤谁」三张表;专业搜索在途的占位颗数与读屏播报档。
 * 2026-10-05 返回钮收进弹框壳(modal 桶左上角 back 位),本域不再自己画钮,PLAIN_BTN_KIND 随之删(「跳过这步」10-04 已删)。
 * 2026-10-05 专业题的选择器整块搬去 components/majors(取数接口、防抖与起搜门槛、结果条数、读屏播报档、界面语言码、
 * 左栏「热门」键、页签 / 白卡 id 前缀与五个词条键,注释原样带过去;首句「专业取数接口」那半随之不在本文件);
 * 同日专业改多选,多一枚 MAJOR_SEP(给第 3 题选职业控件递专业码清单)。
 * 2026-10-11 Frank「我应该先注册 再问问题吧」→「需要改」:访客不再答题,访客向导步序 GATE_STEPS、离开一步的埋点 TRACK_GATE_STEP、
 * 回职位板的地址拼法(路径、地址头、八个参数名、三张「设了谁撤谁」表、职业分隔符、由头表)随之删;余下的是档案编辑弹框在用。
 * 2026-11-07 Frank「删了吧」:一题一屏的档案编辑弹框 GateEdit 换成一页表单 GateForm 后删 —— 只为它而在的目标大卡形名
 * TILE_CARD、注册屏 / 身份 / 教育经历三枚步名、编辑步序 GATE_EDIT_STEPS、题面键两枚(GATE_QUESTION_GOAL / GATE_QUESTIONS)、
 * 换题滚回顶的卡片选择器 GATE_FRAME_SEL、进度条角色 ROLE_PROGRESS、返回钮读屏名 GATE_BACK_KEY、主钮字两枚(NEXT_KEY / SAVE_KEY)、
 * 「跳过这步」两枚(SKIP_KEY / SKIP_BTN_KIND)随之删;余下五枚步名只给「补全档案」提示条判空(missingStepsOf)。
 * 2026-11-12 按「大于 1000 就拆子桶」:教育经历几段这一族的函数搬去子桶 ./edu,只有它们在用的八枚(EDU_ABROAD、EDU_SEP、
 * EDU_LIST_MAX、EDU_YEAR_RE、EDU_NON_DIGIT_RE、K_KIND_HEAD、K_LEN_HEAD、K_PROV_HEAD)连注释搬去子桶的 constants;
 * 教育经历一段的件(GateEduLine)还在用的格名、选项与上限留在这里,子桶自抄一份。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */

/**
 * 没答的空文本(专业、所在省的「没选」;跳过时清回它)。与 profile 域同名同义,各家一份。
 * 2026-10-05 专业改多选后「没选」是空列,这一枚只剩所在省等单值格在用。
 */
export const TEXT_NONE = ''

/**
 * 访客向导(2026-10-03 付费闭环批 A1)的弹框宽度档:modal 桶为它扩的 card 档 ——
 * 电脑中号 560 居中(Frank「框能不能大一些」),手机居中卡片(背后的职位板看得见,不整屏)。
 * 2026-11-07 GateEdit 删:只剩一页表单叠开的选择器框(GatePick)用这一档。
 */
export const GATE_MODAL_SIZE = 'card'

/**
 * 访客向导第一步:你现在的目标(找工作 / 拿 PR)。
 */
export const GATE_STEP_GOAL = 'goal'

/**
 * 访客向导第二步:学的什么专业(统计局 CIP 2021 具体专业,存 class 码)。原写「统计局 CIP 2021 大类」(A1 / 改版时问的是大类)。
 * 2026-10-04 A2 改判(Frank「改」):不再问大类,改问具体专业 —— 热门专业胶囊 + 搜索全部 CIP 2021 class(约 2,000 个),单选,存 class 码。
 * 2026-10-05 改多选(Frank「现在点了专业没法取消,而且不能选多个吗」):至多 3 个,存 class 码清单;选择器搬去 components/majors。
 */
export const GATE_STEP_MAJOR = 'major'

/**
 * 访客向导第三步:想做什么工作(热门职业大号胶囊 + 已选标签)。
 */
export const GATE_STEP_JOB = 'job'

/**
 * 访客向导第四步:现在在哪个省(十省 + 加拿大境外,单选)。
 */
export const GATE_STEP_PROV = 'prov'

/**
 * 编辑模式那一题:英文姓名(2026-10-09「我的档案」批:档案页「修改」走同一套题,末尾多问一句投递署名;访客向导不问)。
 */
export const GATE_STEP_NAME = 'name'

/**
 * 身份题的选项(pnp 桶 fit 子桶的身份词,与 pathways.fits 的键同;2026-10-11 资讯申请步骤筛选那一套原样搬来)。
 */
export const FIT_WHOS = ['student', 'pgwp', 'lmia', 'open', 'abroad', 'ee'] as const

/**
 * 身份选项词条键的前缀(后接身份词)。
 */
export const K_WHO_HEAD = 'fit.who.'

/**
 * 教育经历「院校所在地」的选项:十省码 + 国外(同 fit 子桶 EDU_ABROAD)。
 */
export const EDU_PROVS = ['ON', 'QC', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE', 'abroad'] as const

/**
 * 教育经历「公立或私立」的选项。
 */
export const EDU_KINDS = ['public', 'private'] as const

/**
 * 教育经历「课程时长」的选项(短到长;fit 子桶按这个序比最短时长)。
 */
export const EDU_LENS = ['y1', 'y2', 'y3', 'master'] as const

/**
 * 教育经历至多几段(Frank 10-11「最近两年 和 两个 最重要」)。
 */
export const EDU_ROWS_MAX = 2

/**
 * 教育经历一段的三格名:院校所在地。
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
 * 教育经历一段的明细格名(2026-11-12 Frank「这部分不能直接显示具体的年份和学历 证书吗?」):证书或学历名称。
 */
export const EDU_F_CRED = 'cred'

/**
 * 教育经历一段的明细格名:学校。
 */
export const EDU_F_SCHOOL = 'school'

/**
 * 教育经历一段的明细格名:开始年份。
 */
export const EDU_F_FROM = 'from'

/**
 * 教育经历一段的明细格名:结束年份。
 */
export const EDU_F_TO = 'to'

/**
 * 证书或学历名称输入框的占位词(占位即标签)。
 */
export const K_EDU_CRED = 'pf.eduCred'

/**
 * 学校输入框的占位词。
 */
export const K_EDU_SCHOOL = 'pf.eduSchool'

/**
 * 开始年份输入框的占位词。
 */
export const K_EDU_FROM = 'pf.eduFrom'

/**
 * 结束年份输入框的占位词。
 */
export const K_EDU_TO = 'pf.eduTo'

/**
 * 证书或学历名称至多几个字(同 lib/quiz)。
 */
export const EDU_CRED_LEN = 80

/**
 * 学校名至多几个字(同 lib/quiz)。
 */
export const EDU_SCHOOL_LEN = 120

/**
 * 年份几位数字。
 */
export const EDU_YEAR_LEN = 4

/**
 * 年份输入框的手机键位:数字。
 */
export const EDU_YEAR_MODE = 'numeric'

/**
 * 院校所在地下拉的占位词(占位即标签)。
 */
export const K_EDU_WHERE = 'fit.eduWhere'

/**
 * 公立或私立下拉的占位词。
 */
export const K_EDU_KIND = 'fit.eduKind'

/**
 * 课程时长下拉的占位词。
 */
export const K_EDU_LEN = 'fit.eduLen'

/**
 * 「+ 再加一段」的词条键。
 */
export const K_EDU_ADD = 'fit.addRow'

/**
 * 一段行尾 ✕ 的读屏词条键。
 */
export const K_EDU_REMOVE = 'fit.remove'

/**
 * 一段行尾 ✕ 的字形。
 */
export const EDU_REMOVE_GLYPH = '✕'

/**
 * 次要文字钮档(「+ 再加一段」、✕)。
 */
export const EDU_BTN_KIND = 'ghost'

/**
 * 目标题「找工作」那张大卡的值(答案档 goalBand 的档位,以 lib/quiz 的 FIELD_SPECS.goalBand 为准:2 = 先找到工作)。
 * 2026-10-04 改版:目标题从一排胶囊换成两张带图标的大卡(图标各不相同,两张逐张写),原两枚的值表 GOAL_OPTS 拆成两对值 + 面键。
 */
export const GOAL_JOBS = 2

/**
 * 「找工作」大卡的面(借首页入口的词条;顺序照效果图:找工作在前)。
 */
export const GOAL_JOBS_KEY = 'home.g.jobs'

/**
 * 目标题「拿 PR」那张大卡的值(goalBand 档位:1 = 容易拿身份)。
 */
export const GOAL_PR = 1

/**
 * 「拿 PR」大卡的面(借首页入口的词条)。
 */
export const GOAL_PR_KEY = 'home.g.pr'

/**
 * 「加拿大境外」那一格的值。只活在界面里:落库时折成处境 overseas、现居省留空(见 lib/guest 的 gatePatchOf)。
 */
export const PROV_ABROAD = 'abroad'

/**
 * 「加拿大境外」那一格的面(整行宽、带地球图标,不带省码小注)。
 */
export const GATE_ABROAD_KEY = 'gate.abroad'

/**
 * 所在省题十省格子(单选;顺序照 10-03 拍板:安省、魁省在前,海洋省殿后;境外那一格整行殿后,见 PROV_ABROAD)。
 * 面借省全名词条 pr.*,值 = 答案档 resProv 的省码(值域以 lib/quiz 的 FIELD_SPECS.resProv 为准),
 * 2026-10-04 改版起值同时当格子的灰字小注(代码不裸奔:人话名主文案,省码灰字)。
 */
export const GATE_PROV_OPTS = [
  { key: 'pr.ON', value: 'ON' },
  { key: 'pr.QC', value: 'QC' },
  { key: 'pr.BC', value: 'BC' },
  { key: 'pr.AB', value: 'AB' },
  { key: 'pr.SK', value: 'SK' },
  { key: 'pr.MB', value: 'MB' },
  { key: 'pr.NS', value: 'NS' },
  { key: 'pr.NB', value: 'NB' },
  { key: 'pr.NL', value: 'NL' },
  { key: 'pr.PE', value: 'PE' },
] as const

/**
 * 注册屏的 AuthForm 初始态(向导走到第五屏直接是注册态,框内照旧能切登录)。
 * 2026-10-11 访客不再答题:访客门整个只剩注册框(GateAuth 里 auth 桶 AuthModal 的初始态),照旧注册态、框内能切登录。
 */
export const GATE_AUTH_MODE = 'register'

/**
 * 埋点:访客向导弹出(kind 记由头 job|apply|save)。进第一方漏斗白名单(lib/funnel)。
 * 2026-10-04 kind 加 entry(进站即弹)。
 * 2026-10-11 访客不再答题:弹的是注册框(GateAuth),同一个埋点照记(漏斗前后可比);离开某一步的 gate-step 随访客向导撤。
 */
export const TRACK_GATE_OPEN = 'gate-open'

/**
 * 访客向导的由头:进站即弹(2026-10-04 Frank「进来就要求用户登录注册」→「照这样改」;全站骨架上的 GateSync 弹)。
 */
export const GATE_INTENT_ENTRY = 'entry'

/**
 * 多个专业码之间的分隔符(2026-10-05 专业改多选:第 3 题选职业控件的 majorCode 一格改收逗号连的专业码清单,
 * 与 lib/quiz 的 /api/quiz?major= 多值约定同)。
 */
export const MAJOR_SEP = ','

/**
 * 编辑模式保存失败那一行的词条键。
 */
export const SAVE_FAIL_KEY = 'gate.saveFail'

/**
 * 城市区小标题的词条键。
 */
export const GATE_CITY_KEY = 'gate.city'

/**
 * 城市搜索框占位的词条键。
 */
export const GATE_CITY_PH_KEY = 'gate.cityPh'

/**
 * 英文姓名格占位的词条键(写一个例子,照投递流的姓名格)。
 */
export const GATE_NAME_PH = 'Li Wei'

/**
 * 英文姓名那一题的题面键(输入框的读屏名也用它)。
 */
export const GATE_NAME_Q_KEY = 'gate.q.name'

/**
 * 英文姓名不合规那一行的词条键(与投递流同一句)。
 */
export const GATE_NAME_BAD_KEY = 'ap.e.name'

/**
 * 按省取城市接口(stats 域;后接省码)。
 */
export const URL_CITIES_HEAD = '/api/stats/cities?prov='

/**
 * 投递署名接口(queue 域 PATCH {senderName};与今日待投设置清单同一个口)。
 * 2026-10-10 Frank「删吧」(「今日待投 / 智能投递」整条撤,queue 域随之删):署名改走 apply 域 PATCH /api/apply/name {senderName}。
 */
export const URL_PREFS = '/api/apply/name'

/**
 * 城市区没搜时摆几个热门城市。
 */
export const CITY_HOT_N = 12

/**
 * 城市区搜了最多摆几个命中。
 */
export const CITY_HIT_MAX = 24

/**
 * 界面语:中文。
 */
export const LANG_ZH = 'zh'

/**
 * 界面语:韩文。
 */
export const LANG_KO = 'ko'

/**
 * 处境:在境外(答案档 status;与 lib/guest 的 STATUS_OVERSEAS 同值,各域自抄)。
 */
export const STATUS_OVERSEAS = 'overseas'

/**
 * 按省取城市回来的不是清单时抛的错名(留痕用)。
 */
export const CITIES_BAD = 'cities not a list'

/**
 * 档案编辑保存失败的错名:答案档没推上去。
 */
export const EDIT_ERR_ANSWERS = 'answers'

/**
 * 档案编辑保存失败的错名头:署名没存上(后接状态码)。
 */
export const EDIT_ERR_NAME = 'name '

/**
 * 改署名的方法。
 */
export const METHOD_PATCH = 'PATCH'

/**
 * 请求头:内容类型。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 的内容类型。
 */
export const MIME_JSON = 'application/json'

/**
 * 带 cookie 发请求。
 */
export const CRED_INCLUDE = 'include'

/**
 * 一页表单:没叠开选择器。
 */
export const FORM_PICK_NONE = ''

/**
 * 一页表单:叠开专业选择器。
 */
export const FORM_PICK_MAJOR = 'major'

/**
 * 一页表单:叠开职业选择器。
 */
export const FORM_PICK_JOB = 'job'

/**
 * 一页表单「目标」两段钮的钮形(button 桶分段钮)。
 */
export const FORM_SEG_KIND = 'seg'

/**
 * 一页表单主钮(保存、选好了)。
 */
export const FORM_PRIMARY_KIND = 'primary'

/**
 * 一页表单次钮(取消、修改)。
 */
export const FORM_SECONDARY_KIND = 'secondary'

/**
 * 一页表单下拉框「还没选」那一项的词条。
 */
export const FORM_NONE_KEY = 'pf.none'

/**
 * 一页表单面板标题的词条。
 */
export const FORM_TITLE_KEY = 'pf.editTitle'

/**
 * 已选那一行名字还没取到时的占位(2026-11-09 原「已选 N 个」词条换成名字本身)。
 */
export const FORM_NAME_WAIT = '…'

/**
 * 选择器:做过的工作(2026-11-08 清单第 2 条)。
 */
export const FORM_PICK_WORK = 'work'

/**
 * 选择器:所在地(省与城市;2026-11-12 Frank「这个也需要弹框吧」)。
 */
export const FORM_PICK_WHERE = 'where'

/**
 * 选择器:教育经历(2026-11-12 Frank「这个也弹框修改」)。
 */
export const FORM_PICK_EDU = 'edu'

/**
 * 所在地弹框里「省份」小标题的词条键(2026-11-12)。
 */
export const GATE_PROV_KEY = 'gate.prov'

/**
 * 所在地摘要里省那一行的 key。
 */
export const LINE_KEY_PROV = 'prov'

/**
 * 所在地摘要里城市那一行的 key。
 */
export const LINE_KEY_CITY = 'city'

/**
 * 教育经历摘要一行里各项之间的分隔(学校、证书或学历名称、年份)。
 */
export const EDU_SUM_SEP = ', '

/**
 * 教育经历摘要里开始年份与结束年份之间的连接号。
 */
export const EDU_YEAR_SEP = '–'

/**
 * 题键:做过的工作。
 */
export const GATE_STEP_WORK = 'work'

/**
 * 题键:身份(清单第 3 条:「我的通道」筛推荐的输入,进「补全档案」提示)。
 */
export const GATE_STEP_WHO = 'who'

/**
 * 题键:教育经历(同上)。
 */
export const GATE_STEP_EDU = 'edu'

/**
 * 匹配依据:工作经历。
 */
export const MATCH_WORK = 'work'

/**
 * 匹配依据:学历。
 */
export const MATCH_EDU = 'edu'

/**
 * 匹配模式:默认。
 */
export const MODE_DEFAULT = 'default'

/**
 * 匹配模式:严格。
 */
export const MODE_STRICT = 'strict'

/**
 * 「匹配规则」下拉的取值(2026-11-12 Frank「这两个不能合并成一个吗?比如匹配规则 是 按专业,还是按什么其他的一个下拉选」:
 * 匹配依据、匹配模式两格并成一只下拉,存的还是那两格):按做过的工作、只推很接近的。按做过的工作(默认档)是下拉的空值档,不在表里。
 */
export const RULE_WORK_STRICT = 'workStrict'

/**
 * 「匹配规则」下拉的取值:按我的专业。
 */
export const RULE_EDU = 'edu'

/**
 * 「匹配规则」下拉的取值:按我的专业、只推很接近的。
 */
export const RULE_EDU_STRICT = 'eduStrict'

/**
 * 「匹配规则」下拉空值档以外的三项(顺序即下拉里的顺序)。
 */
export const RULE_OPTS = ['workStrict', 'edu', 'eduStrict'] as const

/**
 * 「匹配规则」各项词条键的前缀(后接取值)。
 */
export const K_RULE_HEAD = 'pf.rule.'

/**
 * 从简历提取档案建议的接口(2026-11-09「我的」第一批)。
 */
export const URL_PREFILL = '/api/resume/prefill'

/**
 * POST。
 */
export const METHOD_POST = 'POST'

/**
 * 来自简历标记里字段与值的分隔。
 */
export const FROM_SEP = ':'

/**
 * 来自简历标记的字段:做过的工作。
 */
export const FROM_WORK = 'workNocs'

/**
 * 来自简历标记的字段:专业。
 */
export const FROM_MAJORS = 'majors'

/**
 * 来自简历标记的字段:英文姓名。
 */
export const FROM_NAME = 'name'

/**
 * 来自简历胶囊的变体。
 */
export const FROM_TAG_V = 'info'

/**
 * 来自简历胶囊的词条。
 */
export const FROM_TAG_KEY = 'pf.fromResume'

/**
 * 已选名字先摆几个(多了折起,同「我的档案」)。
 */
export const PICK_FOLD_N = 3

/**
 * 折叠行的量词词条。
 */
export const PICK_FOLD_UNIT_KEY = 'fold.u.item'

/**
 * 接口错误码 → 提示词条。
 */
export const FILL_ERR_KEYS: Record<string, string> = {
  /**
   * 还没有简历。
   */
  noResume: 'pf.fillNoResume',

  /**
   * 扫描件。
   */
  scan: 'pf.fillScan',

  /**
   * 文件读不出。
   */
  parse: 'pf.fillParse',

  /**
   * 超过每日次数。
   */
  limit: 'pf.fillLimit',
}

/**
 * 其余失败(模型层、网络)的提示词条。
 */
export const FILL_ERR_DEFAULT = 'pf.fillLlm'

/**
 * 填上了几项的提示词条。
 */
export const FILL_OK_KEY = 'pf.fillOk'

/**
 * 什么也没填上的提示词条。
 */
export const FILL_NONE_KEY = 'pf.fillNone'

/**
 * 提示:成功的颜色。
 */
export const FILL_KIND_OK = 'ok'

/**
 * 提示:普通的颜色。
 */
export const FILL_KIND_INFO = 'info'

/**
 * 提示:失败的颜色。
 */
export const FILL_KIND_ERR = 'err'

/**
 * 结果提示那一格的读屏角色(内容变了会念)。
 */
export const FILL_ROLE = 'status'
