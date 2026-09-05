'use client'
/**
 * 站内向导对话框的机器:发一轮(POST /api/guide → 一轮落地)、留邮箱、见客文案取法、各手柄与效果体的工厂。
 * 只渲染不判断:类别、目的地、URL 全由服务端给;这里把回包翻成面板状态。
 *
 * @author Frank
 * @time 2026-09-05 16:00:00
 */

import { DEST_ROUTE, DEST_SUB } from '@/lib/guide'
import { track } from '@/lib/track'
import {
  COARSE_MQ, CRED_INCLUDE, DEST_KEY_PREFIX, EMAIL,  EV_ANSWER, EV_EMAIL, EV_NAV, EV_PROP_DEST, EV_SUBMIT, FAULT,
  H_AUTO, HDR_CONTENT_TYPE, HISTORY_MAX, KEY_ENTER, KIND, METHOD_POST, MIME_JSON, PX, ROLE, SLASH, STICK_SLACK_PX,
  TA_H_MAX, TEXT_NONE, TOO_MANY, URL_GUIDE, URL_GUIDE_EMAIL,
} from './constants'
import type {
  AutofocusIn, ChipHandleIn, CoarseIn, ComposerChangeEvent, ComposerKeyEvent, DestLabelIn, EmailChangeEvent,
  EmailChangeIn, GuideKind, GuideReply, GuideTurn, HistoryTurn, MakeChangeIn, MakeEmailSendIn, MakeKeyIn, MakeNavIn,
  MakeSubmitIn, MakeTurnsIn, MergeTurnIn, PatchTurnIn, PostEmailIn, ReplyTextIn, ReplyWire, SendDeps, SendFn,
  SendNowIn, StickIn, TurnHandleIn, TurnList, VoidFn,
} from './types'

/**
 * 造发话手柄:发出去不等(失败已在 sendNow 里落成故障态)。
 *
 * @param x 依赖包。
 * @returns 发话手柄。
 */
export function makeSend(x: SendDeps): SendFn {
  return function send(q: string): void {
    sendNow({ deps: x, q }).catch(ignoreErr)
  }
}

/**
 * 一轮:占位 → POST → 回包落轮;429 是限流,其余非 200 与网络错都是「没连上」。
 *
 * @param input 依赖包与要发的话。
 * @returns 无。
 */
async function sendNow(input: SendNowIn): Promise<void> {
  const x = input.deps
  const q = input.q.trim()
  if (q === TEXT_NONE || x.busy) {
    return
  }
  const i = x.turns.length
  x.setTurns(function seed(prev: TurnList): TurnList {
    return prev.concat([blankTurnOf(q)])
  })
  x.setInput(TEXT_NONE)
  if (x.taEl.current != null) {
    x.taEl.current.style.height = H_AUTO
  }
  x.setBusy(true)
  x.stick.current = true
  track(EV_SUBMIT)
  try {
    const r = await fetch(URL_GUIDE, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ text: q, lang: x.lang, path: x.path, history: historyOf(x.turns) }),
    })
    if (r.status === TOO_MANY) {
      patchTurn({ setTurns: x.setTurns, i, patch: { fault: FAULT.limit } })
    } else if (r.ok === false) {
      patchTurn({ setTurns: x.setTurns, i, patch: { fault: FAULT.net } })
    } else {
      const wire = await r.json() as ReplyWire
      patchTurn({ setTurns: x.setTurns, i, patch: { reply: toReply(wire) } })
      track(EV_ANSWER)
    }
  } catch {
    patchTurn({ setTurns: x.setTurns, i, patch: { fault: FAULT.net } })
  }
  x.setBusy(false)
}

/**
 * 发给接口的历史:最近几轮的问与向导那句(问题 / 建议没有那句就只带问)。
 *
 * @param turns 现有轮次。
 * @returns 历史。
 */
function historyOf(turns: TurnList): HistoryTurn[] {
  const out: HistoryTurn[] = []
  for (const t of turns.slice(-HISTORY_MAX)) {
    out.push({ role: ROLE.user, content: t.q })
    if (t.reply != null && t.reply.say !== TEXT_NONE) {
      out.push({ role: ROLE.assistant, content: t.reply.say })
    }
  }
  return out
}

/**
 * 刚发出去的一轮:只有问,其余等回包。
 *
 * @param q 用户那句。
 * @returns 一轮。
 */
function blankTurnOf(q: string): GuideTurn {
  return { q, reply: null, fault: FAULT.none, email: EMAIL.idle, emailDraft: TEXT_NONE }
}

/**
 * 改某一轮的几格(函数式更新,别的轮原样)。
 *
 * @param input 落格、轮位与要改的格。
 * @returns 无。
 */
function patchTurn(input: PatchTurnIn): void {
  input.setTurns(function apply(prev: TurnList): TurnList {
    const out: TurnList = []
    for (const [k, turn] of prev.entries()) {
      if (k === input.i) {
        out.push(mergeTurn({ turn, patch: input.patch }))
      } else {
        out.push(turn)
      }
    }
    return out
  })
}

/**
 * 原轮 + 局部更新 → 新轮(逐格写全,不展开)。
 *
 * @param input 原轮与要改的格。
 * @returns 新轮。
 */
function mergeTurn(input: MergeTurnIn): GuideTurn {
  const out: GuideTurn = {
    q: input.turn.q,
reply: input.turn.reply,
fault: input.turn.fault,
email: input.turn.email,
    emailDraft: input.turn.emailDraft,
  }
  if (input.patch.reply != null) {
    out.reply = input.patch.reply
  }
  if (input.patch.fault != null) {
    out.fault = input.patch.fault
  }
  if (input.patch.email != null) {
    out.email = input.patch.email
  }
  if (input.patch.emailDraft != null) {
    out.emailDraft = input.patch.emailDraft
  }
  return out
}

/**
 * 发话的 Promise 收尾:失败已落成故障态,这里只吞。
 *
 * @returns 无。
 */
function ignoreErr(): void {
  return
}

/**
 * 这一轮向导那行字:故障 → 错误句;带路 / 闲聊 → 模型那句;问题 / 建议 → 固定文案;还没回来 → 空串。
 *
 * @param input 取词函数与这一轮。
 * @returns 那行字。
 */
export function replyTextOf(input: ReplyTextIn): string {
  if (input.turn.fault === FAULT.limit) {
    return input.t('chat.err.limit')
  }
  if (input.turn.fault === FAULT.net) {
    return input.t('chat.err.net')
  }
  const r = input.turn.reply
  if (r == null) {
    return TEXT_NONE
  }
  if (r.kind === KIND.question) {
    return input.t('chat.noted')
  }
  if (r.kind === KIND.suggestion) {
    return input.t('chat.gotIt')
  }
  if (r.kind === KIND.chat) {
    return input.t('chat.map')
  }
  return r.say
}

/**
 * 站内地图卡的链接:目的地的路由;带子路径的页落清单第一项(PTE → /pte/ra)。
 *
 * @param dest 目的地键。
 * @returns 站内路径;目录里没有是空串(MAP_DESTS 与目录同源,生产不会走到)。
 */
export function mapHrefOf(dest: string): string {
  const route = DEST_ROUTE[dest]
  if (route == null) {
    return TEXT_NONE
  }
  const subs = DEST_SUB[dest]
  if (subs == null) {
    return route
  }
  const first = subs[0]
  if (first == null) {
    return route
  }
  return route + SLASH + first
}

/**
 * 造站内地图卡点击手柄(tsx 里用):只打埋点,跳转由链接自己走。
 *
 * @param dest 目的地键。
 * @returns 零参手柄。
 */
export function makeMapClick(dest: string): VoidFn {
  return function click(): void {
    track(EV_NAV, { [EV_PROP_DEST]: dest })
  }
}

/**
 * 目的地的见客名(i18n `guide.dest.<键>`)。
 *
 * @param input 取词函数与目的地键。
 * @returns 见客名。
 */
export function destLabelOf(input: DestLabelIn): string {
  return input.t(DEST_KEY_PREFIX + input.dest)
}

/**
 * 这一轮要不要出「留个邮箱」:只有问题与建议,且服务端真记下了(有 id)。
 *
 * @param turn 这一轮。
 * @returns 要不要。
 */
export function wantsEmail(turn: GuideTurn): boolean {
  const r = turn.reply
  if (r == null || r.id == null) {
    return false
  }
  return r.kind === KIND.question || r.kind === KIND.suggestion
}

/**
 * 造输入框 change 手柄:落值 + 自动长高(封顶 TA_H_MAX)。
 *
 * @param x 输入框落格。
 * @returns change 手柄。
 */
export function makeComposerChange(x: MakeChangeIn): (e: ComposerChangeEvent) => void {
  return function onChange(e: ComposerChangeEvent): void {
    x.setInput(e.target.value)
    e.target.style.height = H_AUTO
    e.target.style.height = String(Math.min(e.target.scrollHeight, TA_H_MAX)) + PX
  }
}

/**
 * 造输入框键盘手柄:桌面回车发送(Shift 换行、输入法合成中不发);触屏回车只换行,Cmd/Ctrl+回车才发。
 *
 * @param x 触屏引用、输入框现值与发话手柄。
 * @returns 键盘手柄。
 */
export function makeComposerKey(x: MakeKeyIn): (e: ComposerKeyEvent) => void {
  return function onKeyDown(e: ComposerKeyEvent): void {
    if (e.key !== KEY_ENTER || e.nativeEvent.isComposing === true || e.shiftKey) {
      return
    }
    if (x.coarse.current === false || e.metaKey || e.ctrlKey) {
      e.preventDefault()
      x.send(x.input)
    }
  }
}

/**
 * 造发送钮手柄。
 *
 * @param x 输入框现值与发话手柄。
 * @returns 零参手柄。
 */
export function makeSubmit(x: MakeSubmitIn): VoidFn {
  return function submit(): void {
    x.send(x.input)
  }
}

/**
 * 造胶囊点击手柄(tsx 里用):把胶囊文案当用户那句发出去。
 *
 * @param x 面板与胶囊键。
 * @returns 零参手柄。
 */
export function makeChipClick(x: ChipHandleIn): VoidFn {
  return function click(): void {
    x.p.onChip(x.p.t(x.key))
  }
}

/**
 * 造「打开 X」埋点手柄:跳转由链接自己走,这里只记目的地。
 *
 * @param x 现有轮次。
 * @returns 按轮位记埋点的手柄。
 */
export function makeNav(x: MakeNavIn): (i: number) => void {
  return function nav(i: number): void {
    const turn = x.turns[i]
    if (turn == null || turn.reply == null || turn.reply.dest == null) {
      return
    }
    track(EV_NAV, { [EV_PROP_DEST]: turn.reply.dest })
  }
}

/**
 * 造「打开 X」点击手柄(tsx 里用)。
 *
 * @param x 面板与轮位。
 * @returns 零参手柄。
 */
export function makeNavClick(x: TurnHandleIn): VoidFn {
  return function click(): void {
    x.p.onNav(x.i)
  }
}

/**
 * 造「留个邮箱」展开手柄。
 *
 * @param x 轮次落格。
 * @returns 按轮位展开的手柄。
 */
export function makeEmailOpen(x: MakeTurnsIn): (i: number) => void {
  return function open(i: number): void {
    patchTurn({ setTurns: x.setTurns, i, patch: { email: EMAIL.open } })
  }
}

/**
 * 造「留个邮箱」点击手柄(tsx 里用)。
 *
 * @param x 面板与轮位。
 * @returns 零参手柄。
 */
export function makeEmailOpenClick(x: TurnHandleIn): VoidFn {
  return function click(): void {
    x.p.onEmailOpen(x.i)
  }
}

/**
 * 造邮箱框输入手柄。
 *
 * @param x 轮次落格。
 * @returns 落草稿的手柄。
 */
export function makeEmailChange(x: MakeTurnsIn): (input: EmailChangeIn) => void {
  return function change(input: EmailChangeIn): void {
    patchTurn({ setTurns: x.setTurns, i: input.i, patch: { emailDraft: input.value } })
  }
}

/**
 * 造邮箱框 change 事件手柄(tsx 里用)。
 *
 * @param x 面板与轮位。
 * @returns change 手柄。
 */
export function makeEmailInput(x: TurnHandleIn): (e: EmailChangeEvent) => void {
  return function onChange(e: EmailChangeEvent): void {
    x.p.onEmailChange({ i: x.i, value: e.target.value })
  }
}

/**
 * 造发送邮箱手柄:草稿空或这轮没 id 不发。
 *
 * @param x 现有轮次与落格。
 * @returns 按轮位发送的手柄。
 */
export function makeEmailSend(x: MakeEmailSendIn): (i: number) => void {
  return function send(i: number): void {
    const turn = x.turns[i]
    if (turn == null || turn.reply == null || turn.reply.id == null || turn.emailDraft.trim() === TEXT_NONE) {
      return
    }
    postEmail({ setTurns: x.setTurns, i, turn }).catch(ignoreErr)
  }
}

/**
 * 造发送邮箱点击手柄(tsx 里用)。
 *
 * @param x 面板与轮位。
 * @returns 零参手柄。
 */
export function makeEmailSendClick(x: TurnHandleIn): VoidFn {
  return function click(): void {
    x.p.onEmailSend(x.i)
  }
}

/**
 * POST /api/guide/email:204 → sent;其余 → fail(草稿留着可改可重发)。
 *
 * @param input 落格、轮位与这一轮。
 * @returns 无。
 */
async function postEmail(input: PostEmailIn): Promise<void> {
  const r = input.turn.reply
  if (r == null) {
    return
  }
  patchTurn({ setTurns: input.setTurns, i: input.i, patch: { email: EMAIL.sending } })
  let ok = false
  try {
    const res = await fetch(URL_GUIDE_EMAIL, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ id: r.id, thread: r.thread, email: input.turn.emailDraft.trim() }),
    })
    ok = res.ok
  } catch {
    ok = false
  }
  if (ok) {
    patchTurn({ setTurns: input.setTurns, i: input.i, patch: { email: EMAIL.sent } })
    track(EV_EMAIL)
  } else {
    patchTurn({ setTurns: input.setTurns, i: input.i, patch: { email: EMAIL.fail } })
  }
}

/**
 * 效果体:历史区贴底(用户没往上翻时新内容进来自动滚到底)。
 *
 * @param x 历史区与贴底引用。
 * @returns 效果体。
 */
export function makeStickEffect(x: StickIn): VoidFn {
  return function follow(): void {
    const el = x.threadEl.current
    if (el == null || x.stick.current === false) {
      return
    }
    el.scrollTop = el.scrollHeight
  }
}

/**
 * 造历史区滚动手柄:离底超过一屏的一小截就不再贴底。
 *
 * @param x 历史区与贴底引用。
 * @returns 滚动手柄。
 */
export function makeScroll(x: StickIn): VoidFn {
  return function onScroll(): void {
    const el = x.threadEl.current
    if (el == null) {
      return
    }
    x.stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_SLACK_PX
  }
}

/**
 * 效果体:autoFocus 翻 true 时聚焦输入框(触屏不聚焦,一展开就顶起键盘)。
 *
 * @param x 输入框引用。
 * @returns 效果体。
 */
export function makeAutofocusEffect(x: AutofocusIn): VoidFn {
  return function focusTa(): void {
    if (window.matchMedia(COARSE_MQ).matches) {
      return
    }
    if (x.taEl.current != null) {
      x.taEl.current.focus()
    }
  }
}

/**
 * 效果体:记下是不是触屏(回车行为按它分)。
 *
 * @param x 触屏引用。
 * @returns 效果体。
 */
export function makeCoarseEffect(x: CoarseIn): VoidFn {
  return function detect(): void {
    x.coarse.current = window.matchMedia(COARSE_MQ).matches
  }
}

/**
 * 线上回包 → 校验后的回包:类别认不出按 question,其余缺格补空 / null。
 *
 * @param w 线上回包。
 * @returns 校验后的回包。
 */
export function toReply(w: ReplyWire): GuideReply {
  let kind: GuideKind = KIND.question
  if (w.kind === KIND.nav || w.kind === KIND.suggestion || w.kind === KIND.chat) {
    kind = w.kind
  }
  let id: number | null = null
  if (typeof w.id === 'number') {
    id = w.id
  }
  let thread = TEXT_NONE
  if (typeof w.thread === 'string') {
    thread = w.thread
  }
  let dest: string | null = null
  if (typeof w.dest === 'string' && kind === KIND.nav) {
    dest = w.dest
  }
  let url: string | null = null
  if (typeof w.url === 'string' && kind === KIND.nav) {
    url = w.url
  }
  let say = TEXT_NONE
  if (typeof w.say === 'string') {
    say = w.say
  }
  return { id, thread, kind, dest, url, say }
}
