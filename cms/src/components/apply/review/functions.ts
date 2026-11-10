'use client'
/**
 * apply 桶子桶 review 的行为(2026-11-09):一步步跑改写、画将发出的 PDF 并叠高亮、发送。
 * 预览里为句头序号让出一点位置(那一行往右挪),文件本身不改;高亮只叠在预览上。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { cssOf } from '@/components/css'
import { track } from '@/lib/track'
import {
  AVAIL_GAP, BOX_DOWN, BOX_UP, CANVAS_TAG, COLOR_HEAD, COLOR_N, CRED_INCLUDE, CTX_2D, ERR_DEFAULT, ERR_KEYS, ERR_NAME,
  ERR_PRO, ERR_SEND, HDR_CONTENT_TYPE, HL_H_RATIO, HL_UP_RATIO, KEY_STR, MAT_C, MAT_D, MAT_E, MAT_F, MEASURE_FONT,
  METHOD_PATCH, METHOD_POST, METHOD_PUT, MIME_JSON, NARROW_W, NUM_GAP, NUM_GAP_BASE, NUM_MAX, NUM_NONE, NUM_RATIO,
  ONE_SPACE, PAD_SIDES, PAGE_PAD, PAPER_WHITE, PX, RECT_EPS, SCALE_MAX, SEL_CV, STEP_AUDIT, STEP_LOOP_MAX, TEXT_NONE,
  TRACK_SENT, URL_COVER, URL_NAME, URL_SEND, URL_STATE, URL_STEP,
  WS_RE, ZOOM_NARROW,
} from './constants'
import type {
  CharAt, ClsIfIn, ContentBox, ContentBoxIn, CoverSaveIn, DrawIn, DrawOut, ErrJson, FailRunIn, HlPickFn, HlRect, JdHit,
  JdSeg, JdSegsIn, MoveRectsIn, PaintLineIn, PdfItem, PickActiveIn, Quote, RectsIn, Review, ReviewCells, ReviewReq,
  RunIn, ScaleOfIn, SendIn, ShiftedIn, ShiftedOut, StateJson, StepBodyIn, StepJson,
  FilledFactsIn,
  FactTextIn,
} from './types'
import css from './review.module.css'

/**
 * 文字归一。
 *
 * @param s 文字。
 * @returns 空白折成一个空格。
 */
export function normOf(s: string): string {
  return s.replace(WS_RE, ONE_SPACE).trim()
}

/**
 * 错误码 → 词条。
 *
 * @param code 错误码。
 * @returns 词条键。
 */
function errKeyOf(code: string | null): string {
  if (code != null) {
    const key = ERR_KEYS[code]
    if (key != null) {
      return key
    }
  }
  return ERR_DEFAULT
}

/**
 * 跑一轮:按回包的 next 一步步走,直到结束或出错;文件换了就通知预览重取。
 *
 * @param x 落格与起点。
 * @returns 无。
 */
export async function runSteps(x: RunIn): Promise<void> {
  x.c.setErr(TEXT_NONE)
  let step = x.start.step
  let first = true
  try {
    for (let i = 0; i < STEP_LOOP_MAX && step !== TEXT_NONE; i++) {
      x.c.setStage(step)
      const body = stepBodyOf({ jobId: x.c.jobId, step, x, first })
      const r = await fetch(URL_STEP, {
        method: METHOD_POST,
        credentials: CRED_INCLUDE,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body,
      })
      const d = await r.json() as StepJson
      if (r.ok === false) {
        failRun({ c: x.c, code: errOf(d) })
        return
      }
      if (d.review != null) {
        x.c.setReview(d.review)
      }
      first = false
      step = nextOf(d)
    }
    await reloadState(x.c)
  } catch {
    x.c.setErr(ERR_DEFAULT)
  }
  x.c.setStage(TEXT_NONE)
}

/**
 * 步骤请求体:用户补充和手动标记只跟第一步走。
 *
 * @param y 职位、这一步、起点与是不是第一步。
 * @returns JSON 串。
 */
function stepBodyOf(y: StepBodyIn): string {
  if (y.first) {
    return JSON.stringify({
      jobId: y.jobId,
      step: y.step,
      facts: y.x.start.facts,
      both: y.x.start.both,
      regen: y.x.start.regen,
      fill: y.x.start.fill,
    })
  }
  return JSON.stringify({
    jobId: y.jobId,
    step: y.step,
    facts: {},
    both: y.x.start.both && y.step !== STEP_AUDIT,
    regen: false,
  })
}

/**
 * 回包的错误码。
 *
 * @param d 回包。
 * @returns 错误码;没有给 null。
 */
function errOf(d: StepJson): string | null {
  if (d.error == null) {
    return null
  }
  return d.error
}

/**
 * 回包的下一步。
 *
 * @param d 回包。
 * @returns 下一步;结束给空串。
 */
function nextOf(d: StepJson): string {
  if (d.next == null) {
    return TEXT_NONE
  }
  return d.next
}

/**
 * 一轮失败:试用用完弹升级框,其余摆一行。
 *
 * @param y 落格与错误码。
 * @returns 无。
 */
function failRun(y: FailRunIn): void {
  y.c.setStage(TEXT_NONE)
  if (y.code === ERR_PRO) {
    y.c.onUpsell()
    return
  }
  y.c.setErr(errKeyOf(y.code))
}

/**
 * 取现状并落格;文件版本加一。
 *
 * @param c 落格。
 * @returns 现状。
 */
export async function reloadState(c: ReviewCells): Promise<StateJson> {
  const r = await fetch(URL_STATE + String(c.jobId), { credentials: CRED_INCLUDE })
  const d = await r.json() as StateJson
  if (d.review != null) {
    c.setReview(d.review)
  }
  c.setCover(d.cover)
  c.setJd(d.jd)
  c.bumpGen()
  return d
}

/**
 * 还要不要从头生成:没有要求、没有文件或还没打分。
 *
 * @param d 现状。
 * @returns 要 true。
 */
export function needRunOf(d: StateJson): boolean {
  return d.review == null || d.review.score == null || d.hasResume === false || d.hasCover === false
}

/**
 * 简历里的引文。
 *
 * @param r 核对结果。
 * @returns 引文。
 */
export function resumeQuotesOf(r: Review): Quote[] {
  const out: Quote[] = []
  for (const q of r.reqs) {
    if (q.resume !== TEXT_NONE) {
      out.push({ q: q.resume, n: q.id })
    }
  }
  return out
}

/**
 * 求职信里的引文(含无依据的句子)。
 *
 * @param r 核对结果。
 * @returns 引文。
 */
export function coverQuotesOf(r: Review): Quote[] {
  const out: Quote[] = []
  for (const q of r.reqs) {
    if (q.cover !== TEXT_NONE) {
      out.push({ q: q.cover, n: q.id })
    }
  }
  for (const s of r.unsupported) {
    out.push({ q: s, n: 0 })
  }
  return out
}

/**
 * 这条要求算不算覆盖:简历和求职信都写到了。
 *
 * @param r 一条要求。
 * @returns 算 true。
 */
export function isCovered(r: ReviewReq): boolean {
  return r.resume !== TEXT_NONE && r.cover !== TEXT_NONE
}

/**
 * 把一行职位描述按要求原文切段。
 *
 * @param y 这一行与要求。
 * @returns 各段。
 */
export function jdSegsOf(y: JdSegsIn): JdSeg[] {
  const text = normOf(y.line)
  const hits: JdHit[] = []
  for (const r of y.reqs) {
    const at = text.indexOf(r.jd)
    if (at >= 0) {
      hits.push({ at, req: r })
    }
  }
  hits.sort(byAt)
  const out: JdSeg[] = []
  let k = 0
  for (const h of hits) {
    if (h.at >= k) {
      out.push({ text: text.slice(k, h.at), req: null })
      out.push({ text: h.req.jd, req: h.req })
      k = h.at + h.req.jd.length
    }
  }
  out.push({ text: text.slice(k), req: null })
  return out
}

/**
 * 按位置排。
 *
 * @param a 一项。
 * @param b 另一项。
 * @returns 顺序。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byAt(a: JdHit, b: JdHit): number {
  return a.at - b.at
}

/**
 * 序号圆点的边长。
 *
 * @param h 高亮高度。
 * @returns 边长。
 */
export function numSizeOf(h: number): number {
  return Math.min(NUM_MAX, Math.floor(h * NUM_RATIO))
}

/**
 * 画一份将发出的 PDF:只画第一页,裁到内容;叠高亮并给句头序号让位。
 *
 * @param x 地址、容器、引文与落格。
 * @returns 无。
 */
export async function drawPdf(x: DrawIn): DrawOut {
  try {
    const pdfjs = await import('pdfjs-dist')
    if (pdfjs.GlobalWorkerOptions.workerSrc === TEXT_NONE) {
      // eslint-disable-next-line local/no-bare-strings -- 打包器只认 new URL 里的字面量路径
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
    }
    const r = await fetch(x.url, { credentials: CRED_INCLUDE })
    if (r.ok === false) {
      x.setFailed(true)
      return
    }
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await r.arrayBuffer()) }).promise
    const page = await doc.getPage(1)
    const tc = await page.getTextContent()
    const items = tc.items.filter(isTextItem) as PdfItem[]
    const base = page.getViewport({ scale: 1 })
    const box = contentBoxOf({ items, tr: pdfjs.Util.transform, vt: base.transform })
    const avail = x.host.clientWidth - AVAIL_GAP
    const fit = avail / (box.maxX - box.minX + PAGE_PAD * PAD_SIDES)
    const scale = scaleOf({ fit, zoomed: x.zoomed })
    const vp = page.getViewport({ scale })
    const dpr = window.devicePixelRatio
    const hi = page.getViewport({ scale: scale * dpr })
    const cv = document.createElement(CANVAS_TAG)
    cv.width = Math.floor(hi.width)
    cv.height = Math.floor(hi.height)
    await page.render({ canvas: cv, viewport: hi }).promise
    if (x.alive() === false) {
      return
    }
    const rects = rectsOf({ items, quotes: x.quotes, tr: pdfjs.Util.transform, vt: vp.transform, scale })
    const gap = Math.max(NUM_MAX, Math.round(scale * NUM_GAP_BASE)) + NUM_GAP
    const sheet = shiftedOf({ cv, vp, rects, gap, dpr })
    const host = x.host.querySelector(SEL_CV)
    if (host != null) {
      host.replaceChildren(sheet.canvas)
    }
    x.setRects(rects)
    x.setSize({
      w: Math.ceil(box.maxX * scale + PAGE_PAD * PAD_SIDES + sheet.extra),
      h: Math.ceil(box.maxY * scale + PAGE_PAD * PAD_SIDES),
      left: Math.floor(box.minX * scale - PAGE_PAD),
      top: Math.max(0, Math.floor(box.minY * scale - PAGE_PAD)),
    })
  } catch {
    x.setFailed(true)
  }
}

/**
 * 是有字的文字项。
 *
 * @param i 一项。
 * @returns 是 true。
 */
function isTextItem(i: object): boolean {
  return KEY_STR in i && (i as PdfItem).str !== TEXT_NONE
}

/**
 * 缩放:宽屏贴合宽度,手机默认整页,点一下放大。
 *
 * @param y 贴合缩放与放大了吗。
 * @returns 缩放。
 */
function scaleOf(y: ScaleOfIn): number {
  if (window.innerWidth > NARROW_W) {
    return Math.min(y.fit, SCALE_MAX)
  }
  if (y.zoomed) {
    return y.fit * ZOOM_NARROW
  }
  return y.fit
}

/**
 * 内容的边界。
 *
 * @param y 文字项与变换。
 * @returns 边界。
 */
function contentBoxOf(y: ContentBoxIn): ContentBox {
  let minX = Number.MAX_VALUE
  let maxX = 0
  let minY = Number.MAX_VALUE
  let maxY = 0
  for (const it of y.items) {
    const t = y.tr(y.vt, it.transform)
    const px = t[MAT_E] as number
    const py = t[MAT_F] as number
    minX = Math.min(minX, px)
    maxX = Math.max(maxX, px + it.width)
    minY = Math.min(minY, py - BOX_UP)
    maxY = Math.max(maxY, py + BOX_DOWN)
  }
  return { minX, maxX, minY, maxY }
}

/**
 * 按文字层给每句引文算高亮块。
 *
 * @param y 文字项、引文、变换与缩放。
 * @returns 高亮块。
 */
function rectsOf(y: RectsIn): HlRect[] {
  let full = TEXT_NONE
  const map: CharAt[] = []
  for (const [i, it] of y.items.entries()) {
    for (let o = 0; o < it.str.length; o++) {
      full += it.str.charAt(o)
      map.push({ i, o })
    }
    if (it.str.endsWith(ONE_SPACE) === false) {
      full += ONE_SPACE
      map.push({ i: -1, o: 0 })
    }
  }
  const ctx = document.createElement(CANVAS_TAG).getContext(CTX_2D) as CanvasRenderingContext2D
  ctx.font = MEASURE_FONT
  const out: HlRect[] = []
  for (const q of y.quotes) {
    const at = full.indexOf(q.q)
    let first = true
    let k = at
    while (at >= 0 && k < at + q.q.length) {
      const c = map[k] as CharAt
      if (c.i < 0) {
        k++
        continue
      }
      let e = k
      while (e + 1 < at + q.q.length && (map[e + 1] as CharAt).i === c.i) {
        e++
      }
      const it = y.items[c.i] as PdfItem
      const t = y.tr(y.vt, it.transform)
      const total = ctx.measureText(it.str).width
      const a = ctx.measureText(it.str.slice(0, c.o)).width / total
      const b = ctx.measureText(it.str.slice(0, (map[e] as CharAt).o + 1)).width / total
      const w = it.width * y.scale
      const h = Math.hypot(t[MAT_C] as number, t[MAT_D] as number)
      out.push({
        x: (t[MAT_E] as number) + w * a,
        y: (t[MAT_F] as number) - h * HL_UP_RATIO,
        w: w * (b - a),
        h: h * HL_H_RATIO,
        n: q.n,
        first,
      })
      first = false
      k = e + 1
    }
  }
  return out
}

/**
 * 给句头序号让位:把那一行从句头起往右挪一点,高亮块跟着挪(只动预览画布)。
 *
 * @param y 原画布、尺寸、高亮块、留白与像素比。
 * @returns 新画布与多出的宽。
 */
function shiftedOf(y: ShiftedIn): ShiftedOut {
  const byLine = new Map<number, HlRect[]>()
  for (const r of y.rects) {
    if (r.first) {
      const key = Math.round(r.y)
      const list = byLine.get(key)
      if (list == null) {
        byLine.set(key, [r])
      } else {
        list.push(r)
      }
    }
  }
  let extra = 0
  for (const list of byLine.values()) {
    list.sort(byX)
    extra = Math.max(extra, list.length * y.gap)
  }
  const out = document.createElement(CANVAS_TAG)
  out.width = y.cv.width + Math.ceil(extra * y.dpr)
  out.height = y.cv.height
  out.style.width = String(Math.floor(y.vp.width) + extra) + PX
  out.style.height = String(Math.floor(y.cv.height / y.dpr)) + PX
  const g = out.getContext(CTX_2D) as CanvasRenderingContext2D
  g.fillStyle = PAPER_WHITE
  g.fillRect(0, 0, out.width, out.height)
  g.drawImage(y.cv, 0, 0)
  for (const list of byLine.values()) {
    paintLine({ g, cv: y.cv, list, gap: y.gap, dpr: y.dpr, width: out.width })
  }
  moveRects({ rects: y.rects, byLine, gap: y.gap })
  return { canvas: out, extra }
}

/**
 * 按左边排。
 *
 * @param a 一块。
 * @param b 另一块。
 * @returns 顺序。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死
function byX(a: HlRect, b: HlRect): number {
  return a.x - b.x
}

/**
 * 重画一行:各段按句头个数往右挪。
 *
 * @param y 画笔、原画布、这一行的句头、留白、像素比与总宽。
 * @returns 无。
 */
function paintLine(y: PaintLineIn): void {
  const head = y.list[0] as HlRect
  const y0 = Math.floor(head.y * y.dpr)
  const bh = Math.ceil(head.h * y.dpr)
  y.g.fillRect(0, y0, y.width, bh)
  for (let i = -1; i < y.list.length; i++) {
    let sx = 0
    if (i >= 0) {
      sx = Math.round((y.list[i] as HlRect).x * y.dpr)
    }
    let ex = y.cv.width
    const next = y.list[i + 1]
    if (next != null) {
      ex = Math.round(next.x * y.dpr)
    }
    y.g.drawImage(y.cv, sx, y0, ex - sx, bh, sx + Math.round((i + 1) * y.gap * y.dpr), y0, ex - sx, bh)
  }
}

/**
 * 高亮块跟着挪;句头那一块往左包住序号。
 *
 * @param y 高亮块、按行分组与留白。
 * @returns 无。
 */
function moveRects(y: MoveRectsIn): void {
  const moves: number[] = []
  for (const r of y.rects) {
    let n = 0
    const list = y.byLine.get(Math.round(r.y))
    if (list != null) {
      for (const s of list) {
        if (s.x <= r.x + RECT_EPS) {
          n++
        }
      }
    }
    moves.push(n * y.gap)
  }
  for (const [i, r] of y.rects.entries()) {
    r.x += moves[i] as number
    if (r.first) {
      r.x -= y.gap
      r.w += y.gap
    }
  }
}

/**
 * 发送:档案没有姓名的先存姓名;成功通知外面。
 *
 * @param x 职位、姓名与落格。
 * @returns 无。
 */
export async function sendReview(x: SendIn): Promise<void> {
  x.setSending(true)
  x.setErr(TEXT_NONE)
  try {
    if (x.askName) {
      const named = await fetch(URL_NAME, {
        method: METHOD_PATCH,
        credentials: CRED_INCLUDE,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ senderName: x.name.trim() }),
      })
      if (named.ok === false) {
        x.setErr(ERR_NAME)
        x.setSending(false)
        return
      }
    }
    const r = await fetch(URL_SEND, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ jobId: x.jobId }),
    })
    if (r.ok === false) {
      await (r.json() as Promise<ErrJson>)
      x.setErr(ERR_SEND)
      x.setSending(false)
      return
    }
  } catch {
    x.setErr(ERR_SEND)
    x.setSending(false)
    return
  }
  x.setSending(false)
  track(TRACK_SENT)
  x.onSent()
}

/**
 * 存求职信的修改并重新核对。
 *
 * @param x 落格、信、姓名与收栏。
 * @returns 无。
 */
export async function saveCoverEdit(x: CoverSaveIn): Promise<void> {
  try {
    const r = await fetch(URL_COVER, {
      method: METHOD_PUT,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ jobId: x.c.jobId, cover: x.text }),
    })
    if (r.ok === false) {
      x.c.setErr(ERR_DEFAULT)
      return
    }
  } catch {
    x.c.setErr(ERR_DEFAULT)
    return
  }
  x.close()
  await runSteps({ c: x.c, start: { step: STEP_AUDIT, facts: {}, both: false, regen: false, fill: false } })
}

/**
 * 要求的颜色类。
 *
 * @param id 要求编号。
 * @returns 类名。
 */
export function colorOf(id: number): string {
  return cssOf(css[COLOR_HEAD + String(((id - 1) % COLOR_N) + 1)])
}

/**
 * 按条件取一个类名。
 *
 * @param x 要不要与类名。
 * @returns 要给类名,否则空串。
 */
export function clsIf(x: ClsIfIn): string {
  if (x.on) {
    return x.cls
  }
  return TEXT_NONE
}

/**
 * 高亮块上的序号标记:只有句头那块带。
 *
 * @param r 这一块。
 * @returns 序号;不是句头给 null(React 不写这个属性)。
 */
export function hlDataOf(r: HlRect): number | null {
  if (r.first) {
    return r.n
  }
  return null
}

/**
 * 造「点一条要求」手柄:点同一条取消选中。
 *
 * @param x 选中项、这一条与手柄。
 * @returns 点击手柄。
 */
export function makePickActive(x: PickActiveIn): () => void {
  return function onPick(): void {
    if (x.active === x.n) {
      x.setActive(NUM_NONE)
    } else {
      x.setActive(x.n)
    }
  }
}

/**
 * 造「点高亮」手柄:不冒泡给面板(面板点击是放大)。
 *
 * @param x 选中项、这一条与手柄。
 * @returns 点击手柄。
 */
export function makeHlPick(x: PickActiveIn): HlPickFn {
  return function onHlPick(e: React.MouseEvent): void {
    e.stopPropagation()
    if (x.active === x.n) {
      x.setActive(NUM_NONE)
    } else {
      x.setActive(x.n)
    }
  }
}

/**
 * 还要补的要求(有红叉的)。
 *
 * @param reqs 要求。
 * @returns 还没覆盖的要求。
 */
export function missingReqsOf(reqs: ReviewReq[]): ReviewReq[] {
  const out: ReviewReq[] = []
  for (const r of reqs) {
    if (isCovered(r) === false) {
      out.push(r)
    }
  }
  return out
}

/**
 * 用户真的填了的几条:留着空格、没动骨架或清空的都不算。
 * 2026-11-09 Frank「骨架 就告诉这部分应该填什么即可」:文本框不再预填带空格的句子,只在框里提示该写什么 —— 写了字的就算填了。
 *
 * @param x 要求与现在的文字。
 * @returns 编号 → 文字。
 */
export function filledFactsOf(x: FilledFactsIn): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of x.reqs) {
    const text = x.facts[String(r.id)]
    if (text != null && text.trim() !== TEXT_NONE) {
      out[String(r.id)] = text.trim()
    }
  }
  return out
}


/**
 * 某条要求现在的文字。
 *
 * @param x 文字表与编号。
 * @returns 文字;没有给空串。
 */
export function factTextOf(x: FactTextIn): string {
  const v = x.facts[String(x.id)]
  if (v == null) {
    return TEXT_NONE
  }
  return v
}
