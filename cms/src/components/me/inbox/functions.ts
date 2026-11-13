/**
 * me 桶子桶 inbox 的行为:拉收件箱、点信标已读、深链、转发开关、站内回信,外加几样显示用的纯派生。
 * 2026-11-07 自 inbox 桶在新域重写(Frank「全部在新域重写」):接口、深链、未读事件照旧;转发开关从勾选框换成开关钮
 * (效果图:页标题右边一颗开关),清单行去掉头像、多一行摘要。
 * 2026-11-13 Frank「这个是不是不保留」「照这个做」:「同时转到」开关撤(固定都转,关掉 = 不上站就不知道雇主回信了),
 * 开关手柄、存开关、存好后的提示一并撤。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { cssOf } from '@/components/css'
import { DAY_MS, fmtLocal, fmtLocalShort, ymd } from '@/lib/time'
import {
  ADDR_L, ADDR_R, CRED_INCLUDE, EV_UNREAD, GROUP_OLDER, GROUP_TODAY, GROUP_WEEK, GROUP_YESTERDAY, HDR_CONTENT_TYPE,
  METHOD_POST, MIDNIGHT_UTC, MIME_JSON, ROW_TIME_LEN,
  ONE_SPACE, P_MSG, SNIPPET_LEN, SNIPPET_MORE, SPACE_RUN_RE, ST_TOO_MANY, ST_UNAVAILABLE, TEXT_NONE,
  URL_INBOX, URL_READ, URL_REPLY,
  FILTER_UNREAD,
} from './constants'
import type {
  AfterReplyIn, CurIn, DraftResetIn, FlagSetIn, GroupKey, GroupKeyIn, GroupsIn, InboxGroup, InboxItem, InboxRowClsIn,
  InboxView, RowTimeIn,
  LoadInboxIn,
  OpenAppIn, ShownIn,
  PickMakeIn, PickOfFn, ReplyPostIn, ReplyRespJson, ReplySendIn, SubjectIn, TextSetIn, UnpickIn,
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
 * 现在显示着的那封的信号。
 *
 * @param cur 那一封;没有为 null。
 * @returns 信号;没有为 null。
 */
export function curIdOf(cur: InboxItem | null): number | null {
  if (cur == null) {
    return null
  }
  return cur.id
}

/**
 * 点信手柄工厂:换当前那封,没读过的顺手标已读(本地先改,再告诉服务端)。
 * 2026-11-13(Frank「先修收件箱问题」途中查出):换到别的信先清回信草稿并收起回信框 —— 原先草稿跟着框走,
 * 给甲写了一半切到乙,点发送就发给了乙;点的还是眼前这封不清。
 *
 * @param x 回包、两个 setter、眼前那封的信号与清草稿手柄。
 * @returns 收信号的手柄工厂。
 */
export function makePickOf(x: PickMakeIn): PickOfFn {
  return function pickOf(id: number): () => void {
    return function pick(): void {
      if (id !== x.curId) {
        x.resetDraft()
      }
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
 * 清回信草稿手柄:收起回信框、清草稿、清失败说明。
 *
 * @param x 三个 setter。
 * @returns 无参手柄。
 */
export function makeDraftReset(x: DraftResetIn): () => void {
  return function resetDraft(): void {
    x.setOpen(false)
    x.setText(TEXT_NONE)
    x.setNote(TEXT_NONE)
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
  return { address: x.data.address, items }
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
    if (y.r != null && y.r.status === ST_TOO_MANY) {
      note = y.x.t('ib.e.limit')
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
  return { address: x.data.address, items }
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
 * 清单里的时刻:今天的写钟点(HH:mm),其余写月-日(MM-DD)。
 * 2026-11-13 Frank「我的这个排版和 outlook 不一样啊」:照 Outlook,原先一律月-日。
 *
 * @param x 时刻与此刻。
 * @returns 钟点或月-日;空时刻为空串。
 */
export function rowTimeOf(x: RowTimeIn): string {
  if (x.iso === TEXT_NONE) {
    return TEXT_NONE
  }
  return fmtLocalShort({ iso: x.iso, now: x.now }).slice(0, ROW_TIME_LEN)
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

/**
 * 清单按搜索与筛选留哪几封(搜索不分大小写,搜发件人名、地址、主题、正文、职位名;「未读」只留没读的)。
 *
 * @param x 回包、搜索字与筛选。
 * @returns 留下的信;回包还没到为空清单。
 */
export function shownOf(x: ShownIn): InboxItem[] {
  if (x.data == null) {
    return []
  }
  const needle = x.q.trim().toLowerCase()
  const out: InboxItem[] = []
  for (const m of x.data.items) {
    if (x.filter === FILTER_UNREAD && m.read) {
      continue
    }
    if (needle !== TEXT_NONE && hayOf(m).includes(needle) === false) {
      continue
    }
    out.push(m)
  }
  return out
}

/**
 * 留下的信按日期分组(照 Outlook 清单:今天 / 昨天 / 本周 / 更早;信本来新的在前,同组的挨着,空组不出)。
 *
 * @param x 留下的信与此刻。
 * @returns 分组,新的在前。
 */
export function groupsOf(x: GroupsIn): InboxGroup[] {
  const today = dayNoOf(new Date(x.now).toISOString())
  const out: InboxGroup[] = []
  let last: InboxGroup | null = null
  for (const m of x.items) {
    const key = groupKeyOf({ day: dayNoOf(m.at), today })
    if (last == null || last.key !== key) {
      last = { key, items: [] }
      out.push(last)
    }
    last.items.push(m)
  }
  return out
}

/**
 * 时刻落在渥太华时间的第几天(自 1970-01-01 起的天数;只用来比先后差几天)。
 *
 * @param iso 时刻。
 * @returns 天数;空时刻或解析不了为 0(归「更早」)。
 */
export function dayNoOf(iso: string): number {
  if (iso === TEXT_NONE) {
    return 0
  }
  const n = new Date(ymd(fmtLocal(iso)) + MIDNIGHT_UTC).getTime()
  if (Number.isFinite(n) === false) {
    return 0
  }
  return Math.round(n / DAY_MS)
}

/**
 * 一封信归哪一组:当天 = 今天,前一天 = 昨天,再往前但还在本周(周日起算)= 本周,其余 = 更早。
 *
 * @param x 那一封的天数与今天的天数。
 * @returns 分组。
 */
export function groupKeyOf(x: GroupKeyIn): GroupKey {
  const diff = x.today - x.day
  if (diff <= 0) {
    return GROUP_TODAY
  }
  if (diff === 1) {
    return GROUP_YESTERDAY
  }
  if (diff <= new Date(x.today * DAY_MS).getUTCDay()) {
    return GROUP_WEEK
  }
  return GROUP_OLDER
}

/**
 * 一封信供搜索的整段字(小写)。
 *
 * @param m 那一封。
 * @returns 拼好的字。
 */
export function hayOf(m: InboxItem): string {
  return [m.fromName, m.fromAddr, m.subject, m.text, m.jobTitle].join(ONE_SPACE).toLowerCase()
}

/**
 * 没读的封数。
 *
 * @param data 回包;还没回为 null。
 * @returns 封数。
 */
export function unreadNOf(data: InboxView | null): number {
  if (data == null) {
    return 0
  }
  let n = 0
  for (const m of data.items) {
    if (m.read === false) {
      n += 1
    }
  }
  return n
}

/**
 * 「未读」页签的角标:没有未读不出角标(空串 = 通用页签件不出;2026-11-13 原先 0 封也挂一个「0」)。
 *
 * @param n 没读的封数。
 * @returns 角标文字;不出为空串。
 */
export function unreadBadgeOf(n: number): string {
  if (n === 0) {
    return TEXT_NONE
  }
  return String(n)
}
