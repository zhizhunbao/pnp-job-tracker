/**
 * assistant 组件桶的行为:探活、发一轮、回包验形、消息表的增减、带给服务端的历史、每条消息显示的字、类名。
 * 网络只在 fetchReady 与 sendTurn 两处;其余是纯函数。
 *
 * @author Frank
 * @time 2026-11-14 12:00:00
 */
import { cssOf } from '@/components/css'
import { HISTORY_TURNS, KIND } from '@/lib/assistant'
import {
  CHAT_URL, CLS_SEP, ERR_LIMIT, ERR_NET, JSON_HEADERS, METHOD_POST, MSGS_PER_TURN, NET_PATH_HEAD, PAGE_LABEL, PATH_HEAD,
  READY_URL, ROLE_BOT, ROLE_USER, SEND_LIMIT, SEND_NET, SEND_OFFLINE, SEND_OK, STATUS_LIMIT, STATUS_OFFLINE, TEXT_NONE,
} from './constants'
import { CACHE } from './variables'
import type {
  AfterSendIn, BotMsgIn, ErrKind, HistoryIn, Kind, Link, MaybeLinkJson, MaybeReplyJson, Msg, MsgsWithIn, ReadyJson,
  Reply, ReplyJson, SayIn, SendIn, SendOut, SendStatus, Turn, UserMsgIn,
} from './types'
import css from './assistant.module.css'

/**
 * 问一次助手在不在线。请求失败、回的不是 200、回包不成形都按不在线(入口不出)。
 * 体内 `as ReadyJson` 是跨边界断言:网络 body 先按声明形状收下,只认 ready 严格等于 true。
 *
 * @returns 在线。
 */
export async function fetchReady(): Promise<boolean> {
  try {
    const r = await fetch(READY_URL)
    if (r.ok === false) {
      return false
    }
    const body = await r.json() as ReadyJson
    return body != null && body.ready === true
  } catch {
    return false
  }
}

/**
 * 发一轮:200 回验过形的回复;429 今天聊得太多;503 盒子不在线;其余(502、网络错、回包不成形)按没连上。
 * 体内 `as ReplyJson` 是跨边界断言:逐格验形在 toReply。
 *
 * @param input 本轮提问、语种与之前几轮。
 * @returns 结果码与回复。
 */
export async function sendTurn(input: SendIn): Promise<SendOut> {
  try {
    const r = await fetch(CHAT_URL, {
      method: METHOD_POST,
      headers: JSON_HEADERS,
      body: JSON.stringify({ text: input.text, lang: input.lang, history: input.history }),
    })
    if (r.ok) {
      return { status: SEND_OK, reply: toReply(await r.json() as ReplyJson) }
    }
    return { status: statusOf(r.status), reply: null }
  } catch {
    return { status: SEND_NET, reply: null }
  }
}

/**
 * HTTP 状态码 → 一轮的结果码。
 *
 * @param code 状态码。
 * @returns 结果码。
 */
function statusOf(code: number): SendStatus {
  if (code === STATUS_LIMIT) {
    return SEND_LIMIT
  }
  if (code === STATUS_OFFLINE) {
    return SEND_OFFLINE
  }
  return SEND_NET
}

/**
 * 一轮没答上时出哪一档提示。
 *
 * @param status 结果码。
 * @returns 出错一档。
 */
export function errOf(status: SendStatus): ErrKind {
  if (status === SEND_LIMIT) {
    return ERR_LIMIT
  }
  return ERR_NET
}

/**
 * 发一个新消息号。
 *
 * @returns 消息号。
 */
export function nextMsgId(): number {
  CACHE.seq += 1
  return CACHE.seq
}

/**
 * 访客打的字 → 一条消息。
 *
 * @param x 消息号与字。
 * @returns 一条消息。
 */
export function userMsgOf(x: UserMsgIn): Msg {
  return { id: x.id, role: ROLE_USER, kind: KIND.answer, say: x.text, links: [] }
}

/**
 * 助手的回复 → 一条消息。
 *
 * @param x 消息号与回复。
 * @returns 一条消息。
 */
function botMsgOf(x: BotMsgIn): Msg {
  return { id: x.id, role: ROLE_BOT, kind: x.reply.kind, say: x.reply.say, links: x.reply.links }
}

/**
 * 叠上一条:新的在最后。
 *
 * @param x 现有的消息与新来的一条。
 * @returns 新的消息表。
 */
export function msgsWith(x: MsgsWithIn): Msg[] {
  const out: Msg[] = []
  for (const m of x.list) {
    out.push(m)
  }
  out.push(x.item)
  return out
}

/**
 * 一轮结束后的消息表:答上了接上回复;没答上把访客刚发的那条撤掉(字由调用方放回输入框,可重发)。
 *
 * @param x 现有的消息、刚发那条的消息号、这一轮的结果与回复的消息号。
 * @returns 新的消息表。
 */
export function msgsAfterSend(x: AfterSendIn): Msg[] {
  if (x.out.reply != null) {
    return msgsWith({ list: x.list, item: botMsgOf({ id: x.replyId, reply: x.out.reply }) })
  }
  const out: Msg[] = []
  for (const m of x.list) {
    if (m.id !== x.mineId) {
      out.push(m)
    }
  }
  return out
}

/**
 * 一条消息显示的字:正常回答与访客说的出正文;不谈移民、答不了各出一句固定的话。
 *
 * @param x 一条消息与取词函数。
 * @returns 显示的字。
 */
export function sayOf(x: SayIn): string {
  if (x.msg.kind === KIND.refuse) {
    return x.t('asst.refuse')
  }
  if (x.msg.kind === KIND.off) {
    return x.t('asst.off')
  }
  return x.msg.say
}

/**
 * 带给服务端的历史:每条用界面上显示的那句字,只留最近 HISTORY_TURNS 轮。
 *
 * @param x 现有的消息与取词函数。
 * @returns 历史。
 */
export function historyOf(x: HistoryIn): Turn[] {
  const out: Turn[] = []
  for (const m of x.msgs) {
    out.push({ role: m.role, content: sayOf({ msg: m, t: x.t }) })
  }
  return out.slice(Math.max(0, out.length - HISTORY_TURNS * MSGS_PER_TURN))
}

/**
 * 一条气泡的类名:基座 + 是谁说的。
 *
 * @param role 谁说的。
 * @returns 拼好的 className。
 */
export function bubbleClsOf(role: Msg['role']): string {
  if (role === ROLE_USER) {
    return [cssOf(css.bubble), cssOf(css.mine)].join(CLS_SEP)
  }
  return [cssOf(css.bubble), cssOf(css.bot)].join(CLS_SEP)
}

/**
 * 线上的回包 → 验过形的回复:类别不认的,有正文按 answer、没正文按 off;refuse 与 off 的正文一律清空;链接逐条验。
 *
 * @param wire 线上的回包;不是对象是 null。
 * @returns 验过形的回复。
 */
export function toReply(wire: MaybeReplyJson): Reply {
  let say = TEXT_NONE
  let kind: Kind = KIND.off
  const links: Link[] = []
  if (wire == null || typeof wire !== 'object') {
    return { kind, say, links }
  }
  if (typeof wire.say === 'string') {
    say = wire.say.trim()
  }
  if (wire.kind === KIND.refuse) {
    kind = KIND.refuse
  } else if (wire.kind !== KIND.off && say !== TEXT_NONE) {
    kind = KIND.answer
  }
  if (kind !== KIND.answer) {
    say = TEXT_NONE
  }
  if (Array.isArray(wire.links)) {
    for (const l of wire.links) {
      const link = toLink(l)
      if (link.url !== TEXT_NONE) {
        links.push(link)
      }
    }
  }
  return { kind, say, links }
}

/**
 * 线上的一条链接 → 能渲的链接:页面键要在页名表里,地址要是站内相对地址;不合的给空地址(调用方丢)。
 *
 * @param wire 线上的一条链接。
 * @returns 链接;不合的地址是空串。
 */
function toLink(wire: MaybeLinkJson): Link {
  const none: Link = { labelKey: TEXT_NONE, url: TEXT_NONE }
  if (wire == null || typeof wire !== 'object' || typeof wire.key !== 'string' || typeof wire.url !== 'string') {
    return none
  }
  if (Object.hasOwn(PAGE_LABEL, wire.key) === false) {
    return none
  }
  if (wire.url.startsWith(PATH_HEAD) === false || wire.url.startsWith(NET_PATH_HEAD)) {
    return none
  }
  return { labelKey: String(PAGE_LABEL[wire.key]), url: wire.url }
}
