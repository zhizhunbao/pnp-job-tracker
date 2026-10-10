/**
 * 智能投递域(lib/queue)的函数:挑人、挑岗、写信、进队、列队、跳过、开关。
 * 本域只在服务端跑(没有 index 门,只有 server 门),所以能直接带模型、JD、简历抽字这些服务端依赖;
 * 投递行、简历、署名的取数借 apply 域的桶(apply 是本域的地基:换掉本域 apply 一字不用改)。
 *
 * @author Frank
 * @time 2026-10-08 14:00:00
 */
import {
  COVER_DEFAULT, LETTER_MIN_LEN, LETTER_PROVIDER_ENV, LETTER_TEMPERATURE, LETTER_TOKENS_MAX, coverFillOf, letterCleanOf,
  letterMessagesOf, letterProviderOf, loadApplyBlob,
} from '../apply'
import { count, firstOf, jsonOrNull, numOrNull, queryRows, SQL, text } from '../db'
import { completeText } from '../llm'
import { APPLY_LOG, log } from '../log'
import { LETTER_TRIAL_MAX, TRIAL_LETTER } from '../quota'
import { extractText } from '../resume'
import {
  ANS_BASIC, ANS_CITY, ANS_GOAL, ANS_NOCS, ANS_PROV, B64, GOAL_JOB_BAND, JOB_CLOSED, NOC_GROUP_LEN, QUEUE_LIST_MAX,
  QUEUE_PER_USER, QUEUE_SINCE_ALL, QUEUE_USERS_MAX, TEXT_NONE,
} from './constants'
import type {
  AnswersDbRow, AnswersJson, AutoSaveIn, CandidateDbRow, CandidateFact, CandidatesIn, CandidatesOut, CoverSaveIn, DbIn,
  DoneOut, IdDbRow,
  JdOfIn, LetterTextIn, LetterTextOut, MaybeAnswers, MaybeQueueUserOut, MaybeTextOut, NocCodes, NocsOut, ProvOut, QueueForUserIn,
  QueueForUserOut, QueueResumeFact, QueueResumeFacts, QueueResumeSrcs, ResumeSaveIn,
  QueueInsertIn, QueueJobIn, QueueJobOut, QueueListOut, QueueRowDbRow, QueueRowFact, QueueUserDbRow, QueueUserFact,
  QueueUsersOut, ResumeTextIn, TextOut, TimeCell, UserIn, WriteOut,
} from './types'

/**
 * 开了「智能投递」的人(带四题答案、Pro、默认简历)。
 *
 * @param x 连接。
 * @returns 要跑的人;没人开给空清单。
 */
export async function loadQueueUsers(x: DbIn): QueueUsersOut {
  return queryRows({ db: x.db, sql: SQL.QUEUE_USERS, params: [QUEUE_USERS_MAX], map: toQueueUser })
}

/**
 * 一个人的智能投递档(开启那一刻立刻跑一轮用)。
 *
 * @param x 连接与用户 id。
 * @returns 档;没有偏好行 = null。
 */
export async function loadQueueUser(x: UserIn): MaybeQueueUserOut {
  return firstOf(await queryRows({ db: x.db, sql: SQL.QUEUE_USER_ONE, params: [x.userId], map: toQueueUser }))
}

/**
 * 库行 → 要跑的人(四题答案 jsonb 里取想做的工作与所在省;Pro = 到期日在此刻之后)。
 * 2026-10-09「我的档案」批:再取按哪个城市排岗(cityOf:先找工作且选了城市才有)。
 *
 * @param r 库行。
 * @returns 要跑的人。
 */
export function toQueueUser(r: QueueUserDbRow): QueueUserFact {
  const answers = jsonOrNull<AnswersJson>(r.answers)
  const until = isoOf(r.pro_until)
  let pro = false
  if (until !== TEXT_NONE) {
    pro = new Date(until).getTime() > Date.now()
  }
  return {
    userId: count(r.user_id), senderName: text(r.sender_name), lastQueueAt: isoOf(r.last_queue_at), nocs: nocsOf(answers),
    prov: provOf(answers), city: cityOf(answers), pro, resumeId: numOrNull(r.resume_id),
  }
}

/**
 * 四题答案 → 所在省码(没答给空串;2026-10-08 第三轮小白走查从 toQueueUser 抽出,「今日待投」判条件也要它)。
 *
 * @param answers 四题答案(可空)。
 * @returns 省码。
 */
export function provOf(answers: MaybeAnswers): string {
  if (answers == null || answers[ANS_BASIC] == null || answers[ANS_BASIC][ANS_PROV] == null) {
    return TEXT_NONE
  }
  return answers[ANS_BASIC][ANS_PROV]
}

/**
 * 四题答案 → 按哪个城市的都会区排岗(2026-10-09「我的档案」批:只有先找工作的人(goalBand = 2)选了所在城市才按它排;
 * 拿 PR 的、没答目标的、没选城市的都给空串 = 不按城市排,照旧全省按评分)。
 *
 * @param answers 四题答案(可空)。
 * @returns 城市英文名;不按城市排给空串。
 */
function cityOf(answers: MaybeAnswers): string {
  if (answers == null || answers[ANS_BASIC] == null) {
    return TEXT_NONE
  }
  const basic = answers[ANS_BASIC]
  if (basic[ANS_GOAL] !== GOAL_JOB_BAND || basic[ANS_CITY] == null) {
    return TEXT_NONE
  }
  return basic[ANS_CITY]
}

/**
 * 四题答案 → 想做的工作(没答给空清单)。
 *
 * @param answers 四题答案(可空)。
 * @returns NOC 码。
 */
export function nocsOf(answers: MaybeAnswers): NocCodes {
  if (answers == null || answers[ANS_BASIC] == null || answers[ANS_BASIC][ANS_NOCS] == null) {
    return []
  }
  return answers[ANS_BASIC][ANS_NOCS]
}

/**
 * 时刻格 → ISO 串(空折空串)。
 *
 * @param x 库回的时刻格。
 * @returns ISO 串。
 */
function isoOf(x: TimeCell): string {
  if (x == null) {
    return TEXT_NONE
  }
  if (x instanceof Date) {
    return x.toISOString()
  }
  return x
}

/**
 * 跑一个人:候选岗 → 每岗一封信、进队 → 记这一轮。
 *
 * @param x 连接与这个人。
 * @returns 进了几岗、几封 AI 写的。
 */
export async function queueForUser(x: QueueForUserIn): QueueForUserOut {
  const out = { queued: 0, ai: 0 }
  if (x.user.resumeId == null) {
    return out
  }
  const jobs = await loadCandidates({ db: x.db, user: x.user, since: sinceOf(x.user) })
  if (jobs.length > 0) {
    const resumeText = await resumeTextOf({ db: x.db, userId: x.user.userId, resumeId: x.user.resumeId })
    for (const job of jobs) {
      const got = await queueJob({ db: x.db, user: x.user, job, resumeText, resumeId: x.user.resumeId, svc: x.svc })
      if (got.queued) {
        out.queued++
      }
      if (got.ai) {
        out.ai++
      }
    }
  }
  await markQueueRun({ db: x.db, userId: x.user.userId })
  return out
}

/**
 * 这一轮从哪一刻起看新岗:上次跑过的时刻;没跑过往回看 36 小时。
 * 2026-10-08 改判:没跑过不设时间窗(在架的全算),见 QUEUE_SINCE_ALL。
 *
 * @param user 这个人。
 * @returns ISO 时刻。
 */
export function sinceOf(user: QueueUserFact): string {
  if (user.lastQueueAt !== TEXT_NONE) {
    return user.lastQueueAt
  }
  return QUEUE_SINCE_ALL
}

/**
 * 当作第一次跑的这个人(拨开开关那一刻用:不管以前跑没跑过,都从在架的全部里挑)。
 *
 * @param user 这个人。
 * @returns 同一个人,上次跑的时刻清空。
 */
export function firstRunOf(user: QueueUserFact): QueueUserFact {
  return {
    userId: user.userId, senderName: user.senderName, lastQueueAt: TEXT_NONE, nocs: user.nocs, prov: user.prov, city: user.city,
    pro: user.pro, resumeId: user.resumeId,
  }
}

/**
 * 默认那份简历抽出的文字(抽不出 / 不是本人的给 null,只给模板信)。
 *
 * @param x 连接、用户 id 与简历 id。
 * @returns 文字或 null。
 */
async function resumeTextOf(x: ResumeTextIn): MaybeTextOut {
  const blob = await loadApplyBlob({ db: x.db, userId: x.userId, resumeId: x.resumeId })
  if (blob == null) {
    return null
  }
  return (await extractText({ name: blob.fileName, buf: Buffer.from(blob.b64, B64) })).text
}

/**
 * 给一岗写信、进队:试用开着且抽得出简历、拿得到 JD 才请模型,否则模板;AI 写成且进了队才记一笔试用。
 *
 * @param x 连接、这个人、这一岗、简历文字与简历 id。
 * @returns 进了没有、是不是 AI 写的。
 */
export async function queueJob(x: QueueJobIn): QueueJobOut {
  let cover = coverFillOf({ template: COVER_DEFAULT, title: x.job.title, company: x.job.company, name: x.user.senderName })
  let ai = false
  const trial = await x.svc.loadTrial({ db: x.db, userId: x.user.userId, feature: TRIAL_LETTER, refId: x.job.id })
  if (x.resumeText != null && x.svc.trialOpen({ pro: x.user.pro, trial, max: LETTER_TRIAL_MAX })) {
    const jd = await jdOf({ db: x.db, jobId: x.job.id, svc: x.svc })
    if (jd !== TEXT_NONE) {
      const written = await letterTextOf({
        title: x.job.title, company: x.job.company, city: x.job.city, province: x.job.province, jd, resume: x.resumeText,
        name: x.user.senderName, userId: x.user.userId,
      })
      if (written !== TEXT_NONE) {
        cover = written
        ai = true
      }
    }
  }
  const queued = await insertQueued({ db: x.db, userId: x.user.userId, job: x.job, cover, resumeId: x.resumeId })
  if (queued && ai) {
    await x.svc.markTrial({ db: x.db, userId: x.user.userId, feature: TRIAL_LETTER, refId: x.job.id })
  }
  return { queued, ai: queued && ai }
}

/**
 * 这一岗的职位描述(没有投递地址 / 抓不到给空串)。
 *
 * @param x 连接、职位 id 与注入的服务端件。
 * @returns JD 全文或空串。
 */
async function jdOf(x: JdOfIn): TextOut {
  const applyUrl = await x.svc.applyUrlOf({ db: x.db, jobId: x.jobId })
  if (applyUrl == null) {
    return TEXT_NONE
  }
  return (await x.svc.jdOf({ db: x.db, applyUrl, id: x.jobId })).trim()
}

/**
 * 按 JD 与简历写一封信(同 apply 域写信路由的四步:拼提示 → 请模型 → 洗 → 太短作废;模型通道由 APPLY_LETTER_PROVIDER 定)。
 *
 * @param x 本岗、JD、简历文字与署名。
 * @returns 写成的信;写不成给空串。
 */
export async function letterTextOf(x: LetterTextIn): LetterTextOut {
  let out = TEXT_NONE
  try {
    out = letterCleanOf(await completeText({
      messages: letterMessagesOf({
        title: x.title, company: x.company, city: x.city, province: x.province, jd: x.jd, resume: x.resume, name: x.name,
      }),
      maxTokens: LETTER_TOKENS_MAX, provider: letterProviderOf(LETTER_PROVIDER_ENV), temperature: LETTER_TEMPERATURE,
    }))
  } catch (e) {
    log({ tag: APPLY_LOG.tag, text: APPLY_LOG.letterFailed + x.userId + APPLY_LOG.whyFrag + String(e) })
  }
  if (out.length < LETTER_MIN_LEN) {
    return TEXT_NONE
  }
  return out
}

/**
 * 这个人的候选岗(在架、有投递邮箱、职业在想做的工作里、这之后新上的、没投过、雇主没退过信)。
 * 2026-10-08:「职业在想做的工作里」放宽到同一职业单元组(NOC 前 4 位),与职位页「同省同职业」同口径。
 * 2026-10-09「我的档案」批:带上按哪个城市排岗($6;空串 = 不按城市排),同都会区的岗排前面。
 *
 * @param x 连接、这个人与起始时刻。
 * @returns 候选岗;没有给空清单。
 */
export async function loadCandidates(x: CandidatesIn): CandidatesOut {
  return queryRows({
    db: x.db, sql: SQL.QUEUE_CANDIDATES,
    params: [x.user.userId, nocGroupsOf(x.user.nocs), x.since, x.user.prov, QUEUE_PER_USER, x.user.city], map: toCandidate,
  })
}

/**
 * 想做的工作 → 职业单元组前缀(NOC 前 4 位,去重)。
 *
 * @param nocs NOC 码。
 * @returns 前缀清单。
 */
export function nocGroupsOf(nocs: NocCodes): NocCodes {
  const out: NocCodes = []
  for (const noc of nocs) {
    const group = noc.slice(0, NOC_GROUP_LEN)
    if (group.length === NOC_GROUP_LEN && out.includes(group) === false) {
      out.push(group)
    }
  }
  return out
}

/**
 * 候选岗库行 → 候选岗。
 *
 * @param r 库行。
 * @returns 候选岗。
 */
export function toCandidate(r: CandidateDbRow): CandidateFact {
  return { id: count(r.id), title: text(r.title), company: text(r.company_name), city: text(r.city), province: text(r.province) }
}

/**
 * 进队列(这一岗已有行就不动)。
 *
 * @param x 连接、用户 id、这一岗、信与简历 id。
 * @returns 进了 true;已有行 false。
 */
export async function insertQueued(x: QueueInsertIn): DoneOut {
  const rows = await queryRows({
    db: x.db, sql: SQL.QUEUE_PUT, params: [x.userId, x.job.id, x.job.title, x.job.company, x.cover, x.resumeId], map: toId,
  })
  return rows.length > 0
}

/**
 * RETURNING id 的库行 → id。
 *
 * @param r 库行。
 * @returns id。
 */
export function toId(r: IdDbRow): number {
  return count(r.id)
}

/**
 * 记这个人这一轮跑过队列了。
 *
 * @param x 连接与用户 id。
 * @returns 无。
 */
export async function markQueueRun(x: UserIn): WriteOut {
  await x.db.query(SQL.QUEUE_MARK, [x.userId])
}

/**
 * 本人的队列(「今日待投」)。
 *
 * @param x 连接与用户 id。
 * @returns 队列;空给空清单。
 */
export async function loadQueueList(x: UserIn): QueueListOut {
  return queryRows({ db: x.db, sql: SQL.QUEUE_LIST, params: [x.userId, QUEUE_LIST_MAX], map: toQueueRow })
}

/**
 * 队列库行 → 队列一行。
 *
 * @param r 库行。
 * @returns 一行。
 */
export function toQueueRow(r: QueueRowDbRow): QueueRowFact {
  return {
    id: count(r.id), jobId: numOrNull(r.job_id), title: text(r.job_title), company: text(r.company), cover: text(r.cover_text),
    resumeId: numOrNull(r.resume_id), queuedAt: isoOf(r.created_at), city: text(r.city), cityZh: text(r.city_zh),
    cityKo: text(r.city_ko), province: text(r.province), salary: text(r.salary_text), closed: r.job_status === JOB_CLOSED,
    resumeName: text(r.resume_name),
  }
}

/**
 * 本人答过的「想做的工作」(四题答案;「今日待投」判条件齐不齐)。
 *
 * @param x 连接与用户 id。
 * @returns NOC 码;没答给空清单。
 */
export async function loadUserNocs(x: UserIn): NocsOut {
  const row = firstOf(await queryRows({ db: x.db, sql: SQL.QUEUE_USER_ANSWERS, params: [x.userId], map: toNocs }))
  if (row == null) {
    return []
  }
  return row
}

/**
 * 答案库行 → 想做的工作。
 *
 * @param r 库行。
 * @returns NOC 码。
 */
export function toNocs(r: AnswersDbRow): NocCodes {
  return nocsOf(jsonOrNull<AnswersJson>(r.answers))
}

/**
 * 本人答过的「所在省」(四题答案;「今日待投」判条件齐不齐)。
 *
 * @param x 连接与用户 id。
 * @returns 省码;没答给空串。
 */
export async function loadUserProv(x: UserIn): ProvOut {
  const row = firstOf(await queryRows({ db: x.db, sql: SQL.QUEUE_USER_ANSWERS, params: [x.userId], map: toProv }))
  if (row == null) {
    return TEXT_NONE
  }
  return row
}

/**
 * 答案库行 → 所在省码。
 *
 * @param r 库行。
 * @returns 省码。
 */
export function toProv(r: AnswersDbRow): string {
  return provOf(jsonOrNull<AnswersJson>(r.answers))
}

/**
 * 就地改队列里那一岗的信(还在队列里才改)。
 *
 * @param x 连接、用户 id、职位 id 与信。
 * @returns 改了 true;不在队列 false。
 */
export async function saveQueuedCover(x: CoverSaveIn): DoneOut {
  const rows = await queryRows({ db: x.db, sql: SQL.QUEUE_COVER_PUT, params: [x.userId, x.jobId, x.cover], map: toId })
  return rows.length > 0
}

/**
 * 就地换队列里那一岗附的简历(还在队列里、简历是本人的才换;2026-10-08)。
 *
 * @param x 连接、用户 id、职位 id 与简历 id。
 * @returns 换了 true;不在队列 / 不是本人的简历 false。
 */
export async function saveQueuedResume(x: ResumeSaveIn): DoneOut {
  const rows = await queryRows({
    db: x.db, sql: SQL.QUEUE_RESUME_PUT, params: [x.userId, x.jobId, x.resumeId], map: toId,
  })
  return rows.length > 0
}

/**
 * 简历清单 → 回包里的简历项(id、文件名、MIME)。
 *
 * @param resumes apply 域的简历清单。
 * @returns 简历项。
 */
export function resumeItemsOf(resumes: QueueResumeSrcs): QueueResumeFacts {
  const out: QueueResumeFact[] = []
  for (const r of resumes) {
    out.push({ id: r.id, name: r.fileName, mime: r.mime })
  }
  return out
}

/**
 * 拨「智能投递」开关(没偏好行就建)。
 *
 * @param x 连接、用户 id 与开关。
 * @returns 无。
 */
export async function saveAutoQueue(x: AutoSaveIn): WriteOut {
  await x.db.query(SQL.QUEUE_PREFS_AUTO, [x.userId, x.on])
}
