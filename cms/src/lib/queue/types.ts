/**
 * 智能投递域(lib/queue)的形状:要跑的人、候选岗、队列行、路由回包、注入的三件服务端函数。
 *
 * @author Frank
 * @time 2026-10-08 14:00:00
 */
import type { Db } from '../db'

/**
 * 时刻格(pg 的 timestamptz 交回 Date;测试桩可能给串)。
 */
export type TimeCell = Date | string | null

/**
 * 用户 id(payload 给的是 number 或 string,原样带进 SQL 参数)。
 */
export type UserId = string | number

/**
 * 四题答案 jsonb 里本域读的那几格。
 */
export type AnswersJson = {
  /**
   * 基础段。
   */
  basic?: AnswersBasicJson | null
}

/**
 * 四题答案的基础段里本域读的格。
 */
export type AnswersBasicJson = {
  /**
   * 想做的工作(NOC 码)。
   */
  nocs?: string[] | null

  /**
   * 所在省(省码)。
   */
  resProv?: string | null
}

/**
 * NOC 码清单。
 */
export type NocCodes = string[]

/**
 * 开了开关的人(SQL.QUEUE_USERS 的库行)。
 */
export type QueueUserDbRow = {
  /**
   * 用户 id。
   */
  user_id: number | string | null

  /**
   * 英文署名。
   */
  sender_name: string | null

  /**
   * 上次跑队列的时刻(NULL = 没跑过)。
   */
  last_queue_at: TimeCell

  /**
   * 四题答案 jsonb(pg 交回对象;测试桩可能给串)。
   */
  answers: AnswersJson | string | null

  /**
   * Pro 到期日(NULL = 没买过)。
   */
  pro_until: TimeCell

  /**
   * 默认那份简历的 id(一份都没有 = NULL)。
   */
  resume_id: number | string | null
}

/**
 * 一个要跑的人(洗净)。
 */
export type QueueUserFact = {
  /**
   * 用户 id。
   */
  userId: number

  /**
   * 英文署名。
   */
  senderName: string

  /**
   * 上次跑队列的时刻(ISO;没跑过 = 空串)。
   */
  lastQueueAt: string

  /**
   * 想做的工作(NOC 码;空 = 没答,跳过这个人)。
   */
  nocs: NocCodes

  /**
   * 所在省码(空串 = 没答,不按省排)。
   */
  prov: string

  /**
   * 是 Pro(AI 信不限)。
   */
  pro: boolean

  /**
   * 默认那份简历的 id(null = 没简历,跳过这个人)。
   */
  resumeId: number | null
}

/**
 * 只收连接的取数入参。
 */
export type DbIn = {
  /**
   * 连接(调用方注入)。
   */
  db: Db
}

/**
 * 连接 + 用户 id。
 */
export type UserIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId
}

/**
 * `jdOf` 的入参:连接、职位 id 与注入的服务端件。
 */
export type JdOfIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 注入的服务端五件。
   */
  svc: QueueSvc
}

/**
 * `loadQueueUsers` 的返回。
 */
export type QueueUsersOut = Promise<QueueUserFact[]>

/**
 * `loadQueueUser` 的出参:一个人的档;没有偏好行 = null。
 */
export type MaybeQueueUserOut = Promise<QueueUserFact | null>

/**
 * 候选岗库行(SQL.QUEUE_CANDIDATES)。
 */
export type CandidateDbRow = {
  /**
   * 职位 id。
   */
  id: number | string | null

  /**
   * 职位名。
   */
  title: string | null

  /**
   * 公司名(公司表)。
   */
  company_name: string | null

  /**
   * 城市。
   */
  city: string | null

  /**
   * 省码。
   */
  province: string | null
}

/**
 * 一个候选岗(洗净)。
 */
export type CandidateFact = {
  /**
   * 职位 id。
   */
  id: number

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名(没有 = 空串)。
   */
  company: string

  /**
   * 城市(没有 = 空串)。
   */
  city: string

  /**
   * 省码(没有 = 空串)。
   */
  province: string
}

/**
 * `loadCandidates` 的入参。
 */
export type CandidatesIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 这个人。
   */
  user: QueueUserFact

  /**
   * 只看这之后新上的岗(ISO)。
   */
  since: string
}

/**
 * `loadCandidates` 的返回。
 */
export type CandidatesOut = Promise<CandidateFact[]>

/**
 * `insertQueued` 的入参。
 */
export type QueueInsertIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 这一岗。
   */
  job: CandidateFact

  /**
   * 写好的信。
   */
  cover: string

  /**
   * 附哪份简历。
   */
  resumeId: number
}

/**
 * 写进去了没有(RETURNING 有行 = 写了)。
 */
export type DoneOut = Promise<boolean>

/**
 * 只写不读的返回。
 */
export type WriteOut = Promise<void>

/**
 * RETURNING id 的库行。
 */
export type IdDbRow = {
  /**
   * id。
   */
  id: number | string | null
}

/**
 * `letterTextOf` 的入参:按 JD 与简历写一封信要的素材。
 */
export type LetterTextIn = {
  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省码。
   */
  province: string

  /**
   * 职位描述全文。
   */
  jd: string

  /**
   * 简历抽出的文字。
   */
  resume: string

  /**
   * 英文署名。
   */
  name: string

  /**
   * 留痕用的用户 id。
   */
  userId: UserId
}

/**
 * `letterTextOf` 的返回:写成的信;写不成 / 太短给空串。
 */
export type LetterTextOut = Promise<string>

/**
 * `queueForUser` 的入参。
 */
export type QueueForUserIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 这个人。
   */
  user: QueueUserFact

  /**
   * 注入的服务端五件。
   */
  svc: QueueSvc
}

/**
 * 一个人这一轮的计数。
 */
export type UserCounts = {
  /**
   * 进了几岗。
   */
  queued: number

  /**
   * 其中 AI 写的几封。
   */
  ai: number
}

/**
 * `queueForUser` 的返回。
 */
export type QueueForUserOut = Promise<UserCounts>

/**
 * `queueJob`(给一岗写信、进队)的入参。
 */
export type QueueJobIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 这个人。
   */
  user: QueueUserFact

  /**
   * 这一岗。
   */
  job: CandidateFact

  /**
   * 简历抽出的文字(抽不出 = null,只给模板信)。
   */
  resumeText: string | null

  /**
   * 附哪份简历。
   */
  resumeId: number

  /**
   * 注入的服务端五件。
   */
  svc: QueueSvc
}

/**
 * `queueJob` 的返回:进了没有、是不是 AI 写的。
 */
export type QueueJobOut = Promise<QueueJobResult>

/**
 * 一岗的结果。
 */
export type QueueJobResult = {
  /**
   * 进了队列。
   */
  queued: boolean

  /**
   * 信是 AI 写的。
   */
  ai: boolean
}

/**
 * 一轮的计数(路由回包)。
 */
export type RunCounts = {
  /**
   * 看了几个人。
   */
  users: number

  /**
   * 进了几岗。
   */
  queued: number

  /**
   * 其中 AI 写的几封。
   */
  ai: number
}

/**
 * 队列一行(SQL.QUEUE_LIST 的库行)。
 */
export type QueueRowDbRow = {
  /**
   * 投递行 id。
   */
  id: number | string | null

  /**
   * 职位 id(职位删了是 NULL)。
   */
  job_id: number | string | null

  /**
   * 职位名快照。
   */
  job_title: string | null

  /**
   * 公司名快照。
   */
  company: string | null

  /**
   * 写好的信。
   */
  cover_text: string | null

  /**
   * 附哪份简历。
   */
  resume_id: number | string | null

  /**
   * 进队时刻。
   */
  created_at: TimeCell

  /**
   * 城市。
   */
  city: string | null

  /**
   * 城市中文译名。
   */
  city_zh: string | null

  /**
   * 城市韩文译名。
   */
  city_ko: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 薪资显示串。
   */
  salary_text: string | null

  /**
   * 职位状态(open / closed;职位删了是 NULL)。
   */
  job_status: string | null

  /**
   * 附的那份简历的文件名(简历删了是 NULL)。
   */
  resume_name: string | null
}

/**
 * 队列一行(洗净;也是 /api/queue 的线格式)。
 */
export type QueueRowFact = {
  /**
   * 投递行 id。
   */
  id: number

  /**
   * 职位 id;null = 职位已删。
   */
  jobId: number | null

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 写好的信。
   */
  cover: string

  /**
   * 附哪份简历(null = 那份已删,发不了)。
   */
  resumeId: number | null

  /**
   * 进队时刻(ISO)。
   */
  queuedAt: string

  /**
   * 城市英文名。
   */
  city: string

  /**
   * 城市中文译名(没有 = 空串)。
   */
  cityZh: string

  /**
   * 城市韩文译名(没有 = 空串)。
   */
  cityKo: string

  /**
   * 省码。
   */
  province: string

  /**
   * 薪资显示串(没有 = 空串)。
   */
  salary: string

  /**
   * 职位已下架(发不了,卡上标出来)。
   */
  closed: boolean

  /**
   * 附的那份简历的文件名(简历删了 = 空串)。
   */
  resumeName: string
}

/**
 * `loadQueueList` 的返回。
 */
export type QueueListOut = Promise<QueueRowFact[]>

/**
 * 「今日待投」接口的回包(队列 + 开关 + 条件齐不齐)。
 */
export type QueueView = {
  /**
   * 「智能投递」开着没有。
   */
  auto: boolean

  /**
   * 答过「想做的工作」没有(没答开了开关也挑不出岗,界面引去答题)。
   */
  hasNocs: boolean

  /**
   * 有英文署名没有(没有就写不了信,界面引去投递区第 1 步)。
   */
  hasName: boolean

  /**
   * 有简历没有。
   */
  hasResume: boolean

  /**
   * 答过「所在省」没有(2026-10-08 第三轮小白走查:候选只取本省,没答省不跑;界面在设置清单里就地选)。
   */
  hasProv: boolean

  /**
   * 队列。
   */
  items: QueueRowFact[]

  /**
   * 英文署名(投出前逐项检查的「署名」一行;没有 = 空串)。
   */
  senderName: string
}

/**
 * 本人四题答案的库行(SQL.QUEUE_USER_ANSWERS)。
 */
export type AnswersDbRow = {
  /**
   * 四题答案 jsonb。
   */
  answers: AnswersJson | string | null
}

/**
 * `loadUserNocs` 的返回:想做的工作;没答给空清单。
 */
export type NocsOut = Promise<NocCodes>

/**
 * `loadUserProv` 的返回:所在省码;没答给空串。
 */
export type ProvOut = Promise<string>

/**
 * 偏好接口的请求体:开关或英文署名,二选一(网络体,先按宽收)。
 */
export type AutoBodyJson = {
  /**
   * 开 / 关。
   */
  autoQueue?: boolean | string | number | null

  /**
   * 英文署名(设置清单里就地填;2026-10-08 UX 批)。
   */
  senderName?: string | number | boolean | null
}

/**
 * 改信接口的请求体。
 */
export type CoverBodyJson = {
  /**
   * 职位 id。
   */
  jobId?: number | string | boolean | null

  /**
   * 信。
   */
  cover?: string | number | boolean | null
}

/**
 * `saveQueuedCover` 的入参。
 */
export type CoverSaveIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 信。
   */
  cover: string
}

/**
 * `saveAutoQueue` 的入参。
 */
export type AutoSaveIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 开 / 关。
   */
  on: boolean
}

/**
 * 职位 id 或没有(请求体不合形)。
 */
export type MaybeId = number | null

/**
 * 四题答案或没有。
 */
export type MaybeAnswers = AnswersJson | null

/**
 * 文字或没有(简历抽不出字)。
 */
export type MaybeTextOut = Promise<string | null>

/**
 * 一段文字(JD 全文;没有给空串)。
 */
export type TextOut = Promise<string>

/**
 * `resumeTextOf` 的入参。
 */
export type ResumeTextIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 简历 id。
   */
  resumeId: number
}

/**
 * 试用用量(与 lib/quota 的 Trial 同形,本域自抄)。
 */
export type Trial = {
  /**
   * 用过几个。
   */
  used: number

  /**
   * 这一个用过没有。
   */
  here: boolean
}

/**
 * 查 / 记试用的入参(与 lib/quota 的 TrialIn 同形)。
 */
export type TrialIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 功能名。
   */
  feature: string

  /**
   * 用在哪一个(职位 id)。
   */
  refId: number
}

/**
 * 查试用用量(routes 把 lib/quota 的 loadTrial 注进来)。
 */
export type TrialLoadFn = (x: TrialIn) => Promise<Trial>

/**
 * 记一笔试用(routes 把 lib/quota 的 markTrial 注进来)。
 */
export type TrialMarkFn = (x: TrialIn) => Promise<void>

/**
 * 试用放不放行的入参(与 lib/quota 的 TrialOpenIn 同形)。
 */
export type TrialOpenIn = {
  /**
   * 是不是 Pro。
   */
  pro: boolean

  /**
   * 用量。
   */
  trial: Trial

  /**
   * 上限。
   */
  max: number
}

/**
 * 试用放不放行(routes 把 lib/quota 的 trialOpenOf 注进来)。
 */
export type TrialOpenFn = (x: TrialOpenIn) => boolean

/**
 * 取投递地址的入参(与 lib/jobs 的 ApplyUrlIn 同形)。
 */
export type ApplyUrlIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 职位 id。
   */
  jobId: number
}

/**
 * 取这一岗的投递地址(routes 把 lib/jobs 的 loadApplyUrlById 注进来;没有给 null)。
 */
export type ApplyUrlFn = (x: ApplyUrlIn) => Promise<string | null>

/**
 * 取职位描述的入参(与 lib/jobs 的 JdIn 同形)。
 */
export type JdIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 投递地址。
   */
  applyUrl: string

  /**
   * 职位 id。
   */
  id: number
}

/**
 * 取职位描述全文(routes 把 lib/jobs 的 jobDescription 注进来)。
 */
export type JdFn = (x: JdIn) => Promise<string>

/**
 * 本域要借的服务端五件(取数只许 routes 借别域的 server 门,纯行为层走注入 —— 方案 A)。
 */
export type QueueSvc = {
  /**
   * 查试用用量。
   */
  loadTrial: TrialLoadFn

  /**
   * 记一笔试用。
   */
  markTrial: TrialMarkFn

  /**
   * 试用放不放行。
   */
  trialOpen: TrialOpenFn

  /**
   * 取投递地址。
   */
  applyUrlOf: ApplyUrlFn

  /**
   * 取职位描述。
   */
  jdOf: JdFn
}
