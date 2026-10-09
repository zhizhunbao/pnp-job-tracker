/**
 * 投递区组件桶的行为:起始步判定、取起始态、按岗选简历与就地添加简历、按 JD 写信(调 /api/apply/letter)、
 * 存草稿 / 代发,与各钮的手柄工厂。
 * 2026-10-07 二改(Frank「得根据 jd 写啊」「我的简历 我的 cover letter 是不是要跟着已投职位走」→ 四条都做):
 * 「我的模板」与填入位置撤,信每岗由模型按 JD 写一封(写不成服务端给兜底模板信);第 1 步按岗点选简历、能就地添加。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { COVER_MAX, coverFileOf, isSenderName } from '@/lib/apply'
import { track } from '@/lib/track'
import {
  CLOSED_KEY, CRED_INCLUDE, DATE_LEN, ERR_CODES, ERR_FALLBACK, ERR_KEY_FULL, ERR_KEY_HEAD, ERR_KEY_NAME,
  ERR_KEY_RESUME, ERR_KEY_TEMPLATE, ERR_KEY_UPLOAD, ERR_KEY_WRITE, ERR_NONE, E_TRIAL, FIELD_FILE, HDR_CONTENT_TYPE,
  HTTP_CONFLICT, LOAD_FAIL, LOAD_NONE, LOAD_OK, METHOD_POST, METHOD_PUT, MIME_JSON, NEXT_KEY, NO_EMAIL_KEY, P_JOB,
  SENT_STATUSES, STEP_DONE, STEP_LETTER, STEP_ORDER, STEP_PREVIEW, STEP_RESUME, TEXT_NONE, TRACK_APPLY_SENT,
  UPLOADED_KEY, URL_BACK_HEAD, URL_COVER_HEAD, URL_DRAFT, URL_LETTER, URL_RESUME_FILE, URL_RESUME_FILES, URL_SEND,
  URL_SJOBS, URL_START_HEAD, BREAK_AFTER_RE, CHECK_KEYS, CHECK_LETTER, CHECK_RESUME, CHECK_SIGN, CHECK_TO, PDF_KEY,
  Q_ID_HEAD, VIEW_KEY,
} from './constants'
import type {
  AiOpenIn, ApplyCells, ApplyResumeView, ApplyStartView, CanNextIn, DraftIn, ErrJson, ErrOut, LetterJson, LoadStartIn,
  LocationIn, PageHideIn, PickIn, PickOfFn, ResumeFilesJson, ResumeNameIn, SentIn, SetFn, StartStepIn, UploadedTextIn,
  TrialWriteIn, UploadIn, UploadJson,
  ApplySentOut, SentFn, ApplyChecksIn, CheckRow, CheckRowsIn, TickIn, TickOfFn,
} from './types'

/**
 * 这一岗投不投得了:没投过(或只有草稿)而岗已下架、库里没有投递邮箱 → 给原因的词条(投递区只摆这一行)。
 *
 * @param s 起始态。
 * @returns 投不了的原因词条;投得了给空串。
 */
export function blockKeyOf(s: ApplyStartView): string {
  if (SENT_STATUSES.includes(s.status)) {
    return TEXT_NONE
  }
  if (s.job.closed) {
    return CLOSED_KEY
  }
  if (s.job.hasEmail === false) {
    return NO_EMAIL_KEY
  }
  return TEXT_NONE
}

/**
 * 地址栏里的职位 id(/account?sec=sjobs&job=<id>;正整数才认)。
 *
 * @param search 地址栏查询串。
 * @returns 职位 id;没带 / 不合形给 null。
 */
export function jobIdOf(search: string): number | null {
  const n = Number(new URLSearchParams(search).get(P_JOB))
  if (Number.isInteger(n) && n > 0) {
    return n
  }
  return null
}

/**
 * 取投递区的起始态:没带职位落「不出」;取到落起始态;取不到落失败。
 *
 * @param x 职位 id 与两个落格。
 * @returns 无。
 */
export async function loadStart(x: LoadStartIn): Promise<void> {
  if (x.jobId == null) {
    x.setLoad(LOAD_NONE)
    return
  }
  try {
    const r = await fetch(URL_START_HEAD + x.jobId, { credentials: CRED_INCLUDE })
    if (r.ok === false) {
      x.setLoad(LOAD_FAIL)
      return
    }
    x.setStart(await r.json() as ApplyStartView)
    x.setLoad(LOAD_OK)
  } catch {
    x.setLoad(LOAD_FAIL)
  }
}

/**
 * 起始步:已发出 → 已投递;草稿里已有这一岗的信、选好了简历、英文名合规 → 直接预览;其余从第 1 步起。
 *
 * @param x 投递状态、草稿里的信、选用的简历与英文署名。
 * @returns 步骤。
 */
export function startStepOf(x: StartStepIn): string {
  if (SENT_STATUSES.includes(x.status)) {
    return STEP_DONE
  }
  if (x.cover !== TEXT_NONE && x.resumeId != null && isSenderName(x.name)) {
    return STEP_PREVIEW
  }
  return STEP_RESUME
}

/**
 * 步骤在前三步里的序号(已投递 = 三)。
 *
 * @param step 步骤。
 * @returns 序号。
 */
export function stepIndexOf(step: string): number {
  const i = STEP_ORDER.indexOf(step)
  if (i < 0) {
    return STEP_ORDER.length
  }
  return i
}

/**
 * 造改信的手柄。
 *
 * @param setLetter 落格。
 * @returns 文本框 onChange。
 */
export function makeLetterChange(setLetter: SetFn<string>): (e: React.ChangeEvent<HTMLTextAreaElement>) => void {
  return function onLetter(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setLetter(e.target.value)
  }
}

/**
 * 造改英文姓名的手柄。
 *
 * @param setName 落格。
 * @returns 输入框 onChange。
 */
export function makeNameChange(setName: SetFn<string>): (e: React.ChangeEvent<HTMLInputElement>) => void {
  return function onName(e: React.ChangeEvent<HTMLInputElement>): void {
    setName(e.target.value)
  }
}

/**
 * 造「选用某一份简历」的手柄工厂(按 id 造;选了清掉提示)。
 *
 * @param x 两个落格。
 * @returns 按 id 造手柄的工厂。
 */
export function makePickOf(x: PickIn): PickOfFn {
  return function pickOf(id: number): () => void {
    return function pick(): void {
      x.setResumeId(id)
      x.setErr(ERR_NONE)
    }
  }
}

/**
 * 「上传于 2026-10-06」那一格。
 *
 * @param x 取词函数与上传时刻。
 * @returns 一格字。
 */
export function uploadedTextOf(x: UploadedTextIn): string {
  return x.t(UPLOADED_KEY, { d: x.at.slice(0, DATE_LEN) })
}

/**
 * 主钮在这一步叫什么(词条键)。
 *
 * @param step 步骤。
 * @returns 词条键;已投递给空串(没有主钮)。
 */
export function nextKeyOf(step: string): string {
  const k = NEXT_KEY[step]
  if (k == null) {
    return TEXT_NONE
  }
  return k
}

/**
 * 主钮能不能点:第 1 步上传中不能;第 2 步在写信、信空、有坏字或超长不能;其余能。
 * 2026-10-08:第 3 步逐项检查四项没勾全不能。
 *
 * @param x 当前步、坏字、信、两个在途标与已勾的项。
 * @returns 能点 true。
 */
export function canNextOf(x: CanNextIn): boolean {
  if (x.step === STEP_RESUME) {
    return x.uploading === false
  }
  if (x.step === STEP_PREVIEW) {
    return isCheckedAll(x.ticks)
  }
  if (x.step !== STEP_LETTER) {
    return true
  }
  const filled = x.letter.trim() !== TEXT_NONE
  return x.writing === false && filled && x.badChars.length === 0 && x.letter.length <= COVER_MAX
}

/**
 * 逐项检查四项是不是都勾了(2026-10-08:发出前逐项打勾)。
 *
 * @param ticks 已勾的项。
 * @returns 都勾了。
 */
export function isCheckedAll(ticks: string[]): boolean {
  for (const key of CHECK_KEYS) {
    if (ticks.includes(key) === false) {
      return false
    }
  }
  return true
}

/**
 * 逐项检查的四行:收件人(雇主名;邮箱不出服务端)、简历(文件名 + 打开)、求职信(附件名 + 查看 PDF)、署名。
 *
 * @param x 这一封投递的四样。
 * @returns 四行。
 */
export function checkRowsOf(x: CheckRowsIn): CheckRow[] {
  return [
    { key: CHECK_TO, value: x.company, href: TEXT_NONE, linkKey: TEXT_NONE },
    { key: CHECK_RESUME, value: x.resumeName, href: resumeHrefOf(x.resumeId), linkKey: VIEW_KEY },
    { key: CHECK_LETTER, value: x.coverFile, href: coverHrefOf(x.jobId), linkKey: PDF_KEY },
    { key: CHECK_SIGN, value: x.sender, href: TEXT_NONE, linkKey: TEXT_NONE },
  ]
}

/**
 * 投递区这一封的逐项检查四行(本岗、选用的简历、求职信附件名、署名)。
 *
 * @param x 本岗、简历清单、选用的简历 id 与英文姓名。
 * @returns 四行。
 */
export function applyChecksOf(x: ApplyChecksIn): CheckRow[] {
  return checkRowsOf({
    company: x.job.company,
    resumeName: resumeNameOf({ resumes: x.resumes, resumeId: x.resumeId }),
    resumeId: x.resumeId,
    coverFile: coverFileOf(x.job.company),
    jobId: x.job.id,
    sender: x.name.trim(),
  })
}

/**
 * 逐项检查的值切成可折行的几段(下划线之后可断;每段后面接一个 wbr)。
 *
 * @param value 值。
 * @returns 几段。
 */
export function breakPartsOf(value: string): string[] {
  return value.split(BREAK_AFTER_RE)
}

/**
 * 某一份简历原件的地址(浏览器里直接打开;没简历给空串)。
 *
 * @param id 简历 id。
 * @returns 地址。
 */
export function resumeHrefOf(id: number | null): string {
  if (id == null) {
    return TEXT_NONE
  }
  return URL_RESUME_FILE + Q_ID_HEAD + String(id)
}

/**
 * 造「按项勾 / 取消」:勾了的再点取消,没勾的点了勾上。
 *
 * @param x 已勾的项与落格。
 * @returns 按项造手柄的函数。
 */
export function makeTickOf(x: TickIn): TickOfFn {
  return function tickOf(key: string): () => void {
    return function tick(): void {
      const next: string[] = []
      for (const k of x.ticks) {
        if (k !== key) {
          next.push(k)
        }
      }
      if (next.length === x.ticks.length) {
        next.push(key)
      }
      x.set(next)
    }
  }
}

/**
 * 选用那一份的文件名。
 *
 * @param x 简历清单与选用的 id。
 * @returns 文件名;没选给空串。
 */
export function resumeNameOf(x: ResumeNameIn): string {
  for (const r of x.resumes) {
    if (r.id === x.resumeId) {
      return r.fileName
    }
  }
  return TEXT_NONE
}

/**
 * 职位卡的地点(城市, 省码;缺哪段略哪段)。
 *
 * @param x 城市、省码与分隔。
 * @returns 地点;都没有给空串。
 */
export function locationOf(x: LocationIn): string {
  return [x.city, x.province].filter(Boolean).join(x.sep)
}

/**
 * 求职信 PDF 的地址。
 *
 * @param jobId 职位 id。
 * @returns 地址。
 */
export function coverHrefOf(jobId: number): string {
  return URL_COVER_HEAD + jobId
}

/**
 * 这一次能不能用 AI 按 JD 写信(Pro、本岗已经用过、或还有试用余量;2026-10-07 批 C)。服务端同样判,这里只决定钮与提示。
 *
 * @param x 剩几个与本岗用过没有。
 * @returns 能用。
 */
export function isAiOpenOf(x: AiOpenIn): boolean {
  if (x.left == null || x.here) {
    return true
  }
  return x.left > 0
}

/**
 * 付完回到本岗投递区的地址。
 *
 * @param jobId 职位 id。
 * @returns 地址。
 */
export function upsellBackOf(jobId: number): string {
  return URL_BACK_HEAD + jobId
}

/**
 * 造「开升级框」手柄。
 *
 * @param setUpsell 升级框开关的落格。
 * @returns 点击手柄。
 */
export function makeUpsellOpen(setUpsell: SetFn<boolean>): () => void {
  return function openUpsell(): void {
    setUpsell(true)
  }
}

/**
 * 造「关升级框」手柄。
 *
 * @param setUpsell 升级框开关的落格。
 * @returns 关闭手柄。
 */
export function makeUpsellClose(setUpsell: SetFn<boolean>): () => void {
  return function closeUpsell(): void {
    setUpsell(false)
  }
}

/**
 * 造主钮手柄:第 1 步 → 核姓名与简历、进求职信(这封信不是按这份简历写的就现写);第 2 步 → 存草稿、进预览;第 3 步 → 发信。
 *
 * @param c 整机的可变格。
 * @returns 点击手柄。
 */
export function makeNext(c: ApplyCells): () => void {
  return function onNext(): void {
    if (c.step === STEP_RESUME) {
      void nextFromResume(c)
    } else if (c.step === STEP_LETTER) {
      void saveThenStep({ cells: c })
    } else if (c.step === STEP_PREVIEW) {
      void send(c)
    }
  }
}

/**
 * 第 1 步往下:英文姓名合规、选好了简历,才进求职信;信还没写过或是按别的简历写的,就按这一份现写。
 * 2026-10-07 批 C:试用用完时换简历不重写(那时信框里是模板或用户自己的信,与简历无关,重写会冲掉用户改过的字)。
 *
 * @param c 整机的可变格。
 * @returns 无。
 */
async function nextFromResume(c: ApplyCells): Promise<void> {
  if (isSenderName(c.name.trim()) === false) {
    c.setErr(ERR_KEY_NAME)
    return
  }
  if (c.resumeId == null) {
    c.setErr(ERR_KEY_RESUME)
    return
  }
  c.setErr(ERR_NONE)
  c.setStep(STEP_LETTER)
  if (c.letter.trim() === TEXT_NONE) {
    await writeLetter({ cells: c })
    return
  }
  if (c.letterFor !== c.resumeId && isAiOpenOf({ left: c.trial.left, here: c.trial.here })) {
    await writeLetter({ cells: c })
  }
}

/**
 * 造「按职位重写」手柄(试用用完时改成开升级框;2026-10-07 批 C)。
 *
 * @param c 整机的可变格。
 * @returns 点击手柄。
 */
export function makeRewrite(c: ApplyCells): () => void {
  return function onRewrite(): void {
    if (isAiOpenOf({ left: c.trial.left, here: c.trial.here }) === false) {
      c.trial.setUpsell(true)
      return
    }
    void writeLetter({ cells: c })
  }
}

/**
 * 按这一岗的 JD 与选用的简历写一封信(服务端调模型;写不成给兜底模板信并提示),写好存草稿。
 *
 * @param x 整机的可变格。
 * @returns 无。
 */
async function writeLetter(x: PageHideIn): Promise<void> {
  const c = x.cells
  if (c.resumeId == null) {
    return
  }
  c.setWriting(true)
  c.setErr(ERR_NONE)
  let got: LetterJson = {}
  try {
    const r = await fetch(URL_LETTER, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ jobId: c.job.id, resumeId: c.resumeId, senderName: c.name.trim() }),
    })
    got = await r.json() as LetterJson
  } catch {
    got = {}
  }
  c.setWriting(false)
  if (typeof got.text !== 'string') {
    c.setErr(writeErrOf(got))
    return
  }
  c.setLetter(got.text)
  c.setLetterFor(c.resumeId)
  trialAfterWrite({ cells: c, got })
  if (got.ai === false) {
    c.setErr(ERR_KEY_TEMPLATE)
  }
  void saveDraft({ jobId: c.job.id, name: c.name.trim(), letter: got.text, resumeId: c.resumeId, keepalive: false })
}

/**
 * 写完记下试用余量:试用用完(402)→ 余量 0、本岗没用过(信框里那封是回包带的模板);模型写成 → 本岗记为用过、余量照回包。
 *
 * @param x 整机的可变格与写信回包。
 * @returns 无。
 */
function trialAfterWrite(x: TrialWriteIn): void {
  if (x.got.error === E_TRIAL) {
    x.cells.trial.setLeft(0)
    x.cells.trial.setHere(false)
    return
  }
  if (x.got.ai === true) {
    x.cells.trial.setHere(true)
  }
  if (typeof x.got.left === 'number') {
    x.cells.trial.setLeft(x.got.left)
  }
}

/**
 * 写信接口的失败 → 词条键(署名 / 简历 / 限额照接口的码,其余一律「没写成」)。
 *
 * @param got 回包。
 * @returns 词条键。
 */
function writeErrOf(got: LetterJson): string {
  if (typeof got.error === 'string' && ERR_CODES.includes(got.error)) {
    return ERR_KEY_HEAD + got.error
  }
  return ERR_KEY_WRITE
}

/**
 * 造「添加简历」手柄:点隐藏的文件框。
 *
 * @param c 整机的可变格。
 * @returns 点击手柄。
 */
export function makeAdd(c: ApplyCells): () => void {
  return function onAdd(): void {
    if (c.input != null) {
      c.input.click()
    }
  }
}

/**
 * 造文件框的 onChange:传到「我的简历」(同一个接口),传完重拉清单、选中新那份;满了 / 失败给提示。
 *
 * @param c 整机的可变格。
 * @returns 文件框 onChange。
 */
export function makeFile(c: ApplyCells): (e: React.ChangeEvent<HTMLInputElement>) => void {
  return function onFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const files = e.target.files
    if (files == null) {
      return
    }
    const f = files[0]
    e.target.value = TEXT_NONE
    if (f != null) {
      void upload({ cells: c, file: f })
    }
  }
}

/**
 * 传一份简历(PUT /api/resume/file 新加),成了重拉清单、选中它。
 *
 * @param x 整机的可变格与文件。
 * @returns 无。
 */
async function upload(x: UploadIn): Promise<void> {
  const c = x.cells
  c.setUploading(true)
  c.setErr(ERR_NONE)
  const form = new FormData()
  form.append(FIELD_FILE, x.file)
  let newId: number | null = null
  let err = ERR_NONE
  try {
    const r = await fetch(URL_RESUME_FILE, { method: METHOD_PUT, credentials: CRED_INCLUDE, body: form })
    if (r.ok) {
      const body = await r.json() as UploadJson
      if (body.meta != null && typeof body.meta.id === 'number') {
        newId = body.meta.id
      }
    } else if (r.status === HTTP_CONFLICT) {
      err = ERR_KEY_FULL
    } else {
      err = ERR_KEY_UPLOAD
    }
  } catch {
    err = ERR_KEY_UPLOAD
  }
  if (newId != null) {
    c.setResumes(await loadResumes())
    c.setResumeId(newId)
  }
  c.setUploading(false)
  c.setErr(err)
}

/**
 * 本人的简历清单(拉不到当没有)。
 *
 * @returns 清单。
 */
async function loadResumes(): Promise<ApplyResumeView[]> {
  try {
    const r = await fetch(URL_RESUME_FILES, { credentials: CRED_INCLUDE })
    if (r.ok === false) {
      return []
    }
    const body = await r.json() as ResumeFilesJson
    if (Array.isArray(body.items)) {
      return body.items
    }
    return []
  } catch {
    return []
  }
}

/**
 * 存草稿(英文署名、这一岗的信、选用的简历)。
 *
 * @param x 请求体素材与是否离页时发。
 * @returns 错误词条键;成功给空串。
 */
export async function saveDraft(x: DraftIn): ErrOut {
  try {
    const r = await fetch(URL_DRAFT, {
      method: METHOD_PUT,
      credentials: CRED_INCLUDE,
      keepalive: x.keepalive,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ jobId: x.jobId, senderName: x.name, cover: x.letter, resumeId: x.resumeId }),
    })
    if (r.ok) {
      return ERR_NONE
    }
    return errKeyOf(await r.json() as ErrJson)
  } catch {
    return ERR_FALLBACK
  }
}

/**
 * 接口错误体 → 词条键(认不得的码当「没发出去」)。
 *
 * @param body 错误体。
 * @returns 词条键。
 */
function errKeyOf(body: ErrJson): string {
  if (typeof body.error === 'string' && ERR_CODES.includes(body.error)) {
    return ERR_KEY_HEAD + body.error
  }
  return ERR_FALLBACK
}

/**
 * 存草稿再往下一步(求职信 → 预览)。
 *
 * @param x 整机的可变格。
 * @returns 无。
 */
async function saveThenStep(x: PageHideIn): Promise<void> {
  const c = x.cells
  c.setBusy(true)
  c.setErr(ERR_NONE)
  const err = await saveDraft({
    jobId: c.job.id, name: c.name.trim(), letter: c.letter, resumeId: c.resumeId, keepalive: false,
  })
  c.setBusy(false)
  if (err !== ERR_NONE) {
    c.setErr(err)
    return
  }
  c.setStep(STEP_PREVIEW)
}

/**
 * 发信:成功落「已投递」并通知外面;失败把原因摆在钮上方(没配发信 = 本地 dev 的 503,不算发出)。
 *
 * @param c 整机的可变格。
 * @returns 无。
 */
async function send(c: ApplyCells): Promise<void> {
  c.setBusy(true)
  c.setErr(ERR_NONE)
  let err = ERR_NONE
  try {
    const r = await fetch(URL_SEND, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ jobId: c.job.id }),
    })
    if (r.ok === false) {
      err = errKeyOf(await r.json() as ErrJson)
    }
  } catch {
    err = ERR_FALLBACK
  }
  c.setBusy(false)
  if (err !== ERR_NONE) {
    c.setErr(err)
    return
  }
  track(TRACK_APPLY_SENT)
  c.setStep(STEP_DONE)
  c.onSent({ company: c.job.company })
}

/**
 * 造「发出去了」的回调:投递区收起、地址栏洗掉职位 id(刷新不再出投递区)、通知外面刷新投递记录表。
 *
 * @param x 收起落格与外面的回调。
 * @returns 回调。
 */
export function makeSent(x: SentIn): SentFn {
  return function onSent(y: ApplySentOut): void {
    x.setSent(true)
    window.history.replaceState(null, TEXT_NONE, URL_SJOBS)
    x.onSent(y)
  }
}

/**
 * 造「上一步」手柄(清掉错误)。
 *
 * @param c 整机的可变格。
 * @returns 点击手柄。
 */
export function makeBack(c: ApplyCells): () => void {
  return function onBack(): void {
    const prev = STEP_ORDER[stepIndexOf(c.step) - 1]
    if (prev != null) {
      c.setErr(ERR_NONE)
      c.setTicks([])
      c.setStep(prev)
    }
  }
}

/**
 * 造「失焦 / 离页存草稿」手柄(审查 #8):只在第 2、3 步、信不空、姓名合规且选好了简历时存;失败把原因摆出来。
 *
 * @param x 整机的可变格。
 * @returns 手柄。
 */
export function makeQuietSave(x: PageHideIn): () => void {
  return function quietSave(): void {
    const c = x.cells
    const midway = c.step === STEP_LETTER || c.step === STEP_PREVIEW
    if (midway && c.letter.trim() !== TEXT_NONE && c.resumeId != null && isSenderName(c.name.trim())) {
      void saveDraft({
        jobId: c.job.id, name: c.name.trim(), letter: c.letter, resumeId: c.resumeId, keepalive: true,
      }).then(c.setErr)
    }
  }
}
