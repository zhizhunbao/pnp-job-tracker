/**
 * queue 组件桶(「今日待投」)的函数:拉队列、拨开关、投出、跳过、全部投出、信预览。
 *
 * @author Frank
 * @time 2026-10-08 15:00:00
 */
import { makeOpenJob } from '@/components/companies'
import { cityLabelOf } from '@/components/start'
import {
  CRED_INCLUDE, ERR_CODES, ERR_FALLBACK, ERR_KEY_FULL, ERR_KEY_HEAD, ERR_KEY_UPLOAD, ERR_NONE, FIELD_AUTO, FIELD_FILE,
  FIELD_NAME, FIND_MAX_MS, HDR_CONTENT_TYPE, HTTP_CONFLICT, LAYER_JOB, LOAD_FAIL, LOAD_OK, METHOD_PATCH, METHOD_POST,
  METHOD_PUT, MIME_JSON, NEWLINE, PREVIEW_LINES, TEXT_NONE, URL_COVER, URL_DECLINE, URL_PREFS, URL_QUEUE,
  URL_RESUME_FILE, URL_SEND,
} from './constants'
import type {
  AreaChangeEvent, CellsIn, DropIn, EditOpenIn, EnableIn, ErrJson, ErrOut, FindingIn, FlipIn, InputChangeEvent, LoadIn,
  LocationIn, NameSaveIn, OpenJobFn, PeekClickFn, PeekStackRef, PostIn, PreviewIn, QueueItem, QueueJob, QueueRespJson,
  QueueState, SendOneIn, TitleOpenIn, UploadFileIn, UploadIn, UploadJson, WithAutoIn, WithCoverIn,
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
  return {
    auto: d.auto === true,
    hasNocs: d.hasNocs === true,
    hasName: d.hasName === true,
    hasResume: d.hasResume === true,
    items,
    lastQueueAt,
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
    items: x.state.items,
    lastQueueAt: x.state.lastQueueAt,
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
    items: rest,
    lastQueueAt: x.cells.state.lastQueueAt,
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
 * 造「投出当前这一岗」。
 *
 * @param x 整机的可变格。
 * @returns 点击手柄。
 */
export function makeSend(x: CellsIn): () => Promise<void> {
  return async function send(): Promise<void> {
    const item = x.cells.state.items[0]
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
 * 造「跳过当前这一岗」:POST /api/queue/decline;成功去掉这一行。
 *
 * @param x 整机的可变格。
 * @returns 点击手柄。
 */
export function makeSkip(x: CellsIn): () => Promise<void> {
  return async function skip(): Promise<void> {
    const item = x.cells.state.items[0]
    if (item == null || item.jobId == null) {
      return
    }
    x.cells.setErr(ERR_NONE)
    x.cells.setBusy(true)
    const err = await postJson({ url: URL_DECLINE, body: { jobId: item.jobId } })
    if (err === ERR_NONE) {
      dropItems({ cells: x.cells, ids: [item.id] })
    }
    x.cells.setErr(err)
    x.cells.setBusy(false)
  }
}

/**
 * 造「全部投出」:免费档开升级框;Pro 逐岗发,碰到错就停(错的那一岗留在队列最前,错因摆出来)。
 *
 * @param x 整机的可变格。
 * @returns 点击手柄。
 */
export function makeSendAll(x: CellsIn): () => Promise<void> {
  return async function sendAll(): Promise<void> {
    if (x.cells.pro === false) {
      x.cells.setUpsell(true)
      return
    }
    x.cells.setErr(ERR_NONE)
    x.cells.setBusy(true)
    const sent: number[] = []
    for (const item of x.cells.state.items) {
      const err = await sendOne({ cells: x.cells, item })
      if (err !== ERR_NONE) {
        x.cells.setErr(err)
        break
      }
      sent.push(item.id)
    }
    dropItems({ cells: x.cells, ids: sent })
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
 * 信预览:收起只露前几行,展开给全文。
 *
 * @param x 全文与展开了没有。
 * @returns 要显示的文字。
 */
export function previewOf(x: PreviewIn): string {
  if (x.expanded) {
    return x.cover
  }
  return x.cover.split(NEWLINE).slice(0, PREVIEW_LINES).join(NEWLINE)
}

/**
 * 信是不是比预览长(短信不出「展开」)。
 *
 * @param cover 全文。
 * @returns 比预览长。
 */
export function isLongOf(cover: string): boolean {
  return cover.split(NEWLINE).length > PREVIEW_LINES
}

/**
 * 卡上的城市字(界面语言有译名用译名 + 灰注同站规;这里只取主文案与灰注拼一行)。
 *
 * @param x 这一岗与界面语。
 * @returns 城市主文案;没有城市给空串。
 */
export function locationOf(x: LocationIn): string {
  if (x.item.city === TEXT_NONE) {
    return TEXT_NONE
  }
  return cityLabelOf({
    city: x.item.city, cityZh: x.item.cityZh, cityKo: x.item.cityKo, province: x.item.province, lang: x.lang,
  }).name
}

/**
 * 三样条件齐了没有(简历、想做的工作、英文姓名)。
 *
 * @param st 队列状态。
 * @returns 齐了。
 */
export function isReadyOf(st: QueueState): boolean {
  return st.hasResume && st.hasNocs && st.hasName
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
 *
 * @param x 记号、队列状态与现在。
 * @returns 还在跑。
 */
export function isFinding(x: FindingIn): boolean {
  if (x.find == null || x.state.auto === false || x.state.items.length > 0) {
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
    const item = x.cells.state.items[0]
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
    const item = x.cells.state.items[0]
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
    items,
    lastQueueAt: x.state.lastQueueAt,
  }
}

/**
 * 造「叠开职位描述弹框」:往弹框栈上叠一层职位层(同 myjobs 桶)。
 *
 * @param stack 弹框栈。
 * @returns 开职位弹框的手柄。
 */
export function makePushJob(stack: PeekStackRef): OpenJobFn {
  return function pushJob(job: QueueJob): void {
    stack.push({ kind: LAYER_JOB, job })
  }
}

/**
 * 当前这一岗职位名的点击手柄:职位还在交给公司桶的 makeOpenJob(按岗位号现取一行、叠开 JD 弹框);没有岗给不拦的空口。
 *
 * @param x 当前这一岗与开弹框的手柄。
 * @returns 点击手柄。
 */
export function titleOpenOf(x: TitleOpenIn): PeekClickFn {
  if (x.item == null || x.item.jobId == null) {
    return ignoreClick
  }
  return makeOpenJob({ id: x.item.jobId, row: null, onOpenJob: x.onOpenJob })
}

/**
 * 不拦的空口(没有岗时职位名是纯文字,点不到)。
 *
 * @returns 无。
 */
export function ignoreClick(): void {
  return
}
