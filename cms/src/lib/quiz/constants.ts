/**
 * 答题域的死值:存储键、档位梯子(档 → 引擎输入的映射表)、迁移映射、各决定的取用清单。
 * 梯子头上的日期注释是当初定档的决策记录,别删。
 *
 * @author Frank
 * @time 2026-08-18 04:36:46
 */

// eslint-disable-next-line local/no-import-in-leaf -- EMPTY/SCORE_EMPTY/DECISIONS 的键完备性靠本域形状盯(特批牌形态,同 noc/constants)
import type { Answers, Decision, ScoreAnswers } from './types'

/**
 * 新答案档的 localStorage key(如今只装「待搬家的旧档」,搬完即删)。
 */
export const ANSWERS_KEY = 'o2p_answers_v1'

/**
 * 旧三问档 key:{ status, nocs, provs, done }。
 */
export const OLD_QUIZ = 'jobs_quiz_v1'

/**
 * 旧拿 PR 基本/探索题档 key:六个档位。
 */
export const OLD_PR = 'plan_pr_v1'

/**
 * 分值卡(估分段)答案的 localStorage key。键是 `${prov}:${factor}` / tick 的 `${factor}:${seq}`,
 * 都是用户自身条件(外省经历/亲属/本省学历…),跨岗位跨页面通用,与具体职位无关。
 */
export const SCORE_ANSWERS_KEY = 'o2p_score_answers_v1'

/**
 * 更早的答案元信息 key(dropLegacy 顺带清掉)。
 */
export const META_KEY = 'o2p_answers_meta_v1'

/**
 * 「不清楚」的统一档位值(2026-08-12 Frank「每个选项都应该给一个不清楚的」)。
 * 它是**答过的**(计数与 missingFields 认它),但 toAnswer 一律回 undefined —— 引擎拿 null
 * 落「判不了」,而不是被折成某个他没说过的答案。三值折叠里的 unknown 就该由用户显式说得出口。
 */
export const UNSURE_BAND = 9

/**
 * 英语精确档(2026-08-13 语言合一:基础卷直接问精确 CLB,官方分值表不再追问第二遍)。
 * index = 选项 value;1「还没考」= 没有分,不传。**不用 CLB 数字当 value**:9 会撞 UNSURE_BAND。
 * export:估分段推导双语加分(PnpScoreCard #305)按同一把梯子读英语档,不许另抄一份。
 */
export const CLB = [0, 0, 4, 5, 6, 7, 8, 9, 10]

/**
 * 法语档(2026-08-16):index = 选项 value,值 = NCLC 等级(0 = 不会或不到 4)。
 */
export const NCLC = [0, 0, 4, 5, 6, 7, 8]

/**
 * 法语「够用」的界(frenchAnswer 把法语档折成布尔时以它为准:NCLC ≥5 为 true,
 * 不会或只到 NCLC 4 为 false;「不清楚」不折,照旧不传)。引擎只收布尔 ——
 * 界划在哪由这一格说了算,改它等于改所有法语判定的口径。
 */
export const NCLC_MIN = 5

/**
 * 加拿大经验档 → 月数。a1「没有」= 0 个月,是答案不是缺答。
 */
export const EXP = [0, 0, 6, 18, 30]

/**
 * 目标省档 → 省码组。a4「先看哪个够得着」= 不限省。**海洋四省挂 5 不挂 4**:4 已经在生产用了,
 * 改它的含义会把已存档案里的「不限省」静默变成「海洋四省」(2026-08-03 加这一档时的取舍 ——
 * 显示顺序看 choices 数组,与值无关)。
 */
export const PROVS: string[][] = [[], ['BC'], ['ON'], ['AB', 'SK', 'MB'], [], ['NS', 'NB', 'PE', 'NL']]

/**
 * CRS 档 → 分数下界。a1「没算过」= 不传,引擎照旧出「没填 CRS」。
 */
export const CRS = [0, 0, 380, 425, 480]

/**
 * 签证剩余档 → 月数。
 */
export const PGWP = [0, 4, 9, 18, 30]

/**
 * 学历档 → 引擎学历码(官方分值表要的三样之一,题库扩充 20260802)。
 */
export const EDU = ['', 'highschool', 'diploma2y', 'bachelor', 'master', 'doctorate']

/**
 * 年龄档 → 区间中点(官方分值表要的三样之二)。
 */
export const AGE = [0, 23, 28, 33, 38, 43]

/**
 * 同职业总经验(含海外)档 → 月数(官方分值表要的三样之三)。
 * 精确档(2026-08-14 经验合一,与语言同批):index=选项 value;「没有」=0 个月,是答案不是缺答。
 * 月数取整年 ×12(不到 1 年沿用 6):旧区间档迁移按旧月数对齐(见 CLB_V2_MAP 一族)。
 */
export const TOTAL_EXP = [0, 0, 6, 12, 24, 36, 48, 60]

/**
 * B1-4 PGWP:课程时长档下界(「不到 8 个月」给 4 只为让引擎判「不足 8 个月无 PGWP」)。
 */
export const STUDY_MONTHS = [0, 4, 8, 12, 24]

/**
 * B1-4 PGWP:课程层级(引擎只对 master 有特例,其余按时长档)。
 */
export const STUDY_LEVEL = ['', 'college', 'bachelor', 'master', 'doctorate']

/**
 * 学制年数档(2026-08-15 #316):index=选项 value → 整年数。「不到 1 年」= 0 整年,是答案不是缺答;
 * 档取下界(同 CLB/经验口径)。四档而不是三档:消费端的阈值有 ≥1 / ≥2 / ≥3 三道
 * (crsEstimate 学习加分 1 年与 3 年分档;pathVerdict/ mbEoiEstimate 要 ≥2、≥3),并成「1 年及以下」
 * 就得在 0 和 1 之间替他挑一头 —— 拆开就不用猜。
 */
export const EDU_YEARS = [0, 0, 1, 2, 3]

/**
 * statusInCanada 拆闸(2026-08-15):许可类型档。学签在读不问(处境题已说明持学签),
 * 境外不问(没有加拿大许可可答)—— 见各题 visible。
 */
export const PERMIT = ['', 'study', 'pgwp', 'work', 'none']

/**
 * 境内三种处境(inCanada 的判集;permitBand/resProv 的题级显隐都用它)。
 */
export const IN_CANADA = ['studying', 'working', 'jobhunting']

/**
 * 旧区间档 → 新精确档(index=旧 band):与旧 toAnswer 的引擎数字逐值一致(CLB=[0,0,4,6,8,10]、
 * TOTAL_EXP=[0,0,6,24,48,60] 月),判定核收到的数字前后不变 —— 迁移只影响「格子里显示哪一档」
 * 与「还要不要再追问精确题」。
 */
export const CLB_V2_MAP = [0, 1, 2, 4, 6, 8]

/**
 * 法语旧答案(1=是 / 2=否 / 9=不清楚)→ 新档位(3=NCLC5 / 1=没到 / 9=不清楚)。
 * 新旧值域重叠(旧 1 = 是,新 1 = 不会),所以只能靠 frenchV2 标记区分,不能靠值本身猜。
 */
export const FRENCH_V2_MAP: Record<number, number> = { 0: 0, 1: 3, 2: 1, 9: 9 }

/**
 * 总经验旧区间档 → 新精确档(9「不清楚」在 totalV2 里原样保留)。
 */
export const TOTAL_V2_MAP = [0, 1, 2, 4, 6, 7]

/**
 * 空答案(页面初始 state 也用它:再抄一份就会漏掉新字段)。
 */
export const EMPTY: Answers = {
  status: '', nocs: [], provs: [],
  clbBand: 0, expBand: 0, provBand: 0, crsBand: 0, pgwpBand: 0,
  eduBand: 0, ageBand: 0, totalExpBand: 0, offerBand: 0, goalBand: 0, canadaEduBand: 0,
  permitBand: 0, resProv: '', fieldMatchBand: 0, eduProv: '', eduYearsBand: 0, frenchBand: 0,
  studyMonthsBand: 0, studyLevelBand: 0, bandsV2: true,
}

/**
 * 空分值卡档。
 */
export const SCORE_EMPTY: ScoreAnswers = { ticks: {}, rowAnswers: {}, extraAnswered: {}, profile: {} }

/**
 * 决定 → 取用清单(设计:docs/design/统一题库与付费面-20260731.md §3)。
 * 加一张卡 = 加一行声明,渲染层与存储层零改动 —— 七套题库不存在,只有一套字段库 + 各决定的取用清单。
 * 只声明**已经有 builder 能出报告的决定**(没报告的卡先别占位,YAGNI)。
 * 题库扩充 20260802:基本题按「你是谁 → 技能 → 经验 → 工作 → 去哪」排,一屏内就是对话顺序。
 * 每张卡只取自己算得动的子集(挂不上结论的字段不问,铁律没变)。
 */
export const DECISIONS: Record<string, Decision> = {
  /**
   * 拿 PR。
   * 学历/年龄两题 08-10 撤(Frank「怎么还是显示 8 个题目」)后,2026-08-16 Frank
   * 「这个不应该是 基本问题吗」收回基础卷:08-15 学历接线之后,CRS、六省官方分值表、
   * 多条门槛全在吃这两样;留在分值卡里问,等于把最基本的个人条件塞进「省专属估分」那一段。
   * 具体省份是可多选数组,不再塞进四选一字段;PR 页面在基础题之后用 ProvincePicker 采集。
   * 2026-08-12 加两题(门槛清单三类闸,设计 §3.3):offerBand 是既有题、先前只在卡③用;
   * canadaEduBand 是新题。不问这两样,判定核只能对一半通道说「判不了」——而先前它是**默认放行**,
   * 把从没来过加拿大的人推荐去走「国际毕业生」通道。第三类闸「人在不在境内」由 status 推,不另开题。
   * 2026-08-15 拆闸批再加两题(permitBand/resProv,均只对境内处境显示 —— rows.ts visible):
   * AB/PE 的闸是工签、NL 是 PGWP、NB/MB 是住在/受雇于该省,原「由 status 推境内身份」答不了这三种问法。
   * 2026-08-15 再加两题(fieldMatchBand/eduProv,只对「有加拿大学历」的人出):NL 国际毕业生
   * 官方要求专业对口,例外按毕业院校所在省分档;eduProv 同时喂 MB/ON 两条既有条款(先前恒缺槽)。
   * 2026-08-15 #316 加 eduYearsBand(同闸):ON 毕业生 3 个月档 / MB 学历分档 / CRS 学习加分
   * 全按学制年数分档,不问就恒判不了。排在学历相关题(eduProv)后面。
   * 探索批 2 = B1-4 PGWP(20260803):批首 studyMonthsBand 是 free 题(batchLeadsFree ✓)——
   * 批 1 的历史偏差(KNOWN_NO_FREE_LEAD)不因此消,但新批守规矩。
   */
  pr: {
    basic: ['status', 'permitBand', 'resProv', 'eduBand', 'ageBand', 'clbBand', 'totalExpBand', 'expBand', 'offerBand', 'canadaEduBand', 'fieldMatchBand', 'eduProv', 'eduYearsBand', 'frenchBand'],
    explore: [['crsBand', 'pgwpBand'], ['studyMonthsBand', 'studyLevelBand']],
  },

  /**
   * 卡①找工作:零新题 —— 职业来自选职业(不是四选一题),其余全在共用底座里。
   * 这就是横向扩面成立的原因:同一批答案,三张卡都能出报告。
   * 「手上有没有 offer」不进本卡:buildJobReport 不消费它,问了改不了任何一行(挂不上结论就不问)。
   */
  job: { basic: ['status', 'provBand'], explore: [] },

  /**
   * 卡⑥职业规划(与卡①同理零新题)。
   */
  career: { basic: ['provBand'], explore: [] },

  /**
   * 卡③选省份:目标省是这张卡要**算出来**的东西,不能拿它当输入问。
   * 2026-08-03 砍掉 edu/age/clb/totalExp 四道 —— 实测 buildProvReport 对它们的消费次数是 **0**
   * (而这行原注释还写着「都真的进换省对照的分值表」,注释撒了谎)。Frank:「这种问题和语言成绩、
   * 工作经验都没什么关系,用户根本不需要填」「那些都是个人能克服的问题,主要是政策和环境不好克服」——
   * 这张卡讲的就是政策与环境(哪个省清单收你、多挤、多少岗),个人可改变的因素不在其中。
   * 留下的两道都真消费:goal 决定排序目标函数,hasJobOffer 决定雇主担保通道那条结论。
   * totalExpBand 是 B1-2(学徒序,2026-08-03)加回来的——与被砍那四道不同,它真消费:
   * 0 经验 → 报告改写下一步(先解决第一份岗,再谈选省;rpt.g.zeroExp / rpt.n.firstJob),
   * 有经验 → 进换省对照的下界分(switchLines 的 work 因素)。复用共用底座那道题,不新造字段。
   */
  prov: { basic: ['goalBand', 'totalExpBand', 'offerBand'], explore: [] },
}

/**
 * 例外:拿 PR 探索批 1(crs/pgwp 两题都进锁区)。探索层现在没有能立刻给免费结论的字段
 * —— 省级语言与工资门槛未建模、hasJobOffer 还没规则。这两样任一落地,就把它挪到批首并删掉这行。
 */
export const KNOWN_NO_FREE_LEAD = new Set(['pr:0'])

/**
 * 答题两段里「基本卷」的段名(fieldsOf 的 stage 判值)。
 */
export const STAGE_BASIC = 'basic'

/**
 * #311 登录迹象 cookie 名:payload-token 是 httpOnly,前端读不到 —— 由同步层维护一枚 JS 可读的
 * 伴随 cookie。置位 = 任一同步请求 200;清除 = 吃到 401。没有迹象 → 挂载不发请求(匿名零 401)。
 * 改名要连 api/auth/google/callback 的 Set-Cookie 一起改。
 */
export const LI_COOKIE = 'o2p_li'

/**
 * 登录迹象 cookie 的命中判定(名字变了连上面 LI_COOKIE 一起改)。
 */
export const LI_RE = new RegExp('(?:^|;\\s*)o2p_li=1')

/**
 * 答案档同步端点(PUT 正推;sendBeacon 只能 POST —— 端点同时收两种,见 api/account/answers)。
 */
export const URL_ANSWERS = '/api/quiz/answers'

/**
 * 正推的 HTTP 方法。
 */
export const METHOD_PUT = 'PUT'

/**
 * JSON 请求体的 MIME。
 */
export const JSON_MIME = 'application/json'

/**
 * 离开页面事件名(beacon 兜底挂在它上)。
 */
export const EV_PAGEHIDE = 'pagehide'

/**
 * 可见性变化事件名。
 */
export const EV_VISIBILITY = 'visibilitychange'

/**
 * 「页面已不可见」的状态值。
 */
export const STATE_HIDDEN = 'hidden'

/**
 * 热门职业缓存有效期(10 分钟;过期不清,后台刷 —— SWR)。
 */
export const TTL = 10 * 60_000

/**
 * 登录迹象 cookie 的置位串(一年期;名字变了连 LI_COOKIE/LI_RE 一起改)。
 */
export const LI_SET_ON = 'o2p_li=1; path=/; max-age=31536000; samesite=lax'

/**
 * 登录迹象 cookie 的清除串(max-age=0 即删)。
 */
export const LI_SET_OFF = 'o2p_li=; path=/; max-age=0; samesite=lax'

/**
 * 同步请求带会话 cookie(fetch credentials 值)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 写档防抖窗口(毫秒)。连点选项时不至于每答一下发一次 PUT ——
 * 窗口拉长省请求但丢答案的窗口跟着变大(离开页面那一刻靠 beacon 兜底,见 flushOnLeave),
 * 800ms 是「答完一题会停顿」与「别让没推上去的改动挂太久」之间的取值。
 */
export const SYNC_DEBOUNCE_MS = 800

/**
 * 推档失败的重试次数上限。三次不成就等下次改动 ——
 * 再拖下去多半是会话没了(401 那支已经单独处理),重试只是白发请求。
 */
export const PUSH_RETRY_MAX = 3

/**
 * 退避重试的第一等待(毫秒)。第 n 次重试等 RETRY_BASE_MS × RETRY_FACTOR^n:2s → 6s → 18s。
 */
export const RETRY_BASE_MS = 2000

/**
 * 退避倍数:每重试一次等待乘 3(见 RETRY_BASE_MS 的梯子)。
 */
export const RETRY_FACTOR = 3

/**
 * 免费档的档名(batchLeadsFree 的判值)。
 */
export const TIER_FREE = 'free'

/**
 * /api/quiz 的职业搜索参数名(?q=厨师)。
 */
export const P_Q = 'q'

/**
 * /api/quiz 的职业码参数名(?noc=63200 → 免费事实卡)。
 */
export const P_NOC = 'noc'

/**
 * /api/quiz 的大类参数名(?broad=技工 → 该类职业清单)。
 */
export const P_BROAD = 'broad'

/**
 * /api/quiz 的热门条数参数名(?top=24)。
 */
export const P_TOP = 'top'

/**
 * /api/quiz 的批量计数参数名(?counts=21232,63200)。
 */
export const P_COUNTS = 'counts'

/**
 * 搜索词长度上限(职业名没这么长,超出 = 乱砸)。
 */
export const Q_LEN_MAX = 40

/**
 * 大类名长度上限。
 */
export const BROAD_LEN_MAX = 24

/**
 * 批量计数一次最多几个 NOC。
 */
export const COUNTS_N_MAX = 30

/**
 * ?top= 缺位或非法时的默认条数。
 */
export const TOP_N_DEFAULT = 24

/**
 * 大类职业清单每次取几条。
 */
export const BROAD_LIMIT = 60

/**
 * 事实卡缓存条数上限(职业总数 ~500,600 封顶纯保险)。
 */
export const FACTS_CACHE_MAX = 600

/**
 * 大类清单缓存条数上限(大类共 17 个,40 封顶纯保险;满了整清)。
 */
export const BROAD_CACHE_MAX = 40

/**
 * 批量计数缓存键数上限(满了整清)。
 */
export const COUNTS_CACHE_MAX = 100

/**
 * 批量计数参数的分隔符。
 */
export const COUNTS_SEP = ','

/**
 * 答案档请求体长度上限(几十个档位/勾选 64KB 顶天,超限 = 不是问卷答案,
 * 不让人往 users 表塞大对象)。
 */
export const ANSWERS_LEN_MAX = 64_000

/**
 * 用户表的 collection 名(答案档存取用)。
 */
export const COLLECTION_USERS = 'users'

/**
 * 错误体:未登录。
 */
export const E_AUTH = 'auth'

/**
 * 错误体:body 形状不对。
 */
export const E_BAD = 'bad'

/**
 * 错误体:请求体超长。
 */
export const E_TOO_BIG = 'tooBig'

/**
 * 错误体:/api/quiz 两个主参数都没带。
 */
export const E_PARAM = 'noc or q required'

/**
 * 查询参数没带时的初值(分发器的 `?q` `?broad` `?noc` 三处共用)。
 * 分发器靠「非空才走这一支」把五条分支串起来,所以缺参与空参必须落成同一个值 ——
 * `?q=` 和干脆不写 `q`,在用户那里是同一件事,不该走出两种结果。
 */
export const PARAM_NONE = ''

/**
 * 身份档没取到时的那一格:两份旧档(三问档与 PR 档)里都没写身份就是它。
 * 空串是「没答」,不是某一档 —— 搬家只在 `str(...) !== ''` 时才认旧档的值,
 * 于是「旧档写了空」与「旧档根本没这一格」在这里是同一件事:都不覆盖。
 */
export const STATUS_NONE = ''

/**
 * 内存里还没有上一版档时,拿来跟新档 json 逐字节比的那一格。
 * 任何真 json 都不等于空串,于是首次写入必定判成「语义变了」并排一次同步 ——
 * 不必再养一个「有没有写过」的布尔标记(两份状态迟早对不上)。
 */
export const PREV_JSON_NONE = ''

/**
 * 处境题「不清楚」的选项码(statusAnswer 的判值)。数字档的「不清楚」统一是 UNSURE_BAND,
 * 处境是字符串题,由这个码承担同一件事:它是**答过的**,但引擎拿 undefined 落「判不了」。
 * 与 FIELD_SPECS.status 的选项 value 同源,改要一起改。
 */
export const STATUS_UNSURE = 'unsure'

/**
 * 处境「还在境外」的选项码(pgwpAnswer 的判值:境外没有加拿大签证,签证剩余档不传 ——
 * 拿档位造时间窗=编数)。与 FIELD_SPECS.status 的选项 value 同源,改要一起改。
 */
export const STATUS_OVERSEAS = 'overseas'

/**
 * 诉求「容易拿身份」对应的目标函数码(goalAnswer 的返回值):引擎按它把选省报告排成
 * 「容易拿提名」优先(2026-08-03 Frank「每个人诉求不一样」,排序由用户的诉求定)。
 */
export const GOAL_PR = 'pr'

/**
 * 诉求「先找到工作」对应的目标函数码(goalAnswer 的返回值):引擎按它把选省报告排成
 * 在招量优先。
 */
export const GOAL_WORK = 'work'

/**
 * 诉求题「容易拿身份」的档位(goalAnswer 按它折出 GOAL_PR)。
 * 与 FIELD_SPECS.goalBand 的选项 value 同源,改要一起改。
 */
export const GOAL_PR_BAND = 1

/**
 * 诉求题「先找到工作」的档位(goalAnswer 按它折出 GOAL_WORK)。
 * 与 FIELD_SPECS.goalBand 的选项 value 同源,改要一起改。
 */
export const GOAL_WORK_BAND = 2

/**
 * 单选 BC 那一档的省码(bandFromProvs 的判值:省码组只装这一个省才折回档位 1,
 * 与 PROVS[1] 那格同源)。
 */
export const PROV_BC = 'BC'

/**
 * 单选 ON 那一档的省码(bandFromProvs 的判值:省码组只装这一个省才折回档位 2,
 * 与 PROVS[2] 那格同源)。
 */
export const PROV_ON = 'ON'

/**
 * 目标省档「还没答」那一格(bandFromProvs 收到空省码组时回它;PROVS[0] 是空数组)。
 */
export const PROV_BAND_NONE = 0

/**
 * 目标省档「只看 BC」(与 PROVS[1] 同源,见 PROV_BC)。
 */
export const PROV_BAND_BC = 1

/**
 * 目标省档「只看 ON」(与 PROVS[2] 同源,见 PROV_ON)。
 */
export const PROV_BAND_ON = 2

/**
 * 目标省档「不限省」(a4「先看哪个够得着」)。**是 4 不是 5** —— 海洋四省挂在 5,
 * 理由见 PROVS 的注释:4 已经在生产用了,改它的含义会把已存档案里的「不限省」
 * 静默变成「海洋四省」。省码组落不进前三档的一律折回它。
 */
export const PROV_BAND_ANY = 4

/**
 * 档里的一格不是字符串时给的值(行构造器 str 的兜底):空串 = 「没答」,与 STATUS_NONE
 * 同口径 —— 消费端全按「空串即缺答」判(makeMissingFilter)。
 */
export const STR_NONE = ''

/**
 * 字段名:处境。F_ 家族 = FIELD_SPECS 的键(fieldBehaviorOf 按它把行为半接回数据半),
 * 改名要连 FIELD_SPECS 的键与 Answers 的格一起改。
 */
export const F_STATUS = 'status'

/**
 * 字段名:持有许可(F_ 家族,说明同 F_STATUS)。
 */
export const F_PERMIT_BAND = 'permitBand'

/**
 * 字段名:现居省(F_ 家族,说明同 F_STATUS)。
 */
export const F_RES_PROV = 'resProv'

/**
 * 字段名:最高学历(F_ 家族,说明同 F_STATUS)。
 */
export const F_EDU_BAND = 'eduBand'

/**
 * 字段名:年龄段(F_ 家族,说明同 F_STATUS)。
 */
export const F_AGE_BAND = 'ageBand'

/**
 * 字段名:同职业总经验(F_ 家族,说明同 F_STATUS)。
 */
export const F_TOTAL_EXP_BAND = 'totalExpBand'

/**
 * 字段名:英语 CLB(F_ 家族,说明同 F_STATUS)。
 */
export const F_CLB_BAND = 'clbBand'

/**
 * 字段名:加拿大经验(F_ 家族,说明同 F_STATUS)。
 */
export const F_EXP_BAND = 'expBand'

/**
 * 字段名:目标省档(F_ 家族,说明同 F_STATUS)。
 */
export const F_PROV_BAND = 'provBand'

/**
 * 字段名:诉求(F_ 家族,说明同 F_STATUS)。
 */
export const F_GOAL_BAND = 'goalBand'

/**
 * 字段名:手上有无 offer(F_ 家族,说明同 F_STATUS)。
 */
export const F_OFFER_BAND = 'offerBand'

/**
 * 字段名:有无加拿大学历(F_ 家族,说明同 F_STATUS)。
 */
export const F_CANADA_EDU_BAND = 'canadaEduBand'

/**
 * 字段名:专业对口(F_ 家族,说明同 F_STATUS)。
 */
export const F_FIELD_MATCH_BAND = 'fieldMatchBand'

/**
 * 字段名:学历所在省(F_ 家族,说明同 F_STATUS)。
 */
export const F_EDU_PROV = 'eduProv'

/**
 * 字段名:学制年数(F_ 家族,说明同 F_STATUS)。
 */
export const F_EDU_YEARS_BAND = 'eduYearsBand'

/**
 * 字段名:法语 NCLC(F_ 家族,说明同 F_STATUS)。
 */
export const F_FRENCH_BAND = 'frenchBand'

/**
 * 字段名:CRS 档(F_ 家族,说明同 F_STATUS)。
 */
export const F_CRS_BAND = 'crsBand'

/**
 * 字段名:签证剩余(F_ 家族,说明同 F_STATUS)。
 */
export const F_PGWP_BAND = 'pgwpBand'

/**
 * 字段名:课程时长(F_ 家族,说明同 F_STATUS)。
 */
export const F_STUDY_MONTHS_BAND = 'studyMonthsBand'

/**
 * 字段名:课程层级(F_ 家族,说明同 F_STATUS)。
 */
export const F_STUDY_LEVEL_BAND = 'studyLevelBand'

/**
 * 题库的**数据半**:题面、选项、解锁的结论、免费/锁区档。
 * 2026-08-25 自 functions.ts 搬入 —— 它原先是 `export const FIELDS`,住在只许有 function
 * 的抽屉里(宪法「functions.ts 顶层只许有 function」),498 处三语题面与 77 个选项码
 * 因此一直被当成「散落的裸串/魔数」报警,而它们其实是**数据**。
 *
 * 行为半(toAnswer 换算 / visible 题级显隐 / choiceVisible 选项过滤)留在 functions.ts,
 * 由 `getFields()` 按字段名接回来 —— 拆开的判据:这半装的是「问什么」,那半装的是「怎么算」。
 *
 * 键序即 toEngineAnswers 的遍历序,别乱动。
 * 每个字段头上的 `//` 是它的决策记录(带日期带人带理由),与三语题面同存。
 */
export const FIELD_SPECS = {
  // 处境:决定签证题算不算数(境外没有加拿大签证),并计入基本题完整度
  status: {
    engineKey: 'currentStatus',
    unlocks: ['rpt.c.window', 'rpt.g.basics'],
    tier: 'free',
    q: {
      title: { en: 'Where are you today?', zh: '你现在的情况?', ko: '현재 상황은?' },
      choices: [
        { value: 'overseas', text: { en: 'Outside Canada, planning the move', zh: '还在境外,想来加拿大工作', ko: '해외에서 캐나다 취업 준비 중' } },
        { value: 'studying', text: { en: 'Studying in Canada', zh: '在加拿大读书', ko: '캐나다에서 유학 중' } },
        { value: 'working', text: { en: 'Working in Canada', zh: '已经在加拿大工作', ko: '캐나다에서 근무 중' } },
        { value: 'jobhunting', text: { en: 'In Canada, job hunting', zh: '在加拿大找工作', ko: '캐나다에서 구직 중' } },
        { value: 'unsure', text: { en: 'Not sure', zh: '不清楚', ko: '잘 모르겠음' } },
      ],
    },
  },

  // 持的许可(2026-08-15 statusInCanada 拆闸):AB/PE 的闸是**有效工签**、NL 指名 **PGWP** ——
  // 「人在境内」答不了这两道闸(学签在读曾因此被 AB 放行)。境外不问。
  // 2026-08-16 Frank「这个上面的问题也没问,你是否有工签啊?」:**在读也要问** —— 先前拿「在加拿大读书」
  // 推定持学签,推出来的却是「差工签」这种结论性判定,等于没问就替他认定。境内一律问,答了才判。
  permitBand: {
    engineKey: 'permit',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    q: {
      title: { en: 'What permit are you on now?', zh: '你现在持什么许可?', ko: '지금 어떤 허가로 체류 중인가요?' },
      choices: [
        { value: 2, text: { en: 'PGWP', zh: '毕业工签 PGWP', ko: 'PGWP(졸업 후 취업 허가)' } },
        { value: 3, text: { en: 'Other work permit', zh: '其他工签', ko: '기타 취업 허가' } },
        { value: 1, text: { en: 'Study permit', zh: '学签', ko: '학업 허가' } },
        { value: 4, text: { en: 'Visitor or no permit', zh: '访客或没有许可', ko: '방문자·허가 없음' } },
        { value: 9, text: { en: 'Not sure', zh: '不清楚', ko: '잘 모르겠음' } },
      ],
    },
  },

  // 现居省(2026-08-15 statusInCanada 拆闸):NB 的闸是「在新省住满 6 个月」、MB 是「在曼省在职」——
  // 目标省答不了「你人在哪」(在安省问曼省的人不是曼省居民)。境外不问;领地并作一档。
  resProv: {
    engineKey: 'residenceProvince',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    q: {
      title: { en: 'Which province are you in now?', zh: '你现在人在哪个省?', ko: '지금 어느 주에 있나요?' },
      choices: [
        { value: 'ON', text: { en: 'Ontario', zh: '安省 Ontario', ko: '온타리오' } },
        { value: 'BC', text: { en: 'British Columbia', zh: 'BC 不列颠哥伦比亚', ko: '브리티시컬럼비아' } },
        { value: 'AB', text: { en: 'Alberta', zh: '阿省 Alberta', ko: '앨버타' } },
        { value: 'QC', text: { en: 'Quebec', zh: '魁省 Quebec', ko: '퀘벡' } },
        { value: 'MB', text: { en: 'Manitoba', zh: '曼省 Manitoba', ko: '매니토바' } },
        { value: 'SK', text: { en: 'Saskatchewan', zh: '萨省 Saskatchewan', ko: '서스캐처원' } },
        { value: 'NS', text: { en: 'Nova Scotia', zh: '新斯科舍 Nova Scotia', ko: '노바스코샤' } },
        { value: 'NB', text: { en: 'New Brunswick', zh: '新不伦瑞克 New Brunswick', ko: '뉴브런즈윅' } },
        { value: 'NL', text: { en: 'Newfoundland and Labrador', zh: '纽芬兰 Newfoundland', ko: '뉴펀들랜드' } },
        { value: 'PE', text: { en: 'Prince Edward Island', zh: '爱德华王子岛 PEI', ko: '프린스에드워드아일랜드' } },
        { value: 'TERR', text: { en: 'Territories', zh: '三个领地 Territories', ko: '준주 지역' } },
      ],
    },
  },

  // 学历:官方分值表里分最重的一项(BC SIRS 0-26、SK SINP 0-23)。
  // 先前引擎写死 highschool —— 每个省都少算十几分,「至少 N 分」低得没意义(题库扩充 20260802 §1)
  eduBand: {
    engineKey: 'edu',
    unlocks: ['rpt.s.cur', 'rpt.s.alt.mark'],
    tier: 'free',
    q: {
      title: { en: 'Your highest education?', zh: '最高学历?', ko: '최종 학력은?' },
      choices: [
        { value: 1, text: { en: 'High school or less', zh: '高中或以下', ko: '고졸 이하' } },
        { value: 2, text: { en: 'College diploma', zh: '大专或证书', ko: '전문대·수료증' } },
        { value: 3, text: { en: 'Bachelor', zh: '本科', ko: '학사' } },
        { value: 4, text: { en: 'Master', zh: '硕士', ko: '석사' } },
        { value: 5, text: { en: 'Doctorate', zh: '博士', ko: '박사' } },
      ],
    },
  },

  // 年龄:SK 年龄分 0-12(18-35 满分、≥50 归零),BC 不算年龄 —— 引擎按区间中点匹官方档
  ageBand: {
    engineKey: 'age',
    unlocks: ['rpt.s.cur', 'rpt.s.alt.mark'],
    tier: 'free',
    q: {
      title: { en: 'Your age?', zh: '年龄段?', ko: '연령대는?' },
      choices: [
        { value: 1, text: { en: '24 or under', zh: '24 岁及以下', ko: '24세 이하' } },
        { value: 2, text: { en: '25-30', zh: '25-30 岁', ko: '25-30세' } },
        { value: 3, text: { en: '31-35', zh: '31-35 岁', ko: '31-35세' } },
        { value: 4, text: { en: '36-40', zh: '36-40 岁', ko: '36-40세' } },
        { value: 5, text: { en: '41 or over', zh: '41 岁以上', ko: '41세 이상' } },
      ],
    },
  },

  // 同职业总经验(含海外):省级分值表的 work 因素按**总年数**给分,不限加拿大。
  // 与 expBand(加拿大经验)分工:那道题管 CEC 的 12 个月,这道题管省级 work 档位。
  totalExpBand: {
    engineKey: 'totalExpMonths',
    unlocks: ['rpt.s.cur', 'rpt.s.alt.mark', 'rpt.g.zeroExp', 'rpt.n.firstJob'],
    tier: 'free',
    q: {
      title: { en: 'Total experience in this occupation?', zh: '做这个职业一共多久了?(含海外)', ko: '이 직종 총 경력은?(해외 포함)' },
      // 2026-08-14 经验合一(与语言同批,Frank「怎么有两个」同款病):原来问区间(1-3/3-5 年),
      // 官方分值表按整年给分,分值段还得追问精确年数。改成一步问整年,追问题自动消失
      //(SK 这类按「近 5 年/6-10 年」拆段的省仍要拆段追问,那不是重复,是官方口径不同)。
      choices: [
        { value: 1, text: { en: 'None', zh: '没有', ko: '없음' } },
        { value: 2, text: { en: 'Under 1 year', zh: '不到 1 年', ko: '1년 미만' } },
        { value: 3, text: { en: '1 year', zh: '1 年', ko: '1년' } },
        { value: 4, text: { en: '2 years', zh: '2 年', ko: '2년' } },
        { value: 5, text: { en: '3 years', zh: '3 年', ko: '3년' } },
        { value: 6, text: { en: '4 years', zh: '4 年', ko: '4년' } },
        { value: 7, text: { en: '5+ years', zh: '5 年以上', ko: '5년 이상' } },
        { value: 9, text: { en: 'Not sure', zh: '不清楚', ko: '잘 모르겠음' } },
      ],
    },
  },

  // 英语:门槛建模(L2-04/05 的 BC 20 条 + ON 11 条)与换省对照(L2-08)落地后,
  // 它已经真的驱动结论 —— 原先「只驱动完整度」那行注释同批销账。
  clbBand: {
    engineKey: 'clb',
    unlocks: ['rpt.g.basics', 'rpt.s.cur'],
    tier: 'free',
    q: {
      title: { en: 'Your official language level (CLB)?', zh: '你的语言成绩到 CLB 几?', ko: '공인 언어 점수(CLB)는?' },
      // 2026-08-13 语言合一(Frank 连点两次「怎么有两个语言」):原来这题问区间(4-5/6-7…),
      // 官方分值表按精确档给分,于是分值段还得在区间里再问一遍 —— 同一件事问两遍。
      // 改成一步问精确档,分值段的语言题因「范围只剩一个值」自动消失(PnpScoreCard 既有机制)。
      choices: [
        { value: 1, text: { en: 'Not tested yet', zh: '还没考', ko: '시험 전' } },
        { value: 2, text: { en: 'CLB 4', zh: 'CLB 4', ko: 'CLB 4' } },
        { value: 3, text: { en: 'CLB 5', zh: 'CLB 5', ko: 'CLB 5' } },
        { value: 4, text: { en: 'CLB 6', zh: 'CLB 6', ko: 'CLB 6' } },
        { value: 5, text: { en: 'CLB 7', zh: 'CLB 7', ko: 'CLB 7' } },
        { value: 6, text: { en: 'CLB 8', zh: 'CLB 8', ko: 'CLB 8' } },
        { value: 7, text: { en: 'CLB 9', zh: 'CLB 9', ko: 'CLB 9' } },
        { value: 8, text: { en: 'CLB 10 or higher', zh: 'CLB 10 以上', ko: 'CLB 10 이상' } },
      ],
    },
  },

  // 加拿大经验:够 12 个月出 rpt.c.expOk,不够出 rpt.g.expShort(缺口免费)
  expBand: {
    engineKey: 'canadianExpMonths',
    unlocks: ['rpt.c.expOk', 'rpt.g.expShort'],
    tier: 'free',
    q: {
      // 紧跟在总经验那道题后面问 → 题干写「其中」,一眼看出是子集(全称在一屏里重复一遍是废话)
      title: { en: 'Of that, how long in Canada?', zh: '其中在加拿大多久?', ko: '그중 캐나다에서는?' },
      choices: [
        { value: 1, text: { en: 'None', zh: '没有', ko: '없음' } },
        { value: 2, text: { en: 'Under 1 year', zh: '不到 1 年', ko: '1년 미만' } },
        { value: 3, text: { en: '1-2 years', zh: '1-2 年', ko: '1-2년' } },
        { value: 4, text: { en: '2+ years', zh: '2 年以上', ko: '2년 이상' } },
        { value: 9, text: { en: 'Not sure', zh: '不清楚', ko: '잘 모르겠음' } },
      ],
    },
  },

  // 目标省:决定报告逐省算哪几个省(不选就按具名命中取前 3)
  provBand: {
    engineKey: 'targetProvinces',
    unlocks: ['rpt.c.listedHit', 'rpt.c.listedMiss', 'rpt.c.drawBand', 'rpt.a.prov'],
    tier: 'free',
    q: {
      title: { en: 'Target province?', zh: '目标省?', ko: '희망 주?' },
      choices: [
        { value: 1, text: { en: 'BC', zh: 'BC', ko: 'BC' } },
        { value: 2, text: { en: 'Ontario', zh: '安省', ko: '온타리오' } },
        { value: 3, text: { en: 'Prairies', zh: '草原三省', ko: '프레리 3주' } },
        { value: 5, text: { en: 'Atlantic', zh: '海洋四省', ko: '애틀랜틱 4주' } },
        { value: 4, text: { en: 'Show me what is reachable', zh: '先看哪个够得着', ko: '가능한 곳부터 보기' } },
      ],
    },
  },

  // 诉求(2026-08-03 Frank:「肯定是容易拿 PR 啊」→「如果不拿 PR 肯定去岗位多的啊」→「每个人诉求不一样」)。
  // 选省份的排序目标本来被助手写死过两版(先按岗位量、后按难度),两版都错 —— 排序该由用户的诉求定。
  // 一道题定一个目标函数:拿 PR = 按「容易拿提名」排;先找工作 = 按在招量排。两者都给对方那条当提示。
  goalBand: {
    engineKey: 'goal',
    unlocks: ['rpt.p.best', 'rpt.p.mostJobs'],
    tier: 'free',
    q: {
      title: { en: 'What matters more right now?', zh: '你现在更看重哪个?', ko: '지금 무엇이 더 중요한가요?' },
      choices: [
        { value: 1, text: { en: 'Getting nominated (PR)', zh: '容易拿身份(省提名)', ko: '영주권(주정부 지명)' } },
        { value: 2, text: { en: 'Finding a job first', zh: '先找到工作', ko: '우선 취업' } },
      ],
    },
  },

  // 卡③「选省份」唯一的专属题:雇主担保类通道按定义要先有 offer —— 有/没有各改一条真结论
  // (有 → 下一步换成对照该省雇主通道;没有 → 出缺口)。「面试中/自雇」都按「还没有」算,不含糊。
  offerBand: {
    engineKey: 'hasJobOffer',
    unlocks: ['rpt.n.employer', 'rpt.g.noOffer'],
    tier: 'free',
    q: {
      title: { en: 'Do you have a job offer in hand?', zh: '手上有 offer 吗?', ko: '받은 잡오퍼가 있나요?' },
      choices: [
        { value: 1, text: { en: 'Yes', zh: '有', ko: '있음' } },
        { value: 2, text: { en: 'In interviews', zh: '面试中', ko: '면접 중' } },
        { value: 3, text: { en: 'No', zh: '没有', ko: '없음' } },
        { value: 4, text: { en: 'Self-employed', zh: '自雇', ko: '자영업' } },
        { value: 9, text: { en: 'Not sure', zh: '不清楚', ko: '잘 모르겠음' } },
      ],
    },
  },

  // 门槛清单三类闸之一(2026-08-12,设计 docs/design/通道判定口径根治-20260812.md §3.3):
  // 「有没有加拿大学历」是好几条通道的硬闸(NL 国际毕业生要 PGWP、PGWP 的前提就是加拿大院校毕业)。
  // 不问就只能落「判不了」—— 而不问却当成「没有障碍」,正是把从没来过加拿大的人推荐去走
  // 「国际毕业生」通道的那个病。第三类闸「人在不在境内」不另开题:既有的「你现在的情况」已经分开了。
  canadaEduBand: {
    engineKey: 'canadaStudy',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    q: {
      title: { en: 'Do you have a Canadian credential?', zh: '你有加拿大的学历吗?', ko: '캐나다 학력이 있나요?' },
      choices: [
        { value: 1, text: { en: 'Yes', zh: '有', ko: '있음' } },
        { value: 2, text: { en: 'No', zh: '没有', ko: '없음' } },
        { value: 9, text: { en: 'Not sure', zh: '不清楚', ko: '잘 모르겠음' } },
      ],
    },
  },

  // 专业对口(2026-08-15 Frank「毕业生干厨师靠谱吗?跨专业了怎么弄」→「加」):NL 国际毕业生
  // 官方要求岗位与所学专业相关。只问有加拿大学历的人 —— 没有加拿大学历的,这条通道早被学历闸挡住了,
  // 再问一遍专业是浪费一屏。
  fieldMatchBand: {
    engineKey: 'fieldMatch',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    q: {
      title: {
        en: 'Is your Canadian credential in the same field as this job?',
        zh: '你的加拿大学历专业与这个职业对口吗?',
        ko: '캐나다 학력 전공이 이 직종과 맞나요?',
      },
      choices: [
        { value: 1, text: { en: 'Yes, same field', zh: '对口', ko: '전공과 일치' } },
        { value: 2, text: { en: 'No, different field', zh: '不对口(跨专业)', ko: '전공과 다름' } },
        { value: 9, text: { en: 'Not sure', zh: '不清楚', ko: '잘 모르겠음' } },
      ],
    },
  },

  // 学历所在省(同批):NL 只给本省院校(Memorial / College of the North Atlantic)留了不对口的口子,
  // 省外院校反而更严。这道题还同时喂两条既有官方条款 —— MB「外省院校毕业要 12 个月经验」、
  // ON「近 3 年安省院校毕业只要 3 个月」,先前恒缺槽判不了。
  eduProv: {
    engineKey: 'studyProvince',
    unlocks: ['rpt.s.cur', 'rpt.g.basics'],
    tier: 'free',
    q: {
      title: { en: 'Where did you study in Canada?', zh: '你的加拿大学历在哪个省读的?', ko: '캐나다 학력은 어느 주에서 취득했나요?' },
      choices: [
        { value: 'ON', text: { en: 'Ontario', zh: '安省 Ontario', ko: '온타리오' } },
        { value: 'BC', text: { en: 'British Columbia', zh: 'BC 不列颠哥伦比亚', ko: '브리티시컬럼비아' } },
        { value: 'AB', text: { en: 'Alberta', zh: '阿省 Alberta', ko: '앨버타' } },
        { value: 'QC', text: { en: 'Quebec', zh: '魁省 Quebec', ko: '퀘벡' } },
        { value: 'MB', text: { en: 'Manitoba', zh: '曼省 Manitoba', ko: '매니토바' } },
        { value: 'SK', text: { en: 'Saskatchewan', zh: '萨省 Saskatchewan', ko: '서스캐처원' } },
        { value: 'NS', text: { en: 'Nova Scotia', zh: '新斯科舍 Nova Scotia', ko: '노바스코샤' } },
        { value: 'NB', text: { en: 'New Brunswick', zh: '新不伦瑞克 New Brunswick', ko: '뉴브런즈윅' } },
        { value: 'NL', text: { en: 'Newfoundland and Labrador', zh: '纽芬兰 Newfoundland', ko: '뉴펀들랜드' } },
        { value: 'PE', text: { en: 'Prince Edward Island', zh: '爱德华王子岛 PEI', ko: '프린스에드워드아일랜드' } },
        { value: 'TERR', text: { en: 'Territories', zh: '三个领地 Territories', ko: '준주 지역' } },
      ],
    },
  },

  // 学制年数(2026-08-15 #316):全站此前从没问过,后果是三处官方条款恒判不了 ——
  // ON「近 3 年安省院校毕业只要 3 个月经验」那行要 ≥2 年学制才适用(pathVerdict conditionHolds),
  // MB 学历分按 1/2/3+ 年分档(pathVerdict mbEduOf、mbEoiEstimate mbEduYears),
  // CRS 加拿大学习加分分 1-2 年与 3 年+ 两档(crsEstimate)。消费端全按**年**收,这里给整年数。
  // 只问有加拿大学历的人(与 fieldMatchBand/eduProv 同闸):海外学历不喂这三处条款,问了挂不上结论。
  eduYearsBand: {
    engineKey: 'eduYears',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    q: {
      title: { en: 'How long was that program?', zh: '这个学历的学制几年?', ko: '그 과정은 몇 년제인가요?' },
      choices: [
        { value: 1, text: { en: 'Under 1 year', zh: '不到 1 年', ko: '1년 미만' } },
        { value: 2, text: { en: '1 year', zh: '1 年', ko: '1년' } },
        { value: 3, text: { en: '2 years', zh: '2 年', ko: '2년' } },
        { value: 4, text: { en: '3 years or more', zh: '3 年及以上', ko: '3년 이상' } },
        { value: 9, text: { en: 'Not sure', zh: '不清楚', ko: '잘 모르겠음' } },
      ],
    },
  },

  // 法语(2026-08-15 立,2026-08-16 升级成档位)。两件事本来问了两遍:
  //   · FCIP 的定义性门槛只看「四项够不够 NCLC 5」
  //   · ON/SK 官方表的 language2 要的是**档位**(第二官方语言 CLB/NCLC 4-10 逐档给分)
  // Frank「前面那个就是英语 后面那个就是法语吧」——于是并成一道:问档位,门槛由档位自己判。
  // 量表用 NCLC(法语的尺子);官方 language2 档位按同数值可比,直接喂 clb2。
  frenchBand: {
    engineKey: 'frenchOk',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    q: {
      title: {
        en: 'Your French level (NCLC, all four abilities)?',
        zh: '法语四项到 NCLC 几?',
        ko: '프랑스어 4개 영역 NCLC 등급은?',
      },
      choices: [
        { value: 1, text: { en: 'No French / below NCLC 4', zh: '不会法语或不到 NCLC 4', ko: '프랑스어 미보유·NCLC 4 미만' } },
        { value: 2, text: { en: 'NCLC 4', zh: 'NCLC 4', ko: 'NCLC 4' } },
        { value: 3, text: { en: 'NCLC 5', zh: 'NCLC 5', ko: 'NCLC 5' } },
        { value: 4, text: { en: 'NCLC 6', zh: 'NCLC 6', ko: 'NCLC 6' } },
        { value: 5, text: { en: 'NCLC 7', zh: 'NCLC 7', ko: 'NCLC 7' } },
        { value: 6, text: { en: 'NCLC 8 or higher', zh: 'NCLC 8 以上', ko: 'NCLC 8 이상' } },
        { value: 9, text: { en: 'Not sure', zh: '不清楚', ko: '잘 모르겠음' } },
      ],
    },
  },

  // 探索层:CRS → EE 分差(锁区 ee)
  crsBand: {
    engineKey: 'crs',
    unlocks: ['rpt.c.eeAbove', 'rpt.c.eeBelow'],
    tier: 'pro',
    q: {
      title: { en: 'Your Express Entry CRS score?', zh: '你的 EE 综合排名分(CRS)?', ko: 'Express Entry CRS 점수는?' },
      choices: [
        { value: 1, text: { en: 'Never calculated it', zh: '没算过', ko: '계산해 본 적 없음' } },
        { value: 2, text: { en: 'Under 400', zh: '400 以下', ko: '400 미만' } },
        { value: 3, text: { en: '400-450', zh: '400-450', ko: '400-450' } },
        { value: 4, text: { en: '450+', zh: '450 以上', ko: '450 이상' } },
      ],
    },
  },

  // 探索层:签证剩余 → 时间窗(锁区 window)。境外不传:没有加拿大签证,拿档位造时间窗=编数
  pgwpBand: {
    engineKey: 'pgwpMonthsLeft',
    unlocks: ['rpt.c.window'],
    tier: 'pro',
    q: {
      title: { en: 'How long is left on your permit?', zh: '你的签证还剩多久?', ko: '비자 잔여 기간은?' },
      choices: [
        { value: 1, text: { en: 'Under 6 months', zh: '不到 6 个月', ko: '6개월 미만' } },
        { value: 2, text: { en: '6-12 months', zh: '6-12 个月', ko: '6-12개월' } },
        { value: 3, text: { en: '1-2 years', zh: '1-2 年', ko: '1-2년' } },
        { value: 4, text: { en: '2+ years', zh: '2 年以上', ko: '2년 이상' } },
      ],
    },
  },

  // B1-4 PGWP(20260803,Frank 拍板只加两道;探索批 2)。
  // 「读书 vs 直接工作」的官方算术:课程时长档 + 层级 → 毕业后 PGWP 几个月(规则行 quote-anchored,
  // 见 etl/build_pgwp.py)。档取下界(同 CLB/经验口径)。
  studyMonthsBand: {
    engineKey: 'studyMonths',
    unlocks: ['rpt.c.pgwpLen', 'rpt.c.pgwpCombine'],
    tier: 'free',
    q: {
      title: { en: 'How long is the program you plan to take (or are in)?', zh: '计划读(或在读)的课程有多长?', ko: '계획 중(재학 중)인 과정 길이는?' },
      choices: [
        { value: 1, text: { en: 'Under 8 months', zh: '不到 8 个月', ko: '8개월 미만' } },
        { value: 2, text: { en: '8 months - 1 year', zh: '8 个月-1 年', ko: '8개월-1년' } },
        { value: 3, text: { en: '1-2 years', zh: '1-2 年', ko: '1-2년' } },
        { value: 4, text: { en: '2 years or more', zh: '2 年及以上', ko: '2년 이상' } },
      ],
    },
  },

  studyLevelBand: {
    engineKey: 'studyLevel',
    unlocks: ['rpt.c.pgwpLen', 'rpt.c.pgwpLang'],
    tier: 'free',
    q: {
      title: { en: 'What level is that program?', zh: '这个课程是什么层级?', ko: '그 과정의 학위 수준은?' },
      choices: [
        { value: 1, text: { en: 'College cert / diploma / post-grad cert', zh: '大专文凭、证书或研文', ko: '컬리지 수료증·디플로마' } },
        { value: 2, text: { en: 'Bachelor', zh: '本科', ko: '학사' } },
        { value: 3, text: { en: 'Master', zh: '硕士', ko: '석사' } },
        { value: 4, text: { en: 'Doctorate', zh: '博士', ko: '박사' } },
      ],
    },
  },
}
