/**
 * 投递区组件桶的行为:起始步判定、取起始态、按岗选简历与就地添加简历、按 JD 写信(调 /api/apply/letter)、
 * 存草稿 / 代发,与各钮的手柄工厂。
 * 2026-10-07 二改(Frank「得根据 jd 写啊」「我的简历 我的 cover letter 是不是要跟着已投职位走」→ 四条都做):
 * 「我的模板」与填入位置撤,信每岗由模型按 JD 写一封(写不成服务端给兜底模板信);第 1 步按岗点选简历、能就地添加。
 * 2026-10-10 投递框三步(设计稿 投递向导-照Azure 16d):页签、求职信单选 + 预览、试用撤(改写只给 Pro)、第 3 步改「确认」;
 * 第 3 步邮件形面板 applyCheckOf 一族、试用与自动写信一族退役(今日待投仍用 ApplyMail 与 checkRowsOf)。
 * 同日 Frank「大于 1000 就 拆 子桶」:求职信页一族(信的单选项、上传抽字、按职位改写)搬进子桶 ./letter。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { COVER_MAX, coverFileOf, isSenderName, mailSubjectOf, mailTextOf } from '@/lib/apply'
import { track } from '@/lib/track'
import {
  CLOSED_KEY, CRED_INCLUDE, DATE_LEN, ERR_CODES, ERR_FALLBACK, ERR_KEY_FULL, ERR_KEY_HEAD, ERR_KEY_NAME,
  ERR_KEY_RESUME, ERR_KEY_UPLOAD, ERR_NONE, FIELD_FILE, HDR_CONTENT_TYPE,
  HTTP_CONFLICT, HTTP_UNAUTH, LOAD_AUTH, LOAD_BUSY, LOAD_FAIL, LOAD_NONE, LOAD_OK, METHOD_POST, METHOD_PUT, MIME_JSON,
  NEXT_KEY, NO_EMAIL_KEY, P_JOB,
  MIME_PDF, PICK_MIN, SENT_STATUSES, STEP_CONFIRM, STEP_DONE, STEP_LETTER, STEP_ORDER, STEP_RESUME, TEXT_NONE,
  TRACK_APPLY_SENT,
  UPLOADED_KEY, URL_BACK_HEAD, URL_COVER_HEAD, URL_DRAFT, URL_RESUME_FILE, URL_RESUME_FILES, URL_SEND,
  URL_START_HEAD, BREAK_AFTER_RE, CHECK_LETTER, CHECK_RESUME, CHECK_SIGN, CHECK_TO, PDF_KEY,
  Q_ID_HEAD, VIEW_KEY, EV_APPLY_NAV, EV_APPLY_SENT, PATH_ACCOUNT, P_APPLY,
} from './constants'
import type {
  ApplyCells, ApplyResumeView, ApplyStartView, CanNextIn, DraftIn, DraftOfIn, ErrJson, ErrOut, FileMakeIn,
  GoStepIn, LoadStartIn, MailIn, MailView,
  PageHideIn, PickIn, PickOfFn, ResumeFilesJson, ResumeNameIn, SetFn, SetToIn,
  UploadedTextIn, UploadIn, UploadJson,
  ApplySentOut, CheckRow, CheckRowsIn, MaybeCheckPreview, OpenOfFn, MaybeCheckRow,
  ResumePickItem, RowOfIn, ApplyIdIn, ApplyOpenDetail, OpenedIn,
  ApplyTitled, AuthRetryIn,
} from './types'
import { uploadLetter } from './letter'
import { CACHE } from './variables'

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
 * 地址栏里要弹投递框的职位 id:`?apply=<id>`;旧深链 `/account?sec=sjobs&job=<id>` 也认(2026-10-09 A 批投递搬进弹框,
 * 邮件与收藏夹里存的旧地址照样弹框)。正整数才认。
 *
 * @param x 查询串与路径。
 * @returns 职位 id;没带给 null。
 */
export function applyIdOf(x: ApplyIdIn): number | null {
  const q = new URLSearchParams(x.search)
  const id = positiveIdOf(q.get(P_APPLY))
  if (id != null || x.path !== PATH_ACCOUNT) {
    return id
  }
  return positiveIdOf(q.get(P_JOB))
}

/**
 * 参数值是正整数就给数,否则 null。
 *
 * @param raw 参数原文(没带 = null)。
 * @returns 正整数或 null。
 */
function positiveIdOf(raw: string | null): number | null {
  const n = Number(raw)
  if (raw != null && Number.isInteger(n) && n > 0) {
    return n
  }
  return null
}

/**
 * 读当前地址栏要弹的职位 id;框已经没了(手机返回键退掉了本站推的那一笔)就把历史记账清掉,
 * 免得之后关一个深链进来的框时误退出本站。
 *
 * @returns 职位 id;没带给 null。
 */
export function readApplyId(): number | null {
  const id = applyIdOf({ search: window.location.search, path: window.location.pathname })
  if (id == null) {
    CACHE.pushed = false
  }
  return id
}

/**
 * 宿主活着时框从无到有 = 有人往历史里推了一笔(本站 openApply,或站内链接的软导航)—— 记账,关框时退回去;
 * 宿主刚挂上就带着参数 = 深链进来,不记(关框只洗参数,退了就离开本站)。
 *
 * @param x 是不是刚挂上、上一次读到的与这一次读到的职位 id。
 * @returns 无。
 */
export function noteOpened(x: OpenedIn): void {
  if (x.first === false && x.prev == null && x.id != null) {
    CACHE.pushed = true
  }
}

/**
 * 弹投递框(2026-10-09 A 批,设计稿故事 1):地址栏加 `?apply=<id>` 并往历史里推一笔 —— 手机返回键先关框,不离页;
 * 不走页面导航,通知宿主重读地址栏。同一岗已经开着就只通知,不重复推。
 *
 * @param jobId 职位 id。
 * @returns 无。
 */
export function openApply(jobId: number): void {
  const url = new URL(window.location.href)
  if (url.searchParams.get(P_APPLY) !== String(jobId)) {
    url.searchParams.set(P_APPLY, String(jobId))
    window.history.pushState(null, TEXT_NONE, url.pathname + url.search + url.hash)
    CACHE.pushed = true
  }
  window.dispatchEvent(new Event(EV_APPLY_NAV))
}

/**
 * 关投递框:本站推的那一笔就退回去(与手机返回键同一条路);深链进来的只把参数洗掉,不退(退了就离开本站)。
 *
 * @returns 无。
 */
export function closeApply(): void {
  if (CACHE.pushed) {
    CACHE.pushed = false
    window.history.back()
    return
  }
  const url = new URL(window.location.href)
  url.searchParams.delete(P_APPLY)
  if (url.pathname === PATH_ACCOUNT) {
    url.searchParams.delete(P_JOB)
  }
  window.history.replaceState(null, TEXT_NONE, url.pathname + url.search + url.hash)
  window.dispatchEvent(new Event(EV_APPLY_NAV))
}

/**
 * 起始态里那一份职位名(交给 jobtitle 桶算灰字);没到给三格空串(jobtitle 见空标题不现翻)。
 *
 * @param start 起始态(没到 = null)。
 * @returns 职位名与库里存好的两种译名。
 */
export function titledOf(start: ApplyStartView | null): ApplyTitled {
  if (start == null) {
    return { title: TEXT_NONE, titleZh: TEXT_NONE, titleKo: TEXT_NONE }
  }
  return { title: start.job.title, titleZh: start.job.titleZh, titleKo: start.job.titleKo }
}

/**
 * 投递框标题栏的大标题:取到起始态就是岗名,没到先空着(标题栏只剩灰色小标,不闪错字)。
 *
 * @param start 起始态(没到 = null)。
 * @returns 岗名或空串。
 */
export function modalTitleOf(start: ApplyStartView | null): string {
  if (start == null) {
    return TEXT_NONE
  }
  return start.job.title
}

/**
 * 收到职位桶广播的「要投这一岗」就开框。DOM 的监听签名只给 Event,自定义事件的 detail 由职位桶一处发出,
 * 断言只住这一处。
 *
 * @param e 事件。
 * @returns 无。
 */
export function openFromEvent(e: Event): void {
  openApply((e as CustomEvent<ApplyOpenDetail>).detail.jobId)
}

/**
 * 「投递发出去了」事件里带的那一份。DOM 的监听签名只给 Event,自定义事件的 detail 由 announceSent 一处发出,
 * 断言只住这一处。
 *
 * @param e 事件。
 * @returns 发给了哪家。
 */
export function sentOfEvent(e: Event): ApplySentOut {
  return (e as CustomEvent<ApplySentOut>).detail
}

/**
 * 广播「投递发出去了」(投递框挂在全站骨架上,「我的」页听它刷新投递表、写成功条)。
 *
 * @param y 发给了哪家。
 * @returns 无。
 */
export function announceSent(y: ApplySentOut): void {
  window.dispatchEvent(new CustomEvent<ApplySentOut>(EV_APPLY_SENT, { detail: y }))
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
    if (r.status === HTTP_UNAUTH) {
      x.setLoad(LOAD_AUTH)
      return
    }
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
 * 造「登录完了」:取数状态回到在取、换一代重取起始态,并软刷顶栏(登录 / 注册换成头像)。
 *
 * @param x 当前代数、两个落格与软刷。
 * @returns 登录完成回调。
 */
export function makeAuthRetry(x: AuthRetryIn): () => void {
  return function authRetry(): void {
    x.setLoad(LOAD_BUSY)
    x.setGen(x.gen + 1)
    x.refresh()
  }
}

/**
 * 起始步:已发出 → 已投递;草稿里已有这一岗的信、选好了简历、英文名合规 → 直接预览;其余从第 1 步起。
 * 2026-10-10 投递框三步(Frank「点投递,应该是先 上传简历吧」):没发出的一律落「简历」页。
 *
 * @param status 这一岗的投递状态。
 * @returns 步骤。
 */
export function startStepOf(status: string): string {
  if (SENT_STATUSES.includes(status)) {
    return STEP_DONE
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
 * 2026-10-08 曾加「第 3 步四项没勾全不能」,同日 Frank「这个不能改成类似于邮件那种吗」:第 3 步改邮件形,勾撤,能点。
 * 2026-10-10 投递框三步:信可以是空串(不附求职信);第 2 步改成「上传求职信在途」不能。
 *
 * @param x 当前步、坏字、信与两个在途标。
 * @returns 能点 true。
 */
export function canNextOf(x: CanNextIn): boolean {
  if (x.step === STEP_RESUME) {
    return x.uploading === false
  }
  if (x.step !== STEP_LETTER) {
    return true
  }
  return x.letterBusy === false && x.badChars.length === 0 && x.letter.length <= COVER_MAX
}

/**
 * 逐项检查的四行:收件人(雇主名;邮箱不出服务端)、简历(文件名 + 打开)、求职信(附件名 + 查看 PDF)、署名。
 *
 * @param x 这一封投递的四样。
 * @returns 四行。
 */
export function checkRowsOf(x: CheckRowsIn): CheckRow[] {
  return [
    { key: CHECK_TO, value: x.company, href: TEXT_NONE, linkKey: TEXT_NONE, previewable: false },
    {
      key: CHECK_RESUME,
      value: x.resumeName,
      href: resumeHrefOf(x.resumeId),
      linkKey: VIEW_KEY,
      previewable: x.resumeMime === MIME_PDF,
    },
    { key: CHECK_LETTER, value: x.coverFile, href: coverHrefOf(x.jobId), linkKey: PDF_KEY, previewable: true },
    { key: CHECK_SIGN, value: x.sender, href: TEXT_NONE, linkKey: TEXT_NONE, previewable: false },
  ]
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
 * 选中那份简历的 MIME(没选 / 找不到给空串;逐项检查按它判能不能弹框预览)。
 *
 * @param x 简历清单与选中的 id。
 * @returns MIME。
 */
export function resumeMimeOf(x: ResumeNameIn): string {
  for (const r of x.resumes) {
    if (r.id === x.resumeId) {
      return r.mime
    }
  }
  return TEXT_NONE
}

/**
 * 换简历下拉的选项值(id 串;不足两份给空清单 —— 只有一份没得换,不出下拉)。
 *
 * @param items 下拉的项。
 * @returns id 串。
 */
export function pickOptsOf(items: ResumePickItem[]): string[] {
  if (items.length < PICK_MIN) {
    return []
  }
  const out: string[] = []
  for (const it of items) {
    out.push(String(it.id))
  }
  return out
}

/**
 * 下拉当前值(选中的简历 id 串;没选 = 空串)。
 *
 * @param id 选中的简历 id。
 * @returns id 串。
 */
export function resumeValueOf(id: number | null): string {
  if (id == null) {
    return TEXT_NONE
  }
  return String(id)
}

/**
 * 造换简历下拉的取名函数(id 串 → 文件名;认不出给原串)。
 *
 * @param items 下拉的项。
 * @returns 取名函数。
 */
export function makeResumeLabel(items: ResumePickItem[]): (v: string) => string {
  return function resumeLabel(v: string): string {
    for (const it of items) {
      if (String(it.id) === v) {
        return it.name
      }
    }
    return v
  }
}

/**
 * 四行里按键取一行(邮件形按收件人 / 简历 / 求职信 / 署名各取各的;没有 = null)。
 *
 * @param x 四行与键。
 * @returns 那一行。
 */
export function rowOf(x: RowOfIn): MaybeCheckRow {
  for (const r of x.rows) {
    if (r.key === x.key) {
      return r
    }
  }
  return null
}

/**
 * 造「按行打开弹框预览」:行上的地址当 PDF 地址、值(文件名)当标题。
 *
 * @param set 落格。
 * @returns 按行造点击手柄。
 */
export function makeOpenOf(set: SetFn<MaybeCheckPreview>): OpenOfFn {
  return function openOf(row: CheckRow): () => void {
    return function open(): void {
      set({ src: row.href, title: row.value })
    }
  }
}

/**
 * 造「关预览弹框」。
 *
 * @param set 落格。
 * @returns 点击手柄。
 */
export function makePreviewClose(set: SetFn<MaybeCheckPreview>): () => void {
  return function closePreview(): void {
    set(null)
  }
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
 * 付完回到本岗投递区的地址。
 *
 * @param jobId 职位 id。
 * @returns 地址。
 */
export function upsellBackOf(jobId: number): string {
  return URL_BACK_HEAD + jobId
}

/**
 * 造「关升级框」手柄。
 * 2026-10-10 投递框三步:改成通用的「点了把某一格设成某值」(关升级框、开就地改信、关对照框共用)。
 *
 * @param x 落格与要设的值。
 * @returns 点击手柄。
 */
export function makeSetTo<T>(x: SetToIn<T>): () => void {
  return function setTo(): void {
    x.set(x.v)
  }
}

/**
 * 造主钮手柄:第 1 步 → 进求职信;第 2 步 → 存草稿、进确认;第 3 步 → 投出。
 * 2026-10-10 投递框三步:进求职信不再自动写信、不再核英文姓名(档案里没有才在「确认」页问)。
 *
 * @param c 整机的可变格。
 * @returns 点击手柄。
 */
export function makeNext(c: ApplyCells): () => void {
  return function onNext(): void {
    if (c.step === STEP_RESUME) {
      goStep({ cells: c, step: STEP_LETTER })
    } else if (c.step === STEP_LETTER) {
      goStep({ cells: c, step: STEP_CONFIRM })
    } else if (c.step === STEP_CONFIRM) {
      void send(c)
    }
  }
}

/**
 * 造页签手柄:到过的那几步才走(往回直接切,往前照主钮的核验)。
 *
 * @param c 整机的可变格。
 * @returns 页签 onChange。
 */
export function makeTab(c: ApplyCells): (key: string) => void {
  return function onTab(key: string): void {
    if (stepIndexOf(key) <= c.reached) {
      goStep({ cells: c, step: key })
    }
  }
}

/**
 * 去某一步:往回直接切;往前要选好简历,进确认先存草稿(服务端核坏字与长度)。
 *
 * @param x 整机的可变格与目标步。
 * @returns 无。
 */
function goStep(x: GoStepIn): void {
  const c = x.cells
  if (stepIndexOf(x.step) <= stepIndexOf(c.step)) {
    c.setErr(ERR_NONE)
    c.setStep(x.step)
    return
  }
  if (c.resumeId == null) {
    c.setErr(ERR_KEY_RESUME)
    return
  }
  if (x.step === STEP_LETTER) {
    c.setErr(ERR_NONE)
    reach(x)
    return
  }
  void saveThenStep({ cells: c })
}

/**
 * 切到某一步并记下到过的最远一步。
 *
 * @param x 整机的可变格与目标步。
 * @returns 无。
 */
function reach(x: GoStepIn): void {
  x.cells.setStep(x.step)
  x.cells.setReached(Math.max(x.cells.reached, stepIndexOf(x.step)))
}

/**
 * 「确认」页的邮件预览(收件人、主题、短正文 —— 与真发出去的同一套模板)与求职信附件名。
 *
 * @param x 本岗、英文姓名与信。
 * @returns 邮件预览。
 */
export function mailOf(x: MailIn): MailView {
  const cover = x.letter.trim() !== TEXT_NONE
  const parts = { title: x.job.title, city: x.job.city, province: x.job.province, name: x.name.trim() }
  let coverName = TEXT_NONE
  if (cover) {
    coverName = coverFileOf(x.job.company)
  }
  return {
    to: x.job.company,
    subject: mailSubjectOf(parts),
    body: mailTextOf({ title: parts.title, city: parts.city, province: parts.province, name: parts.name, cover }),
    cover: coverName,
  }
}

/**
 * 造「添加简历」手柄:点隐藏的文件框。
 * 2026-10-10 投递框三步:收文件框本身,「上传新简历」「上传求职信」共用。
 *
 * @param input 隐藏的文件框(还没挂上 = null)。
 * @returns 点击手柄。
 */
export function makeAdd(input: HTMLInputElement | null): () => void {
  return function onAdd(): void {
    if (input != null) {
      input.click()
    }
  }
}

/**
 * 造文件框的 onChange:传到「我的简历」(同一个接口),传完重拉清单、选中新那份;满了 / 失败给提示。
 * 2026-10-10 投递框三步:传法由调用方给(简历 upload、求职信 uploadLetter 共用这一个)。
 *
 * @param x 整机的可变格与传法(要不要求职信那一种)。
 * @returns 文件框 onChange。
 */
export function makeFile(x: FileMakeIn): (e: React.ChangeEvent<HTMLInputElement>) => void {
  return function onFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = fileOf(e)
    if (f != null && x.letter) {
      void uploadLetter({ cells: x.cells, file: f })
    } else if (f != null) {
      void upload({ cells: x.cells, file: f })
    }
  }
}

/**
 * 文件框里选好的那一个(取完清空,同一个文件再选还会触发)。
 *
 * @param e 文件框 onChange 事件。
 * @returns 文件;没选给 null。
 */
function fileOf(e: React.ChangeEvent<HTMLInputElement>): File | null {
  const files = e.target.files
  if (files == null) {
    return null
  }
  const f = files[0]
  e.target.value = TEXT_NONE
  if (f == null) {
    return null
  }
  return f
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
  const err = await saveDraft(draftOf({ cells: c, keepalive: false }))
  c.setBusy(false)
  if (err !== ERR_NONE) {
    c.setErr(err)
    return
  }
  reach({ cells: c, step: STEP_CONFIRM })
}

/**
 * 这一封的草稿素材(英文姓名不合规就先不带 —— 档案里没有、「确认」页还没填完)。
 *
 * @param x 整机的可变格与是否离页时发。
 * @returns 草稿素材。
 */
function draftOf(x: DraftOfIn): DraftIn {
  const c = x.cells
  let name = TEXT_NONE
  if (isSenderName(c.name.trim())) {
    name = c.name.trim()
  }
  return { jobId: c.job.id, name, letter: c.letter, resumeId: c.resumeId, keepalive: x.keepalive }
}

/**
 * 发信:成功落「已投递」并通知外面;失败把原因摆在钮上方(没配发信 = 本地 dev 的 503,不算发出)。
 * 2026-10-10 投递框三步:档案里没有英文姓名的,先核「确认」页现填的、随草稿存回档案(draft 接口顺带写 apply_prefs),再发。
 *
 * @param c 整机的可变格。
 * @returns 无。
 */
async function send(c: ApplyCells): Promise<void> {
  if (c.askName && isSenderName(c.name.trim()) === false) {
    c.setErr(ERR_KEY_NAME)
    return
  }
  c.setBusy(true)
  c.setErr(ERR_NONE)
  let err = ERR_NONE
  if (c.askName) {
    err = await saveDraft(draftOf({ cells: c, keepalive: false }))
  }
  try {
    if (err === ERR_NONE) {
      const r = await fetch(URL_SEND, {
        method: METHOD_POST,
        credentials: CRED_INCLUDE,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ jobId: c.job.id }),
      })
      if (r.ok === false) {
        err = errKeyOf(await r.json() as ErrJson)
      }
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
      c.setStep(prev)
    }
  }
}

/**
 * 造「失焦 / 离页存草稿」手柄(审查 #8):只在第 2、3 步、信不空、姓名合规且选好了简历时存;失败把原因摆出来。
 * 2026-10-10 投递框三步:信可以空(不附)、姓名不合规先不带,选好了简历就存。
 *
 * @param x 整机的可变格。
 * @returns 手柄。
 */
export function makeQuietSave(x: PageHideIn): () => void {
  return function quietSave(): void {
    const c = x.cells
    const midway = c.step === STEP_LETTER || c.step === STEP_CONFIRM
    if (midway && c.resumeId != null) {
      void saveDraft(draftOf({ cells: c, keepalive: true })).then(c.setErr)
    }
  }
}
