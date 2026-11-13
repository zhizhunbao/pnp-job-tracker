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
  COUNT_NONE, CRED_INCLUDE, EMAIL_OK, EMAIL_TAKEN, EV_INBOX_UNREAD, QP_EMAIL, TOAST_ERR, LABEL_NONE, LOGIN_URL, ME_SECS,
  NEXT_SEP, PAY_OK_KEY, QP_OK, QP_OK_ON,
  JOB_TAB_SAVED, ME_JOB_TABS, QP_SEC, SEC_COUNTED, SEC_DEFAULT, SEC_PROFILE, SEC_FAVS_OLD, SEC_RESUME_OLD,
  SENT_NOTICE_KEY,
  TEXT_NONE, TOAST_OK, UNREAD_NONE,
  URL_INBOX_COUNT, URL_ME,
} from './constants'
import type {
  AppliedSentIn, GenBumpIn, MeCountIn, MeDrawerSetIn, MeJobTab, MeKey, MeLabelIn, MePickIn, MeRespJson, MeSec,
  MeUser, NavKeyIn, OnAppliedIn, ProOfIn, RefreshIn, SecPickIn, TFn, UnreadLoadIn, UnreadRespJson,
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
 * 导航给的键 →「我的求职」的子项;不是这三个的认不出(2026-11-09 三枚页签挪到侧边栏)。
 *
 * @param key 导航项的键。
 * @returns 对应的子项;认不出为 null。
 */
export function meJobTabOf(key: string): MeJobTab | null {
  for (const j of ME_JOB_TABS) {
    if (j.tab === key) {
      return j.tab
    }
  }
  return null
}

/**
 * 导航给的键 → 点得到的键(先认子项,再认节);都认不出为 null。
 *
 * @param key 导航项的键。
 * @returns 子项或节;认不出为 null。
 */
export function meKeyOf(key: string): MeKey | null {
  const tab = meJobTabOf(key)
  if (tab != null) {
    return tab
  }
  return meSecOf(key)
}

/**
 * 导航里亮哪一项:在「我的求职」时亮当前子项(类别自己不亮),其余亮节。
 *
 * @param x 当前节与当前子项。
 * @returns 亮的那一项的键。
 */
export function navKeyOf(x: NavKeyIn): MeKey {
  if (x.sec === SEC_DEFAULT) {
    return x.jobTab
  }
  return x.sec
}

/**
 * 导航点击手柄:换节 + 关抽屉(宽屏没有抽屉,关一下无妨)。
 *
 * @param x 换节回调与抽屉开关。
 * @returns 收键的点击手柄。
 */
export function makeMePick(x: MePickIn): (key: string) => void {
  function onPick(key: string) {
    const k = meKeyOf(key)
    if (k != null) {
      x.onPick(k)
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
 * 某一节的文字(导航项与页标题同一个词);「我的求职」的三个子项也在这里取(页标题写子项名)。
 *
 * @param x 节键与取词。
 * @returns 文字;认不出的节为空串。
 */
export function meLabelOf(x: MeLabelIn): string {
  for (const j of ME_JOB_TABS) {
    if (j.tab === x.sec) {
      return x.t(j.labelKey)
    }
  }
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
 * 改登录邮箱确认链接回跳(`?email=<结果码>`,2026-11-07 账户设置):改好了说一句「已改好」,
 * 被占了说「已经注册过了」,其余(签名不对、过期)说「链接无效或已过期」;再把参数从地址栏摘掉。
 *
 * @param t 取词。
 * @returns 无。
 */
export function emailBackToast(t: TFn): void {
  const v = new URLSearchParams(window.location.search).get(QP_EMAIL)
  if (v == null) {
    return
  }
  if (v === EMAIL_OK) {
    toast({ kind: TOAST_OK, title: t('set.emOk') })
  } else if (v === EMAIL_TAKEN) {
    toast({ kind: TOAST_ERR, title: t('set.e.taken') })
  } else {
    toast({ kind: TOAST_ERR, title: t('set.emBad') })
  }
  const url = new URL(window.location.href)
  url.searchParams.delete(QP_EMAIL)
  window.history.replaceState(null, TEXT_NONE, url.pathname + url.search + url.hash)
}

/**
 * 地址栏 `?sec=` 指的节;旧的「我的收藏」落「我的求职」,认不出的不认。
 * 2026-11-09 三枚页签挪到侧边栏:旧的「我的收藏」落「我的求职」下的「我的收藏」子项;子项的键也认。
 *
 * @returns 节或子项;没带或认不出为 null。
 */
export function secLinkOf(): MeKey | null {
  const s = new URLSearchParams(window.location.search).get(QP_SEC)
  if (s == null) {
    return null
  }
  if (s === SEC_FAVS_OLD) {
    return JOB_TAB_SAVED
  }
  if (s === SEC_RESUME_OLD) {
    return SEC_PROFILE
  }
  return meKeyOf(s)
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
 * 2026-11-09 三枚页签挪到侧边栏:点的是「我的求职」的子项时,换到「我的求职」并换子项。
 * 2026-11-13 Frank「先修收件箱问题」:换节同时把这一节写进地址栏(writeSecLink)—— 原先切侧栏地址栏不动,
 * 从收件箱切到别的节再刷新,又回到收件箱。
 *
 * @param x 换节、开面板与换子项三个 setter。
 * @returns 收键的手柄。
 */
export function makeSecPick(x: SecPickIn): (key: MeKey) => void {
  return function pickSec(key: MeKey): void {
    x.setAutoEdit(false)
    const tab = meJobTabOf(key)
    if (tab != null) {
      x.setJobTab(tab)
      x.setSec(SEC_DEFAULT)
      writeSecLink(key)
      return
    }
    const sec = meSecOf(key)
    if (sec != null) {
      x.setSec(sec)
      writeSecLink(key)
    }
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
    writeSecLink(SEC_PROFILE)
  }
}

/**
 * 把当前这一节写进地址栏 `?sec=`(2026-11-13):只换这一格,别的参数不动;不进浏览历史(replaceState),已经是它就不写。
 *
 * @param key 节或「我的求职」子项的键。
 * @returns 无。
 */
export function writeSecLink(key: MeKey): void {
  const url = new URL(window.location.href)
  if (url.searchParams.get(QP_SEC) === key) {
    return
  }
  url.searchParams.set(QP_SEC, key)
  window.history.replaceState(null, TEXT_NONE, url.pathname + url.search + url.hash)
}
