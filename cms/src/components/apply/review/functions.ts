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
  TRACK_SEND_CLICK,
  ERR_CHARS, HEAD_ONLY_NUDGE, HTTP_UNPROCESSABLE, PAGE_GAP,
  JD_BULLET, JD_HEAD_MARK, JD_SEC_KEYS, JD_SENT_SPLIT_RE, NEWLINE,
  AVAIL_GAP, BOX_DOWN, BOX_UP, CANVAS_TAG, COLOR_HEAD, COLOR_N, CRED_INCLUDE, CTX_2D, ERR_DEFAULT, ERR_KEYS, ERR_NAME,
  ERR_PRO, ERR_SEND, HDR_CONTENT_TYPE, HL_H_RATIO, HL_UP_RATIO, KEY_STR, MAT_C, MAT_D, MAT_E, MAT_F, MEASURE_FONT,
  METHOD_PATCH, METHOD_POST, METHOD_PUT, MIME_JSON, NARROW_W, NUM_GAP, NUM_GAP_BASE, NUM_MAX, NUM_NONE, NUM_RATIO,
  NEED_BOTH, NEED_COVER, NEED_RESUME,
  ONE_SPACE, PAD_SIDES, PAGE_PAD, PAPER_WHITE, PX, RECT_EPS, SCALE_MAX, SEL_CV, STEP_AUDIT, STEP_LOOP_MAX, TEXT_NONE,
  SHEET_LEFT_PAD,
  TRACK_SENT, URL_COVER, URL_RESUME, URL_NAME, URL_SEND, URL_STATE, URL_STEP,
  STACK_SCALE_MAX, WS_RE, ZOOM_NARROW,
} from './constants'
import type {
  AddPageIn, CropIn, DrawSum,
  CharAt, ClsIfIn, ContentBox, ContentBoxIn, CoverSaveIn, DrawIn, DrawOut, ErrJson, FailRunIn, HlPickFn, HlRect, JdHit,
  JdSeg, JdSegsIn, MoveRectsIn, PaintLineIn, PdfItem, PickActiveIn, Quote, RectsIn, Review, ReviewCells, ReviewReq,
  RunIn, ScaleOfIn, SendIn, ShiftedIn, ShiftedOut, StateJson, StepBodyIn, StepJson,
  HeadTextIn, JdRow, JdRowsIn, JdSentsIn, SheetZoomIn,
  MaybeReview, QuoteRectsIn, RectsOut, ResumeSaveIn, RunRectIn, TextMap,
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
 * @returns 跑完后的核对结果;失败给 null。
 */
export async function runSteps(x: RunIn): Promise<MaybeReview> {
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
        return null
      }
      if (d.review != null) {
        x.c.setReview(d.review)
      }
      first = false
      step = nextOf(d)
    }
    const got = await reloadState(x.c)
    x.c.setStage(TEXT_NONE)
    return got.review
  } catch {
    x.c.setErr(ERR_DEFAULT)
  }
  x.c.setStage(TEXT_NONE)
  return null
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
      extra: y.x.start.extra,
      both: y.x.start.both,
      regen: y.x.start.regen,
      fill: y.x.start.fill,
    })
  }
  return JSON.stringify({
    jobId: y.jobId,
    step: y.step,
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
  c.setSaved(d.extra)
  c.setCv(d.cv)
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
 * 把职位描述排成行(2026-11-10 Frank「title 应该加粗」「这个也需要 bullets」「这种应该是两行」):
 * 行首带节头标记的是小标题;有小标题的职位描述,小标题下面没带圆点的行补圆点,一行多句的拆成一句一行。
 * 没有小标题的职位描述(整段文字的那种)原样逐行给。
 *
 * @param x 全文与要求。
 * @returns 各行。
 */
export function jdRowsOf(x: JdRowsIn): JdRow[] {
  const out: JdRow[] = []
  const listed = x.jd.startsWith(JD_HEAD_MARK) || x.jd.includes(NEWLINE + JD_HEAD_MARK)
  for (const line of x.jd.split(NEWLINE)) {
    if (line.trim() === TEXT_NONE) {
      continue
    }
    if (line.startsWith(JD_HEAD_MARK)) {
      out.push({ text: line.slice(JD_HEAD_MARK.length), head: true, bullet: false })
    } else if (listed === false || line.trimStart().startsWith(JD_BULLET)) {
      out.push({ text: line, head: false, bullet: false })
    } else {
      for (const s of jdSentsOf({ line, reqs: x.reqs })) {
        out.push({ text: s, head: false, bullet: true })
      }
    }
  }
  return out
}

/**
 * 一行拆成各句;有要求的原文跨着两句的不拆(拆了高亮就对不上)。
 *
 * @param x 这一行与要求。
 * @returns 各句。
 */
function jdSentsOf(x: JdSentsIn): string[] {
  const parts = x.line.split(JD_SENT_SPLIT_RE)
  const whole = normOf(x.line)
  for (const r of x.reqs) {
    if (whole.includes(r.jd)) {
      let inOne = false
      for (const p of parts) {
        if (normOf(p).includes(r.jd)) {
          inOne = true
        }
      }
      if (inOne === false) {
        return [x.line]
      }
    }
  }
  return parts
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
 * 画一份将发出的 PDF:每一页都画(2026-11-10,原先只画第一页),各页裁到内容后竖排;叠高亮并给句头序号让位。
 * 一句引文只在最先出现的那一页标一次。
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
    const dpr = window.devicePixelRatio
    const sum: DrawSum = { scale: 0, left: 0, maxX: 0, top: 0, extra: 0, rects: [], canvases: [], rest: x.quotes }
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const tc = await page.getTextContent()
      const items = tc.items.filter(isTextItem) as PdfItem[]
      if (items.length === 0) {
        continue
      }
      const box = contentBoxOf({ items, tr: pdfjs.Util.transform, vt: page.getViewport({ scale: 1 }).transform })
      if (sum.scale === 0) {
        const fit = (x.host.clientWidth - AVAIL_GAP) / (box.maxX - box.minX + PAGE_PAD * PAD_SIDES)
        sum.scale = scaleOf({ fit, zoomed: x.zoomed })
        sum.left = Math.floor(box.minX * sum.scale - PAGE_PAD)
      }
      const vp = page.getViewport({ scale: sum.scale })
      const hi = page.getViewport({ scale: sum.scale * dpr })
      const cv = document.createElement(CANVAS_TAG)
      cv.width = Math.floor(hi.width)
      cv.height = Math.floor(hi.height)
      await page.render({ canvas: cv, viewport: hi }).promise
      if (x.alive() === false) {
        return
      }
      addPage({ sum, items, tr: pdfjs.Util.transform, vt: vp.transform, cv, vp, dpr, box })
    }
    const host = x.host.querySelector(SEL_CV)
    if (host != null) {
      host.replaceChildren()
      for (const c of sum.canvases) {
        host.append(c)
      }
    }
    x.setRects(sum.rects)
    x.setSize({
      w: Math.ceil(sum.maxX * sum.scale + PAGE_PAD * PAD_SIDES + sum.extra),
      h: Math.max(0, sum.top - PAGE_GAP),
      left: sum.left,
      top: 0,
      fit: x.host.clientWidth,
    })
  } catch {
    x.setFailed(true)
  }
}

/**
 * 预览整体的缩放:给序号让位后比容器宽的,缩到刚好放下(2026-11-10 Frank「不要有这个」:预览下面不出横向滚动条);
 * 手机上点了放大的不缩。
 *
 * @param x 尺寸与放大了吗。
 * @returns 缩放,不用缩给 1。
 */
export function sheetZoomOf(x: SheetZoomIn): number {
  const need = x.size.w - x.size.left + SHEET_LEFT_PAD
  if (x.zoomed || x.size.fit === 0 || need <= x.size.fit) {
    return 1
  }
  return x.size.fit / need
}

/**
 * 把画好的一页并进整份:算高亮、给序号让位、上下裁到内容,高亮块挪到这一页在整份里的位置。
 *
 * @param y 整份的累计、这一页的文字项、变换、画布、视口、像素比与内容边界。
 * @returns 无;累计就地更新。
 */
function addPage(y: AddPageIn): void {
  const sum = y.sum
  const found = rectsOf({ items: y.items, quotes: sum.rest, tr: y.tr, vt: y.vt, scale: sum.scale })
  const gap = Math.max(NUM_MAX, Math.round(sum.scale * NUM_GAP_BASE)) + NUM_GAP
  const sheet = shiftedOf({ cv: y.cv, vp: y.vp, rects: found.rects, gap, dpr: y.dpr })
  const y0 = Math.max(0, Math.floor(y.box.minY * sum.scale - PAGE_PAD))
  const y1 = Math.ceil(y.box.maxY * sum.scale + PAGE_PAD)
  sum.canvases.push(croppedOf({ canvas: sheet.canvas, y0, y1, dpr: y.dpr }))
  for (const r of found.rects) {
    r.y += sum.top - y0
    sum.rects.push(r)
  }
  sum.rest = found.rest
  sum.top += y1 - y0 + PAGE_GAP
  sum.extra = Math.max(sum.extra, sheet.extra)
  sum.maxX = Math.max(sum.maxX, y.box.maxX)
}

/**
 * 把一页画布上下裁到内容。
 *
 * @param y 画布、上下界(屏幕像素)与像素比。
 * @returns 裁好的画布。
 */
function croppedOf(y: CropIn): HTMLCanvasElement {
  const out = document.createElement(CANVAS_TAG)
  out.width = y.canvas.width
  out.height = Math.round((y.y1 - y.y0) * y.dpr)
  out.style.width = y.canvas.style.width
  out.style.height = String(y.y1 - y.y0) + PX
  const g = out.getContext(CTX_2D) as CanvasRenderingContext2D
  g.drawImage(y.canvas, 0, Math.round(y.y0 * y.dpr), out.width, out.height, 0, 0, out.width, out.height)
  return out
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
 * 缩放:宽屏贴合宽度;竖排(窗口不够宽)默认整页、不超过上限,点一下放大。
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
  return Math.min(y.fit, STACK_SCALE_MAX)
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
 * 按文字层给每句引文算高亮块;这一页找不到的引文留给后面的页。
 * 2026-11-10 高亮不重叠:一段字只归最先标到它的那句;后来的引文只画还没被占的部分。
 *
 * @param y 文字项、引文、变换与缩放。
 * @returns 高亮块与这一页没找到的引文。
 */
function rectsOf(y: RectsIn): RectsOut {
  const tm = textMapOf(y.items)
  const ctx = document.createElement(CANVAS_TAG).getContext(CTX_2D) as CanvasRenderingContext2D
  ctx.font = MEASURE_FONT
  const claimed: boolean[] = []
  const ghosts: HlRect[] = []
  const rects: HlRect[] = []
  const rest: Quote[] = []
  for (const q of y.quotes) {
    const at = tm.full.indexOf(q.q)
    if (at < 0) {
      rest.push(q)
      continue
    }
    for (const r of quoteRectsOf({ y, tm, ctx, claimed, ghosts, q, at })) {
      rects.push(r)
    }
  }
  return { rects, rest }
}

/**
 * 把一页的文字项拼成全文,并记下每个字来自哪一项的第几个字。
 *
 * @param items 文字项。
 * @returns 全文与逐字位置。
 */
function textMapOf(items: PdfItem[]): TextMap {
  let full = TEXT_NONE
  const map: CharAt[] = []
  for (const [i, it] of items.entries()) {
    for (let o = 0; o < it.str.length; o++) {
      full += it.str.charAt(o)
      map.push({ i, o })
    }
    if (it.str.endsWith(ONE_SPACE) === false) {
      full += ONE_SPACE
      map.push({ i: -1, o: 0 })
    }
  }
  return { full, map }
}

/**
 * 一句引文的高亮块:跳过已被别的引文占了的字;整句都被占了就只在句头留一个放序号的位置。
 *
 * @param z 这一页的入参、全文、量字笔、占位表、引文与它在全文里的起点。
 * @returns 高亮块(第一块带序号)。
 */
function quoteRectsOf(z: QuoteRectsIn): HlRect[] {
  const out: HlRect[] = []
  const end = z.at + z.q.q.length
  let head = -1
  let k = z.at
  while (k < end) {
    const c = z.tm.map[k] as CharAt
    if (c.i >= 0 && head < 0) {
      head = k
    }
    if (c.i < 0 || z.claimed[k] === true) {
      k++
      continue
    }
    let e = k
    while (e + 1 < end && (z.tm.map[e + 1] as CharAt).i === c.i && z.claimed[e + 1] !== true) {
      e++
    }
    out.push(runRectOf({ z, from: k, to: e, first: out.length === 0 }))
    for (let j = k; j <= e; j++) {
      z.claimed[j] = true
    }
    k = e + 1
  }
  if (out.length === 0 && head >= 0) {
    const r = runRectOf({ z, from: head, to: head, first: true })
    z.ghosts.push(r)
    r.x -= RECT_EPS * HEAD_ONLY_NUDGE * z.ghosts.length
    r.w = 0
    out.push(r)
  }
  return out
}

/**
 * 同一个文字项里连着的几个字 → 一块高亮。
 *
 * @param w 引文的入参、起止(全文下标)与是不是第一块。
 * @returns 高亮块。
 */
function runRectOf(w: RunRectIn): HlRect {
  const a0 = w.z.tm.map[w.from] as CharAt
  const b0 = w.z.tm.map[w.to] as CharAt
  const it = w.z.y.items[a0.i] as PdfItem
  const t = w.z.y.tr(w.z.y.vt, it.transform)
  const total = w.z.ctx.measureText(it.str).width
  const a = w.z.ctx.measureText(it.str.slice(0, a0.o)).width / total
  const b = w.z.ctx.measureText(it.str.slice(0, b0.o + 1)).width / total
  const width = it.width * w.z.y.scale
  const h = Math.hypot(t[MAT_C] as number, t[MAT_D] as number)
  return {
    x: (t[MAT_E] as number) + width * a,
    y: (t[MAT_F] as number) - h * HL_UP_RATIO,
    w: width * (b - a),
    h: h * HL_H_RATIO,
    n: w.z.q.n,
    first: w.first,
  }
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
 * 高亮块跟着挪;句头那一块往左包住序号;块中间插进了别的句头的,跟着加宽。
 *
 * @param y 高亮块、按行分组与留白。
 * @returns 无。
 */
function moveRects(y: MoveRectsIn): void {
  const moves: number[] = []
  const grows: number[] = []
  for (const r of y.rects) {
    let n = 0
    let inside = 0
    const list = y.byLine.get(Math.round(r.y))
    if (list != null) {
      for (const s of list) {
        if (s.x <= r.x + RECT_EPS) {
          n++
        } else if (s.x < r.x + r.w - RECT_EPS) {
          inside++
        }
      }
    }
    moves.push(n * y.gap)
    grows.push(inside * y.gap)
  }
  for (const [i, r] of y.rects.entries()) {
    r.x += moves[i] as number
    r.w += grows[i] as number
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
  track(TRACK_SEND_CLICK)
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
      x.c.setErr(saveErrOf(r.status))
      return
    }
  } catch {
    x.c.setErr(ERR_DEFAULT)
    return
  }
  x.close()
  await runSteps({ c: x.c, start: { step: STEP_AUDIT, extra: TEXT_NONE, both: false, regen: false, fill: false } })
}

/**
 * 手改保存失败的词条:有写不进 PDF 的字单说,其余按生成失败。
 *
 * @param status 状态码。
 * @returns 词条。
 */
function saveErrOf(status: number): string {
  if (status === HTTP_UNPROCESSABLE) {
    return ERR_CHARS
  }
  return ERR_DEFAULT
}

/**
 * 存手改的简历,再核对一次(2026-11-10 任务书第 33 条)。
 *
 * @param x 落格、改好的简历与收起回调。
 * @returns 无。
 */
export async function saveResumeEdit(x: ResumeSaveIn): Promise<void> {
  const work: string[] = []
  for (const w of x.cv.work) {
    work.push(w.desc)
  }
  try {
    const r = await fetch(URL_RESUME, {
      method: METHOD_PUT,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ jobId: x.c.jobId, summary: x.cv.summary, skills: x.cv.skills, work }),
    })
    if (r.ok === false) {
      x.c.setErr(saveErrOf(r.status))
      return
    }
  } catch {
    x.c.setErr(ERR_DEFAULT)
    return
  }
  x.close()
  await runSteps({ c: x.c, start: { step: STEP_AUDIT, extra: TEXT_NONE, both: false, regen: false, fill: false } })
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
 * 要补充经历才修得了的要求(红叉):基础简历和已有补充里都没有依据。
 * 2026-11-10:有依据、只是某一份没写到的不算在这里,那种靠重新生成那一份修。
 *
 * @param reqs 要求。
 * @returns 没有依据的要求。
 */
export function missingReqsOf(reqs: ReviewReq[]): ReviewReq[] {
  const out: ReviewReq[] = []
  for (const r of reqs) {
    if (r.basis === false) {
      out.push(r)
    }
  }
  return out
}

/**
 * 有依据但没覆盖的要求差在哪一份。
 *
 * @param r 一条要求。
 * @returns 小注的词条。
 */
export function needKeyOf(r: ReviewReq): string {
  if (r.resume === TEXT_NONE && r.cover === TEXT_NONE) {
    return NEED_BOTH
  }
  if (r.resume === TEXT_NONE) {
    return NEED_RESUME
  }
  return NEED_COVER
}

/**
 * 小标题显示的字:整理版的节标记(如 `[REQS]`)按界面语言换成节名,别的行原样。
 *
 * @param x 这一行、是不是小标题与取词。
 * @returns 显示的字。
 */
export function headTextOf(x: HeadTextIn): string {
  if (x.head === false) {
    return x.line
  }
  const key = JD_SEC_KEYS[x.line.trim()]
  if (key == null) {
    return x.line
  }
  return x.t(key)
}
