/**
 * plan 域(/plan/pr 决策页)的自足形状:页面与各内件的 props 契约、状态机器的面板、
 * 纯派生与手柄工厂的入参,以及初评表那条「事实行 → 展示行」的三段律。
 * 判定与算分一格都不在这里:那是 lib/ruling、lib/pathways、lib/points 的活,
 * 本页只渲染它们下发的结论(「判定/分数全来自确定性层,本页不算一个数」)。
 * 三处逐行特批的 import type 都是**原样透传**的外域契约(答案档、官方分值表与抽选记录、
 * 职业分省竞争行):它们要原封不动交给同源的分值卡、估分线卡与 lib 引擎,
 * 重抄一份当天就会脱节 —— 特批牌形态同 companies/types.ts 的公司档案。
 * 第二段(ScoreLineCard 与 QuizForm)已于同日并入,形状续在各段尾。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
// eslint-disable-next-line local/no-import-in-leaf -- lib/quiz 的答案档与分值卡存档,原样交给读写函数与答题器;重抄必脱节
import type { Answers, ScoreAnswers } from '@/lib/quiz'
// eslint-disable-next-line local/no-import-in-leaf -- lib/points 的官方表与抽选记录,原样透传给 PnpScoreCard/ScoreLineCard;重抄必脱节
import type { DrawRow, ProvCompetition, ScoreFactor, SelfProfile } from '@/lib/points'
// eslint-disable-next-line local/no-import-in-leaf -- lib/jobs 的职业分省竞争行,原样进表;重抄必脱节
import type { OccCompetitionRow } from '@/lib/jobs'

/**
 * 界面语言(三字面量各域自抄)。
 */
export type PlanLang = 'zh' | 'en' | 'ko'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 省码 → 显示省名的取名函数(条件格网格与估分线卡都要它)。
 */
export type ProvDispFn = (code: string) => string

/**
 * 无参无返的点击手柄。
 */
export type ClickFn = () => void

/**
 * 带条件格 key 的点击手柄(不带 key = 落在第一道没答的题)。
 */
export type EditFn = (key?: string) => void

/**
 * 省码 → 该省一段内容的渲染函数(估分线卡的两处渲染口)。
 */
export type ProvNodeFn = (province: string) => React.ReactNode

/**
 * 省码 → 该省还欠几道估分题(估分线卡的页签角标)。
 */
export type ProvCountFn = (province: string) => number

/**
 * 省码 → 无返(当前页签省上报)。
 */
export type ProvVoidFn = (province: string) => void

/**
 * 各省最近一轮抽选(SSR 事实区直出)。形状与 lib/points 的同名类型对齐 ——
 * 那边是产出方,这里是消费方,本页只读这五格。
 */
export type OverviewDraw = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 抽选日期。
   */
  drawDate: string

  /**
   * 官方通道原名(英文界面拿到的就是它,放不下换行不截)。
   */
  stream: string

  /**
   * 分数线;null = 这一轮官方没公布分数(靠邀请数入选的行)。
   */
  score: number | null

  /**
   * 邀请数;null = 官方没公布。
   */
  invitations: number | null
}

/**
 * 热门职业一行(服务端按在招量取好 → 选职业控件一次成型,不再分段刷)。
 */
export type TopNoc = {
  /**
   * 5 位职业码。
   */
  noc: string

  /**
   * 官方职业名。
   */
  title: string

  /**
   * 中文职业名。
   */
  titleZh: string

  /**
   * 中文短名(控件里位置窄)。
   */
  titleZhShort: string

  /**
   * 韩文短名。
   */
  titleKoShort: string

  /**
   * 英文短名。
   */
  titleEnShort: string

  /**
   * 所属大类。
   */
  broad: string

  /**
   * 本站在招岗数。
   */
  open: number

  /**
   * 其中带 pnpEligible 标记的岗数。
   */
  eligible: number

  /**
   * 薪资中位;null = 样本不足未算。
   */
  medianSalary: number | null
}

/**
 * 带岗进来时那份工作的表头四样(判定本体在 /api/ruling/verdict,这里只要显示要用的几格)。
 */
export type TvJob = {
  /**
   * 岗位 id。
   */
  id: number

  /**
   * 岗位名。
   */
  title: string

  /**
   * 雇主名。
   */
  company: string

  /**
   * 城市。
   */
  city: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * 5 位职业码。
   */
  noc: string

  /**
   * TEER 档;null = 未分类的岗(不硬塞)。
   */
  teer: number | null

  /**
   * 命中的具名通道(抽选线按通道对照)。
   */
  pnpStream: string
}

/**
 * 官方分值表按省懒取的响应:过滤后的因素行 + 本站有表的省清单 + 该批省的抽选记录。
 * null = 还没取到 —— 此时既不出估分区也不敢说「这些省本站没有表」,那两句都得等表到手才算数。
 */
export type ScoreTables = {
  /**
   * 本站有官方分值表的省(AB/BC/MB/NL/ON/SK)。
   */
  factorProvinces: string[]

  /**
   * 官方分值表逐行(原样透传给分值卡)。
   */
  factors: ScoreFactor[]

  /**
   * 该批省的全量抽选记录(线优先用它,没有才退回 SSR 那份近 6 轮)。
   */
  draws: DrawRow[]
}

/**
 * 该省名额竞争(服务端算好的省级比值);形状原样透传给竞争表。
 */
export type PlanCompetition = ProvCompetition

/**
 * 官方分值表的一行因素(原样透传给分值卡)。
 */
export type PlanScoreFactor = ScoreFactor

/**
 * 一轮抽选记录(原样透传给估分线卡与分值卡)。
 */
export type PlanDraw = DrawRow

/**
 * 该职业分省竞争的一行(原样进表)。
 */
export type PlanOccComp = OccCompetitionRow

/**
 * 答案档(原样交给 lib/quiz 的读写函数与答题器)。
 */
export type PlanAnswers = Answers

/**
 * 分值卡的一套自报条件(只作初值,卡内下拉仍可改)。
 */
export type PlanSelfProfile = SelfProfile

/**
 * 基础卷学历档在分值卡那边的口径(五个字面量本域自抄)。
 */
export type PlanEduBand = 'highschool' | 'diploma2y' | 'bachelor' | 'master' | 'doctorate'

/**
 * 分值卡的岗位语境(全格可省 —— 无岗态几格都拿不到,缺席就是「这一格没有语境」)。
 */
export type ScoreContext = {
  /**
   * 5 位职业码。
   */
  noc?: string

  /**
   * TEER 档;null = 未分类。
   */
  teer?: number | null

  /**
   * 两位省码。
   */
  province?: string

  /**
   * 城市(BC 工作地区档要它)。
   */
  city?: string

  /**
   * 岗位时薪(BC 时薪档的预填;分值卡存档里有他自己填的就以他的为准)。
   * 缺席 = 无岗态拿不到,让用户自己填;null = 这份岗位没写薪资。
   */
  hourly?: number | null

  /**
   * 有没有 offer;缺席 = 基础卷答的是「不清楚」或没答,分值段照问。
   */
  hasOffer?: boolean
}

/**
 * 服务端下发的一条通道(排序已在 lib/planRank 做完,客户端只渲染不重排)。
 */
export type ProfilePath = {
  /**
   * 通道 key。
   */
  key: string

  /**
   * 两位省码;区域线拆省前也可能是区域名。
   */
  province: string

  /**
   * 判定:能走 / 判不了。
   */
  verdict: 'viable' | 'needs-info'

  /**
   * 还要攒几档时间;null = 不适用。
   */
  tier: TierBand | null

  /**
   * 本站有没有收录这条通道的门槛条文('ok' = 有)。
   */
  availability: string

  /**
   * 被攒时间补不了的门槛卡住(语言差档 / 自雇不计经验)—— 排在能走的后面,标签也另写。
   */
  blockedBy?: 'language' | 'selfEmployed' | 'offer' | 'statusInCanada' | 'credentialCanada' | 'fieldMatch' | null

  /**
   * 判不了是因为哪几道题没答(2026-08-15:展示层据此挂「需专业对口」这类提醒)。
   */
  missingSlots?: string[]

  /**
   * 该省名额竞争度(临时居民存量 ÷ 当年省提名名额,IRCC 开放数据);联邦线为 null。
   */
  competition?: PathCompetition | null

  /**
   * tier 起算点(#319):在读学生的经验型 tier 要等毕业拿工签才起算。
   */
  tierBasis?: 'now' | 'after-study'

  /**
   * 这段等待要不要全职(官方条文行说了才为 true)。
   */
  tierFullTime?: boolean

  /**
   * 全部缺口的措辞键(#324:原因列要逐行差异,单一 blockedBy 不够)。
   */
  gaps?: string[]

  /**
   * 该省该职业在招岗数(#307:服务端与排序同源下发;客户端不再自取自排)。
   */
  jobsN?: number | null

  /**
   * RCIP/FCIP 社区名额状态(省×制度聚合;竞争格用它替「—」)。
   */
  pilotQuota?: PilotQuota | null

  /**
   * 反事实(L2-09):拿到该省 offer 之后这条路的判定;只有被 offer 卡住的行才带。
   */
  afterOffer?: AfterOffer | null

  /**
   * 打分制通道估分与官方线。两头都是硬结论、中间留白(2026-08-16,判定见 lib/scoreLine)。
   */
  score?: PathScore | null

  /**
   * 上界 < 线(够不着,服务端已沉队尾)。
   */
  belowLine?: boolean

  /**
   * 下界 ≥ 线(够得着,服务端已提前)。
   */
  aboveLine?: boolean
}

/**
 * 省外提示(#302/#303:与主排序同一把尺;inside 给措辞层摆两边对照)。
 */
export type OutsidePath = {
  /**
   * 通道 key。
   */
  key: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * 该省名额竞争比;null = 官方缺位。
   */
  ratio: number | null

  /**
   * 还要攒几档时间。
   */
  tier: TierBand | null

  /**
   * 被哪道闸卡住;null = 没被卡。
   */
  blockedBy: string | null

  /**
   * 目标省内的最优行,拿来两边对照;null = 省内一条都没有。
   */
  inside: InsidePath | null
}

/**
 * 目标省内那条最优通道的对照行(措辞层把它与省外那条并排摆)。
 */
export type InsidePath = {
  /**
   * 通道 key。
   */
  key: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * 该省名额竞争比;null = 官方缺位。
   */
  ratio: number | null

  /**
   * 还要攒几档时间。
   */
  tier: TierBand | null

  /**
   * 被哪道闸卡住;null = 没被卡。
   */
  blockedBy: string | null
}

/**
 * 条件格一行:点这格该落到哪道题('occ'/'prov' 是专属页,基础题用字段名,
 * 分值题用分值卡的题 key,带冒号);prov='' 为全省共用,其余按省分页签。
 */
export type SummaryRow = {
  /**
   * 点这格落到哪道题。
   */
  key: string

  /**
   * 这道题属于哪个省;'' = 全省共用。
   */
  prov: string

  /**
   * 题面。
   */
  label: string

  /**
   * 答案;没答时由调用方填「待填写」。
   */
  value: string

  /**
   * 答过没有。
   */
  filled: boolean

  /**
   * 不匹配小标(岗位职业不在档案职业里 / 岗位省不在目标省里);可省 = 不挂标。
   */
  warn?: string

  /**
   * 小类别(身份 / 教育 / 语言 / 职业经验 / 目标);可省 = 分值题,不进基础分组。
   */
  group?: string
}

/**
 * 分值卡回报的逐题答案回显(与基础 8 项同摆一片格子)。
 */
export type ScoreEchoRow = {
  /**
   * 分值卡的题 key(带省前缀的冒号形)。
   */
  key: string

  /**
   * 这道题属于哪个省;'' = 全省共用。
   */
  prov: string

  /**
   * 题面。
   */
  label: string

  /**
   * 答案。
   */
  value: string

  /**
   * 答过没有。
   */
  filled: boolean
}

/**
 * 分值卡上直选的官方档位与时薪(先前只存在它的 localStorage 里,服务端收不到 ——
 * BC SIRS 200 分里时薪 55 + 地区 25 全卡在这儿,2026-08-16 接上行)。
 */
export type ScoreRowsAnswer = {
  /**
   * 逐行直选的官方档位。
   */
  rowAnswers: Record<string, number>

  /**
   * 时薪;缺席 = 他没答过这一题(默认值当答案就是替他编分)。
   */
  wage?: number

  /**
   * BC 工作地区档;缺席 = 他没答过这一题。
   */
  areaI?: number
}

/**
 * 分值卡的 localStorage 存档(加分项勾选 + 直选档位 + 时薪 + 地区);
 * 原样从 lib/quiz 的 readScoreAnswers 收下来,本页只挑其中真答过的那几样上行。
 */
export type PlanScoreStore = ScoreAnswers

/**
 * 答案档按题名取值时用的字典形状。题名要到运行时才从字段库拿到,而 Answers 没有索引签名,
 * 拿它同形的字典接一手就够 —— 值的种类照 Answers 里真有的那几类写全(职业码数组、
 * 加分项勾选表这些归 object),不用 any 把整格类型丢掉。
 */
export type AnswerBag = Partial<Record<string, string | number | boolean | object>>

/**
 * fieldVisibleOf 的入参(题级显隐:不该问的人不见这道题,条件格也不摆)。
 */
export type FieldVisibleIn = {
  /**
   * 题名。
   */
  name: string

  /**
   * 答案档。
   */
  bands: PlanAnswers
}

/**
 * makeChoiceMatch 的入参(找出当前选中的那个选项)。
 */
export type ChoiceMatchIn = {
  /**
   * 这道题此刻的值;缺席 = 还没答。
   */
  value: string | number | boolean | object | undefined
}

/**
 * 点条件格直达那道分值题:nonce 变一次跳一次(只传 key 的话,点同一格第二次就不动了)。
 */
export type ScoreFocus = {
  /**
   * 分值卡的题 key。
   */
  key: string

  /**
   * 跳转序号。
   */
  nonce: number
}

/**
 * 分值段的进度(与基础卷各算各的,两边卡在哪一步第一次能分开读)。
 */
export type ScoreProgress = {
  /**
   * 已答几题。
   */
  done: number

  /**
   * 一共几题。
   */
  total: number
}

/**
 * 推荐原因胶囊的色档。
 */
export type PillTone = 'ok' | 'info' | 'warn' | 'mute'

/**
 * 一枚推荐原因胶囊。
 */
export type Pill = {
  /**
   * 胶囊上的字。
   */
  text: string

  /**
   * 色档。
   */
  tone: PillTone
}

/**
 * 初评表的展示行(事实行 → 洗好的展示行:话怎么说、色用哪档、链接去哪,
 * 全在洗行的时候算完;单元格只渲不判)。
 */
export type PlanCellRow = {
  /**
   * 行身份(区域线拆省后同 key 多行 → 带省码去重;React key / Table rowKey / 埋点共用)。
   */
  rowKey: string

  /**
   * 名次序号(0 起)。
   */
  index: number

  /**
   * 带岗态补的「本岗所在省」行,不冒充名次(#325)。
   */
  extra: boolean

  /**
   * 是不是榜首(且没被门槛卡住、也没低于线)——名次圆牌染蓝的唯一判据。
   */
  top: boolean

  /**
   * 显示省名;区域线给区域名。
   */
  province: string

  /**
   * 通道显示名(剥完省名 + 并进制度小括号)。
   */
  routeName: string

  /**
   * 名额竞争比的排序键;null = 官方缺位或这条线没有池子(排序沉底)。
   */
  ratio: number | null

  /**
   * 在招岗数的排序键;null = 无岗位级口径。
   */
  jobsN: number | null

  /**
   * 各格的成句(话怎么说在洗行时算完,单元格只渲不判)。
   */
  text: PlanRowText

  /**
   * 各格的胶囊(色档也在洗行时定好)。
   */
  pills: PlanRowPills

  /**
   * 各格的去处。
   */
  links: PlanRowLinks

  /**
   * 两颗钮的埋点手柄(在洗行时就绑好行身份 —— 单元格只渲不算)。
   */
  acts: PlanRowActs
}

/**
 * 初评表一行的两颗钮埋点手柄。
 */
export type PlanRowActs = {
  /**
   * 「查岗位」点击埋点。
   */
  go: ClickFn

  /**
   * 「查雇主」点击埋点。
   */
  emp: ClickFn
}

/**
 * 初评表一行的全部成句。空串一律表示「这一格不出」——「—」由单元格自己渲成灰字,
 * 那是我们没有这个数,与 0 不是一回事。
 */
export type PlanRowText = {
  /**
   * 名次圆牌上的字(补充行给记号,不给数字)。
   */
  rank: string

  /**
   * 「本岗所在省」标;'' = 这不是补充行。
   */
  extraLabel: string

  /**
   * 竞争格主文案(比值 / 发放规则);'' = 这一格没有数据。
   */
  comp: string

  /**
   * 竞争格的灰字小注(官网公布的剩余名额数);'' = 不出小注。
   */
  compSub: string

  /**
   * 在招格文案;'' = 这一格没有数据。
   */
  jobs: string

  /**
   * 手机卡标题(补充行不带名次)。
   */
  cardTitle: string

  /**
   * 手机卡的「在招 N」整句。
   */
  openLine: string

  /**
   * 「查岗位」钮文案。
   */
  actGo: string

  /**
   * 「查雇主」钮文案。
   */
  actEmp: string
}

/**
 * 初评表一行的两列胶囊。
 */
export type PlanRowPills = {
  /**
   * 「还差」列:缺口胶囊(可能并排几枚)。
   */
  gaps: Pill[]

  /**
   * 「还要多久」列:一行一值;null = 这一格不出。
   */
  time: Pill | null
}

/**
 * 初评表一行的两个去处。
 */
export type PlanRowLinks = {
  /**
   * 「查岗位」的去处;null = 这条线没有岗位级口径。
   */
  jobs: string | null

  /**
   * 「查雇主」的去处;null = 这条线不给雇主入口。
   */
  emp: string | null
}

/**
 * 竞争表的展示行(现行口径与年份视图的取数差异在洗行时就分完,表与卡都只渲字)。
 */
export type CompCellRow = {
  /**
   * 行身份(两位省码)。
   */
  key: string

  /**
   * 省全名。
   */
  provName: string

  /**
   * 两位省码灰注。
   */
  provCode: string

  /**
   * 手机卡右侧的主数字(现行口径的竞争比)。
   */
  ratioMain: string

  /**
   * 手机卡第二行的明细整句。
   */
  meta: string

  /**
   * 学签存量成句;'' = 官方缺位。
   */
  study: string

  /**
   * 学签存量排序键。
   */
  studySort: number | null

  /**
   * 工签存量成句;'' = 官方缺位。
   */
  work: string

  /**
   * 工签存量排序键。
   */
  workSort: number | null

  /**
   * 存量合计成句(旧库行没带拆分字段时的单列形态)。
   */
  pool: string

  /**
   * 存量合计排序键。
   */
  poolSort: number | null

  /**
   * 名额成句;'' = 官方缺位。
   */
  quota: string

  /**
   * 名额年度灰注(逐省不同,现行视图留行内);'' = 不出。
   */
  quotaNote: string

  /**
   * 名额排序键。
   */
  quotaSort: number | null

  /**
   * 竞争比成句;'' = 三列同年不齐,不硬算。
   */
  ratio: string

  /**
   * 竞争比排序键。
   */
  ratioSort: number | null

  /**
   * 流量成句;'' = 官方缺位。
   */
  flow: string

  /**
   * 流量排序键。
   */
  flowSort: number | null
}

/**
 * 该职业分省竞争的展示行。
 */
export type OccCellRow = {
  /**
   * 行身份(两位省码)。
   */
  key: string

  /**
   * 省全名。
   */
  provName: string

  /**
   * 两位省码灰注。
   */
  provCode: string

  /**
   * 省名排序键(按显示名排,不按省码)。
   */
  provSort: string

  /**
   * 在招岗数成句(表格里那份带千分位)。
   */
  open: string

  /**
   * 在招岗数的手机卡主数字(原样,不带千分位 —— 卡片右列历来直接摆这个数)。
   */
  openMain: string

  /**
   * 在招岗数排序键。
   */
  openSort: number

  /**
   * 近 30 天新增成句(官方缺位时就是那根横杠 —— 这一列历来不出灰字)。
   */
  new30: string

  /**
   * 近 30 天新增排序键。
   */
  new30Sort: number | null

  /**
   * 平均在招天数成句。
   */
  days: string

  /**
   * 平均在招天数排序键。
   */
  daysSort: number | null

  /**
   * 手机卡第二行的明细整句。
   */
  meta: string
}

/**
 * 各省最近抽选的展示行。
 */
export type DrawCellRow = {
  /**
   * 行身份(两位省码)。
   */
  key: string

  /**
   * 省全名。
   */
  provName: string

  /**
   * 两位省码灰注。
   */
  provCode: string

  /**
   * 抽选日期。
   */
  date: string

  /**
   * 官方通道原名(经 streamDisplay 取过显示名;放不下换行不截)。
   */
  stream: string

  /**
   * 邀请数成句(官方缺位就是那根横杠)。
   */
  inv: string

  /**
   * 邀请数排序键。
   */
  invSort: number | null

  /**
   * 分数线成句(官方缺位就是那根横杠)。
   */
  score: string

  /**
   * 分数线排序键。
   */
  scoreSort: number | null

  /**
   * 手机卡的「邀请数」标。
   */
  invLabel: string
}

/**
 * 一列的声明(与 table 域的 Col 同形,本域自己声明)。
 */
export type PlanCol<T> = {
  /**
   * 列身份。
   */
  key: string

  /**
   * 表头文案。
   */
  label: React.ReactNode

  /**
   * 单元格渲染。
   */
  render?: (r: T) => React.ReactNode

  /**
   * 排序取值器;提供才可排序。
   */
  sort?: (r: T) => string | number | null

  /**
   * 单元格不换行。
   */
  nowrap?: boolean

  /**
   * 显式列宽(百分比)。
   */
  width?: string

  /**
   * 数字列右对齐。
   */
  align?: 'left' | 'right'
}

/**
 * 一行的身份取值器(表格与 React key 共用)。
 */
export type RowKeyFn<T> = (r: T) => string

/**
 * gateChipOf 的入参。
 */
export type GateChipIn = {
  /**
   * 通道 key(闸的细分要按它查策略文件)。
   */
  pathKey: string

  /**
   * 被哪道闸卡住。
   */
  blocked: string
}

/**
 * 通道取名的入参(初评表行与省外提示行共用一份)。
 */
export type RouteNameIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(中文态还要再剥一次「XX省 」前缀)。
   */
  lang: PlanLang

  /**
   * 通道 key。
   */
  key: string

  /**
   * 显示省名(剥省名前缀要它)。
   */
  provinceLabel: string
}

/**
 * provDispOf 与 makeProvDisp 的入参。
 */
export type ProvDispIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 两位省码。
   */
  code: string
}

/**
 * makeProvDisp 的入参(取名函数交给条件格网格与估分线卡)。
 */
export type ProvDispMakeIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * occNameOf 的入参。
 */
export type OccNameIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(名字缓存按语言分格)。
   */
  lang: PlanLang

  /**
   * 5 位职业码。
   */
  code: string

  /**
   * 已经补全到手的冷门职业名。
   */
  titles: Record<string, string>
}

/**
 * occTextOf 的入参。
 */
export type OccTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 档案里选的全部职业码。
   */
  nocs: string[]

  /**
   * 已经补全到手的冷门职业名。
   */
  titles: Record<string, string>
}

/**
 * choiceTextOf 的入参。
 */
export type ChoiceTextIn = {
  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 题名(字段库的字段名)。
   */
  name: string

  /**
   * 界面语言。
   */
  lang: PlanLang
}

/**
 * 条件格分组的五个小类别(组序 = 书写顺序,组内 = 题序;两者都不随答案变动而跳)。
 * 键 = 类别代号(who/edu/lang/work/goal),值 = 该出的显示名。
 */
export type SummaryGroups = Record<string, string>

/**
 * 条件格清单的入参。
 */
export type SummaryRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 已经补全到手的冷门职业名。
   */
  titles: Record<string, string>

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 分值卡回报的逐题答案回显。
   */
  echo: ScoreEchoRow[]
}

/**
 * 一道基础题的条件格入参。
 */
export type BasicRowIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 题名(字段库的字段名,同时也是这一格的 key)。
   */
  name: string

  /**
   * 小类别。
   */
  group: string

  /**
   * 题面的文案键。
   */
  labelKey: string
}

/**
 * 目标省那一格取值的入参。
 */
export type ProvValueIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 答案档。
   */
  bands: PlanAnswers
}

/**
 * 按分组稳定排序的入参。
 */
export type SortedRowsIn = {
  /**
   * 全部条件格。
   */
  rows: SummaryRow[]

  /**
   * 组序。
   */
  order: string[]
}

/**
 * 一行的门槛状态取键入参。
 */
export type StateKeyIn = {
  /**
   * 服务端下发的这一条通道。
   */
  row: ProfilePath

  /**
   * 这条通道自己的「拿到 offer 即可申请」说法;null = 用通用键。
   */
  afterOfferOkKey: string | null
}

/**
 * 在招岗数取值的入参。
 */
export type JobsOfIn = {
  /**
   * 服务端下发的这一条通道。
   */
  row: ProfilePath

  /**
   * 本地那份职业分省竞争(旧响应没带 jobsN 时的退路);null = 还没取到。
   */
  occComp: PlanOccComp[] | null
}

/**
 * 洗一行展示行的入参。
 */
export type PlanCellRowIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 服务端下发的这一条通道。
   */
  row: ProfilePath

  /**
   * 名次序号(0 起)。
   */
  index: number

  /**
   * 本地那份职业分省竞争(退路)。
   */
  occComp: PlanOccComp[] | null

  /**
   * 档案里的 5 位职业码(拼「查岗位」的多值参数)。
   */
  planNocs: string[]

  /**
   * 当前职业码(拼「查雇主」的在招口径)。
   */
  noc: string

  /**
   * 这一行是不是带岗态补的「本岗所在省」行。
   */
  extra: boolean
}

/**
 * 洗整张展示表的入参。
 */
export type PlanCellRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 服务端下发的全部通道(已排好序,客户端只渲染不重排)。
   */
  paths: ProfilePath[]

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 粗筛态(只答了职业)。
   */
  coarse: boolean

  /**
   * 本地那份职业分省竞争(退路)。
   */
  occComp: PlanOccComp[] | null

  /**
   * 档案里的 5 位职业码。
   */
  planNocs: string[]

  /**
   * 当前职业码。
   */
  noc: string
}

/**
 * 缺口胶囊的入参。
 */
export type GapPillsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一行的判定事实。
   */
  f: PlanRowFacts
}

/**
 * 初评表列组的入参。
 */
export type PlanColsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 粗筛态(门槛两列不出)。
   */
  coarse: boolean
}

/**
 * 竞争表列组的入参。
 */
export type CompColsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前年份筛选;'' = 现行口径。
   */
  year: string

  /**
   * 库行带没带学签/工签拆分字段(没带就退回单列合计)。
   */
  hasSplit: boolean

  /**
   * 存量快照月(全表一致 → 进表头灰字)。
   */
  stockAsOf: string | null

  /**
   * 现行口径的存量快照月。
   */
  poolAsOf: string | null

  /**
   * 现行口径的流量区间。
   */
  flowPeriod: string | null

  /**
   * 年份视图的流量区间。
   */
  yearFlowPeriod: string | null
}

/**
 * 职业竞争表列组的入参。
 */
export type OccColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 抽选表列组的入参。
 */
export type DrawColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 按年取一格数的入参(格值与排序共用一套:缺位 null → 显「—」、排序沉底)。
 */
export type YearCellIn = {
  /**
   * 年份键。
   */
  year: string

  /**
   * 存量的哪一格(学签 / 工签)。
   */
  kind: 'study' | 'work'
}

/**
 * 按年取值的排序取值器工厂入参。
 */
export type YearSortIn = {
  /**
   * 年份键;'' = 现行口径,走库行自带的那几格。
   */
  year: string
}

/**
 * 分值卡初值的入参。
 */
export type ScoreInitialIn = {
  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 这批官方表有没有把经验拆成「近 5 年 / 6-10 年」。
   */
  hasSplitWork: boolean
}

/**
 * 分值卡选项范围的入参。
 */
export type ScoreLimitsIn = {
  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 这批官方表有没有把经验拆成两段。
   */
  hasSplitWork: boolean
}

/**
 * 分值卡选项范围(基础卷问过**范围**的条件,精确题只在范围内出选项)。
 */
export type ScoreLimits = {
  /**
   * 第一语言 CLB 的可选值域;缺席 = 不限。
   */
  clb1?: number[]

  /**
   * 近段经验年数的可选值域;缺席 = 不限。
   */
  expRecent?: number[]

  /**
   * 远段经验年数的可选值域;缺席 = 不限。
   */
  expOlder?: number[]
}

/**
 * 分值卡岗位语境的入参。
 */
export type ScoreCtxIn = {
  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 当前职业码。
   */
  noc: string

  /**
   * 这一批题算的是哪个省。
   */
  province: string
}

/**
 * 分值卡重挂键的入参(键一变 = 重挂 = 答案清零,所以只放真该重来的那几格)。
 */
export type ScoreKeyIn = {
  /**
   * 带岗进来那份工作;null = 无岗态用固定首段。
   */
  tvJob: TvJob | null

  /**
   * 有分值表的所选省。
   */
  provinces: string[]

  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 当前页签省的官方因素行。
   */
  factors: PlanScoreFactor[]
}

/**
 * 重算边界的入参(bands 对象每次写答案都换引用,不能直接作依赖 —— 这里刻意收窄)。
 */
export type PathInputKeyIn = {
  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 加分项勾选表。
   */
  ticks: Record<string, boolean>

  /**
   * 直选档位与时薪。
   */
  rowsAns: ScoreRowsAnswer
}

/**
 * 登录闸的面板。
 */
export type AuthGatePanel = {
  /**
   * 登录了没有;null = 还没问回来(闸先关,加载区占位,不闪答题卡)。
   */
  me: boolean | null

  /**
   * 注册/登录完成后就地放行。
   */
  setMe: (v: boolean) => void
}

/**
 * 答案态的面板(答案唯一来源是 lib/quiz 的答案档,这里只是它在页面上的投影)。
 */
export type AnswerStatePanel = {
  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 写回答案档之后同步页面(写档本身走 lib/quiz)。
   */
  setBands: (a: PlanAnswers) => void

  /**
   * 当前职业码(档案里的第一个)。
   */
  noc: string

  /**
   * 换当前职业码。
   */
  setNoc: (v: string) => void

  /**
   * 停在选职业页。
   */
  occStep: boolean

  /**
   * 切选职业页。
   */
  setOccStep: (v: boolean) => void

  /**
   * 停在选目标省页。
   */
  provinceStep: boolean

  /**
   * 切选目标省页。
   */
  setProvinceStep: (v: boolean) => void

  /**
   * 本地答案读完没有(没读完不许渲判定面板 —— 会闪一下再被答题卡顶掉)。
   */
  ready: boolean

  /**
   * 标记本地答案已读完。
   */
  setReady: (v: boolean) => void

  /**
   * 本地答案 → 页面状态的重建(挂载、服务端档拉回、注册闸放行三处共用一套)。
   */
  refresh: () => PlanAnswers
}

/**
 * 问卷动线的面板。
 */
export type QuizFlowPanel = {
  /**
   * 问卷弹框开着没有。
   */
  open: boolean

  /**
   * 开关问卷弹框。
   */
  setOpen: (v: boolean) => void

  /**
   * 停在估分段。
   */
  scoreStep: boolean

  /**
   * 切估分段。
   */
  setScoreStep: (v: boolean) => void

  /**
   * 基础题直达哪道题;'' = 落在第一道没答的题。
   */
  focus: string

  /**
   * 换基础题落点。
   */
  setFocus: (v: string) => void

  /**
   * 从后续步骤返回时回到基础题最后一题。
   */
  atEnd: boolean

  /**
   * 换基础题起步位。
   */
  setAtEnd: (v: boolean) => void

  /**
   * 清空答案的重挂序号。
   */
  resetNonce: number

  /**
   * 清空答案后重挂答题控件。
   */
  bumpReset: () => void

  /**
   * 判定重算序号。
   */
  verdictNonce: number

  /**
   * 让判定重算一次。
   */
  bumpVerdict: () => void

}

/**
 * 题区的两把量尺。**单独一格摆着**,不混进问卷动线:ref 不是渲染要用的值,
 * 与状态混在一个对象里,读它旁边那格状态都会被 react-hooks/refs 判成「渲染期读 ref」。
 */
export type QuizPadPanel = {
  /**
   * 题区容器(把题区顶回视口时量它)。
   */
  padRef: React.RefObject<HTMLDivElement | null>

  /**
   * 这一轮展开之后有没有已经对齐过一次(首次展开保持页面原位,只有翻题才对齐)。
   */
  shownRef: React.RefObject<boolean>
}

/**
 * 估分段的面板。
 */
export type ScoreStatePanel = {
  /**
   * 分值卡报上来的题数;null = 它还没报过(不能用 0/0 兜底,那和「一道题都没有」长得一样)。
   */
  progress: ScoreProgress | null

  /**
   * 收分值卡的题数回报。
   */
  setProgress: (v: ScoreProgress | null) => void

  /**
   * 分值表逐题答案回显。
   */
  echo: ScoreEchoRow[]

  /**
   * 收分值卡的答案回显。
   */
  setEcho: (v: ScoreEchoRow[]) => void

  /**
   * 加分项勾选(随请求上行,服务端按它算分)。
   */
  ticks: Record<string, boolean>

  /**
   * 同步加分项勾选。
   */
  setTicks: (v: Record<string, boolean>) => void

  /**
   * 直选的官方档位与时薪。
   */
  rowsAns: ScoreRowsAnswer

  /**
   * 同步直选档位与时薪。
   */
  setRowsAns: (v: ScoreRowsAnswer) => void

  /**
   * 估分卡当前页签省(估分弹框只出这个省的题)。
   */
  prov: string

  /**
   * 换估分卡页签省。
   */
  setProv: (v: string) => void

  /**
   * 分值题直达落点;null = 落在第一题。
   */
  focus: ScoreFocus | null

  /**
   * 换分值题落点(nonce 自增,点同一格第二次也跳)。
   */
  bumpFocus: (key: string) => void

  /**
   * 官方分值表与抽选记录;null = 还没取到。
   */
  tables: ScoreTables | null

  /**
   * 收懒取回来的分值表。
   */
  setTables: (v: ScoreTables | null) => void
}

/**
 * 冷门职业名补全的面板。
 */
export type NocTitlesPanel = {
  /**
   * 已经补全到手的名字,键 = `<语言>:<职业码>`。
   */
  titles: Record<string, string>
}

/**
 * 初评结果的面板。
 */
export type PathsPanel = {
  /**
   * 服务端下发的通道行;null = 还没回来(此时出占位条,不出空表)。
   */
  paths: ProfilePath[] | null

  /**
   * 省外更优的那一条;null = 没有。
   */
  outside: OutsidePath | null
}

/**
 * 该职业分省竞争的面板。
 */
export type OccCompPanel = {
  /**
   * 分省竞争行;null = 还没取到。
   */
  rows: PlanOccComp[] | null

  /**
   * 这张表当前看的是哪个职业;'' = 跟着全页当前职业。
   */
  noc: string

  /**
   * 换这张表的职业(只切这张表的查询,不动全页职业语境)。
   */
  setNoc: (v: string) => void
}

/**
 * 竞争卡年份筛选的面板。
 */
export type CompYearPanel = {
  /**
   * 当前年份;'' = 现行口径(今天这张表)。
   */
  year: string

  /**
   * 点某个年份的手柄工厂(再点一次回现行口径)。
   */
  pickOf: (year: string) => ClickFn
}

/**
 * 两段计数与门控的面板。
 */
export type ProgressPanel = {
  /**
   * 基础卷的题名清单(按题级显隐过滤后的)。
   */
  stepNames: string[]

  /**
   * 基础段总步数(题数 + 选职业 + 选目标省)。
   */
  stepTotal: number

  /**
   * 基础段已答几步。
   */
  stepDone: number

  /**
   * 目标省答过没有(「还不确定」也算答过 —— 它跟「没答」不是一回事)。
   */
  provAnswered: boolean

  /**
   * 估分段已答几题。
   */
  scoreDone: number

  /**
   * 估分段一共几题。
   */
  scoreTotal: number

  /**
   * 估分段还欠几题。
   */
  scoreLeft: number

  /**
   * 估分段还有没答的题(题数没报上来 = 还不知道,不算「有欠账」)。
   */
  scorePending: boolean

  /**
   * 基础卷答满了没有(分值卡门控)。
   */
  quizComplete: boolean

  /**
   * 整份问卷答满了没有。
   */
  allDone: boolean

  /**
   * 两段合计已答。
   */
  doneAll: number

  /**
   * 两段合计总数。
   */
  totalAll: number
}

/**
 * 全页手柄的面板。
 */
export type ActsPanel = {
  /**
   * 关整个问卷弹框。
   */
  closeQuiz: ClickFn

  /**
   * 打开问卷:不带 key 落在第一道没答的题,带 key 直达那道题。
   */
  startQuiz: EditFn

  /**
   * 不带 key 的入口钮手柄(钮会把鼠标事件当第一个实参递进来,不能直接接 startQuiz)。
   */
  openQuiz: ClickFn

  /**
   * 打开问卷并直接落在估分段。
   */
  openScoreStep: ClickFn

  /**
   * 基础卷的「完成」旁路(改一个答案不用再翻完全卷)。
   */
  finishQuiz: ClickFn

  /**
   * 答完基础卷:落档 + 翻进估分段。
   */
  onQuizDone: ClickFn

  /**
   * 清空全部答案。
   */
  resetQuiz: ClickFn

  /**
   * 把岗位所在省并进目标省。
   */
  addJobProv: ClickFn

  /**
   * 把省外更优的那个省并进目标省。
   */
  addOutsideProv: ClickFn

  /**
   * 收分值卡的题数回报。
   */
  onScoreProgress: (progress: ScoreProgress) => void

  /**
   * 收分值卡的答案回显(顺带把统一答案读回页面 —— 分值卡答学历/年龄会写回答案档)。
   */
  onScoreAnswers: (rows: ScoreEchoRow[]) => void

  /**
   * 估分答完 = 整卷答完,收框显示各省结果。
   */
  onScoreComplete: ClickFn

  /**
   * 估分段第一屏的「返回」= 回到省份页,同一弹框内往回翻。
   */
  onScoreBack: ClickFn

  /**
   * 注册/登录完成:放行并落档浏览器里已答的旧答案。
   */
  onAuthDone: ClickFn

  /**
   * 关掉注册弹框 = 放弃答题。
   */
  onAuthClose: ClickFn

  /**
   * 带岗态判定卡里的「建档案」。
   */
  onBuildProfile: ClickFn

  /**
   * 选职业控件的逐次变更。
   */
  onOccChange: (nocs: string[]) => void

  /**
   * 选职业控件的收页。
   */
  onOccDone: (nocs: string[]) => void

  /**
   * 选目标省控件的逐次变更。
   */
  onProvChange: (provs: string[]) => void

  /**
   * 选目标省控件的「完成」旁路。
   */
  onProvFinish: (provs: string[], any?: boolean) => void

  /**
   * 选目标省控件的收页。
   */
  onProvDone: (provs: string[], any?: boolean) => void

  /**
   * 选目标省页回到上一步。
   */
  onProvBack: ClickFn

  /**
   * 基础题第一题的「上一题」出口 = 回选职业页。
   */
  onQuizBack: ClickFn

  /**
   * 基础题的逐题写答案。
   */
  onQuizPatch: (patch: Partial<PlanAnswers>) => void

  /**
   * 基础题答完 → 翻到选目标省页。
   */
  onQuizComplete: ClickFn

  /**
   * 估分线卡的「改答案」(答满基础卷就落估分段,否则落基础段)。
   */
  onScoreEdit: ClickFn

  /**
   * 估分线卡的「选省份」(落的是基础卷同一道省份题)。
   */
  onPickProv: ClickFn
}

/**
 * useDecisionPage 的入参(SSR 直出的三份事实随 props 进来,派生表要按它们算)。
 */
export type DecisionPageIn = {
  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 各省最近一轮抽选。
   */
  overview: OverviewDraw[]

  /**
   * 每省近 6 轮有分数的抽选。
   */
  drawsRecent: PlanDraw[]

  /**
   * 各省名额竞争。
   */
  competition: PlanCompetition[]
}

/**
 * 决策页整机的面板(各分机器并列摆着,谁负责哪一格一眼看得清)。
 */
export type DecisionPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 登录闸。
   */
  auth: AuthGatePanel

  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 问卷动线。
   */
  flow: QuizFlowPanel

  /**
   * 题区的两把量尺。
   */
  pad: QuizPadPanel

  /**
   * 估分段。
   */
  score: ScoreStatePanel

  /**
   * 冷门职业名补全。
   */
  titles: NocTitlesPanel

  /**
   * 初评结果。
   */
  paths: PathsPanel

  /**
   * 该职业分省竞争。
   */
  occComp: OccCompPanel

  /**
   * 竞争卡年份筛选。
   */
  compYear: CompYearPanel

  /**
   * 两段计数与门控。
   */
  progress: ProgressPanel

  /**
   * 全页手柄。
   */
  acts: ActsPanel

  /**
   * 各块的派生视图(纯派生,零状态)。
   */
  view: PlanView

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null
}

/**
 * 各块的派生视图:纯派生一次算完,组件只读不算(「判定/分数全来自确定性层,本页不算一个数」)。
 */
export type PlanView = {
  /**
   * 条件格与职业语境。
   */
  cond: CondView

  /**
   * 省与分值表语境。
   */
  prov: ProvView

  /**
   * 初评表。
   */
  plan: PlanBoardView

  /**
   * 各省名额竞争表。
   */
  comp: CompView

  /**
   * 该职业分省竞争表。
   */
  occ: OccView

  /**
   * 各省最近抽选表。
   */
  draws: DrawView

  /**
   * 分值卡的四样入参。
   */
  scoreCard: ScoreCardView
}

/**
 * 条件格与职业语境。
 */
export type CondView = {
  /**
   * 全部条件格(基础题 + 估分题,带岗态判定卡要整份)。
   */
  summaryRows: SummaryRow[]

  /**
   * 基础段的条件格(按小类别稳定排序)。
   */
  basicRows: SummaryRow[]

  /**
   * 估分段的条件格。
   */
  scoreRows: SummaryRow[]

  /**
   * 档案里的 5 位职业码(拼「查岗位」的多值参数)。
   */
  planNocs: string[]

  /**
   * 岗位职业不在档案职业里。
   */
  occMismatch: boolean

  /**
   * 该不该给「补上岗位所在省」那颗钮。
   */
  needJobProv: boolean
}

/**
 * 省与分值表语境。
 */
export type ProvView = {
  /**
   * 这一轮要看的省(带岗态就是岗位省,否则是档案里的目标省)。
   */
  selected: string[]

  /**
   * 其中有官方分值表的省。
   */
  scored: string[]

  /**
   * 本站有官方分值表的全部省。
   */
  factorProvinces: string[]

  /**
   * 当前页签省的官方因素行。
   */
  targetFactors: PlanScoreFactor[]

  /**
   * 官方分值表逐行(全部省;共用题该不该在某个省下出现要按它判)。
   */
  allFactors: PlanScoreFactor[]

  /**
   * 懒取回来的全量抽选记录。
   */
  scoreDraws: PlanDraw[]

  /**
   * 线用的抽选记录(懒取的全量优先,没有就用 SSR 那份近 6 轮)。
   */
  lineDraws: PlanDraw[]

  /**
   * 估分卡页签省序(有分值表的在前)。
   */
  lineProvinces: string[]

  /**
   * 所选省拼成的省码串(懒取分值表的参数)。
   */
  provKey: string
}

/**
 * 初评表的派生视图。
 */
export type PlanBoardView = {
  /**
   * 粗筛态(只答了职业)。
   */
  coarse: boolean

  /**
   * 洗好的展示行;null = 初评还没回来(出占位条,不出空表)。
   */
  rows: PlanCellRow[] | null

  /**
   * 榜首 0 岗(一句实话:「0 不是少,是没有」)。
   */
  topEmpty: boolean
}

/**
 * 各省名额竞争表的派生视图。
 */
export type CompView = {
  /**
   * 洗好的展示行。
   */
  rows: CompCellRow[]

  /**
   * 库行带没带学签/工签拆分字段。
   */
  hasSplit: boolean

  /**
   * 年份视图的存量快照月。
   */
  stockAsOf: string | null

  /**
   * 现行口径的存量快照月。
   */
  poolAsOf: string | null

  /**
   * 现行口径的流量区间。
   */
  flowPeriod: string | null

  /**
   * 年份视图的流量区间。
   */
  yearFlowPeriod: string | null

  /**
   * 本站这批数据的生成日(脚注一行说完)。
   */
  generated: string
}

/**
 * 该职业分省竞争表的派生视图。
 */
export type OccView = {
  /**
   * 洗好的展示行。
   */
  rows: OccCellRow[]
}

/**
 * 各省最近抽选表的派生视图。
 */
export type DrawView = {
  /**
   * 洗好的展示行。
   */
  rows: DrawCellRow[]
}

/**
 * 分值卡的四样入参。
 */
export type ScoreCardView = {
  /**
   * 重挂键(一变就重挂 = 答案清零,所以只放真该重来的那几格)。
   */
  key: string

  /**
   * 岗位语境。
   */
  ctx: ScoreContext

  /**
   * 答案预填(同一个条件不问两遍)。
   */
  initial: Partial<PlanSelfProfile>

  /**
   * 选项范围(基础卷问过范围的条件,精确题只在范围内出选项)。
   */
  limits: ScoreLimits

  /**
   * 基础卷已经问过、分值段不再问的那几项。
   */
  hidden: (keyof PlanSelfProfile)[]

  /**
   * 这一批题算的是哪个省(分值卡的通道对照要它)。
   */
  contextProvince: string
}

/**
 * Decision(决策页正文)的 props。
 */
export type DecisionIn = {
  /**
   * 各省最近一轮抽选(SSR 直出的免费硬事实)。
   */
  overview: OverviewDraw[]

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 每省近 6 轮有分数的抽选(SSR 直出)。估分卡的线**不许**等答完题才有 ——
   * 懒取那份只在答满全卷后才发请求,于是「选了省却看不到线」(2026-08-16 生产实撞)。
   */
  drawsRecent?: PlanDraw[]

  /**
   * 各省名额竞争(松→紧);与抽选表并列的第二条免费硬事实。
   */
  competition?: PlanCompetition[]

  /**
   * 服务端取好的热门职业榜 → 选职业控件一次成型,不再分段刷。
   */
  topNocs?: TopNoc[]

  /**
   * 服务端先算好的判定卡(首屏不出骨架);客户端带本地答案再刷一次。
   */
  initialVerdict?: unknown
}

/**
 * ConditionsCard(申请人条件摘要卡)的 props。
 */
export type ConditionsCardIn = {
  /**
   * 决策页整机(基础段的条件格在它的 view 里 —— 估分题已随结论并进「估分与抽选线」那张卡)。
   */
  d: DecisionPanel
}

/**
 * CountPill(计数胶囊)的 props。
 */
export type CountPillIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 已答几项。
   */
  done: number

  /**
   * 一共几项。
   */
  total: number
}

/**
 * PlanCard(可行通道初评卡)的 props。
 */
export type PlanCardIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel
}

/**
 * PlanHead(初评卡标题行)的 props。
 */
export type PlanHeadIn = {
  /**
   * 决策页整机(粗筛态与两处错位判据都在它的 view 里)。
   */
  d: DecisionPanel
}

/**
 * PlanBoard(初评表与手机卡两份 + 三段脚注)的 props。
 */
export type PlanBoardIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel

  /**
   * 洗好的展示行。
   */
  rows: PlanCellRow[]
}

/**
 * PlanCards / PlanTable 共用的 props。
 */
export type PlanRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 洗好的展示行。
   */
  rows: PlanCellRow[]

  /**
   * 粗筛态。
   */
  coarse: boolean
}

/**
 * PlanCardRow(一张初评手机卡)的 props。
 */
export type PlanCardRowIn = {
  /**
   * 这一行展示行。
   */
  r: PlanCellRow

  /**
   * 粗筛态(粗筛不出胶囊排 —— 没答条件,判定本来就出不来)。
   */
  coarse: boolean
}

/**
 * 单元格只收一行展示行(表格的 render 签名由 table 域定死)。
 */
export type PlanCellIn = PlanCellRow

/**
 * PillText(一枚推荐原因胶囊)的 props。
 */
export type PillTextIn = {
  /**
   * 这枚胶囊。
   */
  p: Pill
}

/**
 * OutsideNote(省外更优提示行)的 props。
 */
export type OutsideNoteIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel

  /**
   * 省外更优的那一条。
   */
  outside: OutsidePath
}

/**
 * CompetitionCard(各省名额竞争卡)的 props。
 */
export type CompetitionCardIn = {
  /**
   * 决策页整机(洗好的展示行在它的 view 里)。
   */
  d: DecisionPanel
}

/**
 * 竞争表两份视图共用的 props。
 */
export type CompetitionRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 洗好的展示行。
   */
  rows: CompCellRow[]

  /**
   * 当前年份;'' = 现行口径。
   */
  year: string

  /**
   * 库行带没带学签/工签拆分字段。
   */
  hasSplit: boolean

  /**
   * 存量快照月(年份视图)。
   */
  stockAsOf: string | null

  /**
   * 现行口径的存量快照月。
   */
  poolAsOf: string | null

  /**
   * 现行口径的流量区间。
   */
  flowPeriod: string | null

  /**
   * 年份视图的流量区间。
   */
  yearFlowPeriod: string | null
}

/**
 * CompetitionCardRow(一张竞争手机卡)的 props。
 */
export type CompetitionCardRowIn = {
  /**
   * 这一行展示行。
   */
  r: CompCellRow
}

/**
 * ProvCell(省名 + 省码)的 props。
 */
export type ProvCellIn = {
  /**
   * 省全名。
   */
  name: string

  /**
   * 两位省码。
   */
  code: string
}

/**
 * HeadSub(带灰字小注的表头)的 props。
 */
export type HeadSubIn = {
  /**
   * 主表头词。
   */
  main: React.ReactNode

  /**
   * 灰字小注;null = 不出小注。
   */
  sub: string | null
}

/**
 * YearChips(竞争卡年份筛选)的 props。
 */
export type YearChipsIn = {
  /**
   * 竞争卡年份筛选面板。
   */
  compYear: CompYearPanel
}

/**
 * OccCompCard(该职业分省竞争卡)的 props。
 */
export type OccCompCardIn = {
  /**
   * 决策页整机(洗好的展示行在它的 view 里)。
   */
  d: DecisionPanel
}

/**
 * 职业竞争两份视图共用的 props。
 */
export type OccCompRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 洗好的展示行。
   */
  rows: OccCellRow[]
}

/**
 * OccCompCardRow(一张职业竞争手机卡)的 props。
 */
export type OccCompCardRowIn = {
  /**
   * 这一行展示行。
   */
  r: OccCellRow
}

/**
 * OccChips(职业切换 chips)的 props。
 */
export type OccChipsIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel
}

/**
 * DrawsCard(各省最近抽选卡)的 props。
 */
export type DrawsCardIn = {
  /**
   * 决策页整机(洗好的展示行在它的 view 里)。
   */
  d: DecisionPanel
}

/**
 * 抽选两份视图共用的 props。
 */
export type DrawRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 洗好的展示行。
   */
  rows: DrawCellRow[]
}

/**
 * DrawsCardRow(一张抽选手机卡)的 props。
 */
export type DrawsCardRowIn = {
  /**
   * 这一行展示行。
   */
  r: DrawCellRow
}

/**
 * QuizSection(问卷弹框整段)的 props。
 */
export type QuizSectionIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel

  /**
   * 热门职业榜(选职业控件首帧即终态,一个请求都不发)。
   */
  topNocs: TopNoc[]
}

/**
 * QuizHead(弹框头:标题 + 省名 + 计数 + 进度条)的 props。
 */
export type QuizHeadIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel
}

/**
 * QuizTools(弹框右上角的重置与关闭)的 props。
 */
export type QuizToolsIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel
}

/**
 * QuizSteps(基础段三页:选职业 / 选目标省 / 逐题)的 props。
 */
export type QuizStepsIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel

  /**
   * 热门职业榜。
   */
  topNocs: TopNoc[]
}

/**
 * ScoreSection(估分与抽选线整段)的 props。
 */
export type ScoreSectionIn = {
  /**
   * 决策页整机(页签省序、线、通道行、条件格全在它的 view 里)。
   */
  d: DecisionPanel

  /**
   * 问卷弹框壳 + 分值卡实例(常驻,不搬树 —— 搬容器 = 重挂 = 答案清零)。
   */
  children: React.ReactNode
}

/**
 * makeScoreTiles / makeNoGridNote / makePendingOf 的入参。
 */
export type ProvRenderIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel
}

/**
 * 共用估分题该不该在某个省下出现的入参。
 */
export type SharedFactorIn = {
  /**
   * 这道题的 key。
   */
  key: string

  /**
   * 这个省。
   */
  province: string

  /**
   * 官方分值表逐行。
   */
  factors: PlanScoreFactor[]
}

/**
 * 手柄工厂里要写的那几格状态。
 */
export type ActsIn = {
  /**
   * 取词函数不进来 —— 手柄不出文案。这里只要各分机器。
   */
  auth: AuthGatePanel

  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 问卷动线。
   */
  flow: QuizFlowPanel

  /**
   * 估分段。
   */
  score: ScoreStatePanel

  /**
   * 两段计数与门控。
   */
  progress: ProgressPanel

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 省外更优的那一条;null = 没有。
   */
  outside: OutsidePath | null
}

/**
 * 打开问卷时该落在哪一段的入参。
 */
export type StartQuizIn = {
  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 问卷动线。
   */
  flow: QuizFlowPanel

  /**
   * 估分段。
   */
  score: ScoreStatePanel

  /**
   * 两段计数与门控。
   */
  progress: ProgressPanel
}

/**
 * 清空答案的入参。
 */
export type ResetQuizIn = {
  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 问卷动线。
   */
  flow: QuizFlowPanel

  /**
   * 估分段。
   */
  score: ScoreStatePanel
}

/**
 * 把某个省并进目标省的入参。
 */
export type AddProvIn = {
  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 问卷动线(并完要让判定重算一次)。
   */
  flow: QuizFlowPanel

  /**
   * 要并进来的两位省码。
   */
  province: string

  /**
   * 这次并省记哪个埋点。
   */
  event: string
}

/**
 * 收分值卡回报时同步存档的入参。
 */
export type SyncScoreStoreIn = {
  /**
   * 估分段。
   */
  score: ScoreStatePanel
}

/**
 * 冷门职业名补全的入参。
 */
export type NocTitlesIn = {
  /**
   * 档案里选的全部职业码。
   */
  nocs: string[]

  /**
   * 界面语言(名字缓存按语言分格)。
   */
  lang: PlanLang
}

/**
 * 初评取数的入参。
 */
export type PathsIn = {
  /**
   * 本地答案读完没有。
   */
  ready: boolean

  /**
   * 当前职业码;'' = 还没选职业,不发请求。
   */
  noc: string

  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 加分项勾选。
   */
  ticks: Record<string, boolean>

  /**
   * 直选档位与时薪。
   */
  rowsAns: ScoreRowsAnswer
}

/**
 * 分值表懒取的入参。
 */
export type ScoreTablesIn = {
  /**
   * 估分段(取回来写进它的 tables)。
   */
  score: ScoreStatePanel

  /**
   * 所选省拼成的省码串;'' = 一个省都没选。
   */
  provKey: string

  /**
   * 基础卷答满了没有。
   */
  quizComplete: boolean

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null
}

/**
 * 该职业分省竞争取数的入参。
 */
export type OccCompIn = {
  /**
   * 全页当前职业码。
   */
  noc: string
}

/**
 * 挂载与登录态同步的入参。
 */
export type MountSyncIn = {
  /**
   * 登录闸。
   */
  auth: AuthGatePanel

  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 问卷动线。
   */
  flow: QuizFlowPanel

  /**
   * 估分段。
   */
  score: ScoreStatePanel

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null
}

/**
 * 弹框外壳行为(Esc 退出、题区回视口、两处兜底收框)的入参。
 */
export type QuizChromeIn = {
  /**
   * 问卷动线。
   */
  flow: QuizFlowPanel

  /**
   * 题区的两把量尺。
   */
  pad: QuizPadPanel

  /**
   * 估分段。
   */
  score: ScoreStatePanel

  /**
   * 两段计数与门控(翻题时把题区顶回视口要看它)。
   */
  progress: ProgressPanel

  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 所选省拼成的省码串。
   */
  provKey: string

  /**
   * 当前页签省的官方因素行(一条都没有 = 这一段出不了题)。
   */
  factors: PlanScoreFactor[]
}

/**
 * 两段计数与门控的入参。
 */
export type ProgressIn = {
  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 估分段。
   */
  score: ScoreStatePanel
}

/**
 * planViewOf 的入参:各分机器 + SSR 直出的三份事实。
 */
export type PlanViewIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 估分段。
   */
  score: ScoreStatePanel

  /**
   * 冷门职业名补全。
   */
  titles: NocTitlesPanel

  /**
   * 初评结果。
   */
  paths: PathsPanel

  /**
   * 该职业分省竞争。
   */
  occComp: OccCompPanel

  /**
   * 竞争卡年份筛选。
   */
  compYear: CompYearPanel

  /**
   * 两段计数与门控。
   */
  progress: ProgressPanel

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 各省最近一轮抽选。
   */
  overview: OverviewDraw[]

  /**
   * 每省近 6 轮有分数的抽选。
   */
  drawsRecent: PlanDraw[]

  /**
   * 各省名额竞争。
   */
  competition: PlanCompetition[]
}

/**
 * 条件格与职业语境的入参。
 */
export type CondViewIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 已经补全到手的冷门职业名。
   */
  titles: Record<string, string>

  /**
   * 分值卡回报的逐题答案回显。
   */
  echo: ScoreEchoRow[]

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null
}

/**
 * 省与分值表语境的入参。
 */
export type ProvViewIn = {
  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 官方分值表与抽选记录;null = 还没取到。
   */
  tables: ScoreTables | null

  /**
   * 估分卡当前页签省。
   */
  activeProv: string

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 每省近 6 轮有分数的抽选(线的退路)。
   */
  drawsRecent: PlanDraw[]
}

/**
 * 初评表派生视图的入参。
 */
export type PlanBoardViewIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 服务端下发的通道行;null = 还没回来。
   */
  paths: ProfilePath[] | null

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 基础卷答满了没有(没答满 = 粗筛态)。
   */
  quizComplete: boolean

  /**
   * 本地那份职业分省竞争(在招数的退路)。
   */
  occComp: PlanOccComp[] | null

  /**
   * 档案里的 5 位职业码。
   */
  planNocs: string[]

  /**
   * 当前职业码。
   */
  noc: string
}

/**
 * 各省名额竞争表派生视图的入参。
 */
export type CompViewIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省名取名函数。
   */
  provDisp: ProvDispFn

  /**
   * 各省名额竞争行。
   */
  competition: PlanCompetition[]

  /**
   * 当前年份;'' = 现行口径。
   */
  year: string
}

/**
 * 洗一行竞争展示行的入参。
 */
export type CompCellRowIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省名取名函数。
   */
  provDisp: ProvDispFn

  /**
   * 这一行事实。
   */
  r: PlanCompetition

  /**
   * 当前年份;'' = 现行口径。
   */
  year: string
}

/**
 * 该职业分省竞争派生视图的入参。
 */
export type OccViewIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省名取名函数。
   */
  provDisp: ProvDispFn

  /**
   * 分省竞争行;null = 还没取到。
   */
  occComp: PlanOccComp[] | null
}

/**
 * 洗一行职业竞争展示行的入参。
 */
export type OccCellRowIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省名取名函数。
   */
  provDisp: ProvDispFn

  /**
   * 这一行事实。
   */
  r: PlanOccComp
}

/**
 * 各省最近抽选派生视图的入参。
 */
export type DrawViewIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省名取名函数。
   */
  provDisp: ProvDispFn

  /**
   * 各省最近一轮抽选。
   */
  overview: OverviewDraw[]
}

/**
 * 洗一行抽选展示行的入参。
 */
export type DrawCellRowIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省名取名函数。
   */
  provDisp: ProvDispFn

  /**
   * 这一行事实。
   */
  r: OverviewDraw
}

/**
 * 分值卡四样入参的入参。
 */
export type ScoreCardViewIn = {
  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 带岗进来那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 当前职业码。
   */
  noc: string

  /**
   * 省与分值表语境。
   */
  prov: ProvView
}

/**
 * 榜首 0 岗判据的入参。
 */
export type TopEmptyIn = {
  /**
   * 服务端下发的通道行;null = 还没回来。
   */
  paths: ProfilePath[] | null

  /**
   * 本地那份职业分省竞争(退路)。
   */
  occComp: PlanOccComp[] | null
}

/**
 * 洗一行展示行时取各格成句的入参。
 */
export type PlanRowTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 服务端下发的这一条通道。
   */
  row: ProfilePath

  /**
   * 名次序号(0 起)。
   */
  index: number

  /**
   * 这一行是不是带岗态补的「本岗所在省」行。
   */
  extra: boolean

  /**
   * 通道显示名。
   */
  routeName: string

  /**
   * 在招岗数;null = 无岗位级口径。
   */
  jobsN: number | null
}

/**
 * 门槛状态成句的入参。
 */
export type StateTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 服务端下发的这一条通道。
   */
  row: ProfilePath
}

/**
 * 「查岗位」去处的入参。
 */
export type JobsHrefIn = {
  /**
   * 服务端下发的这一条通道。
   */
  row: ProfilePath

  /**
   * 档案里的 5 位职业码。
   */
  planNocs: string[]
}

/**
 * 「查雇主」去处的入参。
 */
export type EmpHrefIn = {
  /**
   * 服务端下发的这一条通道。
   */
  row: ProfilePath

  /**
   * 当前职业码。
   */
  noc: string
}

/**
 * 单元格工厂的入参:从展示行里挑哪一格的字。
 */
export type MakeCellIn<T> = {
  /**
   * 取这一格的字;'' = 这一格没有数据。
   */
  pick: (r: T) => string
}

/**
 * 单元格渲染函数(签名由 table 域的列声明定死)。
 */
export type CellRenderFn<T> = (r: T) => React.ReactNode

/**
 * 该省还欠几道估分题的入参。
 */
export type PendingOfIn = {
  /**
   * 估分题的条件格。
   */
  rows: SummaryRow[]

  /**
   * 这个省。
   */
  province: string
}

/**
 * 制度名并进通道名尾巴的入参。
 */
export type ProgramParenIn = {
  /**
   * 界面语言(中文全角括号,其余半角带空格)。
   */
  lang: PlanLang

  /**
   * 剥完省名的通道名。
   */
  base: string

  /**
   * 制度名。
   */
  program: string
}

/**
 * 一行的判定事实(话怎么说、色用哪档,都从这几格推出来;胶囊两列共用同一份)。
 */
export type PlanRowFacts = {
  /**
   * 门槛状态的成句。
   */
  stateText: string

  /**
   * 被单一门槛卡住(且没低于线)。
   */
  blocked: boolean

  /**
   * 本站没收录这条通道的条文。
   */
  dataGap: boolean

  /**
   * 差的那一样(offer 按通道分)。
   */
  gapKey: string

  /**
   * 全部缺口键。
   */
  gapsAll: string[]

  /**
   * 有专业对口闸而他还没答那道题。
   */
  fieldUnknown: boolean

  /**
   * 还要攒几档时间。
   */
  waitTier: TierBand

  /**
   * 这段等待从拿到 offer 起算。
   */
  waitAfterOffer: boolean

  /**
   * 从毕业拿工签起算(#319)。
   */
  afterStudy: boolean

  /**
   * 官方原文写了 full-time。
   */
  fullTime: boolean

  /**
   * 「拿到本省 offer 即可申请」。
   */
  afterOk: boolean

  /**
   * 真正达标(这一档才给绿)。
   */
  openOk: boolean
}

/**
 * 竞争格的两行字。
 */
export type PlanCompText = {
  /**
   * 主文案;'' = 这一格没有数据。
   */
  main: string

  /**
   * 灰字小注;'' = 不出小注。
   */
  sub: string
}

/**
 * gateOfGapKey 的入参。
 */
export type GapKeyIn = {
  /**
   * 一条缺口键。
   */
  key: string

  /**
   * 本行的 offer 缺口键(要的不是同一种 offer)。
   */
  offerGate: string
}

/**
 * pushGapPill 的入参。
 */
export type PushGapIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 已收集的胶囊(就地推)。
   */
  out: Pill[]

  /**
   * 闸名。
   */
  gate: string
}

/**
 * fieldSummaryRowsOf 的入参。
 */
export type FieldRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 五个类别名。
   */
  groups: SummaryGroups

  /**
   * 这一批的题单。
   */
  specs: SummaryFieldSpec[]
}

/**
 * 条件格题单的一项。
 */
export type SummaryFieldSpec = {
  /**
   * 题名(同时也是这一格的 key)。
   */
  name: string

  /**
   * 小类别的名字(去 groups 里取显示名)。
   */
  group: string

  /**
   * 题面的文案键。
   */
  label: string

  /**
   * 这道题有没有题级显隐。
   */
  gated: boolean
}

/**
 * scoreSummaryRowsOf 的入参。
 */
export type SplitRowsIn = {
  /**
   * 全部条件格。
   */
  rows: SummaryRow[]

  /**
   * 估分题回显。
   */
  echo: ScoreEchoRow[]
}

/**
 * basicSummaryRowsOf 的入参。
 */
export type BasicRowsIn = {
  /**
   * 全部条件格。
   */
  rows: SummaryRow[]

  /**
   * 估分题回显。
   */
  echo: ScoreEchoRow[]

  /**
   * 组序。
   */
  order: string[]
}

/**
 * makeGroupCompare 的入参。
 */
export type GroupCompareIn = {
  /**
   * 组序。
   */
  order: string[]
}

/**
 * 两处不匹配判据的入参。
 */
export type MismatchIn = {
  /**
   * 带岗那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 答案档。
   */
  bands: PlanAnswers
}

/**
 * jobProvExtraOf 的入参。
 */
export type JobProvExtraIn = {
  /**
   * 全部通道行。
   */
  paths: ProfilePath[]

  /**
   * 带岗那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 已经进前几名的那几行。
   */
  shownBase: ProfilePath[]
}

/**
 * 按年取一格数的入参。
 */
export type YearRowIn = {
  /**
   * 这一行事实。
   */
  r: PlanCompetition

  /**
   * 年份键。
   */
  year: string
}

/**
 * 按年取存量的入参(学签/工签分两格)。
 */
export type YearStockIn = {
  /**
   * 这一行事实。
   */
  r: PlanCompetition

  /**
   * 年份键。
   */
  year: string

  /**
   * 存量的哪一格。
   */
  kind: 'study' | 'work'
}

/**
 * compMetaOf 的入参。
 */
export type CompMetaIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一行事实。
   */
  r: PlanCompetition

  /**
   * 当前年份;'' = 现行口径。
   */
  year: string
}

/**
 * pickYearNum 的入参。
 */
export type PickYearIn = {
  /**
   * 这一行事实。
   */
  r: PlanCompetition

  /**
   * 当前年份。
   */
  year: string

  /**
   * 在不在年份视图。
   */
  yearOn: boolean

  /**
   * 库行自带的那一格;null = 官方缺位。
   */
  plain: number | null

  /**
   * 存量的哪一格。
   */
  kind: 'study' | 'work'
}

/**
 * pickQuotaNum / pickRatioNum / pickFlowNum 的入参。
 */
export type PickPlainIn = {
  /**
   * 这一行事实。
   */
  r: PlanCompetition

  /**
   * 当前年份。
   */
  year: string

  /**
   * 在不在年份视图。
   */
  yearOn: boolean
}

/**
 * stockAsOfOf / yearFlowPeriodOf 的入参。
 */
export type StockAsOfIn = {
  /**
   * 各省名额竞争行。
   */
  competition: PlanCompetition[]

  /**
   * 当前年份;'' = 现行口径。
   */
  year: string
}

/**
 * flowSubOf 的入参。
 */
export type FlowSubIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前年份;'' = 现行口径。
   */
  year: string

  /**
   * 现行口径的流量区间。
   */
  flowPeriod: string | null

  /**
   * 年份视图的流量区间。
   */
  yearFlowPeriod: string | null
}

/**
 * targetTeerOf 的入参。
 */
export type EmpHrefIn2 = {
  /**
   * 带岗那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 当前职业码。
   */
  noc: string
}

/**
 * rangeAt 的入参。
 */
export type RangeAtIn = {
  /**
   * 值域表。
   */
  table: number[][]

  /**
   * 档。
   */
  band: number
}

/**
 * recentRangeOf 的入参。
 */
export type RecentRangeIn = {
  /**
   * 总经验值域。
   */
  totalRange: number[]

  /**
   * 这批官方表有没有拆段。
   */
  hasSplitWork: boolean
}

/**
 * activeProvOf 的入参。
 */
export type ActiveProvIn = {
  /**
   * 有表的省。
   */
  scored: string[]

  /**
   * 当前页签省。
   */
  prov: string
}

/**
 * openScoreFocus 的入参。
 */
export type ScoreFocusIn = {
  /**
   * 问卷动线。
   */
  flow: QuizFlowPanel

  /**
   * 估分段。
   */
  score: ScoreStatePanel

  /**
   * 分值题 key。
   */
  key: string
}

/**
 * openPickerStep 的入参。
 */
export type PickerStepIn = {
  /**
   * 问卷动线。
   */
  flow: QuizFlowPanel

  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 条件格 key。
   */
  key: string
}

/**
 * setStep 的入参。
 */
export type SetStepIn = {
  /**
   * 问卷动线。
   */
  flow: QuizFlowPanel

  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 停不停在选职业页。
   */
  occ: boolean

  /**
   * 停不停在选目标省页。
   */
  prov: boolean

  /**
   * 停不停在估分段。
   */
  score: boolean
}

/**
 * 只要答案态与问卷动线两台机器的入参。
 */
export type StepIn = {
  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 问卷动线。
   */
  flow: QuizFlowPanel
}

/**
 * 只要问卷动线的入参。
 */
export type FlowIn = {
  /**
   * 问卷动线。
   */
  flow: QuizFlowPanel
}

/**
 * 只要答案态的入参。
 */
export type AnswersIn = {
  /**
   * 答案态。
   */
  answers: AnswerStatePanel
}

/**
 * 只要估分段的入参。
 */
export type ScoreIn = {
  /**
   * 估分段。
   */
  score: ScoreStatePanel
}

/**
 * 答案态与估分段一起要的入参。
 */
export type SyncIn = {
  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 估分段。
   */
  score: ScoreStatePanel
}

/**
 * 只要登录闸的入参。
 */
export type AuthIn = {
  /**
   * 登录闸。
   */
  auth: AuthGatePanel
}

/**
 * 登录闸与答案态一起要的入参。
 */
export type AuthSyncIn = {
  /**
   * 登录闸。
   */
  auth: AuthGatePanel

  /**
   * 答案态。
   */
  answers: AnswerStatePanel
}

/**
 * writeNocs 的入参。
 */
export type WriteNocsIn = {
  /**
   * 答案态。
   */
  answers: AnswerStatePanel

  /**
   * 职业码清单。
   */
  nocs: string[]
}

/**
 * makeYearPickOf 的入参。
 */
export type YearPickIn = {
  /**
   * 当前年份。
   */
  year: string

  /**
   * 写年份的口子。
   */
  setYear: (v: string) => void
}

/**
 * makeOccPickOf 的入参。
 */
export type OccPickIn = {
  /**
   * 换这张表的职业。
   */
  setNoc: (v: string) => void
}

/**
 * 收职业码清单的手柄。
 */
export type NocsFn = (nocs: string[]) => void

/**
 * 收一批答案补丁的手柄。
 */
export type PatchFn = (patch: Partial<PlanAnswers>) => void

/**
 * 收省码清单的手柄。
 */
export type ProvsFn = (provs: string[]) => void

/**
 * 收省码清单与「还不确定」的手柄。
 */
export type ProvsAnyFn = (provs: string[], any?: boolean) => void

/**
 * 收分值卡题数回报的手柄。
 */
export type ProgressFn = (progress: ScoreProgress) => void

/**
 * 收分值卡答案回显的手柄。
 */
export type EchoFn = (rows: ScoreEchoRow[]) => void

/**
 * 在途工作者的收尾(中止请求 / 摘监听器 / 熄火)。
 */
export type CleanupFn = () => void

/**
 * 在途工作者:跑起来并交回它的收尾(中止请求 / 摘监听器 / 熄火)。
 */
export type EffectFn = () => CleanupFn

/**
 * makePathsEffect 的入参。
 */
export type PathsEffectIn = {
  /**
   * 答案档。
   */
  bands: PlanAnswers

  /**
   * 加分项勾选。
   */
  ticks: Record<string, boolean>

  /**
   * 直选档位与时薪。
   */
  rowsAns: ScoreRowsAnswer

  /**
   * 写通道行的口子。
   */
  setPaths: (v: ProfilePath[]) => void

  /**
   * 写省外提示的口子。
   */
  setOutside: (v: OutsidePath | null) => void
}

/**
 * makeTablesEffect 的入参。
 */
export type TablesEffectIn = {
  /**
   * 省码串。
   */
  provKey: string

  /**
   * 写分值表的口子。
   */
  setTables: (v: ScoreTables | null) => void
}

/**
 * makeOccCompEffect 的入参。
 */
export type OccEffectIn = {
  /**
   * 要查的职业码。
   */
  noc: string

  /**
   * 写分省竞争行的口子。
   */
  setRows: (v: PlanOccComp[]) => void
}

/**
 * makeNocTitlesEffect 的入参。
 */
export type TitlesEffectIn = {
  /**
   * 职业码清单。
   */
  nocs: string[]

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 写名字表的口子。
   */
  setTitles: (v: Record<string, string>) => void
}

/**
 * missingNocsOf 的入参。
 */
export type TitlesIn = {
  /**
   * 职业码清单。
   */
  nocs: string[]

  /**
   * 界面语言。
   */
  lang: PlanLang
}

/**
 * fetchNocTitle 的入参。
 */
export type NocTitleIn = {
  /**
   * 5 位职业码。
   */
  code: string

  /**
   * 界面语言。
   */
  lang: PlanLang
}

/**
 * makeEscEffect 的入参。
 */
export type EscIn = {
  /**
   * 关框手柄。
   */
  close: ClickFn
}

/**
 * joinCls 的入参。
 */
export type JoinClsIn = {
  /**
   * 底座类。
   */
  base: string | undefined

  /**
   * 叠加类。
   */
  more: string | undefined
}

/**
 * 只要粗筛态的入参。
 */
export type CoarseIn = {
  /**
   * 粗筛态。
   */
  coarse: boolean
}

/**
 * 只要选中态的入参。
 */
export type PickedIn = {
  /**
   * 选中没有。
   */
  picked: boolean
}

/**
 * occTargetOf 的入参。
 */
export type OccTargetIn = {
  /**
   * 全页当前职业码。
   */
  noc: string

  /**
   * 这张表自己的职业码;'' = 跟着全页。
   */
  occNoc: string
}

/**
 * repickHrefOf 的入参。
 */
export type RepickIn = {
  /**
   * 答案档。
   */
  bands: PlanAnswers
}

/**
 * makeActTrack 的入参。
 */
export type ActTrackIn = {
  /**
   * 埋点名。
   */
  event: string

  /**
   * 行身份。
   */
  rowKey: string
}

/**
 * outsideTextOf 的入参。
 */
export type OutsideTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PlanLang

  /**
   * 省外更优的那一条。
   */
  outside: OutsidePath
}

/**
 * 只要「在不在估分段」的入参。
 */
export type StepFlagIn = {
  /**
   * 在不在估分段。
   */
  scoreStep: boolean
}

/**
 * 进度条两个取值器的入参。
 */
export type BarIn = {
  /**
   * 两段计数。
   */
  progress: ProgressPanel

  /**
   * 在不在估分段。
   */
  scoreStep: boolean
}

/**
 * finishLabelOf 的入参。
 */
export type FinishLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 整卷答满了没有。
   */
  done: boolean
}

/**
 * startAtOf 的入参。
 */
export type FocusIn = {
  /**
   * 落点题名;'' = 不指定。
   */
  focus: string
}

/**
 * provStepKeyOf 的入参。
 */
export type NonceIn = {
  /**
   * 重挂序号。
   */
  nonce: number
}

/**
 * formStepKeyOf 的入参。
 */
export type FormKeyIn = {
  /**
   * 重挂序号。
   */
  nonce: number

  /**
   * 起步落在最后一题。
   */
  atEnd: boolean

  /**
   * 落点题名;'' = 不指定。
   */
  focus: string
}

/**
 * scoreHolderClsOf 的入参。
 */
export type HolderClsIn = {
  /**
   * 问卷弹框开着没有。
   */
  open: boolean

  /**
   * 停在估分段没有。
   */
  scoreStep: boolean

  /**
   * 登录了没有;null = 还没问回来。
   */
  me: boolean | null
}

/**
 * scoreShownOf 的入参。
 */
export type ScoreShownIn = {
  /**
   * 两段计数与门控。
   */
  progress: ProgressPanel

  /**
   * 省语境。
   */
  prov: ProvView
}

/**
 * streamsOf 的入参。
 */
export type StreamsIn = {
  /**
   * 带岗那份工作;null = 无岗态。
   */
  tvJob: TvJob | null

  /**
   * 这一批题算的省。
   */
  province: string
}

/**
 * quizSectionClsOf 的入参。
 */
export type ScoreHolderIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel

  /**
   * 问卷弹框开着没有(单独传:整机里那两个量尺是 ref,渲染期不许被读)。
   */
  open: boolean

  /**
   * 停在估分段没有。
   */
  scoreStep: boolean
}

/**
 * tablesPendingOf 的入参。
 */
export type TablesPendingIn = {
  /**
   * 两段计数与门控。
   */
  progress: ProgressPanel

  /**
   * 估分段。
   */
  score: ScoreStatePanel
}

/**
 * quizSectionClsOf 的入参。
 */
export type SectionClsIn = {
  /**
   * 开着没有(开框 = 已登录且开关是开的)。
   */
  shown: boolean

  /**
   * 两段计数。
   */
  progress: ProgressPanel

  /**
   * 估分段。
   */
  score: ScoreStatePanel
}

/**
 * 只要「开着没有」的入参。
 */
export type ShownIn = {
  /**
   * 开着没有。
   */
  shown: boolean
}

/**
 * overlayClickOf 的入参。
 */
export type OverlayClickIn = {
  /**
   * 开着没有。
   */
  shown: boolean

  /**
   * 关框手柄。
   */
  close: ClickFn
}

/**
 * gridProvincesOf 的入参。
 */
export type GridProvIn = {
  /**
   * 估分段。
   */
  score: ScoreStatePanel

  /**
   * 省语境。
   */
  prov: ProvView
}

/**
 * pathRowsOf 的入参。
 */
export type PathRowsIn = {
  /**
   * 通道行;null = 还没回来。
   */
  paths: ProfilePath[] | null
}

/**
 * scoreTileRowsOf 的入参。
 */
export type TileRowsIn = {
  /**
   * 估分题的条件格。
   */
  rows: SummaryRow[]

  /**
   * 这个省。
   */
  province: string

  /**
   * 官方分值表逐行。
   */
  factors: PlanScoreFactor[]
}

/**
 * makeFocusBump 的入参。
 */
export type FocusKeyIn = {
  /**
   * 分值题 key。
   */
  key: string
}

/**
 * 省份格能认的展示行(竞争表与职业竞争表的行都带这两格)。
 */
export type ProvRow = {
  /**
   * 省全名。
   */
  provName: string

  /**
   * 两位省码。
   */
  provCode: string
}

/**
 * JobProvTag 的 props。
 */
export type TagIn = {
  /**
   * 标上的字。
   */
  text: string
}

/**
 * 只收一行初评展示行的 props(手机卡的两个插槽件)。
 */
export type PlanCellRowIn2 = {
  /**
   * 这一行展示行。
   */
  r: PlanCellRow
}

/**
 * ScoreTiles 的 props。
 */
export type ScoreTilesIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel

  /**
   * 这个省。
   */
  province: string
}

/**
 * NoGridNote 的 props。
 */
export type NoGridNoteIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel

  /**
   * 这个省。
   */
  province: string
}

/**
 * JobBoard 的 props。
 */
export type JobBoardIn = {
  /**
   * 决策页整机。
   */
  d: DecisionPanel

  /**
   * 热门职业榜。
   */
  topNocs: TopNoc[]

  /**
   * 服务端先算好的判定;缺席 = 没有。
   */
  initialVerdict?: unknown
}

/**
 * useEscExit 的入参。
 */
export type QuizChromeEscIn = {
  /**
   * 问卷动线。
   */
  flow: QuizFlowPanel
}

/**
 * 还要攒几档时间(0 = 不用攒;1-3 是官方条文里的三档等待)。
 */
export type TierBand = 0 | 1 | 2 | 3

/**
 * 该省名额竞争度(服务端算好的四个数 + 一个松紧档)。
 */
export type PathCompetition = {
  /**
   * 竞争比(存量 ÷ 名额)。
   */
  ratio: number

  /**
   * 松紧档(服务端分的档,前端只显示不重算)。
   */
  tier: string

  /**
   * 临时居民存量。
   */
  pool: number

  /**
   * 当年省提名名额。
   */
  quota: number

  /**
   * 名额是哪一年的(逐省不同)。
   */
  quotaYear: number
}

/**
 * 试点社区(RCIP/FCIP)的名额状态(省 × 制度聚合)。
 */
export type PilotQuota = {
  /**
   * 这个省这条制度下有几个社区。
   */
  communities: number

  /**
   * 其中几个是先到先得(那是决定「要不要马上投」的规则)。
   */
  firstComeN: number

  /**
   * 剩余名额合计;null = 官方没公布。
   */
  remainingSum: number | null

  /**
   * 每轮上限合计;null = 官方没公布。
   */
  perIntakeSum: number | null

  /**
   * 官网公布这批数字的日期。
   */
  asOf: string
}

/**
 * 反事实(L2-09):拿到该省 offer 之后这条路的判定。
 */
export type AfterOffer = {
  /**
   * 拿到 offer 之后的判定。
   */
  verdict: 'viable' | 'needs-info' | 'excluded'

  /**
   * 拿到 offer 之后仍被哪道闸卡住;null = 没别的闸了。
   */
  blockedBy: string | null

  /**
   * 拿到 offer 之后还要攒几档;null = 不用攒。
   */
  tier: TierBand | null
}

/**
 * 打分制通道的估分与官方线。两头都是硬结论、中间留白(2026-08-16,判定见 lib/scoreLine):
 * 下界 ≥ 线 = 够得着,上界 < 线 = 够不着。
 */
export type PathScore = {
  /**
   * 估分下界(没勾的加分项按 0)。
   */
  value: number

  /**
   * 估分上界;null = 算不出上界。
   */
  ceiling: number | null

  /**
   * 对照的官方线;null = 该省没有可对照的线。
   */
  refLine: number | null

  /**
   * 那条线出自哪个通道;缺席 = 该省不按通道设线。
   */
  refStream?: string | null

  /**
   * 分只算了一部分(还有必答档位没答)。
   */
  partial?: boolean
}

/**
 * 单选题的一个选项(只读它的值,用来找出选中的那个)。
 */
export type ChoiceOption = {
  /**
   * 选项的值(档位数字或省码/身份码字符串)。
   */
  value: string | number
}

/**
 * 带行身份的展示行(竞争表与职业竞争表的行键都取这一格)。
 */
export type KeyedRow = {
  /**
   * 行身份。
   */
  key: string
}

/**
 * 排序时带上原题序的条件格(同组内按题序稳定排)。
 */
export type OrderedRow = {
  /**
   * 这一格。
   */
  r: SummaryRow

  /**
   * 它在原清单里的位置。
   */
  i: number
}

/**
 * makeScrollEffect 的入参。
 */
export type PadIn = {
  /**
   * 问卷弹框开着没有。
   */
  open: boolean

  /**
   * 题区的两把量尺。
   */
  pad: QuizPadPanel
}

/**
 * 答题器的段落(基础卷 / 探索卷)。字段库那边同名的联合是产出方,这里是消费方,
 * 形状本域自己声明(no-import-in-leaf)。
 */
export type PlanStage = 'basic' | 'explore'

/**
 * 估分线卡提示框的两个色档:达标染绿,其余一律素色(不许把「够不着」染红吓人)。
 */
export type LineTone = 'ok' | 'mute'

/**
 * 够得着 / 够不着 / 取决于加分项。判定归 lib/points 的 lineStateOf,本页只渲染它的结论。
 */
export type LineVerdict = 'above' | 'below' | 'unknown'

/**
 * 估分线卡真正摆得出的那一轮抽选:**分数线必有值**。
 * 没有分数线的轮次在洗行时就被剔掉了 —— 拿它当 0 比就是编。
 */
export type LineDraw = {
  /**
   * 抽选日。
   */
  drawDate: string

  /**
   * 通道名(官方原名,不许截断)。
   */
  stream: string

  /**
   * 这一轮的分数线。
   */
  score: number

  /**
   * 通道名的中文灰注(ETL 已译);缺席 = 这条通道还没译。**只在 zh 界面出**。
   */
  streamZh?: string
}

/**
 * 估分线卡要的通道行:每省一行代表,只读省码与那一格估分。
 * 收窄声明(通道行的其余十几格这张卡一格都不读),初评行原样喂得进来。
 */
export type ScoreLineRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 打分制通道的估分与官方线;缺席 = 这条通道不打分,null = 还没算出来。
   */
  score?: PathScore | null
}

/**
 * 有值就是那一格估分,null = 该省这一刻没有分可摆。
 */
export type MaybePathScore = PathScore | null

/**
 * 抽选线表的单元格渲染函数(签名由 table 域的列声明定死)。
 */
export type LineCellFn = (draw: LineDraw) => React.ReactNode

/**
 * 抽选线表的排序取值器;null = 这一行没有可比的值,沉底。
 */
export type LineSortFn = (draw: LineDraw) => number | null

/**
 * 估分线卡省页签的一枚(与 tabs 域的页签同形,本域自己声明)。
 */
export type LineTabItem = {
  /**
   * 页签身份键(两位省码,也进 aria id)。
   */
  key: string

  /**
   * 页签文字(显示省名)。
   */
  label: string

  /**
   * 右上角角标 = 该省还欠几道估分题;缺席 = 一道不欠,不出角标
   * (欠 0 道也摆一个「0」会被读成「这里有个数要看」)。
   */
  badge?: number
}

/**
 * ScoreLineCard(估分与抽选线卡)的 props。
 */
export type ScoreLineCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语(通道名的中文灰注只在 zh 界面出 —— 官方原名是事实,译名是辅助,不许盖掉原名)。
   */
  lang: PlanLang

  /**
   * 服务端下发的通道行(每省取分最高的一行代表);客户端不算分。
   */
  rows: ScoreLineRow[]

  /**
   * 各省抽选记录的全量(按省与通道现挑,不预先分组)。
   */
  draws: PlanDraw[]

  /**
   * 页签省序:用户所选省,有分的在前。
   */
  provinces: string[]

  /**
   * 省码 → 显示省名。
   */
  provDisp: ProvDispFn

  /**
   * 估分段已答几道(与基础卷各算各的,两边卡在哪一步第一次能分开读)。
   */
  done: number

  /**
   * 估分段一共几道。
   */
  total: number

  /**
   * 改答案(主动作钮在「答满了」那一档走它)。
   */
  onEdit: ClickFn

  /**
   * 选目标省(2026-08-16 Frank「这个部分加一个按钮,选省份吧?可以多选」)——
   * 落的是基础卷同一道省份题(字段单一来源),不新开一份省份答案。
   */
  onPickProv: ClickFn

  /**
   * 分值表状态:null = 还没取到(基础卷没答满时压根不取)。
   * 没有它就分不清「本站没有这个省的表」和「你还没答完基础卷」—— 两句话在用户那儿意思相反。
   */
  gridProvinces: string[] | null

  /**
   * 该省估分题的格子(2026-08-16 合卡):它们就是这一段的答案面,
   * 先前留在「申请人条件」卡里,与结论隔着一张卡。缺席 = 这张卡不出格子。
   */
  tiles?: ProvNodeFn

  /**
   * 该省还欠几道估分题(页签角标);缺席 = 不出角标。
   */
  pendingOf?: ProvCountFn

  /**
   * 当前页签省上报:估分弹框只出这个省的题(先前分值卡按所有有表的省出题,
   * BC 答完接着弹 MB)。缺席 = 不上报。
   */
  onProv?: ProvVoidFn

  /**
   * 该省没有分值表时的说明(举证口径:官方不打分 vs 本站未收录,两句意思相反)。
   * 2026-08-16 从「申请人条件」卡搬来 —— 省的语境在这张卡,说明就该在这儿。
   * 缺席 = 回落一句通用的「本站未收录」。
   */
  noGridNote?: ProvNodeFn

  /**
   * 问卷弹框壳 + 分值卡实例(常驻,不搬树 —— 搬容器 = 重挂 = 答案清零)。
   */
  children: React.ReactNode
}

/**
 * ScoreLineHead(估分卡卡头)的 props。
 */
export type ScoreLineHeadIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前页签省;空串 = 一个省都还没选。
   */
  prov: string

  /**
   * 估分段已答几道。
   */
  done: number

  /**
   * 估分段一共几道。
   */
  total: number

  /**
   * 改答案。
   */
  onEdit: ClickFn

  /**
   * 选目标省。
   */
  onPickProv: ClickFn
}

/**
 * ScoreLineNote(估分卡提示框)的 props。
 */
export type ScoreLineNoteIn = {
  /**
   * 色档。
   */
  tone: LineTone

  /**
   * 框里那句话。
   */
  children: React.ReactNode
}

/**
 * ScoreLineVerdict(够不够线的结论行)的 props。
 */
export type ScoreLineVerdictIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前页签省。
   */
  prov: string

  /**
   * 省码 → 显示省名。
   */
  provDisp: ProvDispFn

  /**
   * 这个省的估分与官方线(有分才渲这一行)。
   */
  score: PathScore

  /**
   * 对得上的那几轮抽选(数「够得着几轮」用它)。
   */
  list: LineDraw[]
}

/**
 * ScoreLineEmpty(还没有分时那两句引导)的 props。
 */
export type ScoreLineEmptyIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前页签省。
   */
  prov: string

  /**
   * 估分段一共几道(大于 0 = 题就在下面摆着,不必再写一句)。
   */
  total: number

  /**
   * 有分值表的省;null = 表还没取到。
   */
  gridProvinces: string[] | null

  /**
   * 该省没有分值表时那句带举证的说明;缺席 = 回落通用句。
   */
  noGridNote?: ProvNodeFn
}

/**
 * ScoreLineDraws(官方抽选线那一段)的 props。
 */
export type ScoreLineDrawsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 这个省的估分;null = 还没有分,「你」那一列整列留空。
   */
  score: MaybePathScore

  /**
   * 要摆的那几轮抽选。
   */
  list: LineDraw[]
}

/**
 * ScoreLineDrawRow(一轮抽选的手机卡)的 props。
 */
export type ScoreLineDrawRowIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 这个省的估分;null = 还没有分。
   */
  score: MaybePathScore

  /**
   * 这一轮抽选。
   */
  draw: LineDraw
}

/**
 * LineStreamText(通道原名 + 中文灰注)的 props。
 */
export type LineStreamTextIn = {
  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 这一轮抽选。
   */
  draw: LineDraw
}

/**
 * LineGapCell(你的分与这条线差多少)的 props。
 */
export type LineGapCellIn = {
  /**
   * 这个省的估分;null = 还没有分。
   */
  score: MaybePathScore

  /**
   * 这一轮抽选。
   */
  draw: LineDraw
}

/**
 * makeLineGapCell / makeLineGapSort 的入参。
 */
export type LineGapMakeIn = {
  /**
   * 这个省的估分;null = 还没有分。
   */
  score: MaybePathScore
}

/**
 * makeLineStreamCell 的入参。
 */
export type LineStreamMakeIn = {
  /**
   * 界面语。
   */
  lang: PlanLang
}

/**
 * lineColsOf 的入参。
 */
export type LineColsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这个省的估分;null = 还没有分(「你」那一列整列不可比,一律沉底)。
   */
  score: MaybePathScore

  /**
   * 通道列的渲染口。**由调用方注进来** —— 它产 JSX 所以住 tsx,
   * 让本文件反过来 import 它会成环(cell → functions → make → cell)。
   */
  streamCell: LineCellFn

  /**
   * 「你」那一列的渲染口(同上,由调用方注进来)。
   */
  gapCell: LineCellFn
}

/**
 * lineListOf 的入参。
 */
export type LineListIn = {
  /**
   * 各省抽选记录的全量。
   */
  draws: PlanDraw[]

  /**
   * 这个省;空串 = 一个省都还没选。
   */
  province: string

  /**
   * 这个省的估分;null = 还没有分。
   */
  score: MaybePathScore
}

/**
 * recentDrawsOf 的入参。
 */
export type RecentDrawsIn = {
  /**
   * 各省抽选记录的全量。
   */
  draws: PlanDraw[]

  /**
   * 这个省。
   */
  province: string
}

/**
 * lineScoreOf 的入参。
 */
export type LineScoreIn = {
  /**
   * 服务端下发的通道行。
   */
  rows: ScoreLineRow[]

  /**
   * 这个省;空串 = 一个省都还没选。
   */
  province: string
}

/**
 * makeLineRowMatch 的入参。
 */
export type LineRowMatchIn = {
  /**
   * 这个省。
   */
  province: string
}

/**
 * makeLineStreamMatch 的入参。
 */
export type LineStreamMatchIn = {
  /**
   * 对照线出自哪条通道。
   */
  refStream: string
}

/**
 * activeLineProvOf 的入参。
 */
export type LineProvIn = {
  /**
   * 页签省序。
   */
  provinces: string[]

  /**
   * 用户点中的那个省(可能已经不在省序里了 —— 改了目标省之后)。
   */
  active: string
}

/**
 * lineTabItemsOf 的入参。
 */
export type LineTabItemsIn = {
  /**
   * 页签省序。
   */
  provinces: string[]

  /**
   * 省码 → 显示省名。
   */
  provDisp: ProvDispFn

  /**
   * 该省还欠几道估分题;缺席 = 不出角标。
   */
  pendingOf?: ProvCountFn
}

/**
 * lineToneOf / lineYoursClsOf / lineSubClsOf 的入参。
 */
export type LineStateIn = {
  /**
   * 够得着 / 够不着 / 取决于加分项。
   */
  state: LineVerdict
}

/**
 * lineSubTextOf 的入参。
 */
export type LineSubTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 够得着 / 够不着 / 取决于加分项。
   */
  state: LineVerdict

  /**
   * 这个省的估分与官方线。
   */
  score: PathScore

  /**
   * 对得上的那几轮抽选。
   */
  list: LineDraw[]
}

/**
 * lineClearsOf 的入参。
 */
export type LineClearsIn = {
  /**
   * 这个省的估分与官方线。
   */
  score: PathScore

  /**
   * 对得上的那几轮抽选。
   */
  list: LineDraw[]
}

/**
 * lineMainBtnClsOf 的入参。
 */
export type LineMainBtnIn = {
  /**
   * 当前页签省;空串 = 一个省都还没选。
   */
  prov: string

  /**
   * 估分段已答几道。
   */
  done: number

  /**
   * 估分段一共几道。
   */
  total: number
}

/**
 * lineMainLabelOf 的入参。
 */
export type LineMainLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前页签省;空串 = 一个省都还没选。
   */
  prov: string

  /**
   * 估分段已答几道。
   */
  done: number

  /**
   * 估分段一共几道。
   */
  total: number
}

/**
 * lineMainActOf 的入参。
 */
export type LineMainActIn = {
  /**
   * 当前页签省;空串 = 一个省都还没选(那时主动作是「先选省」)。
   */
  prov: string

  /**
   * 改答案。
   */
  onEdit: ClickFn

  /**
   * 选目标省。
   */
  onPickProv: ClickFn
}

/**
 * lineAnsweredOf 的入参。
 */
export type LineAnsweredIn = {
  /**
   * 估分段已答几道。
   */
  done: number

  /**
   * 估分段一共几道。
   */
  total: number
}

/**
 * lineRowKeyOf 的入参。
 */
export type LineRowKeyIn = {
  /**
   * 抽选日。
   */
  date: string

  /**
   * 它在这一屏清单里的位置(同一天可能有多条,光靠日期分不开)。
   */
  i: number
}

/**
 * noGridTextOf 的入参。
 */
export type NoGridTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这个省。
   */
  prov: string

  /**
   * 该省那句带举证的说明;缺席 = 回落通用句。
   */
  noGridNote?: ProvNodeFn
}

/**
 * QuizForm(一屏一题的答题器)的 props。
 */
export type QuizFormIn = {
  /**
   * 取哪一份题单(决定 = 字段库里的一个决策名)。
   */
  decision: string

  /**
   * 题单的段落。
   */
  stage: PlanStage

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 全卷答案(也是题级显隐的依据 —— 境外用户看不到「持什么许可/人在哪个省」)。
   */
  answers: PlanAnswers

  /**
   * 逐题写答案。
   */
  onPatch: PatchFn

  /**
   * 最后一题的「下一题」出口(整卷答完)。
   */
  onComplete: ClickFn

  /**
   * 最后一题按钮的文案键;缺席 = 沿用报告页那一档。
   */
  doneKey?: string

  /**
   * 第一题的「上一题」出口(决策页 = 回选职业页);缺席 = 第一题没有上一题。
   */
  onBack?: ClickFn

  /**
   * 翻到第几题的上报(调用方拿它画进度);缺席 = 不上报。
   */
  onStepChange?: StepChangeFn

  /**
   * 从后续自定义步骤返回时,回到基础题最后一题而不是第一题。
   */
  startAtEnd?: boolean

  /**
   * 点条件格直达那道题:起步落在指定字段(调用方换 key 重挂来触发);缺席 = 落在第一道没答的题。
   */
  startAt?: string

  /**
   * 旁路收卷钮的文案(2026-08-13 Frank:基础卷也要「完成」——改一个答案不用再翻完全卷)。
   * 何时给由调用方定(决策页 = 整卷答满才传);缺席 = 不出这颗钮。
   */
  finishLabel?: string

  /**
   * 旁路收卷:点了直接收卷,不走剩余页。缺席 = 不出这颗钮。
   */
  onFinish?: ClickFn
}

/**
 * 翻到第几题的上报(两参由调用方的画进度口定形:第几题 + 共几题)。
 */
export type StepChangeFn = (index: number, total: number) => void

/**
 * 翻页写回当前题序(React 的 setState 形状)。
 */
export type StepSetFn = (index: number) => void

/**
 * 起步题序的算法(useState 的惰性初值形状:挂载时算一次)。
 */
export type StepIndexFn = () => number

/**
 * 单选题选项在答案里存的值(档位数字或省码/身份码字符串)。
 */
export type PlanBandValue = number | string

/**
 * 选中一个选项(值交回写答案的那一头)。
 */
export type BandPickFn = (value: PlanBandValue) => void

/**
 * 一道单选题的一个选项,文案已按当前语言取过。
 */
export type QuizChoiceRow = {
  /**
   * 进答案存储的值。
   */
  value: PlanBandValue

  /**
   * 这个选项此刻要显示的那句话。
   */
  text: string
}

/**
 * startIndexOf / makeStartIndex 的入参。
 */
export type StartIndexIn = {
  /**
   * 这一段的题名清单(已按题级显隐过滤过)。
   */
  names: string[]

  /**
   * 全卷答案。
   */
  bands: PlanAnswers

  /**
   * 起步落在指定字段;缺席 = 落在第一道没答的题。
   */
  startAt?: string

  /**
   * 起步落在最后一题。
   */
  startAtEnd: boolean
}

/**
 * quizChoicesOf 的入参。
 */
export type QuizChoicesIn = {
  /**
   * 题名。
   */
  name: string

  /**
   * 全卷答案(选项过滤要看它 —— 目前只有一条:加拿大经验不得超过总经验)。
   */
  bands: PlanAnswers

  /**
   * 界面语。
   */
  lang: PlanLang
}

/**
 * fieldTitleOf 的入参。
 */
export type FieldTitleIn = {
  /**
   * 题名。
   */
  name: string

  /**
   * 界面语。
   */
  lang: PlanLang
}

/**
 * makeChoicePatch 的入参。
 */
export type ChoicePatchIn = {
  /**
   * 题名(答案档里的键)。
   */
  name: string

  /**
   * 逐题写答案。
   */
  onPatch: PatchFn
}

/**
 * makeQuizPrev 的入参。
 */
export type QuizPrevIn = {
  /**
   * 当前题序。
   */
  at: number

  /**
   * 翻页写回。
   */
  setIdx: StepSetFn

  /**
   * 第一题的「上一题」出口;缺席 = 第一题没有上一题。
   */
  onBack?: ClickFn
}

/**
 * makeQuizNext 的入参。
 */
export type QuizNextIn = {
  /**
   * 当前题序。
   */
  at: number

  /**
   * 这是不是最后一题。
   */
  last: boolean

  /**
   * 翻页写回。
   */
  setIdx: StepSetFn

  /**
   * 整卷答完的出口。
   */
  onComplete: ClickFn
}

/**
 * quizNextLabelOf 的入参。
 */
export type QuizNextLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这是不是最后一题。
   */
  last: boolean

  /**
   * 最后一题按钮的文案键;缺席 = 按段落回落。
   */
  doneKey?: string

  /**
   * 题单的段落(回落时探索卷说「更新报告」,基础卷说「出报告」)。
   */
  stage: PlanStage
}

/**
 * lineRefStreamOf 的入参。
 */
export type LineRefIn = {
  /**
   * 这个省的估分;null = 还没有分。
   */
  score: MaybePathScore
}

/**
 * lineGapOf / lineGapTextOf / lineGapClsOf / lineGapShownOf 的入参。
 */
export type LineGapIn = {
  /**
   * 这个省的估分;null = 还没有分。
   */
  score: MaybePathScore

  /**
   * 这一轮抽选。
   */
  draw: LineDraw
}

/**
 * makeStepBack 的入参。
 */
export type StepBackIn = {
  /**
   * 当前题序。
   */
  at: number

  /**
   * 翻页写回。
   */
  setIdx: StepSetFn
}

/**
 * 本站认的学历档(七个字面量本域自抄;与 lib/points 的 EduKey 同集,所以两边可以直接对接)。
 */
export type PlanEduKey = 'doctorate' | 'master' | 'bachelor' | 'tradeCert' | 'diploma2y' | 'cert1y' | 'highschool'

/**
 * 一个因素算出来的那一块分(只声明分值卡真读的那几格)。
 */
export type PlanScorePart = {
  /**
   * 官方因素名。
   */
  factor: string

  /**
   * 这一块得几分。
   */
  pts: number

  /**
   * 这一块封顶几分。
   */
  max: number

  /**
   * 命中的官方原文标签。**必须显出来**,好让用户核对我们匹的是哪一档。
   */
  matched: string
}

/**
 * 一个省的估分(lib/points 的算分器下发,本页只渲染)。
 */
export type PlanProvinceScore = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 分制全名,结尾括号里可能自报通道。
   */
  system: string

  /**
   * 满分;0 = 官方没公布总分上限,这时不许拿各项相加冒充官方总分。
   */
  maxTotal: number

  /**
   * 官方申请门槛;null = 官方未公布。
   */
  passMark: number | null

  /**
   * 官方页地址。
   */
  url: string

  /**
   * 官方指南生效日。
   */
  guideEffective: string

  /**
   * 本站抓取日。
   */
  fetched: string

  /**
   * 逐因素的分。
   */
  parts: PlanScorePart[]

  /**
   * 合计(已按因素封顶、组封顶、满分封顶)。
   */
  total: number
}

/**
 * 手动 / 自动项的分数 —— 由本页构造后喂给算分器(全格照抄外域契约,接缝零断言)。
 */
export type PlanScoreOverride = {
  /**
   * 几分。
   */
  pts: number

  /**
   * 命中的官方原文标签。
   */
  matched: string

  /**
   * 这一份分从哪来。
   */
  source: 'profile' | 'job' | 'tick'
}

/**
 * 分值卡的选项范围(基础卷问过**范围**的条件,精确题只在范围内出选项;
 * 范围里只剩一个值就整题不问 —— 那是在请人推翻自己刚给的答案)。
 */
export type ScoreCardLimits = {
  /**
   * 第一语言 CLB 的可选值域;缺席 = 不限。
   */
  clb1?: number[]

  /**
   * 第二语言 CLB 的可选值域;缺席 = 不限。
   */
  clb2?: number[]

  /**
   * 近段经验年数的可选值域;缺席 = 不限。
   */
  expRecent?: number[]

  /**
   * 远段经验年数的可选值域;缺席 = 不限。
   */
  expOlder?: number[]
}

/**
 * 受 limits 收窄的那几道精确题的题名。
 */
export type ScoreLimitKey = 'clb1' | 'clb2' | 'expRecent' | 'expOlder'

/**
 * 逐题答案回显的一行。比页面那边的 ScoreEchoRow 多一格 noQuestion:
 * #305 推导出来的格子没有对应的题,展示层据此不给点。
 */
export type ScoreCardEchoRow = {
  /**
   * 分值卡的题 key(带省前缀的冒号形)。
   */
  key: string

  /**
   * 这道题属于哪个省;'' = 全省共用。
   */
  prov: string

  /**
   * 题面。
   */
  label: string

  /**
   * 答案。
   */
  value: string

  /**
   * 答过没有。
   */
  filled: boolean

  /**
   * 这一格**没有对应的题**(值来自基础卷答案);缺席 = 点它进得去那道题。
   */
  noQuestion?: boolean
}

/**
 * 逐题答案回显的上抛口。
 */
export type ScoreCardEchoFn = (rows: ScoreCardEchoRow[]) => void

/**
 * 一屏单选题的一个选项(官方分值表的档位)。
 */
export type ExtraChoice = {
  /**
   * 选项标识(也是 radio 的值)。
   */
  key: string

  /**
   * 选项文字(官方原文或译名)。
   */
  text: string

  /**
   * 当前选中的是不是它。
   */
  active: boolean

  /**
   * 选中它要落的那一格。
   */
  apply: ClickFn
}

/**
 * 一屏多选题的一条(该省的一条官方加分项)。
 */
export type ExtraCheck = {
  /**
   * 勾选键(`省码:因素:序号`)。
   */
  key: string

  /**
   * 条目文字(官方原文或译名)。
   */
  text: string

  /**
   * 该条的分值;null = 官方没给分。
   */
  pts: number | null

  /**
   * 勾没勾上。
   */
  on: boolean

  /**
   * 勾选落格。
   */
  toggle: BoolSetFn
}

/**
 * 一屏数字题的输入格。**只剩时薪这一道**,保持输入框:两位数字秒答,而且一分不差 ——
 * 档位化的代价 2026-08-16 算过:每 $1 一档 = 56 项下拉;每 $5 一档按下界取值,
 * BC 那 55 分里最多低估 4 分,等于把人的分算低了(Frank「有必要按 1 一个档位吗」→ 撤回)。
 */
export type ExtraNumber = {
  /**
   * 当前值。
   */
  value: number

  /**
   * 落格。
   */
  set: NumSetFn
}

/**
 * 一屏一题。三种题型共用同一副外观(题干 / 选项 / 底部动作条),区别只在选项形态。
 */
export type ExtraQuestion = {
  /**
   * 题 key(条件格点它回跳这道题)。
   */
  key: string

  /**
   * 题干。
   */
  title: string

  /**
   * 题干下的小注;缺席 = 不出小注。
   */
  sub?: string

  /**
   * 单选:官方分值表的档位;缺席 = 不是单选题。
   */
  choices?: ExtraChoice[]

  /**
   * 多选:该省的加分项(一省一屏,不是一条一屏);缺席 = 不是多选题。
   */
  checks?: ExtraCheck[]

  /**
   * 数字题的输入格;缺席 = 不是数字题。
   */
  number?: ExtraNumber

  /**
   * 条件格回显用的短名。2026-08-16 起单条加分项的 title 就是条件本身(前缀「你是否符合」
   * 被 Frank 去掉了 —— 两颗钮已经是「是/否」,再套一句问法是废话);这里保留给别处覆写。
   */
  echoLabel?: string
}

/**
 * 官方表里没有通用自动映射、要用户自己直选档位的一道题。
 */
export type ManualQuestion = {
  /**
   * 这道题属于哪个省。
   */
  prov: string

  /**
   * 官方因素名。
   */
  name: string

  /**
   * 题 key(`省码:因素`)。
   */
  key: string

  /**
   * 该因素的全部官方档位行。
   */
  rows: PlanScoreFactor[]
}

/**
 * 近期抽选线的区间(拿不到对照锚时只摆区间,**不给差分结论**)。
 */
export type DrawRange = {
  /**
   * 区间下界。
   */
  lo: number

  /**
   * 区间上界。
   */
  hi: number

  /**
   * 取了几轮。
   */
  n: number
}

/**
 * 对照锚,按可信度排序:①本岗所在通道的最近一次抽选;②官方申请门槛;
 * ③都没有 → 只摆近期各通道分数线区间。
 */
export type ScoreAnchor = {
  /**
   * 该省(限定通道后)有分数线的抽选,新的在前。
   */
  scored: PlanDraw[]

  /**
   * 本岗通道的最近一次抽选;null = 对不上通道。
   */
  latest: PlanDraw | null

  /**
   * 对照线;null = 该省没有可用的线。
   */
  line: number | null

  /**
   * 该省有分数线、但全是别的通道的(ON 旧通道已关停)。
   */
  hasOtherStreamDraws: boolean

  /**
   * 近期各通道分数线区间;null = 连区间都摆不出。
   */
  range: DrawRange | null
}

/**
 * 该职业在一个省的在招数(免费事实,拿不到就不显示,不编)。
 */
export type PlanJobCount = {
  /**
   * 该省这个职业的在招数。
   */
  n: number

  /**
   * 其中带 pnpEligible 粗筛标记的那些(粗筛信号,不是资格认定)。
   */
  eligible: number
}

/**
 * `/api/quiz?noc=` 回来的「同职业各省在招数」一行:只声明这里真读的那三格。
 */
export type ByProvWireRow = {
  /**
   * 省码(两位大写,如 ON)。
   */
  province: string

  /**
   * 该省这个职业的在招数。
   */
  n: number

  /**
   * 其中带 pnpEligible 粗筛标记的那些。
   */
  eligible: number
}

/**
 * `/api/quiz?noc=` 的响应形状(只声明这里真读的那一格)。
 */
export type ByProvWire = {
  /**
   * 免费事实块;缺席 = 这次没带回来。
   */
  facts?: ByProvFacts
}

/**
 * `/api/quiz?noc=` 响应里的免费事实块。
 */
export type ByProvFacts = {
  /**
   * 同职业各省在招数;缺席 = 这次没带回来。
   */
  byProv?: ByProvWireRow[]
}

/**
 * 官方行的附加规则串解析出来的 NOC 适用清单。
 */
export type RowRuleJson = {
  /**
   * 官方给了 NOC 清单的行:键 = 5 位职业码;缺席 = 这一行对所有职业成立。
   */
  appliesNoc?: Record<string, string>
}

/**
 * BC 时薪规则串解析出来的两个界。
 */
export type WageRuleJson = {
  /**
   * 起算时薪;缺席 = 用官方默认。
   */
  floorAt?: number

  /**
   * 封顶时薪;缺席 = 用官方默认。
   */
  capAt?: number
}

/**
 * 「你的条件」下拉的一个选项。
 */
export type ScoreOption = {
  /**
   * 选项的值(落格时按它取)。
   */
  value: string

  /**
   * 选项文字。
   */
  text: string
}

/**
 * 「你的条件」一格的形态:下拉还是数字输入。
 */
export type ScoreFieldKind = 'select' | 'number'

/**
 * 「你的条件」网格里的一格。
 */
export type ScoreField = {
  /**
   * 这一格的标识(也是 React key)。
   */
  key: string

  /**
   * 这一格的标签。
   */
  label: string

  /**
   * 下拉还是数字输入。
   */
  kind: ScoreFieldKind

  /**
   * 当前值(数字格也按字符串给,落格时再转回数)。
   */
  value: string

  /**
   * 下拉的选项;数字格给空数组。
   */
  options: ScoreOption[]

  /**
   * 落格。
   */
  onPick: ScoreFieldPickFn
}

/**
 * 「你的条件」一格的落格口。
 */
export type ScoreFieldPickFn = (value: string) => void

/**
 * 数字落格口(时薪、地区档)。
 */
export type NumSetFn = (value: number) => void

/**
 * 布尔落格口(勾选、是/否)。
 */
export type BoolSetFn = (on: boolean) => void

/**
 * 单选题的选中落格口(QuizChoices 的 onPick)。
 */
export type ExtraPickFn = (key: string) => void

/**
 * 原生表单控件的变更口(签名由 React 定死)。
 */
export type ScoreChangeFn = (e: React.ChangeEvent<HTMLInputElement>) => void

/**
 * 分值卡的落格总口 —— 出题机器与结果区共用这一副手柄,答案只有一处写入。
 */
export type ScoreActs = {
  /**
   * 「你的条件」一项落格(顺带把字段库有对应档位的写回统一答案)。
   */
  pickProfile: ProfilePickFn

  /**
   * 时薪落格。
   */
  pickWage: NumSetFn

  /**
   * BC 工作地区档落格。
   */
  pickArea: NumSetFn

  /**
   * 官方档位直选落格。
   */
  pickRow: RowPickFn

  /**
   * 加分项勾选落格(同簇的其余条自动放下)。
   */
  pickTick: TickPickFn

  /**
   * 标记某道题「答过了」。
   */
  markAnswered: MarkAnsweredFn
}

/**
 * 「你的条件」一项落格口。
 */
export type ProfilePickFn = (patch: Partial<PlanSelfProfile>) => void

/**
 * 官方档位直选落格口。
 */
export type RowPickFn = (x: RowPickIn) => void

/**
 * 加分项勾选落格口。
 */
export type TickPickFn = (x: TickPickIn) => void

/**
 * 「答过了」标记口。
 */
export type MarkAnsweredFn = (key: string) => void

/**
 * 官方档位直选落格的入参。
 */
export type RowPickIn = {
  /**
   * 题 key(`省码:因素`)。
   */
  key: string

  /**
   * 选中的官方行序号;null = 撤回这一格的答案。
   */
  seq: number | null
}

/**
 * 加分项勾选落格的入参。
 */
export type TickPickIn = {
  /**
   * 勾选键(`省码:因素:序号`)。
   */
  key: string

  /**
   * 勾上还是放下。
   */
  on: boolean

  /**
   * 同簇的其余条(官方原文「…, or」= 二选一):勾上这条就把它们放下 ——
   * 算分本来就只取簇内最大的那条,UI 放任两个都勾等于显示与口径分叉。
   */
  siblings: string[]
}

/**
 * 分值卡「你的条件」的状态格。
 */
export type ScoreProfilePanel = {
  /**
   * 当前这一套条件(预填 + 存档 + 他自己改过的)。
   */
  profile: PlanSelfProfile

  /**
   * 整套写回。
   */
  setProfile: ProfileSetFn

  /**
   * 他**亲口答过**的那几格(只有这些入档 —— 预填是推出来的初值,不是答案)。
   */
  profAns: Partial<PlanSelfProfile>

  /**
   * 答过的那几格写回。
   */
  setProfAns: ProfAnsSetFn
}

/**
 * 整套条件的写回口。收 React 的 setState 形状:落格一律走**函数式更新**,
 * 拿的是那一刻的最新值 —— 拉服务端档是异步的,写死渲染期捕获的那份会把他这中间改的答案盖掉。
 */
export type ProfileSetFn = React.Dispatch<React.SetStateAction<PlanSelfProfile>>

/**
 * 答过的那几格的写回口(同上,函数式更新)。
 */
export type ProfAnsSetFn = React.Dispatch<React.SetStateAction<Partial<PlanSelfProfile>>>

/**
 * 勾选表的写回口(同上,函数式更新)。
 */
export type TickMapSetFn = React.Dispatch<React.SetStateAction<Record<string, boolean>>>

/**
 * 直选档位表的写回口(同上,函数式更新)。
 */
export type RowMapSetFn = React.Dispatch<React.SetStateAction<Record<string, number>>>

/**
 * 分值卡逐题答案的状态格(勾选 / 直选 / 已答标记 / 时薪 / 地区 / offer / 题序)。
 */
export type ScoreAnswerPanel = {
  /**
   * 加分项勾选,键 = `省码:因素:序号`。
   */
  ticks: Record<string, boolean>

  /**
   * 勾选写回。
   */
  setTicks: TickMapSetFn

  /**
   * 官方档位直选,键 = `省码:因素`。
   */
  rowAnswers: Record<string, number>

  /**
   * 直选写回。
   */
  setRowAnswers: RowMapSetFn

  /**
   * 翻过 / 选过的题(计数与回显都按它算)。
   */
  extraAnswered: Record<string, boolean>

  /**
   * 已答标记写回。
   */
  setExtraAnswered: TickMapSetFn

  /**
   * 时薪。
   */
  wage: number

  /**
   * 时薪写回。
   */
  setWage: NumSetFn

  /**
   * BC 工作地区档序。
   */
  areaI: number

  /**
   * 地区档写回。
   */
  setAreaI: NumSetFn

  /**
   * 手上有没有 offer(闸门只认基础卷的「有」;这一格只供结果区勾选框撤销用)。
   */
  hasOffer: boolean

  /**
   * offer 写回。
   */
  setHasOffer: BoolSetFn

  /**
   * offer 是否**真答过**:没答过不把默认 false 写进档 —— 写了,
   * schema 升级后的挂载写就成了「新答案」,会以新者胜的名义把服务端档顶掉。
   */
  offerTouched: boolean

  /**
   * 真答过标记写回。
   */
  setOfferTouched: BoolSetFn

  /**
   * 当前题序。
   */
  at: number

  /**
   * 题序写回。
   */
  setAt: NumSetFn

  /**
   * 用户点过的省页签;null = 还没点过(默认开目标省)。
   */
  openProv: string | null

  /**
   * 省页签写回。
   */
  setOpenProv: ProvVoidFn
}

/**
 * 分值卡的整机 —— 出题、结果、落格三样都从这一个对象取,各内件不再各自穿一遍 props。
 */
export type ScoreCardPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 岗位语境。
   */
  ctx: ScoreContext

  /**
   * 官方分值表。
   */
  factors: PlanScoreFactor[]

  /**
   * 抽选记录。
   */
  draws: PlanDraw[]

  /**
   * 省 → 你的职业命中的具名通道名。
   */
  streams: Record<string, string>

  /**
   * 只评当前职位所在省。
   */
  targetMode: boolean

  /**
   * 正在出题(整卡撑满题卡)。
   */
  asking: boolean

  /**
   * 出结果区(答完之前整块不出:标题在、内容不在 = 看着像加载坏了)。
   */
  showResults: boolean

  /**
   * 出「你的条件」下拉网格。
   */
  inputsShown: boolean

  /**
   * 结果区标题。
   */
  title: string

  /**
   * 当前这一屏的题;null = 没题可出。
   */
  question: ExtraQuestion | null

  /**
   * 当前这一屏答过没有(「下一题」置灰按它)。
   */
  answered: boolean

  /**
   * 当前这一屏单选题的选中值;缺席 = 还没答。
   */
  picked?: string

  /**
   * 「上一题」钮上的字。
   */
  prevLabel: string

  /**
   * 「下一题」钮上的字。
   */
  nextLabel: string

  /**
   * 旁路收卷钮的字;缺席 = 最后一题,主钮本来就是「完成」。
   */
  doneLabel?: string

  /**
   * 多选题的那句灰字;缺席 = 不是多选题。
   */
  hint?: string

  /**
   * 回上一题(第一屏时退回结果页)。
   */
  onPrev?: ClickFn

  /**
   * 去下一题(最后一题走收卷出口)。
   */
  onNext: ClickFn

  /**
   * 旁路收卷。
   */
  onDone?: ClickFn

  /**
   * 单选题选中落格。
   */
  onPick: ExtraPickFn

  /**
   * 数字题落格。
   */
  onNumber: ScoreChangeFn

  /**
   * 「你的条件」网格的各格。
   */
  fields: ScoreField[]

  /**
   * 各省估分,目标省在前。
   */
  scores: PlanProvinceScore[]

  /**
   * 当前摊开的那个省。
   */
  activeProv: string

  /**
   * 换省页签。
   */
  onProv: ProvVoidFn

  /**
   * 同职业各省在招数。
   */
  byProv: Record<string, PlanJobCount>

  /**
   * 加分项勾选现状。
   */
  ticks: Record<string, boolean>

  /**
   * #305 推导出来的勾选(值来自基础卷答案,勾选框改不动它)。
   */
  derivedTicks: Record<string, boolean>

  /**
   * #304 offer 闸开着没有。
   */
  offerYes: boolean

  /**
   * 手上有没有 offer。
   */
  hasOffer: boolean

  /**
   * offer 勾选落格(答过标记同时置上)。
   */
  onOffer: BoolSetFn

  /**
   * 加分项落格总口。
   */
  acts: ScoreActs
}

/**
 * PnpScoreCard(省提名自评打分 + 跨省对照)的 props。
 */
export type PnpScoreCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 岗位语境(职业、TEER、目标省、时薪、城市、有没有 offer)。
   */
  ctx: ScoreContext

  /**
   * 官方分值表(分值全部来自 pnp_score_factors,前端一分都不许自己编)。
   */
  factors: PlanScoreFactor[]

  /**
   * 抽选记录(对照锚只能是官方事实)。
   */
  draws: PlanDraw[]

  /**
   * 基础卷答过的第一语言 CLB;缺席 = 没答过,走默认档。
   */
  profileClb?: number | null

  /**
   * 省 → 你的职业命中的具名通道名。抽选线按通道对照,对不上就不给差分结论。
   */
  streams?: Record<string, string>

  /**
   * 答题答案预填(决策页:同一个条件不问两遍);只作初值,卡内下拉仍可改。
   */
  initial?: Partial<PlanSelfProfile>

  /**
   * false = 纯结果卡(决策页:答题是唯一输入面,卡内不再出「你的条件」下拉;
   * 时薪/地区走 ctx 岗位事实)。缺省 true 保 /pathways 现行为。
   */
  inputs?: boolean

  /**
   * 决策页已经问过的条件不再重复问。
   */
  hiddenProfileInputs?: (keyof PlanSelfProfile)[]

  /**
   * 基础卷已经问过**范围**的条件(如 CLB 6-7):精确题只在范围内出选项;
   * 范围里只剩一个值就整题不问。
   */
  limits?: ScoreCardLimits

  /**
   * 只评当前职位所在省:标题与说明改成「补充条件」,不再暗示跨省排行榜。
   */
  targetMode?: boolean

  /**
   * PR 主问卷选完省份后继续使用同一题区;关闭时保留本组件状态并显示结果。
   */
  questionnaireActive?: boolean

  /**
   * 逐题进度上抛。
   */
  onQuestionnaireProgress?: ProgressFn

  /**
   * 整卷答完的出口。
   */
  onQuestionnaireComplete?: ClickFn

  /**
   * 第一屏「返回」的出口(它退回的是结果页,不是上一题)。
   */
  onQuestionnaireBack?: ClickFn

  /**
   * 逐题答案回显上抛(2026-08-13 Frank:「全都算成基本信息」)—— 分值表的题与基础卷
   * 一视同仁,页面把它们摆进同一片条件格子。
   */
  onQuestionnaireAnswers?: ScoreCardEchoFn

  /**
   * 点条件格直达那道题:nonce 变一次跳一次(只传 key 的话,点同一格第二次就不动了);
   * null = 没有待跳的格。
   */
  focusQuestion?: ScoreFocus | null
}

/**
 * areaIndexOf 的入参。
 */
export type AreaIndexIn = {
  /**
   * 用户填的城市;'' = 不知道,落保守默认档。
   */
  city: string
}

/**
 * storedPatchOf 的入参。
 */
export type StoredPatchIn = {
  /**
   * 存档里的那套条件(localStorage 与服务端档都可能被改坏,坏值宁可丢弃回预填)。
   */
  stored: Partial<PlanSelfProfile>
}

/**
 * mergeProfile 的入参。
 */
export type MergeProfileIn = {
  /**
   * 底子。
   */
  profile: PlanSelfProfile

  /**
   * 要盖上去的那几格。
   */
  patch: Partial<PlanSelfProfile>
}

/**
 * mergeProfAns 的入参。
 */
export type MergeProfAnsIn = {
  /**
   * 已经答过的那几格。
   */
  answered: Partial<PlanSelfProfile>

  /**
   * 这次新答的那一格。
   */
  patch: Partial<PlanSelfProfile>
}

/**
 * withFlag 的入参。
 */
export type WithFlagIn = {
  /**
   * 现有的勾选表。
   */
  map: Record<string, boolean>

  /**
   * 要改的那一格。
   */
  key: string

  /**
   * 勾上还是放下。
   */
  on: boolean

  /**
   * 同时要放下的那几格(同簇二选一)。
   */
  off: string[]
}

/**
 * withRow / withoutRow 的入参。
 */
export type WithRowIn = {
  /**
   * 现有的直选表。
   */
  map: Record<string, number>

  /**
   * 题 key。
   */
  key: string

  /**
   * 选中的官方行序号;null = 撤回这一格。
   */
  seq: number | null
}

/**
 * initialProfileOf 的入参。
 */
export type InitialProfileIn = {
  /**
   * 基础卷答过的第一语言 CLB;null = 没答过。
   */
  profileClb: number | null

  /**
   * 答案预填。
   */
  initial: Partial<PlanSelfProfile>

  /**
   * 选项范围。
   */
  limits: ScoreCardLimits

  /**
   * 分值卡存档里的那套条件。
   */
  stored: Partial<PlanSelfProfile>
}

/**
 * clampToRange 的入参。
 */
export type ClampRangeIn = {
  /**
   * 当前这一套条件。
   */
  profile: PlanSelfProfile

  /**
   * 选项范围。
   */
  limits: ScoreCardLimits
}

/**
 * nearestAgeOf 的入参。
 */
export type NearestAgeIn = {
  /**
   * 预填给的年龄(答题档位给的是 33 这类档中值,不一定在选项表里)。
   */
  age: number
}

/**
 * healedExtraOf 的入参。
 */
export type HealedExtraIn = {
  /**
   * 分值卡存档。
   */
  stored: PlanScoreStore

  /**
   * 这批官方表有没有把经验拆成两段。
   */
  splitWork: boolean
}

/**
 * wageRowAt 的入参。
 */
export type WageRowIn = {
  /**
   * 该省时薪因素的全部官方档位行。
   */
  rows: PlanScoreFactor[]

  /**
   * 用户填的时薪。
   */
  wage: number
}

/**
 * scoreAnchorOf 的入参。
 */
export type ScoreAnchorIn = {
  /**
   * 这个省的估分。
   */
  score: PlanProvinceScore

  /**
   * 抽选记录。
   */
  draws: PlanDraw[]

  /**
   * 你的职业在这个省命中的具名通道名。
   */
  matchedStream: string
}

/**
 * scoreProvincesOf 的入参。
 */
export type ScoreProvincesIn = {
  /**
   * 官方分值表(有表的省由数据层决定,加省不用改代码)。
   */
  factors: PlanScoreFactor[]

  /**
   * 目标省(排第一列,其余省作「换省」对照)。
   */
  province: string
}

/**
 * manualQuestionsOf 的入参。
 */
export type ManualQuestionsIn = {
  /**
   * 有表的省。
   */
  provinces: string[]

  /**
   * 官方分值表。
   */
  factors: PlanScoreFactor[]

  /**
   * 岗位语境。
   */
  ctx: ScoreContext
}

/**
 * rowAppliesOf 的入参。
 */
export type RowAppliesIn = {
  /**
   * 官方表的一行。
   */
  row: PlanScoreFactor

  /**
   * 5 位职业码;'' = 不知道。
   */
  noc: string
}

/**
 * inRangeOf 的入参。
 */
export type InRangeIn = {
  /**
   * 选项范围。
   */
  limits: ScoreCardLimits

  /**
   * 这道题的题名。
   */
  key: ScoreLimitKey

  /**
   * 这道题的全部候选值。
   */
  all: number[]
}

/**
 * deriveBonusOf 的入参。
 */
export type DeriveBonusIn = {
  /**
   * 基础卷答案(每轮渲染现读:答案改了,父级重渲即取到新值)。
   */
  basics: PlanAnswers

  /**
   * 这个因素属于哪个省。
   */
  prov: string

  /**
   * 官方因素名。
   */
  factor: string

  /**
   * 该因素的全部加分项行。
   */
  rows: PlanScoreFactor[]
}

/**
 * tickKeyOf 的入参。
 */
export type TickKeyIn = {
  /**
   * 两位省码。
   */
  prov: string

  /**
   * 官方因素名。
   */
  factor: string

  /**
   * 官方行序号。
   */
  seq: number
}

/**
 * bonusScreenKeyOf 的入参。
 */
export type BonusScreenKeyIn = {
  /**
   * 两位省码。
   */
  prov: string

  /**
   * 官方因素名。
   */
  factor: string

  /**
   * 这一屏从第几条起。
   */
  at: number
}

/**
 * provOfKeyOf 的入参。
 */
export type ProvOfKeyIn = {
  /**
   * 题 key。
   */
  key: string

  /**
   * 时薪那道题归哪个省;'' = 这批表里没有时薪规则。
   */
  wageProvince: string
}

/**
 * 出题机器的产物:题单 + 推导出来的勾选 + 推导格的回显。
 */
export type ScoreBuild = {
  /**
   * 逐屏的题。
   */
  questions: ExtraQuestion[]

  /**
   * #305 推导出来的勾选(推导值优先于存量勾选)。
   */
  derivedTicks: Record<string, boolean>

  /**
   * #305 推导格的回显(格式与答过的题一致,恒为已填)。
   */
  derivedEcho: ScoreCardEchoRow[]
}

/**
 * extraQuestionsOf 的入参 —— 出题要看的全部事实与落格口。
 */
export type ExtraQuestionsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 岗位语境。
   */
  ctx: ScoreContext

  /**
   * 官方分值表。
   */
  factors: PlanScoreFactor[]

  /**
   * 有表的省。
   */
  provinces: string[]

  /**
   * 要用户自己直选档位的那几道题。
   */
  manual: ManualQuestion[]

  /**
   * 决策页已经问过、这里不再问的条件。
   */
  hidden: (keyof PlanSelfProfile)[]

  /**
   * 选项范围。
   */
  limits: ScoreCardLimits

  /**
   * 这批官方表有没有把经验拆成两段。
   */
  splitWork: boolean

  /**
   * 当前这一套条件。
   */
  profile: PlanSelfProfile

  /**
   * 官方档位直选现状。
   */
  rowAnswers: Record<string, number>

  /**
   * 加分项勾选现状。
   */
  ticks: Record<string, boolean>

  /**
   * 时薪。
   */
  wage: number

  /**
   * BC 工作地区档序。
   */
  areaI: number

  /**
   * #304 offer 闸开着没有。
   */
  offerYes: boolean

  /**
   * 基础卷答案。
   */
  basics: PlanAnswers

  /**
   * 时薪那道题归哪个省;'' = 这批表里没有时薪规则。
   */
  wageProvince: string

  /**
   * 落格总口。
   */
  acts: ScoreActs
}

/**
 * 出题机器各段的入参:要看的事实 + 正在攒的产物。
 */
export type ScoreBuildIn = {
  /**
   * 要看的全部事实与落格口。
   */
  x: ExtraQuestionsIn

  /**
   * 正在攒的产物。
   */
  build: ScoreBuild
}

/**
 * 逐省出加分题的入参。
 */
export type ProvBonusIn = {
  /**
   * 要看的全部事实与落格口。
   */
  x: ExtraQuestionsIn

  /**
   * 正在攒的产物。
   */
  build: ScoreBuild

  /**
   * 这一轮在出哪个省。
   */
  prov: string
}

/**
 * 逐组出加分题的入参。
 */
export type BonusGroupIn = {
  /**
   * 要看的全部事实与落格口。
   */
  x: ExtraQuestionsIn

  /**
   * 正在攒的产物。
   */
  build: ScoreBuild

  /**
   * 这一轮在出哪个省。
   */
  prov: string

  /**
   * 官方因素名(组名)。
   */
  factor: string

  /**
   * 这一组的全部加分项行。
   */
  rows: PlanScoreFactor[]
}

/**
 * 一屏加分题的入参。
 */
export type BonusChunkIn = {
  /**
   * 要看的全部事实与落格口。
   */
  x: ExtraQuestionsIn

  /**
   * 正在攒的产物。
   */
  build: ScoreBuild

  /**
   * 这一轮在出哪个省。
   */
  prov: string

  /**
   * 官方因素名(组名)。
   */
  factor: string

  /**
   * 这一屏的那几条。
   */
  chunk: PlanScoreFactor[]

  /**
   * 这一屏从整组的第几条起(题 key 的第三段)。
   */
  at: number
}

/**
 * pushChoiceScreen 的入参:选项少于两个的题不占一屏(那是在请人确认一件已知的事)。
 */
export type ChoiceScreenIn = {
  /**
   * 正在攒的产物。
   */
  build: ScoreBuild

  /**
   * 题 key。
   */
  key: string

  /**
   * 题干。
   */
  title: string

  /**
   * 选项。
   */
  choices: ExtraChoice[]

  /**
   * 条件格回显用的短名;缺席 = 用题干。
   */
  echoLabel?: string
}

/**
 * derivedEchoOf 的入参。
 */
export type DerivedEchoIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 这一组属于哪个省。
   */
  prov: string

  /**
   * 官方因素名。
   */
  factor: string

  /**
   * 这一组的全部加分项行。
   */
  rows: PlanScoreFactor[]

  /**
   * 推导出来的逐行成立与否。
   */
  derived: Record<number, boolean>
}

/**
 * clusterOf / siblingsOf 里一屏内的二选一簇号。
 */
export type ClusterIn = {
  /**
   * 这一屏的那几条。
   */
  chunk: PlanScoreFactor[]
}

/**
 * siblingsOf 的入参。
 */
export type SiblingsIn = {
  /**
   * 这一屏的那几条。
   */
  chunk: PlanScoreFactor[]

  /**
   * 逐条的簇号。
   */
  cluster: number[]

  /**
   * 当前这一条在屏内的序号。
   */
  at: number

  /**
   * 这一屏属于哪个省。
   */
  prov: string
}

/**
 * echoRowsOf 的入参。
 */
export type EchoRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 逐屏的题。
   */
  questions: ExtraQuestion[]

  /**
   * 翻过 / 选过的题。
   */
  extraAnswered: Record<string, boolean>

  /**
   * 时薪那道题归哪个省。
   */
  wageProvince: string

  /**
   * #305 推导格的回显。
   */
  derivedEcho: ScoreCardEchoRow[]
}

/**
 * echoValueOf 的入参。
 */
export type EchoValueIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 这一道题。
   */
  question: ExtraQuestion
}

/**
 * echoLabelOf 的入参。
 */
export type EchoLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一道题。
   */
  question: ExtraQuestion

  /**
   * 逐屏的题(判同省内有没有撞名)。
   */
  questions: ExtraQuestion[]

  /**
   * 这一道题归哪个省。
   */
  prov: string

  /**
   * 时薪那道题归哪个省。
   */
  wageProvince: string
}

/**
 * effTicksOf 的入参。
 */
export type EffTicksIn = {
  /**
   * 存量勾选。
   */
  ticks: Record<string, boolean>

  /**
   * #305 推导出来的勾选(优先于存量)。
   */
  derivedTicks: Record<string, boolean>

  /**
   * #304 offer 闸开着没有。
   */
  offerYes: boolean
}

/**
 * provinceScoresOf 的入参。
 */
export type ProvinceScoresIn = {
  /**
   * 有表的省。
   */
  provinces: string[]

  /**
   * 官方分值表。
   */
  factors: PlanScoreFactor[]

  /**
   * 当前这一套条件。
   */
  profile: PlanSelfProfile

  /**
   * 算分用的**有效**勾选。
   */
  effTicks: Record<string, boolean>

  /**
   * 时薪。
   */
  wage: number

  /**
   * BC 工作地区档序。
   */
  areaI: number

  /**
   * #304 offer 闸开着没有。
   */
  offerYes: boolean

  /**
   * 官方档位直选现状。
   */
  rowAnswers: Record<string, number>

  /**
   * 岗位语境。
   */
  ctx: ScoreContext
}

/**
 * 逐省算 overrides 的入参。
 */
export type OverridesIn = {
  /**
   * 这个省的官方分值行。
   */
  mine: PlanScoreFactor[]

  /**
   * 官方分值表全量(判这批表里到底有没有时薪规则)。
   */
  factors: PlanScoreFactor[]

  /**
   * 两位省码。
   */
  prov: string

  /**
   * 时薪。
   */
  wage: number

  /**
   * BC 工作地区档序。
   */
  areaI: number

  /**
   * #304 offer 闸开着没有。
   */
  offerYes: boolean

  /**
   * 官方档位直选现状。
   */
  rowAnswers: Record<string, number>

  /**
   * 岗位语境。
   */
  ctx: ScoreContext
}

/**
 * 逐因素落 override 的入参。
 */
export type OverrideRowIn = {
  /**
   * 攒到一半的 overrides。
   */
  out: Record<string, PlanScoreOverride>

  /**
   * 要看的那些事实。
   */
  x: OverridesIn

  /**
   * 官方因素名。
   */
  name: string
}

/**
 * bonusListOf 的入参。
 */
export type BonusListIn = {
  /**
   * 官方分值表。
   */
  factors: PlanScoreFactor[]

  /**
   * 两位省码。
   */
  prov: string

  /**
   * #304 offer 闸开着没有。
   */
  offerYes: boolean

  /**
   * #305 推导出来的勾选(推导出的因子不摆勾选框,值由基础卷答案定)。
   */
  derivedTicks: Record<string, boolean>
}

/**
 * activeProvOfScores 的入参。
 */
export type ActiveScoreProvIn = {
  /**
   * 各省估分。
   */
  scores: PlanProvinceScore[]

  /**
   * 用户点过的省;null = 还没点过。
   */
  openProv: string | null

  /**
   * 目标省。
   */
  target: string
}

/**
 * scoreFieldsOf 的入参。
 */
export type ScoreFieldsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 官方分值表。
   */
  factors: PlanScoreFactor[]

  /**
   * 各省估分(BC 地区那一格只在它真进了分项时才摆)。
   */
  scores: PlanProvinceScore[]

  /**
   * 要用户自己直选档位的那几道题。
   */
  manual: ManualQuestion[]

  /**
   * 决策页已经问过、这里不再问的条件。
   */
  hidden: (keyof PlanSelfProfile)[]

  /**
   * 这批官方表有没有把经验拆成两段。
   */
  splitWork: boolean

  /**
   * 当前这一套条件。
   */
  profile: PlanSelfProfile

  /**
   * 官方档位直选现状。
   */
  rowAnswers: Record<string, number>

  /**
   * 时薪。
   */
  wage: number

  /**
   * BC 工作地区档序。
   */
  areaI: number

  /**
   * 落格总口。
   */
  acts: ScoreActs
}

/**
 * 逐格攒「你的条件」的入参。
 */
export type ScoreFieldPushIn = {
  /**
   * 攒到一半的那几格。
   */
  out: ScoreField[]

  /**
   * 要看的那些事实与落格口。
   */
  x: ScoreFieldsIn
}

/**
 * 官方档位行 → 下拉选项的入参。
 */
export type RowOptionsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 官方档位行。
   */
  rows: PlanScoreFactor[]
}

/**
 * makeProfilePick / makeProfileField 的入参。
 */
export type ProfilePickMakeIn = {
  /**
   * 落格总口。
   */
  acts: ScoreActs

  /**
   * 要落的那一格。
   */
  patch: Partial<PlanSelfProfile>
}

/**
 * makeRowPick 的入参。
 */
export type RowPickMakeIn = {
  /**
   * 落格总口。
   */
  acts: ScoreActs

  /**
   * 题 key。
   */
  key: string

  /**
   * 选中的官方行序号。
   */
  seq: number
}

/**
 * makeAreaPick / makeNumberPick 的入参。
 */
export type NumberPickMakeIn = {
  /**
   * 要落的值。
   */
  value: number

  /**
   * 落格口。
   */
  set: NumSetFn
}

/**
 * makeTickSet / makeTickToggle 的入参。
 */
export type TickSetMakeIn = {
  /**
   * 落格总口。
   */
  acts: ScoreActs

  /**
   * 勾选键。
   */
  key: string

  /**
   * 同簇的其余条。
   */
  siblings: string[]

  /**
   * 勾上还是放下(makeTickSet 用;makeTickToggle 由调用方给)。
   */
  on: boolean
}

/**
 * makeFieldPick 的入参(下拉一格的落格)。
 */
export type FieldPickMakeIn = {
  /**
   * 落格总口。
   */
  acts: ScoreActs

  /**
   * 这一格对应 profile 的哪个键。
   */
  field: keyof PlanSelfProfile
}

/**
 * makeRowFieldPick 的入参(官方档位直选那一格的落格)。
 */
export type RowFieldPickMakeIn = {
  /**
   * 落格总口。
   */
  acts: ScoreActs

  /**
   * 题 key。
   */
  key: string
}

/**
 * makeExtraPick 的入参。
 */
export type ExtraPickMakeIn = {
  /**
   * 当前这一屏的题;null = 没题可出。
   */
  question: ExtraQuestion | null

  /**
   * 落格总口。
   */
  acts: ScoreActs
}

/**
 * makeExtraNumber 的入参。
 */
export type ExtraNumberMakeIn = {
  /**
   * 当前这一屏的题;null = 没题可出。
   */
  question: ExtraQuestion | null
}

/**
 * makeExtraNext / makeExtraPrev 的入参。
 */
export type ExtraNavMakeIn = {
  /**
   * 当前题序。
   */
  at: number

  /**
   * 一共几题。
   */
  total: number

  /**
   * 题序写回。
   */
  setAt: NumSetFn

  /**
   * 当前这一屏的题;null = 没题可出。
   */
  question: ExtraQuestion | null

  /**
   * 落格总口。
   */
  acts: ScoreActs

  /**
   * 整卷答完的出口。
   */
  onComplete?: ClickFn

  /**
   * 第一屏「返回」的出口。
   */
  onBack?: ClickFn
}

/**
 * makeOfferAnswer 的入参。
 */
export type OfferAnswerMakeIn = {
  /**
   * offer 写回。
   */
  setHasOffer: BoolSetFn

  /**
   * 真答过标记写回。
   */
  setOfferTouched: BoolSetFn
}

/**
 * scoreActsOf 的入参。
 */
export type ScoreActsIn = {
  /**
   * 「你的条件」的状态格。
   */
  profile: ScoreProfilePanel

  /**
   * 逐题答案的状态格。
   */
  answers: ScoreAnswerPanel
}

/**
 * usePnpScoreCard 里各 effect 的入参。
 */
export type ScoreSyncIn = {
  /**
   * 「你的条件」的状态格。
   */
  profile: ScoreProfilePanel

  /**
   * 逐题答案的状态格。
   */
  answers: ScoreAnswerPanel

  /**
   * 岗位语境。
   */
  ctx: ScoreContext

  /**
   * 这批官方表有没有把经验拆成两段。
   */
  splitWork: boolean
}

/**
 * 分值卡存档回写的入参。
 */
export type ScoreStoreIn = {
  /**
   * 「你的条件」的状态格。
   */
  profile: ScoreProfilePanel

  /**
   * 逐题答案的状态格。
   */
  answers: ScoreAnswerPanel
}

/**
 * makeByProvEffect 的入参。
 */
export type ByProvEffectIn = {
  /**
   * 5 位职业码;'' = 无岗态,不查。
   */
  noc: string

  /**
   * 在招数写回。
   */
  setByProv: ByProvSetFn
}

/**
 * 同职业各省在招数的写回口。
 */
export type ByProvSetFn = (rows: Record<string, PlanJobCount>) => void

/**
 * scoreGapOf / scoreGapTextOf / scoreGapClsOf 的入参。
 */
export type ScoreGapIn = {
  /**
   * 对照线;null = 该省没有可用的线。
   */
  line: number | null

  /**
   * 你在这个省的合计分。
   */
  total: number
}

/**
 * scoreGapTextOf 的入参。
 */
export type ScoreGapTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 对照线;null = 该省没有可用的线。
   */
  line: number | null

  /**
   * 你在这个省的合计分。
   */
  total: number
}

/**
 * offerGainOf 的入参。
 */
export type OfferGainIn = {
  /**
   * 这个省的估分。
   */
  score: PlanProvinceScore

  /**
   * 官方分值表。
   */
  factors: PlanScoreFactor[]

  /**
   * 这个省是不是「换省」对照(目标省自己不谈换省)。
   */
  switchable: boolean
}

/**
 * lineNoteTextOf / lineNoteClsOf 的入参。
 */
export type LineNoteIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这个省的估分。
   */
  score: PlanProvinceScore

  /**
   * 对照锚。
   */
  anchor: ScoreAnchor
}

/**
 * partTitleOf / partMaxTextOf 的入参。
 */
export type ScorePartIn = {
  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 这一块分。
   */
  part: PlanScorePart
}

/**
 * ScoreQuestion(答题屏)的 props。
 */
export type ScoreQuestionIn = {
  /**
   * 分值卡整机。
   */
  d: ScoreCardPanel

  /**
   * 当前这一屏的题。
   */
  q: ExtraQuestion
}

/**
 * ScoreInputs(「你的条件」下拉网格)的 props。
 */
export type ScoreInputsIn = {
  /**
   * 分值卡整机。
   */
  d: ScoreCardPanel
}

/**
 * ScoreCell(「你的条件」一格)的 props。
 */
export type ScoreCellIn = {
  /**
   * 这一格。
   */
  f: ScoreField
}

/**
 * ScoreOptionItem(下拉一个选项)的 props。
 */
export type ScoreOptionItemIn = {
  /**
   * 这一项。
   */
  o: ScoreOption
}

/**
 * ProvinceLine(对照结论块)的 props。
 */
export type ProvinceLineIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这个省的估分。
   */
  s: PlanProvinceScore

  /**
   * 对照锚。
   */
  anchor: ScoreAnchor
}

/**
 * 一道单选题交给答题壳的一个选项(与 quiz 域的选项行同形,本域自抄)。
 */
export type ScoreChoiceRow = {
  /**
   * 选项的值(也是 radio 的值)。
   */
  value: string

  /**
   * 选项文字。
   */
  text: string
}

/**
 * 结果区加分项网格里的一条。
 */
export type BonusTickRow = {
  /**
   * 这一条的标识(也是 React key)。
   */
  key: string

  /**
   * 条目文字。
   */
  text: string

  /**
   * 该条的分值;null = 官方没给分。
   */
  pts: number | null

  /**
   * 勾没勾上。
   */
  on: boolean

  /**
   * 勾选落格。
   */
  toggle: BoolSetFn
}

/**
 * bonusTicksOf 的入参。
 */
export type BonusTicksMakeIn = {
  /**
   * 分值卡整机。
   */
  d: ScoreCardPanel

  /**
   * 这个省的估分。
   */
  s: PlanProvinceScore
}

/**
 * streamOfProv 的入参。
 */
export type StreamOfProvIn = {
  /**
   * 省 → 通道名的表。
   */
  streams: Record<string, string>

  /**
   * 两位省码。
   */
  prov: string
}

/**
 * makeCheckChange 的入参。
 */
export type CheckChangeIn = {
  /**
   * 勾选落格。
   */
  toggle: BoolSetFn
}

/**
 * makeSelectChange / makeInputChange 的入参。
 */
export type SelectChangeIn = {
  /**
   * 这一格的落格。
   */
  onPick: ScoreFieldPickFn
}

/**
 * 下拉变更口(签名由 React 定死)。
 */
export type ScoreSelectChangeFn = (e: React.ChangeEvent<HTMLSelectElement>) => void

/**
 * 勾选变更口(签名由 React 定死)。
 */
export type ScoreCheckChangeFn = (e: React.ChangeEvent<HTMLInputElement>) => void

/**
 * switchTextOf 的入参。
 */
export type SwitchTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这个省的估分。
   */
  score: PlanProvinceScore

  /**
   * 拿到 offer 能加几分。
   */
  gain: number
}

/**
 * offerTickRowOf 的入参。
 */
export type OfferTickRowIn = {
  /**
   * 分值卡整机。
   */
  d: ScoreCardPanel

  /**
   * 两位省码。
   */
  prov: string
}

/**
 * ScoreResults(各省估分结果区)的 props。
 */
export type ScoreResultsIn = {
  /**
   * 分值卡整机。
   */
  d: ScoreCardPanel
}

/**
 * ProvincePanel(一个省的面板)的 props。
 */
export type ProvincePanelIn = {
  /**
   * 分值卡整机。
   */
  d: ScoreCardPanel

  /**
   * 这个省的估分。
   */
  s: PlanProvinceScore
}

/**
 * ProvinceTotal(合计分与差距那一行)的 props。
 */
export type ProvinceTotalIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这个省的估分。
   */
  s: PlanProvinceScore

  /**
   * 对照线;null = 该省没有可用的线。
   */
  line: number | null
}

/**
 * BonusTicks(加分项勾选网格)的 props。
 */
export type BonusTicksIn = {
  /**
   * 分值卡整机。
   */
  d: ScoreCardPanel

  /**
   * 这个省的估分。
   */
  s: PlanProvinceScore
}

/**
 * BonusTick(加分项一条)的 props。
 */
export type BonusTickIn = {
  /**
   * 勾没勾上。
   */
  on: boolean

  /**
   * 勾选落格。
   */
  onToggle: BoolSetFn

  /**
   * 条目文字(官方原文或译名)。
   */
  text: string

  /**
   * 该条的分值;null = 官方没给分。
   */
  pts: number | null
}

/**
 * ProvinceResult(展开后的明细)的 props。
 */
export type ProvinceResultIn = {
  /**
   * 分值卡整机。
   */
  d: ScoreCardPanel

  /**
   * 这个省的估分。
   */
  s: PlanProvinceScore
}

/**
 * ProvinceParts(分项网格)的 props。
 */
export type ProvincePartsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 这个省的估分。
   */
  s: PlanProvinceScore
}

/**
 * ProvincePart(分项一行的三格)的 props。
 */
export type ProvincePartIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 这一块分。
   */
  p: PlanScorePart
}

/**
 * ScoreSources(官方出处那一行)的 props。
 */
export type ScoreSourcesIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 各省估分。
   */
  scores: PlanProvinceScore[]
}

/**
 * ScoreSource(一个省的官方出处链接)的 props。
 */
export type ScoreSourceIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这个省的估分。
   */
  s: PlanProvinceScore
}

/**
 * 「你的条件」里 profile 那几格的数字键(学历不在其中,它是字符串档)。
 */
export type ScoreNumKey = 'expRecent' | 'expOlder' | 'clb1' | 'clb2' | 'age'

/**
 * numPatchOf 的入参。
 */
export type NumPatchIn = {
  /**
   * 要落的那一格。
   */
  key: ScoreNumKey

  /**
   * 要落的值。
   */
  value: number
}

/**
 * wageRowHitOf 的入参。
 */
export type WageRowHitIn = {
  /**
   * 官方的一条时薪档位行。
   */
  row: PlanScoreFactor

  /**
   * 用户填的时薪。
   */
  wage: number
}

/**
 * extraKeptOf 的入参。
 */
export type ExtraKeptIn = {
  /**
   * 已答标记的键。
   */
  key: string

  /**
   * 分值卡存档。
   */
  stored: PlanScoreStore

  /**
   * 这批官方表有没有把经验拆成两段。
   */
  splitWork: boolean
}

/**
 * prefillOkOf 的入参。
 */
export type PrefillOkIn = {
  /**
   * profile 那一格的键。
   */
  key: string

  /**
   * 这批官方表有没有把经验拆成两段。
   */
  splitWork: boolean
}

/**
 * profileFilledOf 的入参。
 */
export type ProfileFilledIn = {
  /**
   * 存档里的那套条件。
   */
  profile: Partial<PlanSelfProfile>

  /**
   * 要看的那一格。
   */
  key: string
}

/**
 * makeTargetFirst 的入参。
 */
export type TargetFirstIn = {
  /**
   * 目标省(排第一列)。
   */
  province: string
}

/**
 * factorNamesOf / provFactorsOf 的入参。
 */
export type ProvFactorsIn = {
  /**
   * 官方分值表。
   */
  factors: PlanScoreFactor[]

  /**
   * 两位省码。
   */
  prov: string
}

/**
 * rowsOfFactorOf 的入参。
 */
export type RowsOfFactorIn = {
  /**
   * 官方分值表。
   */
  factors: PlanScoreFactor[]

  /**
   * 两位省码。
   */
  prov: string

  /**
   * 官方因素名。
   */
  name: string
}

/**
 * manualAskedOf 的入参。
 */
export type ManualAskedIn = {
  /**
   * 官方因素名。
   */
  name: string

  /**
   * 两位省码。
   */
  prov: string

  /**
   * 岗位语境。
   */
  ctx: ScoreContext
}

/**
 * provFactorKeyOf 的入参。
 */
export type ProvFactorKeyIn = {
  /**
   * 两位省码。
   */
  prov: string

  /**
   * 官方因素名。
   */
  factor: string
}

/**
 * profileAskedOf 的入参。
 */
export type ProfileAskedIn = {
  /**
   * 决策页已经问过、这里不再问的条件。
   */
  hidden: (keyof PlanSelfProfile)[]

  /**
   * 这一格对应 profile 的哪个键。
   */
  field: keyof PlanSelfProfile

  /**
   * 官方分值表。
   */
  factors: PlanScoreFactor[]

  /**
   * 官方表里哪几个因素名要它(有一个在就问)。
   */
  names: string[]
}

/**
 * yearChoicesOf / numChoicesOf 的入参。
 */
export type NumChoicesIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 候选值。
   */
  values: number[]

  /**
   * 当前值。
   */
  current: number

  /**
   * 这一格对应 profile 的哪个键。
   */
  field: ScoreNumKey

  /**
   * 落格总口。
   */
  acts: ScoreActs
}

/**
 * yearTextOf / clbTextOf 的入参。
 */
export type NumTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一档的值。
   */
  n: number
}

/**
 * rowChoicesOf 的入参。
 */
export type RowChoicesIn = {
  /**
   * 要看的全部事实与落格口。
   */
  x: ExtraQuestionsIn

  /**
   * 题 key。
   */
  key: string

  /**
   * 该因素的官方档位行。
   */
  rows: PlanScoreFactor[]
}

/**
 * areaChoicesOf 的入参。
 */
export type AreaChoicesIn = {
  /**
   * 要看的全部事实与落格口。
   */
  x: ExtraQuestionsIn

  /**
   * BC 工作地区的官方档位行。
   */
  rows: PlanScoreFactor[]
}

/**
 * 逐省落 override 的入参。
 */
export type OverridePushIn = {
  /**
   * 攒到一半的 overrides。
   */
  out: Record<string, PlanScoreOverride>

  /**
   * 要看的那些事实。
   */
  x: OverridesIn
}

/**
 * lineEmptyTextOf / lineCutTextOf 的入参。
 */
export type LineTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 对照锚。
   */
  anchor: ScoreAnchor
}

/**
 * switchTotalOf 的入参。
 */
export type SwitchTotalIn = {
  /**
   * 这个省的估分。
   */
  score: PlanProvinceScore

  /**
   * 拿到 offer 能加几分。
   */
  gain: number
}

/**
 * useScoreProfileState 的入参。
 */
export type ScoreProfileStateIn = {
  /**
   * 基础卷答过的第一语言 CLB;null = 没答过。
   */
  profileClb: number | null

  /**
   * 答案预填。
   */
  initial: Partial<PlanSelfProfile>

  /**
   * 选项范围。
   */
  limits: ScoreCardLimits
}

/**
 * useScoreAnswerState 的入参。
 */
export type ScoreAnswerStateIn = {
  /**
   * 岗位语境。
   */
  ctx: ScoreContext

  /**
   * 这批官方表有没有把经验拆成两段。
   */
  splitWork: boolean
}

/**
 * useScorePager 的入参:答题段的两处「进段就对位」。
 */
export type ScorePagerIn = {
  /**
   * 正在出题。
   */
  showQuestionnaire: boolean

  /**
   * 逐屏的题。
   */
  questions: ExtraQuestion[]

  /**
   * 翻过 / 选过的题。
   */
  extraAnswered: Record<string, boolean>

  /**
   * 点条件格直达那道题;null = 没有待跳的格。
   */
  focus: ScoreFocus | null

  /**
   * 题序写回。
   */
  setAt: NumSetFn
}

/**
 * sameForRowsOf 的入参。
 */
export type SameForRowsIn = {
  /**
   * 这一组的行。
   */
  rows: PlanScoreFactor[]

  /**
   * 逐行都落这个结论。
   */
  on: boolean
}

/**
 * hitLabelsOf 的入参。
 */
export type HitLabelsIn = {
  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 命中的那几条。
   */
  rows: PlanScoreFactor[]
}

/**
 * factorTitleOf 的入参。
 */
export type FactorTitleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 官方因素名。
   */
  factor: string
}

/**
 * numChoiceTextOf / numOptionsOf 里一格的键与值。
 */
export type NumChoiceTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一档的值。
   */
  n: number

  /**
   * 这一格对应 profile 的哪个键。
   */
  field: ScoreNumKey
}

/**
 * makeTickToggle 的入参。
 */
export type TickToggleMakeIn = {
  /**
   * 落格总口。
   */
  acts: ScoreActs

  /**
   * 勾选键。
   */
  key: string

  /**
   * 同簇的其余条。
   */
  siblings: string[]
}

/**
 * manualWageSkippedOf 的入参。
 */
export type ManualWageSkipIn = {
  /**
   * 要看的全部事实与落格口。
   */
  x: ExtraQuestionsIn

  /**
   * 这道直选题。
   */
  q: ManualQuestion
}

/**
 * bonusRowsOf 的入参。
 */
export type BonusRowsIn = {
  /**
   * 官方分值表。
   */
  factors: PlanScoreFactor[]

  /**
   * 两位省码。
   */
  prov: string

  /**
   * #304 offer 闸开着没有。
   */
  offerYes: boolean

  /**
   * 岗位语境(行级适用范围要按职业码判)。
   */
  ctx: ScoreContext
}

/**
 * bonusGroupRowsOf 的入参。
 */
export type BonusGroupRowsIn = {
  /**
   * 这个省要出的加分项行。
   */
  bonus: PlanScoreFactor[]

  /**
   * 组名(官方因素名)。
   */
  factor: string
}

/**
 * yesNoChoicesOf 的入参。
 */
export type YesNoChoicesIn = {
  /**
   * 这一屏。
   */
  c: BonusChunkIn

  /**
   * 这一屏里唯一那一条。
   */
  row: PlanScoreFactor

  /**
   * 逐条的簇号。
   */
  cluster: number[]
}

/**
 * bonusChecksOf 的入参。
 */
export type BonusChecksIn = {
  /**
   * 这一屏。
   */
  c: BonusChunkIn

  /**
   * 逐条的簇号。
   */
  cluster: number[]
}

/**
 * wagePointsOf 的入参。
 */
export type WagePointsIn = {
  /**
   * 官方的时薪规则行。
   */
  rule: PlanScoreFactor

  /**
   * 时薪。
   */
  wage: number
}

/**
 * pushDigitOverride 的入参。
 */
export type DigitOverrideIn = {
  /**
   * 攒到一半的 overrides。
   */
  out: Record<string, PlanScoreOverride>

  /**
   * 要看的那些事实。
   */
  x: OverridesIn

  /**
   * 官方因素名。
   */
  name: string

  /**
   * 要命中的那个数(TEER 档或职业大类)。
   */
  digit: number
}

/**
 * 一个省页签(与 tabs 域的 TabItem 同形,本域自抄)。
 */
export type ScoreTabItem = {
  /**
   * 页签身份键(也进 aria id)。
   */
  key: string

  /**
   * 页签文字。
   */
  label: string
}

/**
 * numOptionsOf 的入参。
 */
export type NumOptionsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 候选值。
   */
  values: number[]

  /**
   * 这一格对应 profile 的哪个键。
   */
  field: ScoreNumKey
}

/**
 * areaOptionsOf 的入参。
 */
export type AreaOptionsIn = {
  /**
   * 界面语。
   */
  lang: PlanLang

  /**
   * BC 工作地区的官方档位行。
   */
  rows: PlanScoreFactor[]
}

/**
 * makeNumberFieldPick 的入参。
 */
export type NumberFieldPickIn = {
  /**
   * 落格口。
   */
  set: NumSetFn
}

/**
 * 三颗钮上的字的入参。
 */
export type ExtraLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前题序。
   */
  at: number

  /**
   * 一共几题。
   */
  total: number
}

/**
 * extraHintOf 的入参。
 */
export type ExtraHintIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前这一屏的题;null = 没题可出。
   */
  question: ExtraQuestion | null
}

/**
 * extraActiveAnsweredOf / extraPickedOf 的入参。
 */
export type ExtraActiveIn = {
  /**
   * 当前这一屏的题;null = 没题可出。
   */
  question: ExtraQuestion | null

  /**
   * 翻过 / 选过的题。
   */
  answered: Record<string, boolean>
}

/**
 * scoreTitleOf 的入参。
 */
export type ScoreTitleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 只评当前职位所在省。
   */
  targetMode: boolean
}

/**
 * 分值卡整机的装配入参:props、两个状态格、落格总口与几样算好的事实。
 */
export type ScoreCardBuildIn = {
  /**
   * 组件收到的 props。
   */
  props: PnpScoreCardIn

  /**
   * 「你的条件」的状态格。
   */
  profile: ScoreProfilePanel

  /**
   * 逐题答案的状态格。
   */
  answers: ScoreAnswerPanel

  /**
   * 落格总口。
   */
  acts: ScoreActs

  /**
   * 同职业各省在招数。
   */
  byProv: Record<string, PlanJobCount>

  /**
   * 决策页已经问过、这里不再问的条件。
   */
  hidden: (keyof PlanSelfProfile)[]

  /**
   * 选项范围。
   */
  limits: ScoreCardLimits

  /**
   * 这批官方表有没有把经验拆成两段。
   */
  splitWork: boolean
}

/**
 * 装配整机时算一遍就够的几样事实。
 */
export type ScoreCardCore = {
  /**
   * 有表的省,目标省在前。
   */
  provinces: string[]

  /**
   * 要用户自己直选档位的那几道题。
   */
  manual: ManualQuestion[]

  /**
   * 时薪那道题归哪个省;'' = 这批表里没有时薪规则。
   */
  wageProvince: string

  /**
   * #304 offer 闸开着没有。
   */
  offerYes: boolean

  /**
   * 题单 + 推导勾选 + 推导格回显。
   */
  build: ScoreBuild

  /**
   * 算分用的有效勾选。
   */
  effTicks: Record<string, boolean>

  /**
   * 各省估分。
   */
  scores: PlanProvinceScore[]
}

/**
 * 分值卡的整机与它上抛要用的几个量。
 */
export type ScoreCardMachine = {
  /**
   * 各内件消费的整机。
   */
  panel: ScoreCardPanel

  /**
   * 逐屏的题。
   */
  questions: ExtraQuestion[]

  /**
   * 逐题答案回显。
   */
  echo: ScoreCardEchoRow[]

  /**
   * 已答几题。
   */
  done: number

  /**
   * 一共几题。
   */
  total: number

  /**
   * 正在出题。
   */
  showQuestionnaire: boolean
}

/**
 * scoreCardPanelOf 的入参。
 */
export type PanelBuildIn = {
  /**
   * 装配入参。
   */
  x: ScoreCardBuildIn

  /**
   * 算好的那几样事实。
   */
  core: ScoreCardCore

  /**
   * 一共几题。
   */
  total: number

  /**
   * 已答几题。
   */
  done: number

  /**
   * 正在出题。
   */
  showQuestionnaire: boolean
}

/**
 * showResultsOf 的入参。
 */
export type ShowResultsIn = {
  /**
   * 组件收到的 props。
   */
  p: PnpScoreCardIn

  /**
   * 正在出题。
   */
  showQuestionnaire: boolean

  /**
   * 已答几题。
   */
  done: number

  /**
   * 一共几题。
   */
  total: number
}

/**
 * answeredCountOf / allAnsweredOf 的入参。
 */
export type AnsweredCountIn = {
  /**
   * 逐屏的题。
   */
  questions: ExtraQuestion[]

  /**
   * 翻过 / 选过的题。
   */
  answered: Record<string, boolean>
}

/**
 * questionAt 的入参。
 */
export type QuestionAtIn = {
  /**
   * 逐屏的题。
   */
  questions: ExtraQuestion[]

  /**
   * 题序。
   */
  at: number
}

/**
 * questionIndexOf 的入参。
 */
export type QuestionIndexIn = {
  /**
   * 逐屏的题。
   */
  questions: ExtraQuestion[]

  /**
   * 要找的题 key。
   */
  key: string
}

/**
 * useScoreEcho 的入参:三个上抛口与它们的量。
 */
export type ScoreEchoIn = {
  /**
   * 逐题答案回显。
   */
  rows: ScoreCardEchoRow[]

  /**
   * 已答几题。
   */
  done: number

  /**
   * 一共几题。
   */
  total: number

  /**
   * 正在出题。
   */
  showQuestionnaire: boolean

  /**
   * 逐题进度上抛。
   */
  onProgress?: ProgressFn

  /**
   * 逐题答案回显上抛。
   */
  onAnswers?: ScoreCardEchoFn

  /**
   * 整卷答完的出口。
   */
  onComplete?: ClickFn
}
