/**
 * 答题域的形状 —— 本域自己声明(三处 `import type` 特批:i18n 的语言码、points 的自条件档、
 * jobs 的热门职业行,都是别家拥有的形状,抄一份就是两份真相)。
 *
 * @author Frank
 * @time 2026-08-18 04:36:46
 */

// eslint-disable-next-line local/no-import-in-leaf -- 题面三语跟全站语言机制走,加语言 tsc 点名靠它(特批牌形态)
import type { Lang } from '../i18n'
// eslint-disable-next-line local/no-import-in-leaf -- 分值卡 profile 格的形状归 points 域(特批牌形态)
import type { SelfProfile } from '../points'
// eslint-disable-next-line local/no-import-in-leaf -- 热门职业行的形状归 jobs 域(特批牌形态)
import type { TopNoc } from '../jobs/server'

/**
 * 结论落免费区还是锁区。
 */
export type Tier = 'free' | 'pro'

/**
 * 题面/选项的三语文本。2026-08-17 从 { default; 'zh-cn'; ko } 换成全站同一套 Lang ——
 * 先前那套是 SurveyJS 留下的键名,撤掉框架后没跟着改;两套并存的代价见 resumeMatch 的 LANG_NAME。
 */
export type L = Record<Lang, string>

/**
 * 选项在答案里存的值(档位数字或省码/身份码字符串)。
 */
export type BandValue = number | string

/**
 * 档位 → 引擎输入的产物。undefined = 不传:缺答与「答案是 0」要分开,
 * 而 JSON.stringify 会把 undefined 的键整个抹掉 —— 「不传」就是靠它实现的,换 null 会改载荷。
 */
// eslint-disable-next-line local/no-undefined-type -- 「不传」的实现就是 JSON.stringify 抹 undefined 键,契约必须写它
export type EngineValue = string | number | boolean | string[] | undefined

/**
 * 一道题的题面。
 */
export type Question = {
  /**
   * 题干(三语)。
   */
  title: L

  /**
   * 选项(value 进答案存储,text 是三语文案)。
   */
  choices: {
    /**
     * 进答案存储的值。
     */
    value: BandValue

    /**
     * 选项的三语文案。
     */
    text: L
  }[]

  /**
   * 选项过滤(目前只有一处:加拿大经验不得超过总经验)。先前是框架的字符串表达式,现在是普通函数。
   */
  // eslint-disable-next-line local/no-optional, local/one-parameter -- 字段库的声明形状:多数题没有选项过滤,缺席即全显;两参由「答案 + 候选值」这对语义定
  choiceVisible?: (a: Answers, v: BandValue) => boolean
}

/**
 * 字段库的一行。
 */
export type FieldDef = {
  /**
   * /api/report answers 的键名(缺省=字段名)。
   */
  // eslint-disable-next-line local/no-optional -- 缺省=字段名是既有契约,补全会把 30 行写成同名复读
  engineKey?: string

  /**
   * 题面。
   */
  q: Question

  /**
   * 答完能算出哪几条结论(引擎里真实存在的 key,lib/report.ts)。
   */
  unlocks: string[]

  /**
   * 免费区还是锁区。
   */
  tier: Tier

  /**
   * 档位 → 引擎输入(缺席=原样透传)。
   */
  // eslint-disable-next-line local/no-optional, local/one-parameter -- 原样透传的字段不配换算函数;两参由「本题答案 + 全卷」这对语义定
  toAnswer?: (v: BandValue, all: Answers) => EngineValue

  /**
   * 题级显隐(2026-08-15 拆闸批新增,此前只有选项级过滤):不该问的人不见这道题,
   * 完整度计数同源过滤 —— 境外用户没有「持什么许可/人在哪个省」可答,摆着=逼他乱答。
   */
  // eslint-disable-next-line local/no-optional -- 多数题对所有人可见,缺席即恒显
  visible?: (a: Answers) => boolean
}

/**
 * 全卷答案。
 */
export type Answers = {
  /**
   * 处境码(overseas/studying/working/jobhunting/unsure;空串=没答)。
   */
  status: string

  /**
   * 选的职业码。
   */
  nocs: string[]

  /**
   * 目标省码组(与 provBand 互推)。
   */
  provs: string[]

  /**
   * 三问答完过(职位板据此判断还弹不弹)。
   */
  // eslint-disable-next-line local/no-optional -- 存档形状:旧档没有这格,补必填会改已存 json 的字节
  done?: boolean

  /**
   * 英语档(2=CLB4 … 8=CLB10+,精确档 v2)。
   */
  clbBand: number

  /**
   * 加拿大经验档。
   */
  expBand: number

  /**
   * 目标省档(与 provs 互推)。
   */
  provBand: number

  /**
   * CRS 档。
   */
  crsBand: number

  /**
   * 签证剩余档。
   */
  pgwpBand: number

  /**
   * 学历档(题库扩充 20260802:官方分值表本来就要的三样,先前引擎写死 → 每个省都少算十几分)。
   */
  eduBand: number

  /**
   * 年龄档。
   */
  ageBand: number

  /**
   * 同职业总经验档(3=1年 … 7=5年+,精确档 v2;9=不清楚)。
   */
  totalExpBand: number

  /**
   * 有没有 offer(卡③专属题;类型里先前漏声明)。
   */
  offerBand: number

  /**
   * 诉求档(卡③;2026-08-23 十件套批补声明 —— 与 offerBand 当年同病:运行时一直在存,
   * 类型里漏了,靠 `...cur` 展开幸存;显式重建后不补就会被洗掉)。
   */
  goalBand: number

  /**
   * 学制年数档(2026-08-15 #316;同上 2026-08-23 补声明)。
   */
  eduYearsBand: number

  /**
   * 有没有加拿大学历(2026-08-12 门槛清单三类闸之一)。
   */
  canadaEduBand: number

  /**
   * 持的许可档(statusInCanada 拆闸 2026-08-15;只对境内处境显示,境外保持空)。
   */
  permitBand: number

  /**
   * 现居省(省码字符串,'TERR'=领地;同上只对境内显示)。
   */
  resProv: string

  /**
   * 专业对口档(2026-08-15 拆闸;只对「有加拿大学历」的人显示)。
   */
  fieldMatchBand: number

  /**
   * 加拿大学历所在省(省码,'TERR'=领地;同上)。
   */
  eduProv: string

  /**
   * 法语档(2026-08-15,FCIP 的定义性门槛;不由 clbBand 折算)。
   */
  frenchBand: number

  /**
   * 法语题已是档位版(2026-08-16)。没有这个标记的是旧「是/否」答案,读时迁移。
   */
  // eslint-disable-next-line local/no-optional -- 存档形状:标记缺席正是「旧档」的判据,不能补必填
  frenchV2?: boolean

  /**
   * 目标省「还不确定」——**答过了**,只是不限省(与「没答」不同)。
   */
  // eslint-disable-next-line local/no-optional -- 存档形状:缺席=没答过这层语义
  provsAny?: boolean

  /**
   * 档位 v2 标记(2026-08-13/14 语言+经验合一):clbBand 从区间档改成精确档、totalExpBand 从
   * 区间档改成整年档(9=不清楚不变)。没打标的旧答案读取时按旧引擎月数/下界迁移 ——
   * 同一个 band 数字两套语义,不迁移就是静默改答案。
   */
  // eslint-disable-next-line local/no-optional -- 存档形状:标记缺席正是「旧档」的判据
  bandsV2?: boolean

  /**
   * B1-4 PGWP(20260803,拿 PR 探索批 2):计划读的课程时长档。
   */
  studyMonthsBand: number

  /**
   * 课程层级档。
   */
  studyLevelBand: number
}

/**
 * 分值卡答案(2026-08-15 Frank「学历以下的字段都有这个问题」:勾选/逐题答案只活在
 * 组件 state → 刷新全丢。同一原则:门面是唯一读写口)。
 */
export type ScoreAnswers = {
  /**
   * 勾选项(键 `${factor}:${seq}`)。
   */
  ticks: Record<string, boolean>

  /**
   * 逐题档位答案(键 `${prov}:${factor}`)。
   */
  rowAnswers: Record<string, number>

  /**
   * 「你的条件」逐项答过没有。
   */
  extraAnswered: Record<string, boolean>

  /**
   * 「你的条件」逐项的**值**(学历/年龄/同职业经验/更早经验/第二语言分…)。
   * 2026-08-15 Frank 实拍「选的是本科一刷新就变成高中」:extraAnswered 只记了「答过」,
   * 值却只活在组件 state → 刷新回 DEFAULT_PROFILE(edu='highschool')还顶着已答标记。
   * 值必须与标记同存同取,缺一样都是在替他编答案。
   */
  profile: Partial<SelfProfile>

  /**
   * 基础卷没答 offer 时分值卡自问的那道;基础卷答过(ctx.hasOffer 有值)以基础卷为准。
   */
  // eslint-disable-next-line local/no-optional -- 存档形状:缺席=分值卡也没问到
  hasOffer?: boolean

  /**
   * 时薪(加元/小时)。2026-08-16 补:先前只活在分值卡的 state 里,刷新即丢,更谈不上上行 ——
   * 而 BC SIRS 200 分里时薪+地区占 80 分,服务端拿不到就整省算不出。
   */
  // eslint-disable-next-line local/no-optional -- 存档形状:缺席=没填过
  wage?: number

  /**
   * BC 工作地区档(与 wage 同批补)。
   */
  // eslint-disable-next-line local/no-optional -- 存档形状:缺席=没填过
  areaI?: number
}

/**
 * 答题的两段:基本卷 / 探索批。
 */
export type Stage = 'basic' | 'explore'

/**
 * 一个决定的取用清单。
 */
export type Decision = {
  /**
   * 答满即出报告(粗版,confidence 低)。
   */
  basic: string[]

  /**
   * 探索题按批推进,一批一屏组。
   */
  explore: string[][]
}

/**
 * localStorage / 服务端档解析出来的一格(信任边界:类型不可信,判定在 rows 的词汇表)。
 */
export type RawCell = string | number | boolean | null | RawCell[] | { [k: string]: RawCell }

/**
 * 解析出来的一份档(键任意 —— 旧档/服务端档都过 normalize 逐格收)。
 */
export type RawDoc = { [k: string]: RawCell }

/**
 * 引擎入参对象(undefined 的键被 JSON.stringify 抹掉 = 不传)。
 */
export type EngineAnswers = Record<string, string | number | boolean | string[]>

/**
 * 存储原文(localStorage.getItem 的返回)。
 */
export type RawText = string | null

/**
 * 档对象或没有(parse 解析失败/为空)。
 */
export type MaybeRawDoc = RawDoc | null

/**
 * 档里的一格或缺键(词汇表 num/arr/str/rec 的入参 —— 缺键接缝在词汇表门口收)。
 */
// eslint-disable-next-line local/no-undefined-type -- 语言接缝:RawDoc 缺键读出 undefined,在这一格收
export type RawField = RawCell | undefined

/**
 * 合并档或没有(migrate 没旧档时)。
 */
export type MaybeAnswers = Answers | null

/**
 * normalize 的入参:原料档或已是本域形状(内存运行态回洗)。
 */
export type RawAnswersSource = RawDoc | Answers

/**
 * normalizeScore 的入参(可为 null:没档)。
 */
export type RawScoreSource = RawDoc | ScoreAnswers | null

/**
 * 全卷的局部更新(writeAnswers 的入参)。
 */
export type AnswersPatch = Partial<Answers>

/**
 * 字段名清单。
 */
export type FieldNames = string[]

/**
 * 省码组。
 */
export type ProvList = string[]

/**
 * 省码组或缺键(旧档 json 的 provs 格可缺)。
 */
// eslint-disable-next-line local/no-undefined-type -- 语言接缝:旧档缺键在 bandFromProvs 门口收
export type MaybeProvList = ProvList | undefined

/**
 * `pushToServer` 的返回(结果反映在 CACHE 上)。
 */
export type PushedOut = Promise<void>

/**
 * `pullAndMerge` 的返回(true = 内存被服务端档换过,调用方需重建 state)。
 */
export type PulledOut = Promise<boolean>

/**
 * 字段名的过滤函数形状(filter 用)。
 */
export type NameFilter = (n: string) => boolean

/**
 * 热门职业缓存的一格。
 */
export type TopSlot = {
  /**
   * 写入时刻(ms)。
   */
  at: number

  /**
   * 缓存的清单。
   */
  rows: TopNoc[]

  /**
   * 有没有在途的后台刷新(防重复刷)。
   */
  refreshing: boolean
}

/**
 * `getTopNocsCached` 的返回(热门职业清单)。
 */
export type TopOut = Promise<TopNoc[]>

/**
 * 热门职业清单行的复数(缓存与在途 Map 的值)。
 */
export type TopRows = TopNoc[]

/**
 * 首查/后台刷成功的落格函数形状。
 */
export type StoreFn = (rows: TopNoc[]) => void

/**
 * 首查落格 + 透传的函数形状。
 */
export type FirstStoreFn = (rows: TopNoc[]) => TopNoc[]

/**
 * 后台刷失败收尾的函数形状。
 */
export type UnflagFn = (e: Error) => void

/**
 * 首查收尾(清在途标记)的函数形状。
 */
export type DropFn = () => void

/**
 * 答题域全部可变状态的形状(住 variables.ts 的 CACHE)。
 */
export type QuizCache = {
  /**
   * 运行态答案档(**换账号必须清** —— 见 resetAnswersMemory)。
   */
  mem: Answers | null

  /**
   * 运行态分值卡档。
   */
  memScore: ScoreAnswers | null

  /**
   * 登录态(null=未知,push 不发;拉档探明后才开闸)。
   */
  loggedIn: boolean | null

  /**
   * 防抖定时器。
   */
  syncTimer: ReturnType<typeof setTimeout> | null

  /**
   * 退避重试定时器。
   */
  retryTimer: ReturnType<typeof setTimeout> | null

  /**
   * 已重试次数。
   */
  retryN: number

  /**
   * 有改动还没推成功 —— 离开页面时靠它决定要不要 beacon。
   */
  dirty: boolean

  /**
   * 🔴 拉过服务端档没有。**没拉过就一个字节都不许推** —— 内存此刻是空的,推上去等于拿空档
   * 覆盖用户真答过的整份档案(2026-08-16 实撞:Frank 刷新后页面 0/11,而库里 845 字节完好,
   * 差一步就被空档盖掉)。同理没拉过档时不许让「挂载写默认值」算成用户改动。
   */
  hydrated: boolean

  /**
   * 离开页面兜底已挂上没有(只挂一次)。
   */
  guarded: boolean

  /**
   * 热门职业:条数 → 缓存格(SWR;instrumentation 预热与请求路径写同一份)。
   */
  top: Map<number, TopSlot>

  /**
   * 热门职业:条数 → 在途首查(预热与首个 HTTP 请求同时撞进来时的去重,
   * 没有它会并发跑两次 4 万岗 GROUP BY —— 08-10 冷启动实测 8s)。
   */
  topPending: Map<number, Promise<TopRows>>
}
