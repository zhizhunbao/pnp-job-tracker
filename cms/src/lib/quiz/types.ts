/**
 * 答题域的形状 —— 本域自己声明(两处 `import type` 特批:db 基础设施叶子、payload 句柄归库)。
 *
 * 🔵 2026-08-25 Frank 落锤:原先挂特批牌引进来的三处跨域形状(i18n 的 Lang、points 的
 * SelfProfile、jobs 的四个行形状)全部撤掉,按「先自己写自己的,等最后都稳定了再看要不要
 * 抽公共层」改为本域自声明 —— 结构相同 tsc 两头都认,接缝零断言;三语齐不齐照样是 tsc 红
 * (`L = Record<Lang, string>` 的机制没变,只是 Lang 换成本域的那份)。
 *
 * @author Frank
 * @time 2026-08-18 04:36:46
 */

import type { Db } from '../db'
// eslint-disable-next-line local/no-import-in-leaf -- Payload Local API 的句柄形状归库(同 mail/types 的 PayloadHandle 特批)
import type { Payload } from 'payload'

/**
 * 语言码 —— 本域自声明(2026-08-25 撤 i18n 跨域 import;与全站三语同集,加语言两处同改)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 学历档 —— 本域自声明(2026-08-25 撤 points 跨域 import;档位键与打分表同集)。
 */
export type EduKey = 'doctorate' | 'master' | 'bachelor' | 'tradeCert' | 'diploma2y' | 'cert1y' | 'highschool'

/**
 * 「你的条件」的一套值 —— 本域自声明(2026-08-25 撤 points 跨域 import;
 * 分值卡答案的存档形状,points 引擎收的是结构,同形即兼容)。
 */
export type SelfProfile = {
  /**
   * 学历档。
   */
  edu: EduKey

  /**
   * 近 5 年内同职业全职年数(0-5)。
   */
  expRecent: number

  /**
   * 再往前(6-10 年前)的年数(0-5)。
   */
  expOlder: number

  /**
   * 首考语言 CLB;0 = 没有成绩。
   */
  clb1: number

  /**
   * 第二官方语言 CLB;0 = 没有。
   */
  clb2: number

  /**
   * 年龄。
   */
  age: number
}

/**
 * 热门职业一行 —— 本域自声明(2026-08-25 撤 jobs 跨域 import;注入的取数函数返回它,
 * 整行进缓存再下发,全格照抄)。
 */
export type TopNoc = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 官方英文名。
   */
  title: string

  /**
   * 中文名。
   */
  titleZh: string

  /**
   * 窄位中文名。
   */
  titleZhShort: string

  /**
   * 窄位韩文名。
   */
  titleKoShort: string

  /**
   * 窄位英文名。
   */
  titleEnShort: string

  /**
   * 大类。
   */
  broad: string

  /**
   * 在招数。
   */
  open: number

  /**
   * 可提名数。
   */
  eligible: number

  /**
   * 中位年薪;null = 大清单不算。
   */
  medianSalary: number | null
}

/**
 * 大类下的职业一行 —— 本域自声明(同上判;jobs 的 loadBroadNocs 返回它,整行下发)。
 */
export type BroadNoc = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 官方英文名。
   */
  title: string

  /**
   * 中文名。
   */
  titleZh: string

  /**
   * 窄位中文名。
   */
  titleZhShort: string

  /**
   * 窄位韩文名。
   */
  titleKoShort: string

  /**
   * 窄位英文名。
   */
  titleEnShort: string

  /**
   * 大类。
   */
  broad: string

  /**
   * 在招数。
   */
  open: number

  /**
   * 可提名数。
   */
  eligible: number
}

/**
 * 在招/可提名计数一格 —— 本域自声明(同上判)。
 */
export type NocOpenCount = {
  /**
   * 在招数。
   */
  open: number

  /**
   * 可提名数。
   */
  eligible: number
}

/**
 * 通道命中计数一行 —— 本域自声明(QuizFacts 的嵌套格)。
 */
export type QuizStreamCount = {
  /**
   * 通道。
   */
  stream: string

  /**
   * 命中岗数。
   */
  n: number
}

/**
 * 分省计数一行 —— 本域自声明(QuizFacts 的嵌套格)。
 */
export type QuizProvCount = {
  /**
   * 省码。
   */
  province: string

  /**
   * 在招数。
   */
  n: number

  /**
   * 可提名数。
   */
  eligible: number
}

/**
 * 职业事实卡 —— 本域自声明(同上判;jobs 的 loadQuizFacts 返回它,整卡进缓存再下发)。
 */
export type QuizFacts = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * TEER;null = 未分类。
   */
  teer: number | null

  /**
   * 官方英文名。
   */
  title: string

  /**
   * 中文名。
   */
  titleZh: string

  /**
   * 窄位中文名。
   */
  titleZhShort: string

  /**
   * 窄位韩文名。
   */
  titleKoShort: string

  /**
   * 窄位英文名。
   */
  titleEnShort: string

  /**
   * 在招数。
   */
  open: number

  /**
   * 可提名数。
   */
  eligible: number

  /**
   * 具名省清单命中岗数。
   */
  named: number

  /**
   * 分通道命中计数。
   */
  streams: QuizStreamCount[]

  /**
   * 分省计数。
   */
  byProv: QuizProvCount[]

  /**
   * 中位年薪;null = 未算(官方可空,不折 0)。
   */
  medianSalary: number | null

  /**
   * 有担保凭证的雇主数。
   */
  sponsors: number
}

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
   * 不过滤的给 null(2026-08-25 由 `?:` 改)。
   */
  choiceVisible: ((a: Answers, v: BandValue) => boolean) | null
}

/**
 * 字段库的一行。
 */
export type FieldDef = {
  /**
   * /api/report answers 的键名(缺省=字段名)。
   */
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
   * 档位 → 引擎输入;原样透传的字段给 null(2026-08-25:原先是 `?:`,
   * 「没有」靠键的缺席表达 —— 改成显式 null,漏填当场 tsc 红)。
   */
  toAnswer: ((v: BandValue, all: Answers) => EngineValue) | null

  /**
   * 题级显隐(2026-08-15 拆闸批新增,此前只有选项级过滤):不该问的人不见这道题,
   * 完整度计数同源过滤 —— 境外用户没有「持什么许可/人在哪个省」可答,摆着=逼他乱答。
   */
  visible: ((a: Answers) => boolean) | null
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
   * 现居城市(2026-10-09「我的档案」批,Frank「所在地 需不需要 选城市」→「可以」):英文城市名,与 cities.name 同写法;
   * 空串 = 没选(选填,跳过照旧按全省推)。挂在 resProv 之下 —— 换省时由写入方一并清掉,不单独成立。只存不判,引擎不读。
   */
  resCity: string

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
  frenchV2?: boolean

  /**
   * 目标省「还不确定」——**答过了**,只是不限省(与「没答」不同)。
   */
  provsAny?: boolean

  /**
   * 档位 v2 标记(2026-08-13/14 语言+经验合一):clbBand 从区间档改成精确档、totalExpBand 从
   * 区间档改成整年档(9=不清楚不变)。没打标的旧答案读取时按旧引擎月数/下界迁移 ——
   * 同一个 band 数字两套语义,不迁移就是静默改答案。
   */
  bandsV2?: boolean

  /**
   * B1-4 PGWP(20260803,拿 PR 探索批 2):计划读的课程时长档。
   */
  studyMonthsBand: number

  /**
   * 课程层级档。
   */
  studyLevelBand: number

  /**
   * 专业大类(2026-10-03 付费闭环批 A1,访客向导第 ② 题):统计局 CIP 2021 大类码 '01'…'11',
   * '12' = 其他;空串 = 没答。只存不判 —— 不进 FIELD_SPECS,引擎不读它。
   * 2026-10-04 A2(Frank「改」):改存具体专业的 CIP 2021 class 码(如 '52.0203';第 ② 题换成热门具体专业 + 搜索全部 CIP 专业,
   * 专业 → 本站大类的对照在 cip_programs.broads)。A1 未上线,线上没有大类码的旧值,不迁移;仍只存不判。
   * 2026-10-05 访客第 ② 题改多选(至多 3 个):格名 major → majors,存 class 码清单;空列 = 没答。单值那版(10-04)cms 没推过,
   * 线上没有 major 串的旧档,不迁移 —— 档里万一有,读取时那一格不认(normalize 只读 majors)。仍只存不判。
   */
  majors: string[]
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
  hasOffer?: boolean

  /**
   * 时薪(加元/小时)。2026-08-16 补:先前只活在分值卡的 state 里,刷新即丢,更谈不上上行 ——
   * 而 BC SIRS 200 分里时薪+地区占 80 分,服务端拿不到就整省算不出。
   */
  wage?: number

  /**
   * BC 工作地区档(与 wage 同批补)。
   */
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
 * `mergeBasics` 的返回(true = 并进去且推上服务端了;false = 没拉到档或没推成,调用方留着草稿下次再来)。
 */
export type MergedOut = Promise<boolean>

/**
 * `blankPatchOf` 的入参(现档与要填的格)。
 */
export type BlankPatchIn = {
  /**
   * 现档(刚从服务端拉回的那份)。
   */
  cur: Answers

  /**
   * 要填的格(缺席 = 不碰)。
   */
  patch: AnswersPatch
}

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
 * 注入取数函数收的参(与 jobs 的 loadTopNocs 门面同形)。
 */
export type TopLoadIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 清单条数。
   */
  limit: number
}

/**
 * 热门清单取数函数的形状(jobs 的 loadTopNocs 由调用方注进来,functions 不借 server 门)。
 */
export type TopLoaderFn = (input: TopLoadIn) => Promise<TopNoc[]>

/**
 * `getTopNocsCached` 的入参(2026-08-23 批②注入化后的单参门面)。
 */
export type TopCachedIn = {
  /**
   * 能查的连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 清单条数。
   */
  n: number

  /**
   * 注入的取数函数。
   */
  load: TopLoaderFn
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

  /**
   * 事实卡:noc → 缓存格(SWR:命中含过期先回,过期后台刷;实测 1.0s/次,
   * 决策页分值上下文与职业名回显都在打它)。
   */
  factsBy: Map<string, FactsSlot>

  /**
   * 批量计数:排序后的 noc 串 → 缓存格(第 2 题热门按钮挂真数)。
   */
  countsBy: Map<string, CountsSlot>

  /**
   * 大类职业清单:大类名 → 缓存格(点中大类才取,比每次 top=200 快且省)。
   */
  broadBy: Map<string, BroadSlot>

  /**
   * 专业职业清单:码 | 条数 → 缓存格(访客四题第 3 题;10 分钟 TTL,空结果不进缓存)。
   */
  majorBy: Map<string, MajorSlot>

  /**
   * 装配好的题库(数据半 FIELD_SPECS + 行为半接回来);getFields 首次调用时填。
   * 装一次就够 —— 它是纯数据加固定函数引用,进程内不会变。
   */
  fields: FieldMap | null
}

/**
 * 事实卡缓存一格(noc → 卡;null = 该职业当前零在招,也缓存)。
 */
export type FactsSlot = {
  /**
   * 落格时刻(ms)。
   */
  at: number

  /**
   * 事实卡;零在招是 null。
   */
  facts: QuizFacts | null
}

/**
 * 批量计数缓存一格(排序后的 noc 串 → 计数表)。
 */
export type CountsSlot = {
  /**
   * 落格时刻(ms)。
   */
  at: number

  /**
   * noc → 在招/可提名计数。
   */
  counts: Record<string, NocOpenCount>
}

/**
 * 大类职业清单缓存一格(大类名 → 清单)。
 */
export type BroadSlot = {
  /**
   * 落格时刻(ms)。
   */
  at: number

  /**
   * 该大类的职业清单。
   */
  rows: BroadNoc[]
}

/**
 * 专业分支缓存一格(码 | 条数 → 清单;2026-10-04 访客四题第 3 题)。
 */
export type MajorSlot = {
  /**
   * 落格时刻(ms)。
   */
  at: number

  /**
   * 该专业对应大类下在招最多的职业。
   */
  rows: TopNoc[]
}

/**
 * 注入的「专业 → 本站大类」取数收的参(与 majors 域 getMajorBroads 同形)。
 */
export type MajorBroadsLoadIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * CIP class 码。
   */
  code: string
}

/**
 * 「专业 → 本站大类」取数函数的形状(majors 域的 getMajorBroads 由路由注进来,functions 不借 server 门)。
 */
export type MajorBroadsFn = (input: MajorBroadsLoadIn) => Promise<string[]>

/**
 * 注入的「大类 → 在招最多的职业」取数收的参(与 jobs 的 loadMajorNocs 同形)。
 */
export type MajorNocsLoadIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 大类清单(调用方已判非空)。
   */
  broads: string[]

  /**
   * 清单条数。
   */
  limit: number
}

/**
 * 「大类 → 在招最多的职业」取数函数的形状(jobs 的 loadMajorNocs 由路由注进来)。
 */
export type MajorNocsLoaderFn = (input: MajorNocsLoadIn) => Promise<TopNoc[]>

/**
 * `getMajorNocsCached` 的入参。
 */
export type MajorNocsCachedIn = {
  /**
   * 能查的连接(池由调用方注进来)。
   */
  db: Db

  /**
   * CIP class 码清单(majorCodesOf 已验形、去重、夹到至多 3 个;空列 = 参数里一个都不合形)。
   * 2026-10-05 访客第 2 题改多选:原是一个码 code,大类取这几个码的本站大类并集。
   */
  codes: MajorCodes

  /**
   * 清单条数(majorNOf 已夹紧)。
   */
  n: number

  /**
   * 注入的「专业 → 本站大类」取数。
   */
  broadsOf: MajorBroadsFn

  /**
   * 注入的「大类 → 在招最多的职业」取数。
   */
  load: MajorNocsLoaderFn
}

/**
 * `getMajorNocsCached` 的返回。
 */
export type MajorNocsOut = Promise<TopNoc[]>

/**
 * 专业码清单(?major= 洗出来的 CIP class 码,至多 MAJOR_PICK_MAX 个;2026-10-05 访客第 2 题改多选时立)。
 */
export type MajorCodes = string[]

/**
 * `majorBroadsOf`(几个专业的本站大类并集)的入参(2026-10-05 立)。
 */
export type MajorBroadsUnionIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 专业码清单(调用方已排好序)。
   */
  codes: MajorCodes

  /**
   * 注入的「专业 → 本站大类」取数。
   */
  broadsOf: MajorBroadsFn
}

/**
 * `majorBroadsOf` 的返回(大类并集,去重,按码序与各码内的序先到先排)。
 */
export type MajorBroadsUnionOut = Promise<string[]>

/**
 * 事实卡后台刷成功的落格函数形状。
 */
export type FactsStoreFn = (facts: QuizFacts | null) => void

/**
 * 事实卡后台刷失败的收尾函数形状(旧值已删,下次请求重查)。
 */
export type FactsSwallowFn = (e: Error) => void

/**
 * Payload Local API 的句柄(本域只用 findByID/update 两个面)。
 */
export type PayloadHandle = Payload

/**
 * 用户 id(payload 会话里两种都见过)。
 */
export type UserId = string | number

/**
 * 透传的 json 值(答案档服务端不读内容,只验形与限长)。
 */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/**
 * PUT /api/quiz/answers 的请求体形状(两格都必须是对象,路由验过才落库)。
 */
export type AnswersBody = {
  /**
   * 基础三题答案档。
   */
  basic: Json

  /**
   * 分值卡答案档。
   */
  score: Json
}

/**
 * 答案档在 users 表上的那一格(findByID 的跨边界断言目标:生成的 User 型
 * 没收 docs/sql 手写加的 answers 列)。
 */
export type AnswersDoc = {
  /**
   * 答案档 jsonb;没存过是 null。
   */
  answers: Json | null
}

/**
 * `loadAnswers` 的入参。
 */
export type LoadAnswersIn = {
  /**
   * Payload 句柄(路由注进来)。
   */
  payload: PayloadHandle

  /**
   * 本人 id(取自 cookie 鉴权结果,不收参数 —— 答案是隐私)。
   */
  userId: UserId
}

/**
 * `loadAnswers` 的返回(没档/查挂都是 null)。
 */
export type AnswersOut = Promise<Json | null>

/**
 * `saveAnswers` 的入参。
 */
export type SaveAnswersIn = {
  /**
   * Payload 句柄(路由注进来)。
   */
  payload: PayloadHandle

  /**
   * 本人 id。
   */
  userId: UserId

  /**
   * 基础三题答案档(路由已验是对象)。
   */
  basic: Json

  /**
   * 分值卡答案档(同上)。
   */
  score: Json

  /**
   * 服务端补的更新时刻(ISO)。
   */
  updatedAt: string
}

/**
 * `saveAnswers` 的返回(落库即返,无体)。
 */
export type SaveAnswersOut = Promise<void>

/**
 * 题库一个字段的**行为半**:换算 / 题级显隐 / 选项过滤。
 * 2026-08-25 拆题库时立:数据半(题面、选项、解锁、档位)住 constants 的 FIELD_SPECS,
 * 这半留 functions —— 判据是「问什么」与「怎么算」分家。
 */
export type FieldBehavior = {
  /**
   * 档位 → 引擎输入;原样透传的字段没有,给 null。
   */
  toAnswer: ((v: BandValue, all: Answers) => EngineValue) | null

  /**
   * 题级显隐(不该问的人不见这道题);恒显的给 null。
   */
  visible: ((a: Answers) => boolean) | null

  /**
   * 选项级过滤;不过滤的给 null。
   */
  choiceVisible: ((a: Answers, v: BandValue) => boolean) | null
}

/**
 * 装配好的题库(字段名 → 完整定义)。
 */
export type FieldMap = Record<string, FieldDef>

// =========================================================================
// N. 我的档案(2026-10-09「我的档案」批:/api/quiz/profile)
// =========================================================================

/**
 * 码清单(专业码 / 职业码)。
 */
export type CodeList = string[]

/**
 * 码清单或没有(jsonb 里那一格缺 / 错型 = null)。
 */
export type MaybeCodeList = string[] | null

/**
 * loadQuizProfile 的返回。
 */
export type QuizProfileOut = Promise<QuizProfile>

/**
 * 一串名字。
 */
export type ProfileNames = ProfileName[]

/**
 * 按码取名字的返回。
 */
export type ProfileNamesOut = Promise<ProfileNames>

/**
 * 取城市译名的返回。
 */
export type CityNamesOut = Promise<ProfileName>

/**
 * 一个名字的三语(专业 / 职业 / 城市;档案页照名字规范摆英文在上、界面语译名灰字在下)。
 */
export type ProfileName = {
  /**
   * 码(专业 CIP class 码 / NOC 五位码);城市没有码,给空串。
   */
  code: string

  /**
   * 英文名;库里查不到用码顶上。
   */
  en: string

  /**
   * 中文译名;没有 = 空串。
   */
  zh: string

  /**
   * 韩文译名;没有 = 空串。
   */
  ko: string
}

/**
 * 档案页那一张「求职」卡要的全部(答案档五格 + 名字 + 投递署名)。
 */
export type QuizProfile = {
  /**
   * 目标档(1 = 拿 PR、2 = 先找工作);0 = 没答。
   */
  goal: number

  /**
   * 专业(按答的先后序)。
   */
  majors: ProfileName[]

  /**
   * 想做的工作(按答的先后序)。
   */
  nocs: ProfileName[]

  /**
   * 现居省码;空串 = 没答或在境外。
   */
  prov: string

  /**
   * 答的是「加拿大境外」。
   */
  abroad: boolean

  /**
   * 现居城市;没选 = 四格空串。
   */
  city: ProfileName

  /**
   * 投递署名(英文姓名);没填 = 空串。
   */
  name: string
}

/**
 * 档案页读的答案档基础段(洗净后;to* 出)。
 */
export type ProfileBasicFact = {
  /**
   * 目标档;没答 0。
   */
  goal: number

  /**
   * 专业码清单。
   */
  majors: string[]

  /**
   * 职业码清单。
   */
  nocs: string[]

  /**
   * 现居省码。
   */
  prov: string

  /**
   * 在境外。
   */
  abroad: boolean

  /**
   * 现居城市英文名。
   */
  city: string
}

/**
 * 答案档那一格的库行(pg 原始;jsonb 可能已解析成对象,也可能是串)。
 */
export type ProfileAnswersDbRow = {
  /**
   * users.answers。
   */
  answers: string | ProfileAnswersJson | null
}

/**
 * 答案档(线格式 / jsonb 原样;只声明档案页读的格)。
 */
export type ProfileAnswersJson = {
  /**
   * 基础段。
   */
  basic?: ProfileBasicJson | null
}

/**
 * 答案档基础段里档案页读的格(老答案可能缺任何一格)。
 */
export type ProfileBasicJson = {
  /**
   * 目标档。
   */
  goalBand?: number | null

  /**
   * 专业码清单。
   */
  majors?: string[] | null

  /**
   * 职业码清单。
   */
  nocs?: string[] | null

  /**
   * 现居省码。
   */
  resProv?: string | null

  /**
   * 现居城市英文名。
   */
  resCity?: string | null

  /**
   * 处境(overseas = 在境外)。
   */
  status?: string | null
}

/**
 * 专业名的库行(cip_programs)。
 */
export type MajorNameDbRow = {
  /**
   * CIP class 码。
   */
  code: string

  /**
   * 英文名。
   */
  title_en: string | null

  /**
   * 中文名。
   */
  title_zh: string | null

  /**
   * 韩文名。
   */
  title_ko: string | null
}

/**
 * 职业名的库行(noc_descriptions)。
 */
export type NocNameDbRow = {
  /**
   * NOC 五位码。
   */
  noc: string

  /**
   * 官方英文职业名。
   */
  title: string | null

  /**
   * 中文职业名。
   */
  title_zh: string | null

  /**
   * 韩文职业名。
   */
  title_ko: string | null
}

/**
 * 城市译名的库行(cities)。
 */
export type CityNamesDbRow = {
  /**
   * 中文译名。
   */
  name_zh: string | null

  /**
   * 韩文译名。
   */
  name_ko: string | null
}

/**
 * 投递署名的库行(apply_prefs;只读这一格)。
 */
export type SenderDbRow = {
  /**
   * 英文姓名。
   */
  sender_name: string | null
}

/**
 * loadQuizProfile 的入参。
 */
export type ProfileLoadIn = {
  /**
   * 连接(路由注进来)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: number
}

/**
 * 按码取名字(专业 / 职业)的入参。
 */
export type NamesByCodesIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 码清单(按答的先后序)。
   */
  codes: string[]
}

/**
 * 取城市译名的入参。
 */
export type CityNamesIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 英文城市名。
   */
  city: string

  /**
   * 省码。
   */
  prov: string
}

/**
 * orderNamesOf 的入参:按答的先后序排名字,查不到的用码顶上。
 */
export type OrderNamesIn = {
  /**
   * 码清单(答的先后序)。
   */
  codes: string[]

  /**
   * 查回来的名字。
   */
  rows: ProfileName[]
}
