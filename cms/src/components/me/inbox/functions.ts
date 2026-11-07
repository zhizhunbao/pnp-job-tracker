/**
 * me 桶子桶 inbox 的行为:拉收件箱、点信标已读、深链、转发开关、站内回信,外加几样显示用的纯派生。
 * 2026-11-07 自 inbox 桶在新域重写(Frank「全部在新域重写」):接口、深链、未读事件照旧;转发开关从勾选框换成开关钮
 * (效果图:页标题右边一颗开关),清单行去掉头像、多一行摘要。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { cssOf } from '@/components/css'
import { toast } from '@/components/toast'
import { fmtLocal } from '@/lib/time'
import {
  ADDR_L, ADDR_R, CRED_INCLUDE, EV_UNREAD, HDR_CONTENT_TYPE, MD_FROM, MD_TO, METHOD_PATCH, METHOD_POST, MIME_JSON,
  ONE_SPACE, P_MSG, SNIPPET_LEN, SNIPPET_MORE, SPACE_RUN_RE, ST_UNAVAILABLE, TEXT_NONE, TOAST_ERR, TOAST_OK,
  URL_INBOX, URL_PREFS, URL_READ, URL_REPLY,
} from './constants'
import type {
  AfterReplyIn, CurIn, FlagSetIn, ForwardMakeIn, ForwardSavedIn, InboxItem, InboxRowClsIn, InboxView, LoadInboxIn,
  OpenAppIn,
  PickMakeIn, PickOfFn, ReplyPostIn, ReplyRespJson, ReplySendIn, SubjectIn, TextSetIn, UnpickIn, WithForwardIn,
  WithReadIn, WithReplyIn,
} from './types'
import css from './inbox.module.css'

/**
 * 拉收件箱的手柄。
 *
 * @param x 落回包与落失败。
 * @returns 异步无参手柄。
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
 * 地址栏深链 `?msg=` 指的那封。
 *
 * @returns 信号;没带或不合法为 null。
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
 * 当前打开哪一封:点过的那封;宽屏没点过默认第一封,窄屏没点过不开。
 *
 * @param x 回包、点过的信号与窄屏否。
 * @returns 那一封;没有为 null。
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
 * 点信手柄工厂:换当前那封,没读过的顺手标已读(本地先改,再告诉服务端)。
 *
 * @param x 回包与两个 setter。
 * @returns 收信号的手柄工厂。
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
 * 告诉服务端某封读过了,再抛未读事件让铃铛与导航的数字重拉。
 *
 * @param id 信号。
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
 * 标已读后的回包(其余一格不变)。
 *
 * @param x 原回包与那封的信号。
 * @returns 新回包。
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
 * 关掉当前那封(窄屏弹框关了);地址栏带着 `?msg=` 就顺手摘掉,免得刷新又弹。
 *
 * @param x 换当前那封。
 * @returns 无参手柄。
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
 * 打开当前那封对上的那次投递。
 *
 * @param x 当前那封与打开投递记录框的函数。
 * @returns 无参手柄。
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
 * 转发开关手柄:本地先翻,存失败翻回来并提示;存好了右上角说一句。
 *
 * @param x 回包、换回包与取词。
 * @returns 无参手柄。
 */
export function makeForward(x: ForwardMakeIn): () => void {
  return function onForward(): void {
    if (x.data == null) {
      return
    }
    const before = x.data
    const forward = before.forward === false
    x.setData(withForward({ data: before, forward }))
    void saveForward(forward).then(function done(ok: boolean): void {
      if (ok === false) {
        x.setData(before)
        toast({ kind: TOAST_ERR, title: x.t('mj.pushFail') })
        return
      }
      toast({ kind: TOAST_OK, title: forwardSavedOf({ forward, account: before.account, t: x.t }) })
    })
  }
}

/**
 * 转发开关存好后的那句提示。
 *
 * @param x 开关值、账户邮箱与取词。
 * @returns 提示文字。
 */
export function forwardSavedOf(x: ForwardSavedIn): string {
  if (x.forward) {
    return x.t('ib.fwdOn', { e: x.account })
  }
  return x.t('ib.fwdOff')
}

/**
 * 存转发开关。
 *
 * @param forward 新值。
 * @returns 存成了没有。
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
 * 改了转发开关的回包。
 *
 * @param x 原回包与新值。
 * @returns 新回包。
 */
export function withForward(x: WithForwardIn): InboxView {
  return { address: x.data.address, forward: x.forward, account: x.data.account, items: x.data.items }
}

/**
 * 发回信手柄。
 *
 * @param x 当前那封、草稿与各 setter。
 * @returns 无参手柄。
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
 * 调回信接口。
 *
 * @param body 回哪一封与正文。
 * @returns 回包;网络失败为 null。
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
 * 回信回包落地:失败写一句说明(发信服务没开单独一句);成功把回信挂到那封下面、清草稿、关发信框。
 *
 * @param y 发信手柄入参、那封的信号与回包。
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
 * 把回信挂上去后的回包。
 *
 * @param x 原回包、那封的信号与回信。
 * @returns 新回包。
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
 * 布尔开关手柄。
 *
 * @param x setter 与按下后的值。
 * @returns 无参手柄。
 */
export function makeFlagSet(x: FlagSetIn): () => void {
  return function flag(): void {
    x.set(x.v)
  }
}

/**
 * 文本框手柄。
 *
 * @param x setter。
 * @returns 输入事件手柄。
 */
export function makeTextSet(x: TextSetIn): (e: React.ChangeEvent<HTMLTextAreaElement>) => void {
  return function onText(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    x.set(e.target.value)
  }
}

/**
 * 清单里的发件人:有名字出名字,没有出地址。
 *
 * @param m 那一封。
 * @returns 发件人。
 */
export function senderOf(m: InboxItem): string {
  if (m.fromName !== TEXT_NONE) {
    return m.fromName
  }
  return m.fromAddr
}

/**
 * 阅读区的发件人一行:「名字 <地址>」,没名字只出地址。
 *
 * @param m 那一封。
 * @returns 一行字。
 */
export function senderLineOf(m: InboxItem): string {
  if (m.fromName === TEXT_NONE) {
    return m.fromAddr
  }
  return m.fromName + ADDR_L + m.fromAddr + ADDR_R
}

/**
 * 清单里的日期(MM-DD)。
 *
 * @param iso 时刻。
 * @returns 月-日;空时刻为空串。
 */
export function dayOf(iso: string): string {
  if (iso === TEXT_NONE) {
    return TEXT_NONE
  }
  return fmtLocal(iso).slice(MD_FROM, MD_TO)
}

/**
 * 阅读区的时刻(到分钟)。
 *
 * @param iso 时刻。
 * @returns 本地时刻;空时刻为空串。
 */
export function minuteOf(iso: string): string {
  if (iso === TEXT_NONE) {
    return TEXT_NONE
  }
  return fmtLocal(iso)
}

/**
 * 主题:没写给占位词。
 *
 * @param y 那一封与取词。
 * @returns 主题。
 */
export function subjectOf(y: SubjectIn): string {
  if (y.m.subject.trim() === TEXT_NONE) {
    return y.t('ib.noSubject')
  }
  return y.m.subject
}

/**
 * 清单里的一行摘要:正文压成一行,超长截断补省略号。
 *
 * @param m 那一封。
 * @returns 摘要。
 */
export function snippetOf(m: InboxItem): string {
  const one = m.text.replace(SPACE_RUN_RE, ONE_SPACE).trim()
  if (one.length <= SNIPPET_LEN) {
    return one
  }
  return one.slice(0, SNIPPET_LEN) + SNIPPET_MORE
}

/**
 * 清单一行的类名:当前那封浅主色底,没读的字加粗。
 *
 * @param x 当前否与没读否。
 * @returns 类名。
 */
export function inboxRowClsOf(x: InboxRowClsIn): string {
  let cls = cssOf(css.ibRow)
  if (x.on) {
    cls = `${cls} ${cssOf(css.ibRowOn)}`
  }
  if (x.unread) {
    cls = `${cls} ${cssOf(css.ibUnread)}`
  }
  return cls
}
