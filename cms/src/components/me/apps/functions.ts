/**
 * me 桶子桶 apps 的行为:只读投递框 —— 拉我的投递清单找那一行、洗「职位信息」卡、拉一条投递的往来(/api/inbox/thread)
 * 洗成框要的形,开 / 关框(地址栏 `?app=<投递行 id>` 深链 + 往历史里推一笔,手机返回键先关框;照 apply 桶 openApply / closeApply)。
 * 2026-11-07 自 myjobs 桶(viewRowOf / itemByIdOf / fileHrefFor)与子桶 thread 在新域重写,接口、深链、事件名照旧。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { lazyTitleOf, titleSubOf } from '@/components/jobtitle'
import { hoursNameOf, placeHrefOf, placeSubOf, termNameOf } from '@/components/name'
import { fmtLocal, ymd } from '@/lib/time'
import {
  CRED_INCLUDE, EV_APP_NAV, EV_POPSTATE, FILE_COVER_TAIL, FILE_RESUME_TAIL, P_APP, ST_DRAFT, TEXT_NONE, TITLES_NONE,
  URL_APPLIED, URL_FILE_HEAD, URL_THREAD_HEAD,
} from './constants'
import { CACHE } from './variables'
import type {
  AppHostSyncIn, AppItem, AppsRespJson, AvJob, AvJobOfIn, FileHrefIn, ItemByIdIn, LoadAppsIn, LoadThreadIn, ThreadJson,
  ThreadMsg, ThreadMsgJson, ThreadReply, ThreadReplyJson, ThreadView, UnbindFn,
} from './types'

/**
 * 我的投递清单响应 → 清单(行构造器:缺席按零条读)。
 *
 * @param d 响应体。
 * @returns 清单。
 */
export function toAppItems(d: AppsRespJson): AppItem[] {
  if (d.items == null) {
    return []
  }
  return d.items
}

/**
 * 造「拉一次我的投递清单」:成功写清单;失败(网络、未登录、回包坏)拨「拉失败了」并给空清单。
 *
 * @param x 两个落格。
 * @returns 拉清单的函数。
 */
export function makeLoadApps(x: LoadAppsIn): () => Promise<void> {
  return async function loadApps(): Promise<void> {
    try {
      const r = await fetch(URL_APPLIED, { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setFailed(true)
        x.setItems([])
        return
      }
      x.setItems(toAppItems(await r.json() as AppsRespJson))
    } catch {
      x.setFailed(true)
      x.setItems([])
    }
  }
}

/**
 * 在我的投递清单里按投递行 id 找那一行。
 *
 * @param x 清单与投递行 id。
 * @returns 那一行;不在清单里给 null。
 */
export function itemByIdOf(x: ItemByIdIn): AppItem | null {
  for (const it of x.items) {
    if (it.id === x.id) {
      return it
    }
  }
  return null
}

/**
 * 「职位信息」那张卡(同我的投递清单一行的格子口径:职位名灰字照 jobtitle 口径、公司库存译名、地点灰字、工时 / 雇佣期英文名)。
 *
 * @param x 那一行、取词函数与界面语。
 * @returns 洗净的卡。
 */
export function avJobOf(x: AvJobOfIn): AvJob {
  const it = x.item
  return {
    jobId: it.jobId,
    title: it.title,
    titleSub: titleSubOf({
      row: { title: it.title, titleZh: it.titleZh, titleKo: it.titleKo },
      lang: x.lang,
      lazy: lazyTitleOf({ map: TITLES_NONE, title: it.title }),
      noc: TEXT_NONE,
    }),
    company: it.company,
    companyZh: it.companyZh,
    companyKo: it.companyKo,
    companySlug: it.companySlug,
    address: it.address,
    addressHref: placeHrefOf(it.address),
    addressSub: placeSubOf({ cityZh: it.cityZh, cityKo: it.cityKo, province: it.province, lang: x.lang, t: x.t }),
    salary: it.salary,
    hoursEn: hoursNameOf({ v: it.hours, lang: x.lang, t: x.t }).en,
    termEn: termNameOf({ v: it.term, lang: x.lang, t: x.t }).en,
    posted: ymdOf(it.datePosted),
    deadline: ymdOf(it.validThrough),
    resumeHref: fileHrefOf({ item: it, tail: FILE_RESUME_TAIL }),
    coverHref: coverHrefOf(it),
  }
}

/**
 * 附件地址:发出去了的行(行 id = 投递行 id)给 /api/apply/file 的地址;草稿给空串。
 *
 * @param x 这一行与种类尾。
 * @returns 地址或空串。
 */
export function fileHrefOf(x: FileHrefIn): string {
  if (x.item.stage === ST_DRAFT) {
    return TEXT_NONE
  }
  return URL_FILE_HEAD + x.item.id + x.tail
}

/**
 * 求职信附件地址:同上,但发出时没附求职信的行给空串(2026-10-10 Frank「两处都改吧」)。
 *
 * @param it 这一行。
 * @returns 地址或空串。
 */
export function coverHrefOf(it: AppItem): string {
  if (it.hasCover === false) {
    return TEXT_NONE
  }
  return fileHrefOf({ item: it, tail: FILE_COVER_TAIL })
}

/**
 * ISO 时刻 → 年-月-日(没有给空串)。
 *
 * @param iso ISO 时刻。
 * @returns 年-月-日。
 */
export function ymdOf(iso: string): string {
  if (iso === TEXT_NONE) {
    return TEXT_NONE
  }
  return ymd(iso)
}

/**
 * 造「拉一次往来」:成功写往来;失败(网络、未登录、不是本人的、回包坏)拨「拉失败了」。
 *
 * @param x 投递行 id 与两个落格。
 * @returns 拉往来的函数。
 */
export function makeLoadThread(x: LoadThreadIn): () => Promise<void> {
  return async function loadThread(): Promise<void> {
    try {
      const r = await fetch(URL_THREAD_HEAD + x.appId, { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setFailed(true)
        return
      }
      x.setThread(toThreadView(await r.json() as ThreadJson))
    } catch {
      x.setFailed(true)
    }
  }
}

/**
 * 回包 → 框要的往来(时刻换成渥太华时间到分;转发关着不给邮箱)。
 *
 * @param d 回包。
 * @returns 往来。
 */
export function toThreadView(d: ThreadJson): ThreadView {
  const a = d.app
  const messages: ThreadMsg[] = []
  for (const m of d.messages) {
    messages.push(toThreadMsg(m))
  }
  let forwardTo = TEXT_NONE
  if (d.forward) {
    forwardTo = d.account
  }
  return {
    senderName: a.senderName,
    replyTo: a.replyTo,
    resumeFile: a.resumeFile,
    coverFile: a.coverFile,
    company: a.company,
    subject: a.subject,
    body: a.body,
    sentAt: minuteOf(a.sentAt),
    messages,
    forwardTo,
  }
}

/**
 * 一封回信(线格式)→ 洗净:发件人一行有名字用名字,没有用地址。
 *
 * @param m 线格式。
 * @returns 一封回信。
 */
export function toThreadMsg(m: ThreadMsgJson): ThreadMsg {
  let from = m.fromName
  if (from === TEXT_NONE) {
    from = m.fromAddr
  }
  const replies: ThreadReply[] = []
  for (const r of m.replies) {
    replies.push(toThreadReply(r))
  }
  return { id: m.id, from, text: m.text, at: minuteOf(m.at), replies }
}

/**
 * 本人回出去的一封(线格式)→ 洗净。
 *
 * @param r 线格式。
 * @returns 一封。
 */
export function toThreadReply(r: ThreadReplyJson): ThreadReply {
  return { id: r.id, text: r.text, at: minuteOf(r.at) }
}

/**
 * ISO 时刻 → 渥太华时间到分(全站时刻口径 lib/time 的 fmtLocal);空串照旧空串。
 *
 * @param iso ISO 串。
 * @returns 'YYYY-MM-DD HH:mm' 或空串。
 */
export function minuteOf(iso: string): string {
  if (iso === TEXT_NONE) {
    return TEXT_NONE
  }
  return fmtLocal(iso)
}

/**
 * 读地址栏里的投递行 id(`?app=`);没带或不合形给 null,顺手清掉历史记账。
 *
 * @returns 投递行 id 或 null。
 */
export function readAppId(): number | null {
  const raw = new URL(window.location.href).searchParams.get(P_APP)
  const n = Number(raw)
  if (raw == null || Number.isInteger(n) === false || n <= 0) {
    CACHE.pushed = false
    return null
  }
  return n
}

/**
 * 开只读投递框:地址栏加 `?app=<id>` 并往历史里推一笔(手机返回键先关框),通知宿主重读。同一条已经开着只通知。
 *
 * @param appId 投递行 id。
 * @returns 无。
 */
export function openAppView(appId: number): void {
  const url = new URL(window.location.href)
  if (url.searchParams.get(P_APP) !== String(appId)) {
    url.searchParams.set(P_APP, String(appId))
    window.history.pushState(null, TEXT_NONE, url.pathname + url.search + url.hash)
    CACHE.pushed = true
  }
  window.dispatchEvent(new Event(EV_APP_NAV))
}

/**
 * 关只读投递框:本站推的那一笔就退回去;深链进来的只把参数洗掉,不退(退了就离开本站)。
 *
 * @returns 无。
 */
export function closeAppView(): void {
  if (CACHE.pushed) {
    CACHE.pushed = false
    window.history.back()
    return
  }
  const url = new URL(window.location.href)
  url.searchParams.delete(P_APP)
  window.history.replaceState(null, TEXT_NONE, url.pathname + url.search + url.hash)
  window.dispatchEvent(new Event(EV_APP_NAV))
}

/**
 * 宿主绑事件:挂上先读一次地址栏,开关框与浏览器后退都重读。
 *
 * @param x 写当前 id 的落格。
 * @returns 解绑函数。
 */
export function bindAppHost(x: AppHostSyncIn): UnbindFn {
  function sync(): void {
    x.setId(readAppId())
  }
  sync()
  window.addEventListener(EV_APP_NAV, sync)
  window.addEventListener(EV_POPSTATE, sync)
  return function unbind(): void {
    window.removeEventListener(EV_APP_NAV, sync)
    window.removeEventListener(EV_POPSTATE, sync)
  }
}
