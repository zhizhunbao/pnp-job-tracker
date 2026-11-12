/**
 * 我的岗位域子桶 recommend 的形状:今日推荐的推荐指数(档案、通道对照、门槛行、各项结论、排序)。
 * 2026-11-11 任务书第 41 到 46 条立;子桶不取父桶,形状本桶自声明(推荐一行只声明真读的几格)。
 *
 * @author Frank
 * @time 2026-11-11 23:00:00
 */
import type { Db } from '@/lib/db'

/**
 * 推荐一行里本桶真读的几格(父桶的 PickRow 是它的超集)。
 */
export type RankRow = {
  /**
   * 职位 id。
   */
  id: number

  /**
   * 省码。
   */
  province: string

  /**
   * 城市。
   */
  city: string

  /**
   * 具名省提名通道(没有 = 空串)。
   */
  pnpStream: string

  /**
   * 能走省提名。
   */
  pnpEligible: boolean

  /**
   * 职业的 TEER(没分类 = null)。
   */
  teer: number | null

  /**
   * 5 位职业码(没分类 = 空串)。
   */
  noc: string

  /**
   * 档案想做 / 做过的工作同职业。
   */
  occWant: boolean

  /**
   * 和收藏或真发出去的投递同职业。
   */
  occSimilar: boolean

  /**
   * 雇主是 AIP 或社区试点的指定雇主。
   */
  designated: boolean

  /**
   * 雇主的 LMIA 获批名额。
   */
  lmiaPositions: number

  /**
   * 薪资高出本省同职业中位的百分比(没有 = null)。
   */
  abovePct: number | null

  /**
   * 所在省雇主 offer 类通道最近一次抽选日(没有 = 空串)。
   */
  drawLast: string
}

/**
 * 取本人档案(loadPickProfile)的入参。
 */
export type ProfileIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: string | number
}

/**
 * wayOfPick 的入参。
 */
export type WayIn = {
  /**
   * 推荐一行。
   */
  row: RankRow

  /**
   * 各通道对照。
   */
  ways: PathwayFits
}

/**
 * 推荐指数里的一项结论(线格式:词条键尾与填词,字在前端取)。
 */
export type FitLine = {
  /**
   * 项的身份(who / edu / lang / work / term / draw / occ / pay / place / emp)。
   */
  key: string

  /**
   * 结论胶囊(pass / check / high / mid / low / none;fail 只在服务端用,不下发)。
   */
  tag: string

  /**
   * 说明一句的键尾。
   */
  note: string

  /**
   * 说明一句的填词。
   */
  vars: Record<string, string>
}

/**
 * 几项结论。
 */
export type FitLines = FitLine[]

/**
 * 一项结论;这一格不出 = null。
 */
export type MaybeFitLine = FitLine | null

/**
 * 硬性条件各项;这一岗不推 = null。
 */
export type MaybeFitLines = FitLine[] | null

/**
 * 一行推荐的推荐指数。
 */
export type PickFit = {
  /**
   * 档(high / mid / low)。
   */
  level: string

  /**
   * 目标(pr / job)。
   */
  goal: string

  /**
   * 总分(0 到 100)。
   */
  score: number

  /**
   * 硬性条件各项(找工作 = 空)。
   */
  hard: FitLine[]

  /**
   * 匹配情况各项。
   */
  soft: FitLine[]
}

/**
 * 一条通道的身份对照里一个身份那一格的院校条件(线格式;同 lib/pathways 的 SchoolJson,全格照抄 —— 喂它的判定)。
 */
export type PickSchoolJson = {
  /**
   * 院校所在地条件(own / other / canada …)。
   */
  prov: string

  /**
   * 公立私立条件(缺席 = 不限)。
   */
  kind?: string

  /**
   * 最短课程时长(缺席 = 不限)。
   */
  min?: string
}

/**
 * 一条通道的身份对照里一个身份那一格(线格式;同 lib/pathways 的 FitJson)。
 */
export type PickFitJson = {
  /**
   * 能不能走(no = 不能)。
   */
  can: string

  /**
   * 院校条件(缺席 = 没有)。
   */
  schools?: PickSchoolJson[]
}

/**
 * 一条通道的身份对照:身份词 → 那一格(同 lib/pathways 的 FitsJson)。
 */
export type PickFitsJson = Record<string, PickFitJson>

/**
 * 通道身份对照的库行(pathways)。
 */
export type PathwayFitDbRow = {
  /**
   * 通道键。
   */
  key: string

  /**
   * 门槛流名(jsonb 数组;对门槛表的 stream;没登 NULL)。
   */
  req_streams: string[] | null

  /**
   * 省码。
   */
  province: string

  /**
   * 职位板上的通道标签(岗的 pnp_stream 对它;省默认通道没有)。
   */
  board_label: string | null

  /**
   * 是不是本省省默认通道。
   */
  is_default: boolean | null

  /**
   * 身份对照(jsonb)。
   */
  fits: PickFitsJson | null
}

/**
 * 通道身份对照(洗净后)。
 */
export type PathwayFitFact = {
  /**
   * 通道键。
   */
  key: string

  /**
   * 门槛流名;没登 = 空列。
   */
  reqStreams: string[]

  /**
   * 省码。
   */
  province: string

  /**
   * 职位板上的通道标签;没有 = 空串。
   */
  label: string

  /**
   * 是不是本省省默认通道。
   */
  isDefault: boolean

  /**
   * 身份对照。
   */
  fits: PickFitsJson | null
}

/**
 * 几条通道身份对照。
 */
export type PathwayFits = PathwayFitFact[]

/**
 * loadPathwayFits 的返回。
 */
export type PathwayFitsOut = Promise<PathwayFits>

/**
 * loadPathwayFits 的入参。
 */
export type DbIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db
}

/**
 * 今日推荐要的本人档案库行(MYJOBS_PICK_PROFILE)。
 */
export type PickProfileDbRow = {
  /**
   * 身份。
   */
  who: string | null

  /**
   * 教育经历串(jsonb 数组)。
   */
  edu: string[] | null

  /**
   * 目标档。
   */
  goal: number | string | null

  /**
   * 语言档。
   */
  clb: number | string | null

  /**
   * 同职业总经验档。
   */
  total_exp: number | string | null

  /**
   * 所在省码。
   */
  res_prov: string | null

  /**
   * 所在城市。
   */
  res_city: string | null

  /**
   * 有没有职业依据。
   */
  has_occ: boolean | null
}

/**
 * 今日推荐要的本人档案(洗净)。
 */
export type PickProfile = {
  /**
   * 身份(没答 = 空串)。
   */
  who: string

  /**
   * 教育经历串。
   */
  edu: string[]

  /**
   * 目标档(0 = 没答)。
   */
  goal: number

  /**
   * 语言档(0 = 没答)。
   */
  clb: number

  /**
   * 同职业总经验档(0 = 没答)。
   */
  totalExp: number

  /**
   * 所在省码(没答 = 空串)。
   */
  prov: string

  /**
   * 所在城市(没答 = 空串)。
   */
  city: string

  /**
   * 有没有职业依据。
   */
  hasOcc: boolean
}

/**
 * loadPickProfile 的返回。
 */
export type PickProfileOut = Promise<PickProfile>

/**
 * 门槛行的库行(MYJOBS_REQS)。
 */
export type ReqDbRow = {
  /**
   * 省码。
   */
  province: string

  /**
   * 门槛流名。
   */
  stream: string

  /**
   * 项(language / experience / experienceAlt)。
   */
  factor: string

  /**
   * 比较符(>= / none)。
   */
  op: string

  /**
   * 数值(none 行 NULL)。
   */
  value: number | string | null

  /**
   * 单位。
   */
  unit: string | null

  /**
   * 适用 TEER(逗号分隔;空 = 不限)。
   */
  applies_teer: string | null

  /**
   * 适用职业码或码头(逗号分隔;空 = 不限)。
   */
  applies_noc: string | null

  /**
   * 适用情形(空 = 通用)。
   */
  applies_condition: string | null

  /**
   * 口径包。
   */
  basis: string | null

  /**
   * 官方条文陈述。
   */
  label: string | null
}

/**
 * 门槛行(洗净)。
 */
export type ReqFact = {
  /**
   * 省码。
   */
  province: string

  /**
   * 门槛流名。
   */
  stream: string

  /**
   * 是不是语言行(否 = 工作经验行)。
   */
  lang: boolean

  /**
   * 数值:语言 = CLB 级数,工作经验 = 月数;官方写明不要求 = null。
   */
  value: number | null

  /**
   * 适用 TEER;不限 = 空列。
   */
  teers: string[]

  /**
   * 适用职业码或码头;不限 = 空列。
   */
  nocs: string[]

  /**
   * 档案分不出的限定(带适用情形,或口径里有同一雇主 / 本省等):不拿来判过与不过。
   */
  unsure: boolean

  /**
   * 官方条文陈述。
   */
  label: string
}

/**
 * 几行门槛。
 */
export type ReqFacts = ReqFact[]

/**
 * loadReqs 的返回。
 */
export type ReqsOut = Promise<ReqFacts>

/**
 * 一条通道;找不到 = null。
 */
export type MaybeWay = PathwayFitFact | null

/**
 * reqHitOf 的入参。
 */
export type ReqHitIn = {
  /**
   * 门槛行。
   */
  req: ReqFact

  /**
   * 这一岗。
   */
  row: RankRow
}

/**
 * wayReqsOf 的入参。
 */
export type WayReqsIn = {
  /**
   * 这一岗走的通道。
   */
  way: PathwayFitFact

  /**
   * 全部门槛行。
   */
  reqs: ReqFacts

  /**
   * 这一岗。
   */
  row: RankRow

  /**
   * 要语言行(否 = 要工作经验行)。
   */
  lang: boolean
}

/**
 * langLineOf / workLineOf 的入参。
 */
export type ReqLineIn = {
  /**
   * 这条通道对这一岗适用的门槛行。
   */
  reqs: ReqFacts

  /**
   * 本人的数:语言 = CLB 级数,工作经验 = 月数。
   */
  mine: number

  /**
   * 本站没收到数字、先标需自行核对的通道。
   */
  check: boolean
}

/**
 * hardLinesOf 的入参。
 */
export type HardIn = {
  /**
   * 这一岗。
   */
  row: RankRow

  /**
   * 各通道对照。
   */
  ways: PathwayFits

  /**
   * 全部门槛行。
   */
  reqs: ReqFacts

  /**
   * 本人档案。
   */
  profile: PickProfile
}

/**
 * eduLineOf 的入参。
 */
export type EduLineIn = {
  /**
   * 这一岗走的通道。
   */
  way: PathwayFitFact

  /**
   * 本人档案。
   */
  profile: PickProfile
}

/**
 * 四个分项的权重(百分)。
 */
export type Weights = {
  /**
   * 匹配。
   */
  match: number

  /**
   * 雇主信号。
   */
  emp: number

  /**
   * 薪资。
   */
  pay: number

  /**
   * 地点。
   */
  place: number
}

/**
 * softOf 的入参。
 */
export type SoftIn = {
  /**
   * 这一岗。
   */
  row: RankRow

  /**
   * 目标(pr / job)。
   */
  goal: string

  /**
   * 这一岗的简历匹配(没有 = null,匹配项按职业判)。
   */
  match: MaybeMatch

  /**
   * 本人所在省码(档案答的,没答用时区预选的;都没有 = 空串)。
   */
  prov: string

  /**
   * 本人所在城市(没答 = 空串)。
   */
  city: string
}

/**
 * softOf 的产出:匹配情况各项与总分。
 */
export type SoftOut = {
  /**
   * 各项。
   */
  lines: FitLine[]

  /**
   * 总分(0 到 100)。
   */
  score: number
}

/**
 * 一个分项:分数与那一项结论。
 */
export type Part = {
  /**
   * 分数(0 到 100)。
   */
  score: number

  /**
   * 结论。
   */
  line: FitLine
}

/**
 * placePartOf 的入参。
 */
export type PlaceIn = {
  /**
   * 这一岗。
   */
  row: RankRow

  /**
   * 本人所在省码。
   */
  prov: string

  /**
   * 本人所在城市。
   */
  city: string
}

/**
 * rankPicksOf 的入参。
 */
export type RankIn = {
  /**
   * 候选池(已剔掉碰过的岗)。
   */
  rows: RankRow[]

  /**
   * 各通道对照。
   */
  ways: PathwayFits

  /**
   * 全部门槛行。
   */
  reqs: ReqFacts

  /**
   * 本人档案。
   */
  profile: PickProfile

  /**
   * 目标(pr / job)。
   */
  goal: string

  /**
   * 候选岗的简历匹配(没有可用的简历正文 = 空列)。
   */
  matches: MatchFacts

  /**
   * 本人所在省码(档案答的,没答用时区预选的)。
   */
  prov: string
}

/**
 * rankPicksOf 的产出。
 */
export type RankOut = {
  /**
   * 排好的推荐(带推荐指数;高中档,没有才是低档)。
   */
  rows: Ranked[]

  /**
   * 出的是低档。
   */
  lowOnly: boolean
}

/**
 * insertByScoreOf 的入参。
 */
export type InsertIn = {
  /**
   * 已按总分从高到低排好的行。
   */
  rows: Ranked[]

  /**
   * 要插进去的一行。
   */
  one: Ranked
}

/**
 * 一行推荐连同它的推荐指数。
 */
export type Ranked = {
  /**
   * 这一岗在候选池里的位置。
   */
  at: number

  /**
   * 推荐指数。
   */
  fit: PickFit
}

/**
 * 一行的推荐指数;这一岗不推 = null。
 */
export type MaybePickFit = PickFit | null

/**
 * fitOf 的入参。
 */
export type FitIn = {
  /**
   * 这一岗。
   */
  row: RankRow

  /**
   * 各通道对照。
   */
  ways: PathwayFits

  /**
   * 全部门槛行。
   */
  reqs: ReqFacts

  /**
   * 本人档案。
   */
  profile: PickProfile

  /**
   * 目标(pr / job)。
   */
  goal: string

  /**
   * 候选岗的简历匹配(没有可用的简历正文 = 空列)。
   */
  matches: MatchFacts

  /**
   * 本人所在省码。
   */
  prov: string
}

/**
 * 数;没有 = null。
 */
export type MaybeNum = number | null

/**
 * 几个档案项。
 */
export type Needs = string[]

/**
 * 几行排好的推荐。
 */
export type RankedList = Ranked[]

/**
 * 几个串。
 */
export type Strs = string[]

/**
 * 简历匹配的库行(MYJOBS_RESUME_MATCH)。
 */
export type MatchDbRow = {
  /**
   * 职位 id。
   */
  id: number | string

  /**
   * 职位名加描述切出的词干数。
   */
  total: number | string | null

  /**
   * 其中出现在简历里的词干数。
   */
  hit: number | string | null
}

/**
 * 一岗的简历匹配(洗净)。
 */
export type MatchFact = {
  /**
   * 职位 id。
   */
  id: number

  /**
   * 出现在简历里的词干数。
   */
  hit: number

  /**
   * 职位名加描述切出的词干数。
   */
  total: number
}

/**
 * 几岗的简历匹配。
 */
export type MatchFacts = MatchFact[]

/**
 * 一岗的简历匹配;没有 = null(没有可用的简历正文,或这一岗没有检索向量)。
 */
export type MaybeMatch = MatchFact | null

/**
 * loadMatches 的入参。
 */
export type MatchesIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: string | number

  /**
   * 候选岗的 id。
   */
  ids: number[]
}

/**
 * loadMatches 的返回。
 */
export type MatchesOut = Promise<MatchFacts>

/**
 * matchOf 的入参。
 */
export type MatchOfIn = {
  /**
   * 几岗的简历匹配。
   */
  matches: MatchFacts

  /**
   * 职位 id。
   */
  id: number
}
