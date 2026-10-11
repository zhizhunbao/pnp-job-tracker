/**
 * inbox 组件桶的函数(2026-10-10 批 3「收件箱」):拉收件箱、点一封(本地先标已读再告诉服务端,通知页签红点重拉)、
 * 转发开关、站内回信,以及清单的首字母块、发件人一行、日期。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { fmtLocal } from '@/lib/time'
import {
  ADDR_L, ADDR_R, AT, CRED_INCLUDE, EV_UNREAD, HDR_CONTENT_TYPE, INITIALS_MAX, MD_FROM, MD_TO, METHOD_PATCH,
  METHOD_POST, MIME_JSON, P_MSG, ST_UNAVAILABLE, TEXT_NONE, URL_INBOX, URL_PREFS, URL_READ, URL_REPLY, WORD_SPLIT_RE,
} from './constants'
import type {
  AfterReplyIn, CurIn, FlagSetIn, ForwardMakeIn, InboxItem, InboxView, LoadInboxIn, OpenAppIn, PickMakeIn, PickOfFn,
  ReplyPostIn, SubjectIn, ReplyRespJson, ReplySendIn, TextSetIn, UnpickIn, WithForwardIn, WithReadIn, WithReplyIn,
} from './types'

/**
 * 造「拉一次收件箱」:成功写整份;失败(网络、未登录、库没就绪)拨「拉失败了」,不冒充空收件箱。
 *
 * @param x 两个落格。
 * @returns 拉收件箱的函数。
 */
export function makeLoadInbox(x: LoadInboxIn): () => Promise<void> {
  return async function loadInbox(): Promise<void> {
    try {
      const r = await fetch(URL_INBOX, { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setFailed(true)
        return
      }
      x.setData(await r.json() as InboxView)
    } catch {
      x.setFailed(true)
    }
  }
}

/**
 * 地址栏里的深链信 id(`?msg=`;转发信里的「Open in Offer2PR」)。
 *
 * @returns 信 id;没带或不合形给 null。
 */
export function msgLinkOf(): number | null {
  const raw = new URL(window.location.href).searchParams.get(P_MSG)
  const n = Number(raw)
  if (raw == null || Number.isInteger(n) === false || n <= 0) {
    return null
  }
  return n
}

/**
 * 阅读区那一封:选中的那一封;网页端没点过默认第一封(不算读过),手机没点就没有。
 *
 * @param x 整份、选中的 id 与窄屏。
 * @returns 那一封或 null。
 */
export function curOf(x: CurIn): InboxItem | null {
  if (x.data == null) {
    return null
  }
  for (const m of x.data.items) {
    if (m.id === x.sel) {
      return m
    }
  }
  if (x.narrow) {
    return null
  }
  const first = x.data.items[0]
  if (first == null) {
    return null
  }
  return first
}

/**
 * 造「点了某一封」的工厂:选中;没读过的本地先标已读、告诉服务端、通知页签红点重拉。
 *
 * @param x 整份、两个落格。
 * @returns 信 id → 点击手柄。
 */
export function makePickOf(x: PickMakeIn): PickOfFn {
  return function pickOf(id: number): () => void {
    return function pick(): void {
      x.setSel(id)
      if (x.data == null) {
        return
      }
      for (const m of x.data.items) {
        if (m.id === id && m.read === false) {
          x.setData(withRead({ data: x.data, id }))
          void sendRead(id)
        }
      }
    }
  }
}

/**
 * 告诉服务端读了一封,回来后通知页签红点重拉(失败不拦:下次进来还是未读,不冒充读过)。
 *
 * @param id 信 id。
 * @returns 无。
 */
export async function sendRead(id: number): Promise<void> {
  try {
    await fetch(URL_READ, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ id }),
    })
  } catch {
    return
  }
  window.dispatchEvent(new Event(EV_UNREAD))
}

/**
 * 整份里那一封标成已读(新的一份,字段写全)。
 *
 * @param x 整份与信 id。
 * @returns 新的一份。
 */
export function withRead(x: WithReadIn): InboxView {
  const items: InboxItem[] = []
  for (const m of x.data.items) {
    let read = m.read
    if (m.id === x.id) {
      read = true
    }
    items.push({
      id: m.id,
appId: m.appId,
fromAddr: m.fromAddr,
fromName: m.fromName,
subject: m.subject,
text: m.text,
at: m.at,
      read,
jobTitle: m.jobTitle,
replies: m.replies,
    })
  }
  return { address: x.data.address, forward: x.data.forward, account: x.data.account, items }
}

/**
 * 造「关手机阅读框」(取消选中;地址栏的 `?msg=` 一并洗掉,刷新不再弹)。
 *
 * @param x 写选中的落格。
 * @returns 关框手柄。
 */
export function makeUnpick(x: UnpickIn): () => void {
  return function unpick(): void {
    x.setSel(null)
    const url = new URL(window.location.href)
    if (url.searchParams.has(P_MSG)) {
      url.searchParams.delete(P_MSG)
      window.history.replaceState(null, TEXT_NONE, url.pathname + url.search + url.hash)
    }
  }
}

/**
 * 造「打开这次投递」:阅读区那一封挂着投递就弹只读投递框。
 *
 * @param x 那一封与开框函数。
 * @returns 点击手柄。
 */
export function makeOpenApp(x: OpenAppIn): () => void {
  return function openApp(): void {
    if (x.cur == null || x.cur.appId == null) {
      return
    }
    x.open(x.cur.appId)
  }
}

/**
 * 造「勾 / 不勾同时转到」:本地先改,存不上退回原值并出一句。
 *
 * @param x 整份、两个落格与取词函数。
 * @returns 复选框的 onChange。
 */
export function makeForward(x: ForwardMakeIn): (e: React.ChangeEvent<HTMLInputElement>) => void {
  return function onForward(e: React.ChangeEvent<HTMLInputElement>): void {
    if (x.data == null) {
      return
    }
    const before = x.data
    const forward = e.target.checked
    x.setData(withForward({ data: before, forward }))
    x.setNote(TEXT_NONE)
    void saveForward(forward).then(function done(ok: boolean): void {
      if (ok === false) {
        x.setData(before)
        x.setNote(x.t('mj.pushFail'))
      }
    })
  }
}

/**
 * 存转发开关。
 *
 * @param forward 开 / 关。
 * @returns 存上了 true。
 */
export async function saveForward(forward: boolean): Promise<boolean> {
  try {
    const r = await fetch(URL_PREFS, {
      method: METHOD_PATCH,
credentials: CRED_INCLUDE,
headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ forward }),
    })
    return r.ok
  } catch {
    return false
  }
}

/**
 * 整份换转发开关(新的一份,字段写全)。
 *
 * @param x 整份与开关。
 * @returns 新的一份。
 */
export function withForward(x: WithForwardIn): InboxView {
  return { address: x.data.address, forward: x.forward, account: x.data.account, items: x.data.items }
}

/**
 * 造「发回信」:正文空的不发;发出去了挂到那一封下面、关框清空;发信没开通 / 没发出去出一句,框不关、字不丢。
 *
 * @param x 那一封、正文、整份与各落格。
 * @returns 点击手柄。
 */
export function makeReplySend(x: ReplySendIn): () => void {
  return function sendReply(): void {
    const cur = x.cur
    if (cur == null || x.text.trim() === TEXT_NONE) {
      return
    }
    x.setBusy(true)
    x.setNote(TEXT_NONE)
    void postReply({ id: cur.id, text: x.text }).then(function done(r: Response | null): Promise<void> {
      return afterReply({ x, id: cur.id, r })
    })
  }
}

/**
 * 发回信请求(网络异常给 null)。
 *
 * @param body 信 id 与正文。
 * @returns 响应或 null。
 */
export async function postReply(body: ReplyPostIn): Promise<Response | null> {
  try {
    return await fetch(URL_REPLY, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify(body),
    })
  } catch {
    return null
  }
}

/**
 * 回信回来以后:成功挂上去、关框清空;失败出一句(503 = 发信还没开通)。
 *
 * @param y 造手柄时的入参、信 id 与响应。
 * @returns 无。
 */
export async function afterReply(y: AfterReplyIn): Promise<void> {
  y.x.setBusy(false)
  if (y.r == null || y.r.ok === false) {
    let note = y.x.t('ib.e.send')
    if (y.r != null && y.r.status === ST_UNAVAILABLE) {
      note = y.x.t('ib.e.off')
    }
    y.x.setNote(note)
    return
  }
  const d = await y.r.json() as ReplyRespJson
  if (y.x.data != null && d.reply != null) {
    y.x.setData(withReply({ data: y.x.data, id: y.id, reply: d.reply }))
  }
  y.x.setText(TEXT_NONE)
  y.x.setOpen(false)
}

/**
 * 整份里那一封挂上一封回出去的(新的一份,字段写全)。
 *
 * @param x 整份、信 id 与回出去的那一封。
 * @returns 新的一份。
 */
export function withReply(x: WithReplyIn): InboxView {
  const items: InboxItem[] = []
  for (const m of x.data.items) {
    let replies = m.replies
    if (m.id === x.id) {
      replies = m.replies.concat([x.reply])
    }
    items.push({
      id: m.id,
appId: m.appId,
fromAddr: m.fromAddr,
fromName: m.fromName,
subject: m.subject,
text: m.text,
at: m.at,
      read: m.read,
jobTitle: m.jobTitle,
replies,
    })
  }
  return { address: x.data.address, forward: x.data.forward, account: x.data.account, items }
}

/**
 * 造「拨开关」手柄。
 *
 * @param x 落格与值。
 * @returns 点击手柄。
 */
export function makeFlagSet(x: FlagSetIn): () => void {
  return function flag(): void {
    x.set(x.v)
  }
}

/**
 * 造文字区的 onChange。
 *
 * @param x 落格。
 * @returns onChange。
 */
export function makeTextSet(x: TextSetIn): (e: React.ChangeEvent<HTMLTextAreaElement>) => void {
  return function onText(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    x.set(e.target.value)
  }
}

/**
 * 发件人一个名字:有显示名用显示名,没有用地址。
 *
 * @param m 那一封。
 * @returns 名字。
 */
export function senderOf(m: InboxItem): string {
  if (m.fromName !== TEXT_NONE) {
    return m.fromName
  }
  return m.fromAddr
}

/**
 * 阅读区发件人一行:「名字 <地址>」(没名字只写地址)。
 *
 * @param m 那一封。
 * @returns 一行。
 */
export function senderLineOf(m: InboxItem): string {
  if (m.fromName === TEXT_NONE) {
    return m.fromAddr
  }
  return m.fromName + ADDR_L + m.fromAddr + ADDR_R
}

/**
 * 首字母块:名字前两个词的首字母(一个词取前两个字母),大写;用地址的取 @ 前那段。
 *
 * @param m 那一封。
 * @returns 一到两个字母。
 */
export function initialsOf(m: InboxItem): string {
  let name = m.fromName
  if (name === TEXT_NONE) {
    name = m.fromAddr.slice(0, Math.max(0, m.fromAddr.indexOf(AT)))
  }
  const words = name.trim().split(WORD_SPLIT_RE).filter(isWord)
  let out = TEXT_NONE
  for (const w of words.slice(0, INITIALS_MAX)) {
    out += w.charAt(0)
  }
  if (words.length === 1 && words[0] != null) {
    out = words[0].slice(0, INITIALS_MAX)
  }
  return out.toUpperCase()
}

/**
 * 切出来的词非空。
 *
 * @param w 词。
 * @returns 非空 true。
 */
function isWord(w: string): boolean {
  return w !== TEXT_NONE
}

/**
 * 清单日期:渥太华时间的月-日。
 *
 * @param iso ISO 串。
 * @returns 'MM-DD';空串照旧空串。
 */
export function dayOf(iso: string): string {
  if (iso === TEXT_NONE) {
    return TEXT_NONE
  }
  return fmtLocal(iso).slice(MD_FROM, MD_TO)
}

/**
 * 阅读区时刻:渥太华时间到分。
 *
 * @param iso ISO 串。
 * @returns 'YYYY-MM-DD HH:mm';空串照旧空串。
 */
export function minuteOf(iso: string): string {
  if (iso === TEXT_NONE) {
    return TEXT_NONE
  }
  return fmtLocal(iso)
}

/**
 * 标题(空的出「(无主题)」)。
 *
 * @param y 那一封与取词函数。
 * @returns 标题。
 */
export function subjectOf(y: SubjectIn): string {
  if (y.m.subject.trim() === TEXT_NONE) {
    return y.t('ib.noSubject')
  }
  return y.m.subject
}
