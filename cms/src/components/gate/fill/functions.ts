/**
 * gate 桶子桶 fill 的行为:把档案里空着的格子自动填上 —— 修改面板里点「从简历填写」(填进表单,保存才入档案)、
 * 传简历后后台自己读简历填并存(无界面)、投出后补想做的工作与现居省(无界面)。
 * 2026-11-13 Frank「别等一周啊 都做完」(档案自动生成,不用用户填):父桶 functions.ts 到 981 行贴线,按「大于 1000 就拆子桶」
 * (样张 apply/letter)把「从简历填写」这一族(makeResumeFill / runResumeFill / fillErrOf / fillMsgOf / toPrefill / applyPrefill)
 * 整体搬来;合并规则只有一处 —— 合并核 prefillMergedOf,表单那条路(applyPrefill)与无界面那条路(autoCellsOf)都走它,
 * 它用的工作经历、教育经历并法仍住子桶 work / edu,由父桶注进来(子桶不取父桶,也不取兄弟子桶)。
 *
 * @author Frank
 * @time 2026-11-13 21:00:00
 */
import { GUEST_LOG, log } from '@/lib/log'
import { eduKeysOf, saveBasics } from '@/lib/quiz'
import { track } from '@/lib/track'
import {
  AUTO_APPLY_OK, AUTO_AT_PREFILL, AUTO_AT_SAVE, AUTO_AT_SEED, AUTO_LOG_SEP, AUTO_RESUME_FAIL, AUTO_RESUME_NONE,
  AUTO_RESUME_OK, CRED_INCLUDE, EV_AUTO_DONE, FILL_ERR_DEFAULT, FILL_ERR_KEYS, FILL_KIND_ERR, FILL_KIND_INFO,
  FILL_NONE_KEY, FROM_MAJORS, FROM_NAME, FROM_SEP, FROM_WORK, METHOD_POST, NOC_RE, PREFILL_HOLD_MS, TEXT_NONE,
  TRACK_AUTO, URL_PREFILL,
} from './constants'
import { CACHE } from './variables'
import type {
  ApplyAutoIn, ApplyFillIn, ApplyPatch, ApplyPrefillIn, AutoCells, AutoCellsIn, AutoFilledOut, AutoPatch,
  AutoSaveIn, CellDiffIn, FillFns, FillMsg, PrefillFact, PrefillGot, PrefillJson, PrefillMergeIn, PrefillMergeOut,
  ResumeFillIn,
} from './types'

/**
 * 造「从简历填写」的点击手柄。
 *
 * @param x 表单状态、两个落格与父桶注进来的函数。
 * @returns 点击手柄。
 */
export function makeResumeFill(x: ResumeFillIn): () => void {
  return function onResumeFill(): void {
    x.setBusy(true)
    x.setMsg({ key: TEXT_NONE, n: 0, kind: FILL_KIND_INFO })
    void runResumeFill(x)
  }
}

/**
 * 取提取结果并填表;失败摆一行提示(留痕在 fetchPrefill)。
 * 2026-11-13 Frank「别等一周啊 都做完」:传简历后后台刚读过(或正在读)的那一份直接拿来用,不调第二遍接口(见 heldPrefill)。
 *
 * @param x 同 makeResumeFill。
 * @returns 无。
 */
async function runResumeFill(x: ResumeFillIn): Promise<void> {
  const got = await heldPrefill()
  if (got.ok === false) {
    x.setMsg(fillErrOf(got.code))
  } else {
    x.setMsg(fillMsgOf(applyPrefill({ x, d: got.d })))
  }
  x.setBusy(false)
}

/**
 * 接口错误码 → 提示。
 *
 * @param code 错误码;没有 = 空串。
 * @returns 提示。
 */
function fillErrOf(code: string): FillMsg {
  let key = FILL_ERR_DEFAULT
  const got = FILL_ERR_KEYS[code]
  if (got != null) {
    key = got
  }
  return { key, n: 0, kind: FILL_KIND_ERR }
}

/**
 * 填上了几项 → 提示(2026-11-13 Frank「这个绿条不需要」:填上了不出提示,只有什么也没填上才说一句)。
 *
 * @param n 填上了几项。
 * @returns 提示。
 */
function fillMsgOf(n: number): FillMsg {
  if (n === 0) {
    return { key: FILL_NONE_KEY, n, kind: FILL_KIND_INFO }
  }
  return { key: TEXT_NONE, n, kind: FILL_KIND_INFO }
}

/**
 * 修改面板要的提取结果:传简历后后台自己读的那一份还留着(在途的也算,没过期)就拿它,用掉即清;没有就现调接口。
 *
 * @returns 一次提取的结果。
 */
async function heldPrefill(): Promise<PrefillGot> {
  const held = CACHE.got
  CACHE.got = null
  if (held != null && Date.now() - CACHE.at < PREFILL_HOLD_MS) {
    return held
  }
  return fetchPrefill()
}

/**
 * 调一次提取接口(服务端按本人的基础简历读);请求没发出去、回的不是 JSON 按失败算并留痕,不抛。
 *
 * @returns 一次提取的结果。
 */
async function fetchPrefill(): Promise<PrefillGot> {
  try {
    const r = await fetch(URL_PREFILL, { method: METHOD_POST, credentials: CRED_INCLUDE })
    const body = await r.json() as PrefillJson
    let code: string = TEXT_NONE
    if (body.error != null) {
      code = body.error
    }
    return { ok: r.ok, code, status: r.status, d: toPrefill(body) }
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.editSave + String(e) })
    return { ok: false, code: TEXT_NONE, status: 0, d: toPrefill({}) }
  }
}

/**
 * 回包 → 提取结果(缺席按空读)。
 *
 * @param b 回包。
 * @returns 提取结果。
 */
function toPrefill(b: PrefillJson): PrefillFact {
  let works: string[] = []
  if (b.works != null) {
    works = b.works
  }
  let majors: string[] = []
  if (b.majors != null) {
    majors = b.majors
  }
  let name: string = TEXT_NONE
  if (b.name != null) {
    name = b.name
  }
  let education: PrefillFact['education'] = []
  if (b.education != null) {
    education = b.education
  }
  let jobs: PrefillFact['jobs'] = []
  if (b.jobs != null) {
    jobs = b.jobs
  }
  return { works, majors, name, education, jobs }
}

/**
 * 把提取结果填进表单:只填空着的格,不动用户已经选的;填上的值打「来自简历」。
 * 2026-11-12:提取到的教育经历并进教育经历几段(规矩见子桶 edu 的 eduMergedOf),并进去一条以上算填上一项;教育经历不打「来自简历」。
 * 同日 Frank「都改完」:提取到的几段工作经历(公司、时间、职责)填进「做过的工作」,规矩见子桶 work 的 workFilledOf。
 * 同日专业并进教育经历:各段都还没挂专业时,提取到的专业码按序落进各段(并完教育经历之后落,见子桶 edu 的 eduWithMajorsOf)。
 * 2026-11-13 Frank「别等一周啊 都做完」:怎么填收进合并核 prefillMergedOf(无界面那条路也走它),这里只把它算出的各格落进表单。
 *
 * @param y 手柄与提取结果。
 * @returns 填上了几项。
 */
function applyPrefill(y: ApplyPrefillIn): number {
  const g = y.x.g
  const m = prefillMergedOf({
    work: g.edit.w.work, edu: g.edit.edu, name: g.edit.name, marks: g.fromResume, d: y.d, fns: y.x.fns,
  })
  if (m.workFilled) {
    g.edit.w.setWork(m.work)
  }
  if (m.nameFilled) {
    g.edit.onName(m.name)
  }
  g.edit.setEdu(m.edu)
  g.setFromResume(m.marks)
  return m.n
}

/**
 * 合并核(2026-11-13 Frank「别等一周啊 都做完」:合并规则只有这一处,表单与无界面两条路共用):现在的各格 + 提取结果 →
 * 填过之后的各格。只填空着的,不动已有的 —— 工作经历照子桶 work 的 workFilledOf;英文姓名空着才填;教育经历照子桶 edu 的
 * eduMergedOf 并;各段都还没挂专业时专业码照 eduWithMajorsOf 落。填上的职业码、专业码、姓名打「来自简历」标记。
 *
 * @param x 现在的各格、提取结果与父桶注进来的函数。
 * @returns 填过之后的各格与填上了几项。
 */
export function prefillMergedOf(x: PrefillMergeIn): PrefillMergeOut {
  const d = x.d
  const marks = x.marks.slice()
  let n = 0
  const work = x.fns.workFilledOf({ rows: x.work, jobs: d.jobs, codes: d.works })
  if (work.filled) {
    for (const c of work.codes) {
      marks.push(FROM_WORK + FROM_SEP + c)
    }
    n++
  }
  let name = x.name
  let nameFilled = false
  if (x.name.trim() === TEXT_NONE && d.name !== TEXT_NONE) {
    name = d.name
    nameFilled = true
    marks.push(FROM_NAME + FROM_SEP + d.name)
    n++
  }
  const merged = x.fns.eduMergedOf({ rows: x.edu, items: d.education })
  let edu = merged.rows
  if (merged.n > 0) {
    n++
  }
  if (x.fns.eduMajorsOf(edu).length === 0 && d.majors.length > 0) {
    edu = x.fns.eduWithMajorsOf({ rows: edu, codes: d.majors })
    for (const c of d.majors) {
      marks.push(FROM_MAJORS + FROM_SEP + c)
    }
    n++
  }
  return { work: work.rows, workFilled: work.filled, edu, name, nameFilled, marks, n }
}

/**
 * 传简历后后台自己读简历、填档案里空着的格并存(2026-11-13 Frank「别等一周啊 都做完」):不出界面、不弹提示、不挡投递;
 * 用户填过的不动。每次结果记一笔埋点(resume-ok / resume-none / resume-fail),失败留痕。
 * 这一次的提取结果同时留给紧跟着打开的修改面板用一次(见 heldPrefill),同一份简历不读两遍。
 *
 * @param fns 父桶注进来的函数。
 * @returns 无。
 */
export async function runResumeAuto(fns: FillFns): Promise<void> {
  const run = fetchPrefill()
  CACHE.got = run
  CACHE.at = Date.now()
  let kind: string = AUTO_RESUME_FAIL
  try {
    const got = await run
    if (got.ok) {
      kind = await autoSavedOf({ d: got.d, fns })
    } else {
      const at = AUTO_AT_PREFILL + got.code + AUTO_LOG_SEP + String(got.status)
      log({ tag: GUEST_LOG.tag, text: GUEST_LOG.autoResume + at })
    }
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.autoResume + String(e) })
  }
  track(TRACK_AUTO, { kind })
  if (kind === AUTO_RESUME_OK) {
    window.dispatchEvent(new Event(EV_AUTO_DONE))
  }
}

/**
 * 取服务端那份档案、算出填过之后的各格、只存真变了的格;提取到合规的英文姓名且档案里空着就一并存。
 * 档案在读完简历之后才取(读简历要十来秒,这期间用户可能刚改过档案)。
 *
 * @param x 提取结果与父桶注进来的函数。
 * @returns 埋点取值(存成 / 没有空格可填 / 没成)。
 */
async function autoSavedOf(x: AutoSaveIn): Promise<string> {
  const seed = await x.fns.pullSeed()
  if (seed == null) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.autoResume + AUTO_AT_SEED })
    return AUTO_RESUME_FAIL
  }
  const out = autoFilledOf({ seed, d: x.d, fns: x.fns })
  if (out.filled === false) {
    return AUTO_RESUME_NONE
  }
  if (Object.keys(out.patch).length > 0) {
    const ok = await saveBasics(out.patch)
    if (ok === false) {
      log({ tag: GUEST_LOG.tag, text: GUEST_LOG.autoResume + AUTO_AT_SAVE })
      return AUTO_RESUME_FAIL
    }
  }
  if (out.name !== TEXT_NONE) {
    await x.fns.saveName(out.name)
  }
  return AUTO_RESUME_OK
}

/**
 * 服务端那份档案 + 提取结果 → 要存的补丁与英文姓名(无界面那条路的纯函数):同一份档案不带提取结果算一遍、带着算一遍,
 * 两遍不一样的格才进补丁 —— 表单存档时顺手做的整理(去空白、老职业码起头成几段)不算「变了」,不会因此去覆盖服务端的格。
 *
 * @param x 服务端那份档案、提取结果与父桶注进来的函数。
 * @returns 填过之后的各格、补丁、要存的英文姓名与填上了没有。
 */
export function autoFilledOf(x: AutoCellsIn): AutoFilledOut {
  const base = autoCellsOf({ seed: x.seed, d: toPrefill({}), fns: x.fns })
  const next = autoCellsOf(x)
  const patch: AutoPatch = {}
  if (isCellDiff({ a: base.majors, b: next.majors })) {
    patch.majors = next.majors
  }
  if (isCellDiff({ a: base.fitEdu, b: next.fitEdu })) {
    patch.fitEdu = next.fitEdu
  }
  if (isCellDiff({ a: base.eduList, b: next.eduList })) {
    patch.eduList = next.eduList
  }
  if (isCellDiff({ a: base.workNocs, b: next.workNocs })) {
    patch.workNocs = next.workNocs
  }
  if (isCellDiff({ a: base.fromResume, b: next.fromResume })) {
    patch.fromResume = next.fromResume
  }
  if (isCellDiff({ a: base.cv, b: next.cv })) {
    patch.cv = next.cv
  }
  let name: string = TEXT_NONE
  if (next.name !== base.name) {
    name = next.name
  }
  return { cells: next, patch, name, filled: Object.keys(patch).length > 0 || name !== TEXT_NONE }
}

/**
 * 档案 + 提取结果 → 表单会存进答案档的那几格:几段照表单的起头法起头(子桶 work / edu),过合并核,再照表单存档的拼法
 * 拼(职业码与专业码由各段汇出、教育经历串由明细派生、标记只留值还在的)。提取到的英文姓名不合规就不要(表单里是填上再标红,
 * 这里没有人看,不合规的不存)。
 *
 * @param x 服务端那份档案、提取结果与父桶注进来的函数。
 * @returns 各格。
 */
function autoCellsOf(x: AutoCellsIn): AutoCells {
  const s = x.seed
  const f = x.fns
  const m = prefillMergedOf({
    work: f.workFormRowsOf({ list: s.cv.work, nocs: s.workNocs }),
    edu: f.eduFormRowsOf({ list: s.eduList, strs: s.edu, majors: s.majors }),
    name: s.name,
    marks: s.fromResume,
    d: x.d,
    fns: f,
  })
  let name = s.name.trim()
  if (m.nameFilled && f.nameBadOf(m.name) === false) {
    name = m.name.trim()
  }
  const majors = f.eduMajorsOf(m.edu)
  const workNocs = f.workNocsOf(m.work)
  const eduList = f.eduListOf(m.edu)
  return {
    majors,
    fitEdu: eduKeysOf(eduList),
    eduList,
    workNocs,
    fromResume: f.fromKeptOf({ marks: m.marks, majors, workNocs, name }),
    cv: { work: f.workListOf(m.work), phone: s.cv.phone, link: s.cv.link, skills: s.cv.skills, tpl: s.cv.tpl },
    name,
  }
}

/**
 * 两格不一样(两边都是同一套函数按同样的键序拼出来的,比序列化后的字)。
 *
 * @param x 原来的与填过之后的。
 * @returns 不一样 true。
 */
function isCellDiff(x: CellDiffIn): boolean {
  return JSON.stringify(x.a) !== JSON.stringify(x.b)
}

/**
 * 投出成功后补两格并存(2026-11-13 Frank「别等一周啊 都做完」):想做的工作空着就填刚投那个职位的职业码,现居省空着且不是境外
 * 就填该职位的省份;填过的不动。空不空以服务端那份为准(先取再判)。存成后把职业与省同步进旧档案(职位板匹配度读它),
 * 记一笔埋点 apply-ok;什么都没补不记;失败留痕。
 *
 * @param x 刚投的职位的职业码与省码、现居省能取的值与父桶注进来的函数。
 * @returns 无。
 */
export async function runApplyAuto(x: ApplyAutoIn): Promise<void> {
  try {
    const seed = await x.fns.pullSeed()
    if (seed == null) {
      log({ tag: GUEST_LOG.tag, text: GUEST_LOG.autoApply + AUTO_AT_SEED })
      return
    }
    const patch = applyPatchOf({ noc: x.noc, prov: x.prov, provs: x.provs, seed })
    if (Object.keys(patch).length === 0) {
      return
    }
    const ok = await saveBasics(patch)
    if (ok === false) {
      log({ tag: GUEST_LOG.tag, text: GUEST_LOG.autoApply + AUTO_AT_SAVE })
      return
    }
    let nocs = seed.nocs
    if (patch.nocs != null) {
      nocs = patch.nocs
    }
    let prov = seed.prov
    if (patch.resProv != null) {
      prov = patch.resProv
    }
    await x.fns.syncOld({ nocs, prov })
    track(TRACK_AUTO, { kind: AUTO_APPLY_OK })
    window.dispatchEvent(new Event(EV_AUTO_DONE))
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.autoApply + String(e) })
  }
}

/**
 * 投出后要补哪几格(纯函数):想做的工作空着、职位带五位职业码才填;现居省空着、不是境外、职位的省在可选的省里才填。
 *
 * @param x 刚投的职位的职业码与省码、现居省能取的值与服务端那份档案。
 * @returns 要补的格;都不用补 = 空对象。
 */
export function applyPatchOf(x: ApplyFillIn): ApplyPatch {
  const patch: ApplyPatch = {}
  if (x.seed.nocs.length === 0 && NOC_RE.test(x.noc)) {
    patch.nocs = [x.noc]
  }
  if (x.seed.prov === TEXT_NONE && x.seed.abroad === false && x.provs.includes(x.prov)) {
    patch.resProv = x.prov
  }
  return patch
}
