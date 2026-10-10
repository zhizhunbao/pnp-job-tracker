/**
 * queue 组件桶(「今日待投」)的函数:拉队列、拨开关、投出、跳过、全部投出、信预览。
 * 2026-10-08 Frank 看「我的」:跳过、全部投出、信预览(展开 / 收起)撤;加翻页(上一个 / 下一个)与投出前逐项检查。
 * 2026-10-09 N6 批:卡上职位名 / 城市换 name 桶现成件,点职位名的手柄(titleOpenOf / makePushJob)与城市拼字(locationOf)撤。
 *
 * @author Frank
 * @time 2026-10-08 15:00:00
 */
import { checkRowsOf, makeResumeLabel, pickOptsOf, resumeValueOf } from '@/components/apply'
import { coverFileOf, mailSubjectOf } from '@/lib/apply'
import { ALL_PROVS, provName } from '@/lib/location'
import { mergeBasics } from '@/lib/quiz'
import {
  CRED_INCLUDE, ERR_CODES, ERR_FALLBACK, ERR_KEY_FULL, ERR_KEY_HEAD, ERR_KEY_PROV, ERR_KEY_UPLOAD, ERR_NONE,
  FIELD_AUTO, FIELD_FILE, FIELD_NAME, FIND_MAX_MS, HDR_CONTENT_TYPE, HTTP_CONFLICT, LOAD_FAIL, LOAD_OK,
  METHOD_PATCH, METHOD_POST, METHOD_PUT, MIME_JSON, TEXT_NONE, URL_COVER, URL_PREFS, URL_QUEUE, URL_QUEUE_RESUME,
  URL_RESUME_FILE, URL_SEND,
} from './constants'
import type {
  AreaChangeEvent, CellsIn, DropIn, EditOpenIn, EnableIn, ErrJson, ErrOut, FindingIn, FlipIn, InputChangeEvent, LoadIn,
  NameSaveIn, PostIn, ProvSaveIn, QueueItem, QueueRespJson,
  QueueState, SendOneIn, UploadFileIn, UploadIn, UploadJson, WithAutoIn, WithCoverIn, ChecksIn, PosIn,
  PageIn, QueueCells, QueueCheckRow, TFn, QueueCheckIn, QueueCheckPanel, QueueResumeItem, QueueResumeJson,
  ResumeChangeIn, ResumeMimeIn,
} from './types'

/**
 * 回包 → 队列状态(缺席的格按「没有」读)。
 *
 * @param d 回包。
 * @returns 队列状态。
 */
export function toQueueState(d: QueueRespJson): QueueState {
  let items: QueueItem[] = []
  if (d.items != null) {
    items = d.items
  }
  let lastQueueAt = TEXT_NONE
  if (typeof d.lastQueueAt === 'string') {
    lastQueueAt = d.lastQueueAt
  }
  let senderName = TEXT_NONE
  if (typeof d.senderName === 'string') {
    senderName = d.senderName
  }
  return {
    auto: d.auto === true,
    hasNocs: d.hasNocs === true,
    hasName: d.hasName === true,
    hasResume: d.hasResume === true,
    hasProv: d.hasProv === true,
    items,
    resumes: toResumeItems(d.resumes),
    lastQueueAt,
    senderName,
  }
}

/**
 * 回包里的简历清单 → 洗净的项(缺席 / 格子脏的跳过)。
 *
 * @param raw 回包里的清单(可缺席)。
 * @returns 洗净的项。
 */
export function toResumeItems(raw: QueueResumeJson[] | null | undefined): QueueResumeItem[] {
  const out: QueueResumeItem[] = []
  if (raw == null) {
    return out
  }
  for (const r of raw) {
    const id = Number(r.id)
    if (Number.isInteger(id) && id > 0 && typeof r.name === 'string') {
      let mime = TEXT_NONE
      if (typeof r.mime === 'string') {
        mime = r.mime
      }
      out.push({ id, name: r.name, mime })
    }
  }
  return out
}

/**
 * 还没拉到时的队列状态(全空、全关)。
 *
 * @returns 队列状态。
 */
export function emptyQueueOf(): QueueState {
  return {
    auto: false,
    hasNocs: false,
    hasName: false,
    hasResume: false,
    hasProv: false,
    items: [],
    resumes: [],
    lastQueueAt: TEXT_NONE,
    senderName: TEXT_NONE,
  }
}

/**
 * 造「拉一次队列」:成功写状态并落 ok;失败落 fail(不冒充空队列)。
 *
 * @param x 两个落格。
 * @returns 拉的函数。
 */
export function makeLoad(x: LoadIn): () => Promise<void> {
  return async function loadQueue(): Promise<void> {
    try {
      const r = await fetch(URL_QUEUE, { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setLoad(LOAD_FAIL)
        return
      }
      x.setState(toQueueState(await r.json() as QueueRespJson))
      x.setLoad(LOAD_OK)
    } catch {
      x.setLoad(LOAD_FAIL)
    }
  }
}

/**
 * 造「拨开关」:先本地翻、再 PATCH 跟投;服务端没成就翻回来。
 *
 * @param x 整机的可变格。
 * @returns 点击手柄。
 */
export function makeToggle(x: CellsIn): () => Promise<void> {
  return async function toggle(): Promise<void> {
    const on = x.cells.state.auto === false
    x.cells.setState(withAuto({ state: x.cells.state, on }))
    x.cells.setBusy(true)
    try {
      const r = await fetch(URL_PREFS, {
        method: METHOD_PATCH,
        credentials: CRED_INCLUDE,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ [FIELD_AUTO]: on }),
      })
      if (r.ok === false) {
        x.cells.setState(withAuto({ state: x.cells.state, on: on === false }))
      }
    } catch {
      x.cells.setState(withAuto({ state: x.cells.state, on: on === false }))
    } finally {
      x.cells.setBusy(false)
    }
  }
}

/**
 * 队列状态换一个开关值(字段写全,不展开)。
 *
 * @param x 原状态与新开关。
 * @returns 新状态。
 */
function withAuto(x: WithAutoIn): QueueState {
  return {
    auto: x.on,
    hasNocs: x.state.hasNocs,
    hasName: x.state.hasName,
    hasResume: x.state.hasResume,
    hasProv: x.state.hasProv,
    items: x.state.items,
    resumes: x.state.resumes,
    lastQueueAt: x.state.lastQueueAt,
    senderName: x.state.senderName,
  }
}

/**
 * 队列里去掉几行(投出 / 跳过之后;一次去掉多行是给「全部投出」用的 —— 逐岗 setState 会拿到挂载时那份旧状态)。
 *
 * @param x 整机的可变格与去掉哪些行。
 * @returns 无。
 */
export function dropItems(x: DropIn): void {
  const rest: QueueItem[] = []
  for (const it of x.cells.state.items) {
    if (x.ids.includes(it.id) === false) {
      rest.push(it)
    }
  }
  x.cells.setState({
    auto: x.cells.state.auto,
    hasNocs: x.cells.state.hasNocs,
    hasName: x.cells.state.hasName,
    hasResume: x.cells.state.hasResume,
    hasProv: x.cells.state.hasProv,
    items: rest,
    resumes: x.cells.state.resumes,
    lastQueueAt: x.cells.state.lastQueueAt,
    senderName: x.cells.state.senderName,
  })
}

/**
 * 投出一岗:POST /api/apply/send;成功通知外面(发给了哪家);不动队列(由调用方按结果去行)。
 *
 * @param x 整机的可变格与这一岗。
 * @returns 错误词条键;成功 = 空串。
 */
export async function sendOne(x: SendOneIn): ErrOut {
  if (x.item.jobId == null) {
    return ERR_FALLBACK
  }
  const err = await postJson({ url: URL_SEND, body: { jobId: x.item.jobId } })
  if (err !== ERR_NONE) {
    return err
  }
  x.cells.onSent({ company: x.item.company })
  return ERR_NONE
}

/**
 * 发一个 JSON 请求(默认 POST;x.method 可换),把回包的错误码换成词条键。
 *
 * @param x 地址、请求体与方法。
 * @returns 错误词条键;2xx = 空串。
 */
async function postJson(x: PostIn): ErrOut {
  let method = METHOD_POST
  if (x.method != null) {
    method = x.method
  }
  try {
    const r = await fetch(x.url, {
      method,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify(x.body),
    })
    if (r.ok) {
      return ERR_NONE
    }
    const d = await r.json() as ErrJson
    return errKeyOf(d.error)
  } catch {
    return ERR_FALLBACK
  }
}

/**
 * 接口错误码 → 词条键(认不得的落兜底)。
 *
 * @param code 错误码(可缺席)。
 * @returns 词条键。
 */
export function errKeyOf(code: string | undefined): string {
  if (code == null || ERR_CODES.includes(code) === false) {
    return ERR_FALLBACK
  }
  return ERR_KEY_HEAD + code
}

/**
 * 当前翻到的那一岗(2026-10-08 加翻页:投出 / 改信都对它,不再固定队列第一条)。
 *
 * @param cells 整机的可变格。
 * @returns 那一岗;空队列给 null。
 */
export function currentOf(cells: QueueCells): QueueItem | null {
  const item = cells.state.items[cells.pos]
  if (item == null) {
    return null
  }
  return item
}

/**
 * 记着的位置夹进队列长度(投出一条后队列变短,停在原位 = 自动落到下一条;落到末尾外就退一格)。
 *
 * @param x 记着的位置与条数。
 * @returns 0 ~ 条数 - 1;空队列给 0。
 */
export function posOf(x: PosIn): number {
  if (x.pos >= x.n) {
    return Math.max(0, x.n - 1)
  }
  return Math.max(0, x.pos)
}

/**
 * 造「翻到第几条」(通用 Pager 的回调)。
 *
 * @param x 落格。
 * @returns 翻页回调。
 */
export function makePage(x: PageIn): (to: number) => void {
  return function page(to: number): void {
    x.setPos(to)
  }
}

/**
 * 当前这一岗的逐项检查四行(照 apply 桶;职位已删发不了,给空清单)。
 *
 * @param x 这一岗与英文署名。
 * @returns 四行。
 */
export function checksOf(x: ChecksIn): QueueCheckRow[] {
  if (x.item == null || x.item.jobId == null) {
    return []
  }
  return checkRowsOf({
    company: x.item.company,
    resumeName: x.item.resumeName,
    resumeId: x.item.resumeId,
    resumeMime: resumeMimeOf({ resumes: x.resumes, resumeId: x.item.resumeId }),
    coverFile: coverFileOf(x.item.company),
    jobId: x.item.jobId,
    sender: x.sender,
  })
}

/**
 * 附的那份简历的 MIME(清单里找;没有给空串)。
 *
 * @param x 简历清单与附的简历 id。
 * @returns MIME。
 */
export function resumeMimeOf(x: ResumeMimeIn): string {
  for (const r of x.resumes) {
    if (r.id === x.resumeId) {
      return r.mime
    }
  }
  return TEXT_NONE
}

/**
 * 装邮件形预览面板(2026-10-08 Frank「这两个应该都是可以弹框,并且可以替换吧」「这个不能改成类似于邮件那种吗」):
 * 四行、主题、正文、弹框预览、换简历、改信。
 *
 * @param x 当前这一岗、预览三格、状态、可变格、重拉与开改信。
 * @returns 面板。
 */
export function queueCheckOf(x: QueueCheckIn): QueueCheckPanel {
  let resumeId: number | null = null
  let subject = TEXT_NONE
  let body = TEXT_NONE
  if (x.item != null) {
    resumeId = x.item.resumeId
    subject = mailSubjectOf({
      title: x.item.title, city: x.item.city, province: x.item.province, name: x.state.senderName,
    })
    body = x.item.cover
  }
  return {
    rows: checksOf({ item: x.item, sender: x.state.senderName, resumes: x.state.resumes }),
    subject,
    body,
    preview: x.pv.preview,
    openOf: x.pv.openOf,
    onPreviewClose: x.pv.onPreviewClose,
    resumeOpts: pickOptsOf(x.state.resumes),
    resumeValue: resumeValueOf(resumeId),
    resumeLabel: makeResumeLabel(x.state.resumes),
    onResume: makeResumeChange({ cells: x.cells, reload: x.reload }),
    onLetter: x.onEdit,
  }
}

/**
 * 造「下拉换简历」:PATCH /api/queue/resume {jobId, resumeId} 后重拉(行上的文件名换新、勾清空)。
 *
 * @param x 整机的可变格与重拉。
 * @returns 下拉改动手柄(收 id 串)。
 */
export function makeResumeChange(x: ResumeChangeIn): (v: string) => void {
  return function changeResume(v: string): void {
    const item = currentOf(x.cells)
    const resumeId = Number(v)
    if (item == null || item.jobId == null || Number.isInteger(resumeId) === false || resumeId <= 0) {
      return
    }
    x.cells.setErr(ERR_NONE)
    x.cells.setBusy(true)
    postJson({ url: URL_QUEUE_RESUME, method: METHOD_PATCH, body: { jobId: item.jobId, resumeId } })
      .then(async function done(err: string): Promise<void> {
        x.cells.setErr(err)
        if (err === ERR_NONE) {
          await x.reload()
        }
        x.cells.setBusy(false)
      })
  }
}

/**
 * 造「投出当前这一岗」。
 *
 * @param x 整机的可变格。
 * @returns 点击手柄。
 */
export function makeSend(x: CellsIn): () => Promise<void> {
  return async function send(): Promise<void> {
    const item = currentOf(x.cells)
    if (item == null) {
      return
    }
    x.cells.setErr(ERR_NONE)
    x.cells.setBusy(true)
    const err = await sendOne({ cells: x.cells, item })
    if (err === ERR_NONE) {
      dropItems({ cells: x.cells, ids: [item.id] })
    }
    x.cells.setErr(err)
    x.cells.setBusy(false)
  }
}

/**
 * 造「翻一个布尔」的手柄(展开 / 收起、关升级框)。
 *
 * @param x 现值与落格。
 * @returns 点击手柄。
 */
export function makeFlip(x: FlipIn): () => void {
  return function flip(): void {
    x.set(x.v === false)
  }
}

/**
 * 三样条件齐了没有(简历、想做的工作、英文姓名)。
 *
 * @param st 队列状态。
 * @returns 齐了。
 */
export function isReadyOf(st: QueueState): boolean {
  return st.hasResume && st.hasNocs && st.hasProv && st.hasName
}

/**
 * 所在省下拉的选项(十省码,顺序照 lib/location)。
 *
 * @returns 省码清单。
 */
export function provOptsOf(): string[] {
  return Array.from(ALL_PROVS)
}

/**
 * 造所在省下拉的取名函数(界面语言全名)。
 *
 * @param t 取词函数。
 * @returns 省码 → 省名。
 */
export function makeProvLabel(t: TFn): (v: string) => string {
  return function provLabel(v: string): string {
    return provName({ t, code: v, localeOnly: true })
  }
}

/**
 * 造「改所在省」(下拉)。
 *
 * @param set 落格。
 * @returns 改动手柄。
 */
export function makeProvChange(set: (v: string) => void): (v: string) => void {
  return function onProv(v: string): void {
    set(v)
  }
}

/**
 * 造「存所在省」:并进四题答案档并推上服务端(走 lib/quiz 的 mergeBasics,与访客向导注册那一刻同一条路);
 * 没选、或没推成(会话没了 / 现档记着「人在境外」不收省)摆出词条;成了重拉状态。
 *
 * @param x 整机的可变格与重拉。
 * @returns 点击手柄。
 */
export function makeProvSave(x: ProvSaveIn): () => Promise<void> {
  return async function saveProv(): Promise<void> {
    x.cells.setErr(ERR_NONE)
    if (x.cells.prov === TEXT_NONE) {
      x.cells.setErr(ERR_KEY_PROV)
      return
    }
    x.cells.setBusy(true)
    const ok = await mergeBasics({ resProv: x.cells.prov })
    if (ok) {
      await x.reload()
    } else {
      x.cells.setErr(ERR_KEY_PROV)
    }
    x.cells.setBusy(false)
  }
}

/**
 * 造「改英文姓名」(文本框)。
 *
 * @param set 落格。
 * @returns 改动手柄。
 */
export function makeNameChange(set: (v: string) => void): (e: InputChangeEvent) => void {
  return function onName(e: InputChangeEvent): void {
    set(e.target.value)
  }
}

/**
 * 造「存英文姓名」:PATCH /api/queue/prefs { senderName };不合规接口回 422 name,原样摆出来;成了重拉状态。
 *
 * @param x 整机的可变格与重拉。
 * @returns 点击手柄。
 */
export function makeNameSave(x: NameSaveIn): () => Promise<void> {
  return async function saveName(): Promise<void> {
    x.cells.setErr(ERR_NONE)
    x.cells.setBusy(true)
    const err = await postJson({ url: URL_PREFS, method: METHOD_PATCH, body: { [FIELD_NAME]: x.cells.name } })
    x.cells.setErr(err)
    if (err === ERR_NONE) {
      await x.reload()
    }
    x.cells.setBusy(false)
  }
}

/**
 * 造「点上传」:代点隐藏的文件框。
 *
 * @param x 整机的可变格。
 * @returns 点击手柄。
 */
export function makeAdd(x: CellsIn): () => void {
  return function add(): void {
    if (x.cells.input != null) {
      x.cells.input.click()
    }
  }
}

/**
 * 造「文件框选好了」:PUT /api/resume/file 新加一份;满了 / 没成按词条摆;成了重拉状态(简历 ✓ 亮起)。
 *
 * @param x 整机的可变格与重拉。
 * @returns 改动手柄。
 */
export function makeUpload(x: UploadIn): (e: InputChangeEvent) => void {
  return function onFile(e: InputChangeEvent): void {
    const files = e.target.files
    if (files == null) {
      return
    }
    const f = files[0]
    e.target.value = TEXT_NONE
    if (f != null) {
      void uploadResume({ x, file: f })
    }
  }
}

/**
 * 上传一份简历。
 *
 * @param y 上传入参与文件。
 * @returns 无。
 */
async function uploadResume(y: UploadFileIn): Promise<void> {
  const c = y.x.cells
  c.setUploading(true)
  c.setErr(ERR_NONE)
  const form = new FormData()
  form.append(FIELD_FILE, y.file)
  let err = ERR_NONE
  try {
    const r = await fetch(URL_RESUME_FILE, { method: METHOD_PUT, credentials: CRED_INCLUDE, body: form })
    if (r.ok) {
      const body = await r.json() as UploadJson
      if (body.meta == null || typeof body.meta.id !== 'number') {
        err = ERR_KEY_UPLOAD
      }
    } else if (r.status === HTTP_CONFLICT) {
      err = ERR_KEY_FULL
    } else {
      err = ERR_KEY_UPLOAD
    }
  } catch {
    err = ERR_KEY_UPLOAD
  }
  if (err === ERR_NONE) {
    await y.x.reload()
  }
  c.setUploading(false)
  c.setErr(err)
}

/**
 * 造「开启智能投递」:PATCH 开关为开,成了本地翻、记「正在找岗」(服务端回包后立刻给本人跑一轮,这边轮询等它)。
 *
 * @param x 整机的可变格。
 * @returns 点击手柄。
 */
export function makeEnable(x: EnableIn): () => Promise<void> {
  return async function enable(): Promise<void> {
    x.cells.setErr(ERR_NONE)
    x.cells.setBusy(true)
    const err = await postJson({ url: URL_PREFS, method: METHOD_PATCH, body: { [FIELD_AUTO]: true } })
    if (err === ERR_NONE) {
      x.cells.setState(withAuto({ state: x.cells.state, on: true }))
      x.cells.setFind({ at: Date.now(), since: x.cells.state.lastQueueAt })
    }
    x.cells.setErr(err)
    x.cells.setBusy(false)
  }
}

/**
 * 开启后这一轮还在跑没有:点过开启、还没有岗、上一轮时刻没变(变了 = 跑完了,哪怕一岗没挑到)、没超时。
 * 2026-10-08 实测改判:去掉「还没有岗」—— 一轮是逐岗写信逐岗进队的,第一岗一出现就停轮询,后面几岗要手动刷新才看得到;
 * 开启前队列里本来就有岗时更是一开就停。只认「上一轮时刻变了」或超时。
 *
 * @param x 记号、队列状态与现在。
 * @returns 还在跑。
 */
export function isFinding(x: FindingIn): boolean {
  if (x.find == null || x.state.auto === false) {
    return false
  }
  if (x.state.lastQueueAt !== x.find.since) {
    return false
  }
  return x.now - x.find.at < FIND_MAX_MS
}

/**
 * 造「开改信弹框」:把当前这一岗的信填进弹框。
 *
 * @param x 整机的可变格与改信落格。
 * @returns 点击手柄。
 */
export function makeEditOpen(x: EditOpenIn): () => void {
  return function openEdit(): void {
    const item = currentOf(x.cells)
    if (item == null) {
      return
    }
    x.setEditText(item.cover)
    x.cells.setEditing(true)
  }
}

/**
 * 造「弹框里改信」。
 *
 * @param set 落格。
 * @returns 改动手柄。
 */
export function makeEditChange(set: (v: string) => void): (e: AreaChangeEvent) => void {
  return function onEditText(e: AreaChangeEvent): void {
    set(e.target.value)
  }
}

/**
 * 造「弹框里保存」:PATCH /api/queue/cover;成了把队列里这一岗的信换掉、关弹框;没成把原因摆在弹框里。
 *
 * @param x 整机的可变格。
 * @returns 点击手柄。
 */
export function makeEditSave(x: CellsIn): () => Promise<void> {
  return async function saveEdit(): Promise<void> {
    const item = currentOf(x.cells)
    if (item == null || item.jobId == null) {
      return
    }
    x.cells.setErr(ERR_NONE)
    x.cells.setBusy(true)
    const body = { jobId: item.jobId, cover: x.cells.editText }
    const err = await postJson({ url: URL_COVER, method: METHOD_PATCH, body })
    if (err === ERR_NONE) {
      x.cells.setState(withCover({ state: x.cells.state, id: item.id, cover: x.cells.editText }))
      x.cells.setEditing(false)
    }
    x.cells.setErr(err)
    x.cells.setBusy(false)
  }
}

/**
 * 队列状态里换掉一岗的信(字段写全,不展开)。
 *
 * @param x 原状态、哪一行与新信。
 * @returns 新状态。
 */
function withCover(x: WithCoverIn): QueueState {
  const items: QueueItem[] = []
  for (const it of x.state.items) {
    if (it.id === x.id) {
      items.push({
        id: it.id,
        jobId: it.jobId,
        title: it.title,
        company: it.company,
        cover: x.cover,
        resumeId: it.resumeId,
        city: it.city,
        cityZh: it.cityZh,
        cityKo: it.cityKo,
        province: it.province,
        salary: it.salary,
        closed: it.closed,
        resumeName: it.resumeName,
      })
    } else {
      items.push(it)
    }
  }
  return {
    auto: x.state.auto,
    hasNocs: x.state.hasNocs,
    hasName: x.state.hasName,
    hasResume: x.state.hasResume,
    hasProv: x.state.hasProv,
    items,
    resumes: x.state.resumes,
    lastQueueAt: x.state.lastQueueAt,
    senderName: x.state.senderName,
  }
}
