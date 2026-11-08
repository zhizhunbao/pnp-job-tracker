/**
 * me 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-11-07 15:30:00
 */
import { toJobPlan } from '@/components/jobs'
import { toast } from '@/components/toast'
import { hasProfile, normalizeProfile } from '@/lib/jobs'
import type { Plan } from '@/lib/jobs'
import {
  COUNT_NONE, CRED_INCLUDE, EV_INBOX_UNREAD, LABEL_NONE, LOGIN_URL, ME_SECS, NEXT_SEP, PAY_OK_KEY, QP_OK, QP_OK_ON,
  QP_SEC, SEC_COUNTED, SEC_DEFAULT, SEC_PROFILE, SEC_FAVS_OLD, SENT_NOTICE_KEY, TEXT_NONE, TOAST_OK, UNREAD_NONE,
  URL_INBOX_COUNT, URL_ME,
} from './constants'
import type {
  AppliedSentIn, GenBumpIn, MeCountIn, MeDrawerSetIn, MeLabelIn, MePickIn, MeRespJson, MeSec, MeUser, OnAppliedIn,
  ProOfIn, RefreshIn, SecPickIn, TFn, UnreadLoadIn, UnreadRespJson,
} from './types'

/**
 * 导航给的键 → 节;不在五节里的键认不出。
 *
 * @param key 导航项的键。
 * @returns 对应的节;认不出为 null。
 */
export function meSecOf(key: string): MeSec | null {
  for (const s of ME_SECS) {
    if (s.sec === key) {
      return s.sec
    }
  }
  return null
}

/**
 * 导航点击手柄:换节 + 关抽屉(宽屏没有抽屉,关一下无妨)。
 *
 * @param x 换节回调与抽屉开关。
 * @returns 收键的点击手柄。
 */
export function makeMePick(x: MePickIn): (key: string) => void {
  function onPick(key: string) {
    const sec = meSecOf(key)
    if (sec != null) {
      x.onPick(sec)
    }
    x.setDrawer(false)
  }
  return onPick
}

/**
 * 开或关抽屉的手柄。
 *
 * @param x 抽屉开关与按下后的状态。
 * @returns 无参手柄。
 */
export function makeDrawerSet(x: MeDrawerSetIn): () => void {
  function set() {
    x.setDrawer(x.open)
  }
  return set
}

/**
 * 某一节的文字(导航项与页标题同一个词)。
 *
 * @param x 节键与取词。
 * @returns 文字;认不出的节为空串。
 */
export function meLabelOf(x: MeLabelIn): string {
  for (const s of ME_SECS) {
    if (s.sec === x.sec) {
      return x.t(s.labelKey)
    }
  }
  return LABEL_NONE
}

/**
 * 某一项的红色计数:只有收件箱带(没读的封数),其余 0 不出。
 *
 * @param x 节键与没读封数。
 * @returns 计数。
 */
export function meCountOf(x: MeCountIn): number {
  if (x.sec === SEC_COUNTED) {
    return x.unread
  }
  return COUNT_NONE
}

/**
 * 拉当前用户:拉到落用户,没登录或失败落 null;无论如何落「查过了」。
 *
 * @param x 两个落格。
 * @returns 异步无参手柄。
 */
export function makeRefresh(x: RefreshIn): () => Promise<void> {
  return async function refresh(): Promise<void> {
    try {
      const r = await fetch(URL_ME, { credentials: CRED_INCLUDE })
      const d = await r.json() as MeRespJson
      let user: MeUser | null = null
      if (d != null && d.user != null) {
        user = d.user
      }
      x.setMe(user)
    } catch {
      x.setMe(null)
    } finally {
      x.setChecked(true)
    }
  }
}

/**
 * Stripe 付款成功回跳(`?ok=1`):右上角说一句,再把参数从地址栏摘掉(刷新不再说)。
 *
 * @param t 取词。
 * @returns 无。
 */
export function payOkToast(t: TFn): void {
  if (new URLSearchParams(window.location.search).get(QP_OK) !== QP_OK_ON) {
    return
  }
  toast({ kind: TOAST_OK, title: t(PAY_OK_KEY) })
  const url = new URL(window.location.href)
  url.searchParams.delete(QP_OK)
  window.history.replaceState(null, TEXT_NONE, url.pathname + url.search + url.hash)
}

/**
 * 地址栏 `?sec=` 指的节;旧的「我的收藏」落「我的求职」,认不出的不认。
 *
 * @returns 节;没带或认不出为 null。
 */
export function secLinkOf(): MeSec | null {
  const s = new URLSearchParams(window.location.search).get(QP_SEC)
  if (s == null) {
    return null
  }
  if (s === SEC_FAVS_OLD) {
    return SEC_DEFAULT
  }
  return meSecOf(s)
}

/**
 * 拉收件箱未读数(失败按 0)。
 *
 * @param x 落未读数。
 * @returns 异步无参手柄。
 */
export function makeUnreadLoad(x: UnreadLoadIn): () => Promise<void> {
  return async function loadUnread(): Promise<void> {
    try {
      const r = await fetch(URL_INBOX_COUNT, { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setUnread(UNREAD_NONE)
        return
      }
      x.setUnread((await r.json() as UnreadRespJson).unread)
    } catch {
      x.setUnread(UNREAD_NONE)
    }
  }
}

/**
 * 先拉一次未读数,再听收件箱「读了一封」的事件重拉。
 *
 * @param x 落未读数。
 * @returns 解绑函数。
 */
export function bindUnread(x: UnreadLoadIn): () => void {
  const load = makeUnreadLoad(x)
  void load()
  function onUnread(): void {
    void load()
  }
  window.addEventListener(EV_INBOX_UNREAD, onUnread)
  return function unbind(): void {
    window.removeEventListener(EV_INBOX_UNREAD, onUnread)
  }
}

/**
 * 是不是 Pro(到期日在今天之后;与 header 的 proOf、lib/quota 的 isPro 同一口径)。
 *
 * @param x 到期日。
 * @returns 是 Pro。
 */
export function proOf(x: ProOfIn): boolean {
  if (x.until == null || x.until === TEXT_NONE) {
    return false
  }
  return new Date(x.until) > new Date()
}

/**
 * Pro 到期日(没有为 null)。
 *
 * @param me 当前用户。
 * @returns 到期日。
 */
export function untilOf(me: MeUser | null): string | null {
  if (me == null || me.proUntil == null) {
    return null
  }
  return me.proUntil
}

/**
 * 分层态:档案用 lib/jobs 的 normalizeProfile / hasProfile、Pro 用 proOf,交职位桶 toJobPlan 装配(与各页面门同口径);
 * 没登录给访客态。
 *
 * @param me 当前用户。
 * @returns 分层态。
 */
export function planOf(me: MeUser | null): Plan {
  if (me == null) {
    return toJobPlan({ user: null, pro: false, profile: normalizeProfile(null), profileOk: false })
  }
  let raw = null
  if (me.profile != null) {
    raw = me.profile
  }
  const profile = normalizeProfile(raw)
  return toJobPlan({ user: me, pro: proOf({ until: untilOf(me) }), profile, profileOk: hasProfile(profile) })
}

/**
 * 代数 +1。
 *
 * @param n 原代数。
 * @returns 新代数。
 */
export function genNextOf(n: number): number {
  return n + 1
}

/**
 * 「投递框发出去了」:投递表重挂、推荐重拉,右上角说「已发给 <公司>」。
 *
 * @param x 代数 setter 与取词。
 * @returns 收发出结果的手柄。
 */
export function makeOnApplied(x: OnAppliedIn): (y: AppliedSentIn) => void {
  return function onApplied(y: AppliedSentIn): void {
    x.setGen(genNextOf)
    toast({ kind: TOAST_OK, title: x.t(SENT_NOTICE_KEY, { co: y.company }) })
  }
}

/**
 * 代数 +1 的手柄(五题答完,推荐按新档案重拉)。
 *
 * @param x 代数 setter。
 * @returns 无参手柄。
 */
export function makeGenBump(x: GenBumpIn): () => void {
  return function bumpGen(): void {
    x.setGen(genNextOf)
  }
}

/**
 * 没登录时去的登录地址(带回跳)。
 *
 * @returns 地址。
 */
export function loginLinkOf(): string {
  return LOGIN_URL + NEXT_SEP + encodeURIComponent(window.location.pathname + window.location.search)
}

/**
 * 换节手柄:换到哪节都先清「一进档案就开修改面板」(只有「去补全」那一下开)。
 *
 * @param x 换节与开面板两个 setter。
 * @returns 收节的手柄。
 */
export function makeSecPick(x: SecPickIn): (sec: MeSec) => void {
  return function pickSec(sec: MeSec): void {
    x.setAutoEdit(false)
    x.setSec(sec)
  }
}

/**
 * 「去补全」手柄:切到「我的档案」并开修改面板。
 *
 * @param x 换节与开面板两个 setter。
 * @returns 无参手柄。
 */
export function makeFill(x: SecPickIn): () => void {
  return function fill(): void {
    x.setAutoEdit(true)
    x.setSec(SEC_PROFILE)
  }
}
