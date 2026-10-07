/**
 * modal 域的纯函数(零 JSX 零 hook):DOM 断言接缝、事件停传、
 * 类名与运行时样式的预算。
 * 2026-09-28 并壳(Frank「别并存啊」「你都重构了 还并存什么」):advisor 浮层壳的拖动 / 拉伸 / 尺寸记忆 / 居中算式并进来,
 * 与本域原有的拖动(transform 位移)、拉伸(resizedOf)合成一套 —— 拖过或拉过之后白卡一律钉在视口坐标上;
 * 窗口形(带标题栏)首帧就按记忆尺寸居中钉住。Esc 排号的两个出入口也在这里。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { cssOf } from '@/components/css'
import {
  CENTER_DIV, CLS_SEP, DRAG_IGNORE_SEL, EDGE_E, EDGE_N, EDGE_NE, EDGE_NW, EDGE_S, EDGE_SE, EDGE_SW, EDGE_W,
  EV_POINTERMOVE, EV_POINTERUP, FIT_NONE, FRAME_SEL, POS_FIXED, POS_MIN, POS_X0, POS_Y0, RESIZE_MIN_H, RESIZE_MIN_W,
  TEXT_NONE, VIEWPORT_GAP, WIN_MIN_H, WIN_MIN_W,
} from './constants'
import type {
  BarClsIn, BodyClsIn, BoxNowIn, CenterIn, ClsIn, ClsOut, DownPickIn, DragStartIn, FrameBox, FrameIn, FrameInitIn,
  FrameOut, FramePickIn, FrameStyleIn, MinSize, MinSizeIn, ModalSize, PointerHandlerFn, PrefFact, PrefJson, ResizedIn,
  ResizeStartIn, SavePrefIn, SizedBox,
} from './types'
import { CACHE } from './variables'
import css from './modal.module.css'

/**
 * DOM 事件目标 → 元素(EventTarget 是 DOM 的宽类型,capture/closest 要元素 ——
 * 跨边界断言收在这一个接缝里,组件体内不再散落 as)。
 *
 * @param t 事件目标。
 * @returns 元素。
 */
export function elOf(t: EventTarget | null): HTMLElement {
  return t as HTMLElement
}

/**
 * 事件停传(卡内点击不许冒到遮罩,否则点哪都算点外面关框)。
 *
 * @param e 鼠标事件。
 * @returns 无。
 */
export function stopClick(e: React.MouseEvent) {
  e.stopPropagation()
}

/**
 * 遮罩与白卡的类名预算:窗口形(带标题栏,窄屏全屏)→ 普通弹框的窄屏(sm 档留衬、其余全屏贴边)→
 * 居中态(三档宽 + 加高档 + 可拖给手势光标),pad=false 再叠免内衬。
 * card 档(2026-10-03 付费闭环批 A1):宽屏借 md 的 560、窄屏借 sm 的居中卡片,不另起 css。
 *
 * @param x 形态开关。
 * @returns 两条拼好的 className。
 */
export function clsOf(x: ClsIn): ClsOut {
  if (x.win) {
    const card = [css.card, css.win]
    if (x.narrow) {
      card.push(css.full)
    }
    return { card: card.join(CLS_SEP), overlay: cssOf(css.overlay) }
  }
  const narrowCard: Record<ModalSize, string> = {
    sm: cssOf(css.narrowSm),
    md: cssOf(css.narrowFull),
    lg: cssOf(css.narrowFull),
    fit: cssOf(css.narrowSm),
    card: cssOf(css.narrowSm),
  }
  const narrowOverlay: Record<ModalSize, string> = {
    sm: cssOf(css.overlayNarrowSm),
    md: cssOf(css.overlayNarrowFull),
    lg: cssOf(css.overlayNarrowFull),
    fit: cssOf(css.overlayNarrowSm),
    card: cssOf(css.overlayNarrowSm),
  }
  const sizeCls: Record<ModalSize, string> = {
    sm: cssOf(css.sm),
    md: cssOf(css.md),
    lg: cssOf(css.lg),
    fit: cssOf(css.fit),
    card: cssOf(css.md),
  }
  const card = [css.card, css.flow]
  const overlay = [css.overlay]
  if (x.narrow) {
    card.push(narrowCard[x.size])
    overlay.push(narrowOverlay[x.size])
  } else {
    card.push(css.center)
    card.push(sizeCls[x.size])
    if (x.tall) {
      card.push(css.tall)
    }
    if (x.draggable) {
      card.push(css.grab)
    }
  }
  if (x.pad === false) {
    card.push(css.noPad)
  }
  return { card: card.join(CLS_SEP), overlay: overlay.join(CLS_SEP) }
}

/**
 * 换屏键(缺席折成 FIT_NONE;2026-10-05 立,见 useFrame)。
 *
 * @param x 白卡机器的入参。
 * @returns 换屏键。
 */
export function fitKeyOf(x: FrameIn): string {
  if (x.fitKey == null) {
    return FIT_NONE
  }
  return x.fitKey
}

/**
 * 换了一屏内容时白卡的位置尺寸:拉出来的高撤掉(回到随内容高,上限照类里的),位置与宽不动;
 * 没拉过高的原样交回(2026-10-05 Frank「这个也是很多空白」「都有这个问题」:访客向导在第 2 题拉高,
 * 第 1 / 4 题与注册屏内容矮,按钮下面空一大截)。
 *
 * @param box 此刻钉住的位置尺寸;null = 没动过。
 * @returns 撤掉高之后的位置尺寸。
 */
export function heightDroppedOf(box: FrameBox | null): FrameBox | null {
  if (box == null || box.h == null) {
    return box
  }
  return { x: box.x, y: box.y, w: box.w, h: null }
}

/**
 * 白卡的运行时样式:拖过 / 拉过 / 窗口形才有值 —— 钉在视口上的位置与尺寸是每帧连续变化的像素,
 * 类是有限枚举装不下它。没动过的普通弹框与窄屏全屏样式全在类里,返回空对象。
 *
 * @param x 窄屏态与钉住的位置尺寸。
 * @returns 白卡的 style。
 */
export function frameStyleOf(x: FrameStyleIn): React.CSSProperties {
  if (x.narrow || x.box == null) {
    return {}
  }
  const style: React.CSSProperties = { position: POS_FIXED, left: x.box.x, top: x.box.y, margin: 0 }
  if (x.box.w != null) {
    style.width = x.box.w
  }
  if (x.box.h != null) {
    style.height = x.box.h
  }
  return style
}

/**
 * 遮罩层类名(交给**自带壳**的重弹框用:Advisor / Decision 这类带拖拽全屏的面板
 * 不套 Modal 组件,但遮罩必须与全站同一份 —— 2026-08-24 弹框族批把它们从
 * `style={SCRIM}` 换成这个类,SCRIM 常量随之退役)。
 * 2026-09-28 并壳后 advisor 的三个浮层也套 Modal 了,眼下只剩 plan 桶答题区的伪全屏在用。
 *
 * @returns 遮罩 className(半透黑全屏底;z-index 由调用方按层级给)。
 */
export function overlayCls(): string {
  return cssOf(css.overlay)
}

/**
 * 窗口形标题栏的类名(窄屏全屏时不给拖动光标 —— 全屏拖不动)。
 *
 * @param x 窄屏态。
 * @returns 类名。
 */
export function barClsOf(x: BarClsIn): string {
  if (x.narrow) {
    return cssOf(css.bar) + CLS_SEP + cssOf(css.barFull)
  }
  return cssOf(css.bar)
}

/**
 * 窗口形正文的类名(JD 档:整栏读正文,字号大一档、底衬归零让投递栏贴底)。
 * 2026-07-25 用户「穿墙」:底部原 20px 内衬在 sticky 投递栏下方留缝,滚动到底
 * JD 从缝里透出卡片圆角外 → 底内衬归 0,底部留白改由投递栏自带。
 *
 * @param x 走不走 JD 档。
 * @returns 类名。
 */
export function bodyClsOf(x: BodyClsIn): string {
  if (x.jd) {
    return cssOf(css.body) + CLS_SEP + cssOf(css.bodyJd)
  }
  return cssOf(css.body)
}

/**
 * 窗口钮排的类名:窗口形排在标题栏里,普通弹框浮在白卡右上角。
 *
 * @param bar 是否排在标题栏里。
 * @returns 类名。
 */
export function actsClsOf(bar: boolean): string {
  if (bar) {
    return cssOf(css.barActs)
  }
  return cssOf(css.acts)
}

/**
 * 八向拉伸把手的类名(边距与光标是**样式**,按方向查表)。
 *
 * @param edge 方向。
 * @returns 类名;方向不认识时只给把手底座(不炸)。
 */
export function edgeClsOf(edge: string): string {
  const map: Record<string, string> = {
    [EDGE_N]: cssOf(css.edgeN),
    [EDGE_S]: cssOf(css.edgeS),
    [EDGE_W]: cssOf(css.edgeW),
    [EDGE_E]: cssOf(css.edgeE),
    [EDGE_NW]: cssOf(css.edgeNw),
    [EDGE_NE]: cssOf(css.edgeNe),
    [EDGE_SW]: cssOf(css.edgeSw),
    [EDGE_SE]: cssOf(css.edgeSe),
  }
  const hit = map[edge]
  if (hit == null) {
    return cssOf(css.handle)
  }
  return cssOf(css.handle) + CLS_SEP + hit
}

/**
 * 最小尺寸:窗口形(长内容浮层)360 × 280,普通弹框 240 × 120。
 *
 * @param x 是否窗口形。
 * @returns 最小宽高。
 */
export function minSizeOf(x: MinSizeIn): MinSize {
  if (x.win) {
    return { w: WIN_MIN_W, h: WIN_MIN_H }
  }
  return { w: RESIZE_MIN_W, h: RESIZE_MIN_H }
}

/**
 * 拉伸跟手算式:东/南向只改尺寸(右下边跟手),西/北向改尺寸的同时挪左上角(左上边跟手、右下边钉住)。
 * 宽高夹在最小尺寸与「视口减留白」之间;夹住时西/北向把左上角反推回去,不然会出现「拉不动了但框还在飘」。
 *
 * @param x 起手快照、位移量与最小尺寸。
 * @returns 这一帧的位置与尺寸。
 */
export function resizedOf(x: ResizedIn): SizedBox {
  const e = x.st.edge
  const b = x.st.box
  let w = b.w
  let h = b.h
  if (e.includes(EDGE_E)) {
    w = b.w + x.dx
  }
  if (e.includes(EDGE_W)) {
    w = b.w - x.dx
  }
  if (e.includes(EDGE_S)) {
    h = b.h + x.dy
  }
  if (e.includes(EDGE_N)) {
    h = b.h - x.dy
  }
  w = Math.min(Math.max(w, x.min.w), window.innerWidth - VIEWPORT_GAP)
  h = Math.min(Math.max(h, x.min.h), window.innerHeight - VIEWPORT_GAP)
  let left = b.x
  let top = b.y
  if (e.includes(EDGE_W)) {
    left = b.x + (b.w - w)
  }
  if (e.includes(EDGE_N)) {
    top = b.y + (b.h - h)
  }
  return { x: left, y: top, w, h }
}

/**
 * 按尺寸算居中位。先从视口里扣掉边缘留白再居中,并给左上角兜一个最小坐标 ——
 * 否则窗口比浮层还小时标题栏会被顶出屏外,拖都拖不回来。
 *
 * @param x 弹框宽高。
 * @returns 钉住的位置与尺寸(尺寸照给的宽高)。
 */
export function centeredBoxOf(x: CenterIn): FrameBox {
  const w = Math.min(x.w, window.innerWidth - VIEWPORT_GAP)
  const h = Math.min(x.h, window.innerHeight - VIEWPORT_GAP)
  return {
    x: Math.max(POS_MIN, (window.innerWidth - w) / CENTER_DIV),
    y: Math.max(POS_MIN, (window.innerHeight - h) / CENTER_DIV),
    w: x.w,
    h: x.h,
  }
}

/**
 * 读尺寸记忆。
 *
 * @param key 记忆键。
 * @returns 记忆。读不到、存的不是 JSON、浏览器禁了本地存储时给空记忆
 * —— 记忆是锦上添花,拿不到就用默认尺寸,不该连累弹框打不开。
 */
export function readPrefOf(key: string): PrefFact {
  const empty: PrefFact = { w: null, h: null }
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) {
      return empty
    }
    const p: PrefJson = JSON.parse(raw)
    if (p.w == null || p.h == null) {
      return empty
    }
    return { w: p.w, h: p.h }
  } catch {
    return empty
  }
}

/**
 * 写尺寸记忆。
 *
 * @param x 记忆键与这次拉出来的宽高。
 * @returns 无。浏览器禁了本地存储时静默作罢,同上:记不住尺寸不影响用。
 */
export function savePrefOf(x: SavePrefIn): void {
  try {
    localStorage.setItem(x.key, JSON.stringify({ w: x.w, h: x.h }))
  } catch {
    return
  }
}

/**
 * 首帧的位置与尺寸:窗口形直接按记忆(读不到照旧默认尺寸)居中钉住 —— 2026-09-21 Frank「会出现 先一个小框，然后在放大」:
 * 记忆原先在挂载后的 effect 里补,先按默认尺寸画一帧再跳;弹框都是用户点了才开、只在浏览器里画,首帧就按记忆算,那一跳没了。
 * 服务端给固定初值。普通弹框给 null(照遮罩居中,动过才钉)。
 *
 * @param x 弹框形态。
 * @returns 首帧的位置与尺寸;null = 普通弹框还没动过。
 */
export function frameInitOf(x: FrameInitIn): FrameBox | null {
  if (x.win == null) {
    return null
  }
  const p = readPrefOf(x.win.memo)
  let w = x.win.w
  let h = x.win.h
  if (p.w != null && p.h != null) {
    w = p.w
    h = p.h
  }
  if (typeof window === 'undefined') {
    return { x: POS_X0, y: POS_Y0, w, h }
  }
  return centeredBoxOf({ w, h })
}

/**
 * 按下那一刻白卡的位置:钉过就用钉住的,还没动过就量一下白卡此刻在视口里的位置(宽高照旧跟档位走)。
 *
 * @param x 钉住的位置与白卡元素。
 * @returns 位置;白卡还没挂上时给 null(不起手)。
 */
export function boxNowOf(x: BoxNowIn): FrameBox | null {
  if (x.box != null) {
    return x.box
  }
  if (x.el == null) {
    return null
  }
  const r = x.el.getBoundingClientRect()
  return { x: r.left, y: r.top, w: null, h: null }
}

/**
 * 按下那一刻白卡的位置与尺寸(拉伸要四格都有值:没拉过的宽高量白卡)。
 *
 * @param x 钉住的位置与白卡元素。
 * @returns 位置与尺寸;白卡还没挂上时给 null。
 */
export function sizedNowOf(x: BoxNowIn): SizedBox | null {
  if (x.el == null) {
    return null
  }
  const r = x.el.getBoundingClientRect()
  if (x.box == null || x.box.w == null || x.box.h == null) {
    return { x: r.left, y: r.top, w: r.width, h: r.height }
  }
  return { x: x.box.x, y: x.box.y, w: x.box.w, h: x.box.h }
}

/**
 * 从按下的那块往上找白卡(标题栏、把手、白卡本身都行)。
 *
 * @param t 挂手柄的那个元素。
 * @returns 白卡;找不到给 null(不起手)。
 */
export function frameElOf(t: EventTarget | null): Element | null {
  return elOf(t).closest(FRAME_SEL)
}

/**
 * 按在拖动豁免目标上没有(按钮、输入件、链接、窗口钮排、译名行……)。
 *
 * @param t 事件目标。
 * @returns 是否豁免。
 */
export function isNoDragOf(t: EventTarget | null): boolean {
  return elOf(t).closest(DRAG_IGNORE_SEL) != null
}

/**
 * 拖动的起手手柄(原生 pointer 事件,无依赖):按下量起点,窗口级跟手写位置,松手摘监听。
 * 位置不记忆:每次打开都居中 —— 记了位置,窗口一缩小上次那个坐标就在屏外,弹框打开即消失。
 *
 * @param x 开关、当前位置与位置落格。
 * @returns 按下手柄。
 */
export function makeDragStart(x: DragStartIn): PointerHandlerFn {
  return function startDrag(e: React.PointerEvent): void {
    if (x.enabled === false || isNoDragOf(e.target)) {
      return
    }
    const now = boxNowOf({ box: x.box, el: frameElOf(e.currentTarget) })
    if (now == null) {
      return
    }
    e.preventDefault()
    const from: FrameBox = now
    const sx = e.clientX
    const sy = e.clientY
    function move(ev: PointerEvent): void {
      x.setBox({ x: from.x + ev.clientX - sx, y: from.y + ev.clientY - sy, w: from.w, h: from.h })
    }
    function up(): void {
      window.removeEventListener(EV_POINTERMOVE, move)
      window.removeEventListener(EV_POINTERUP, up)
    }
    window.addEventListener(EV_POINTERMOVE, move)
    window.addEventListener(EV_POINTERUP, up)
  }
}

/**
 * 八向拉伸的起手手柄(用户点名:上下左右都可放大缩小)。松手时有记忆键就把尺寸写进记忆 ——
 * 读的是这一把拉伸自己记的最后一帧,不是 state:闭包里的 state 停在按下那一刻,写回去就把整段拉伸丢了。
 *
 * @param x 开关、当前位置尺寸、落格、方向、记忆键与最小尺寸。
 * @returns 按下手柄。
 */
export function makeResizeStart(x: ResizeStartIn): PointerHandlerFn {
  return function startResize(e: React.PointerEvent): void {
    if (x.enabled === false) {
      return
    }
    const from = sizedNowOf({ box: x.box, el: frameElOf(e.currentTarget) })
    if (from == null) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    const st = { x: e.clientX, y: e.clientY, box: from, edge: x.edge }
    let last: SizedBox = from
    function move(ev: PointerEvent): void {
      last = resizedOf({ st, dx: ev.clientX - st.x, dy: ev.clientY - st.y, min: x.min })
      x.setBox(last)
    }
    function up(): void {
      if (x.memo !== TEXT_NONE) {
        savePrefOf({ key: x.memo, w: last.w, h: last.h })
      }
      window.removeEventListener(EV_POINTERMOVE, move)
      window.removeEventListener(EV_POINTERUP, up)
    }
    window.addEventListener(EV_POINTERMOVE, move)
    window.addEventListener(EV_POINTERUP, up)
  }
}

/**
 * 不起手的按下手柄(拖动只挂在一块手柄上,另一块给它)。
 *
 * @returns 无。
 */
export function ignoreDown(): void {
  return
}

/**
 * 挑按下手柄:这块手柄起就给真手柄,不起就给空手柄。
 *
 * @param x 起不起与真手柄。
 * @returns 手柄。
 */
export function downOf(x: DownPickIn): PointerHandlerFn {
  if (x.on) {
    return x.fn
  }
  return ignoreDown
}

/**
 * 记忆键:窗口形用它自己的,普通弹框不记(空串)。
 *
 * @param x 弹框形态。
 * @returns 记忆键。
 */
export function memoOf(x: FrameIn): string {
  if (x.win == null) {
    return TEXT_NONE
  }
  return x.win.memo
}

/**
 * 用哪台白卡机器:外层起了就用外层的(内容整块重挂时位置尺寸不丢),没起用弹框自己的。
 *
 * @param x 外层的与自己的。
 * @returns 机器。
 */
export function frameOf(x: FramePickIn): FrameOut {
  if (x.ext != null) {
    return x.ext
  }
  return x.own
}

/**
 * Esc 排号:弹框挂上时领一个号排到最上面。
 *
 * @returns 领到的号。
 */
export function joinEsc(): number {
  CACHE.escSeq += 1
  CACHE.escOrder.push(CACHE.escSeq)
  return CACHE.escSeq
}

/**
 * Esc 排号:弹框卸下时出列(不管它在不在最上面)。
 *
 * @param id 号。
 * @returns 无。
 */
export function leaveEsc(id: number): void {
  const at = CACHE.escOrder.indexOf(id)
  if (at >= 0) {
    CACHE.escOrder.splice(at, 1)
  }
}

/**
 * 这个号是不是最上面那个(只有它接 Esc)。
 *
 * @param id 号。
 * @returns 是否最上面。
 */
export function isTopEsc(id: number): boolean {
  return CACHE.escOrder[CACHE.escOrder.length - 1] === id
}
