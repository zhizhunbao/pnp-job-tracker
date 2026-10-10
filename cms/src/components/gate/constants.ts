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
 * 选择格的大卡形名(chip 桶 ChipTile 的 shape 取值,目标题两张大卡用;与 chip 域同名同义,各家一份)。
 */
export const TILE_CARD = 'card'

/**
 * 访客向导(2026-10-03 付费闭环批 A1)的弹框宽度档:modal 桶为它扩的 card 档 ——
 * 电脑中号 560 居中(Frank「框能不能大一些」),手机居中卡片(背后的职位板看得见,不整屏)。
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
 * 访客向导第五屏:注册(不计步数 —— 注册屏不出顶行与钮区,注册不可跳过)。
 * 2026-10-04 改版:「第 N 步 · 共 4 步」那行字撤了,进度只剩顶行的四段条。
 */
export const GATE_STEP_REG = 'reg'

/**
 * 访客向导四道题的顺序(下标即步数;走过最后一道就是注册屏;进度条一题一段)。
 */
export const GATE_STEPS = ['goal', 'major', 'job', 'prov'] as const

/**
 * 编辑模式那一题:英文姓名(2026-10-09「我的档案」批:档案页「修改」走同一套题,末尾多问一句投递署名;访客向导不问)。
 */
export const GATE_STEP_NAME = 'name'

/**
 * 编辑模式的步序:访客四题 + 英文姓名(下标即步数;最后一题的主钮是「保存」)。
 */
export const GATE_EDIT_STEPS = ['goal', 'major', 'job', 'prov', 'name'] as const

/**
 * 访客向导第一问的题面键。单独起名是因为它同时是取题面时的兜底(同 profile 的 OB_QUESTION_STATUS 的理由)。
 */
export const GATE_QUESTION_GOAL = 'gate.q.goal'

/**
 * 访客向导每一步的题面键(「想做什么工作」与首访向导同一句,借 prof.noc)。
 */
export const GATE_QUESTIONS = [
  { step: 'goal', key: GATE_QUESTION_GOAL },
  { step: 'major', key: 'gate.q.major' },
  { step: 'job', key: 'prof.noc' },
  { step: 'prov', key: 'gate.q.prov' },
  { step: 'name', key: 'gate.q.name' },
] as const

/**
 * 弹框卡片(滚动的那一层)的选择器 —— modal 桶给卡片挂的 data-frame(同 modal 桶 FRAME_SEL,本域自抄)。
 * 2026-10-04 收口:换了题把卡片滚回顶(英文第 2 题比卡片高,滚下去选完点下一步,第 3 题原先开在半截:进度条与搜索框在上面看不见)。
 */
export const GATE_FRAME_SEL = '[data-frame]'

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
 */
export const GATE_AUTH_MODE = 'register'

/**
 * 进度条的无障碍角色(撤掉「第 N 步 · 共 4 步」那行字后,读屏靠它与 ob.step 那句标签报进度)。
 */
export const ROLE_PROGRESS = 'progressbar'

/**
 * 埋点:访客向导弹出(kind 记由头 job|apply|save)。进第一方漏斗白名单(lib/funnel)。
 * 2026-10-04 kind 加 entry(进站即弹)。
 */
export const TRACK_GATE_OPEN = 'gate-open'

/**
 * 访客向导的由头:进站即弹(2026-10-04 Frank「进来就要求用户登录注册」→「照这样改」;全站骨架上的 GateSync 弹)。
 */
export const GATE_INTENT_ENTRY = 'entry'

/**
 * 埋点:离开向导的某一步(kind 记哪一步 goal|major|job|prov;到了注册屏记 reg)。进第一方漏斗白名单。
 */
export const TRACK_GATE_STEP = 'gate-step'

/**
 * 职位板的路径(注册完只在这一页上按答案筛;2026-10-04 A2)。旧 /jobs 由 middleware 301 回根,不另列。
 */
export const BOARD_PATH = '/'

/**
 * 回职位板的地址头(后面拼查询串)。
 */
export const BOARD_HEAD = '/?'

/**
 * 职位板的省参数名(两位码,板子自己转全名;答了境外不带)。
 */
export const P_PROV = 'prov'

/**
 * 职位板的职业参数名(逗号连的多个 NOC 码)。
 */
export const P_NOC = 'noc'

/**
 * 职位板的大类参数名(单值;没选职业时带专业对应的第一个本站大类)。
 * 2026-10-05 专业改多选后照旧单值、带第一个专业的第一个大类:职位板的 broad 是等值筛(lib/jobs buildJobsWhere 的 broadEq),
 * 不收逗号连的多值(noc 才收)。
 */
export const P_BROAD = 'broad'

/**
 * 职位板的市参数名(以 jobs 桶 URL_TO_FILTER 的短名为准,本域自抄一份;2026-10-04 收口审查:
 * 注册完回职位板改成在现有地址上改 —— 设了省就撤掉市 / 区 / 国家,免得拼出「安省 + 温哥华」)。
 */
export const P_CITY = 'city'

/**
 * 职位板的区参数名(同上,设了省一起撤)。
 */
export const P_DIST = 'dist'

/**
 * 职位板的国家参数名(同上,设了省一起撤)。
 */
export const P_COUNTRY = 'country'

/**
 * 职位板的中分类参数名(设了职业或大类就撤 —— 分类三级与职业码只认一组,拼出来的组合互相打架)。
 */
export const P_MID = 'mid'

/**
 * 职位板的小分类参数名(同上)。
 */
export const P_FINE = 'fine'

/**
 * 设了省要撤的职位板参数(省以下的地域:市、区;与省并列的国家)。其余参数(关键词、排序、页码……)原样留着。
 */
export const PROV_DROP_PARAMS = [P_CITY, P_DIST, P_COUNTRY]

/**
 * 设了职业要撤的职位板参数(分类三级:大类、中分类、小分类)。
 */
export const NOC_DROP_PARAMS = [P_BROAD, P_MID, P_FINE]

/**
 * 设了大类要撤的职位板参数(职业码与中 / 小分类)。
 */
export const BROAD_DROP_PARAMS = [P_NOC, P_MID, P_FINE]

/**
 * 多个职业码之间的分隔符(与职位板 noc 参数的多值约定同)。
 */
export const NOC_SEP = ','

/**
 * 多个专业码之间的分隔符(2026-10-05 专业改多选:第 3 题选职业控件的 majorCode 一格改收逗号连的专业码清单,
 * 与 lib/quiz 的 /api/quiz?major= 多值约定同)。
 */
export const MAJOR_SEP = ','

/**
 * 注册完要回职位板按答案筛的由头:只有进站即弹。点投递 / 收藏的照旧接着投 / 收藏,不改筛选。
 * 2026-10-04 A2 立时是「进站即弹、点开职位弹框」两个;同日收口撤掉点开职位 —— 职位板挂着 key = 筛选签名,地址栏一换整块重挂,
 * 刚亮出来的职位弹框(弹框栈住在板子里)跟着卸掉,闪一下就关,开框埋点还多打一次;Google 整页登录那一路回跳的是职位整页
 * (/jobs/<号>),本来就不在板上。两路一致:点开职位的注册完看那一岗,不改筛选。
 */
export const BOARD_INTENTS = ['entry']

/**
 * 返回钮读屏名的词条键(2026-10-05 返回钮收进弹框壳,读屏名由整机交给壳;词条沿用首访向导那一条)。
 */
export const GATE_BACK_KEY = 'ob.back'

/**
 * 钮区主钮的词条键:下一步(访客向导每一题、编辑模式前四题)。
 */
export const NEXT_KEY = 'ob.next'

/**
 * 钮区主钮的词条键:保存(编辑模式最后一题)。
 */
export const SAVE_KEY = 'gate.save'

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
 */
export const URL_PREFS = '/api/queue/prefs'

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

