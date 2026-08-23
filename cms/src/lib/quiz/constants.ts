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
 * 免费档的档名(batchLeadsFree 的判值)。
 */
export const TIER_FREE = 'free'
