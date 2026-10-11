/**
 * notify 组件桶的行为:拉通知清单、开面板记「看过了」、每条的一句与去处、铃铛上的数字。
 * 2026-10-11 批 5「提示统一 + 顶栏铃铛」:操作当场的结果走右上角提示(toast 桶),留底的走这里。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { homeProvinceOf } from '@/lib/location'
import { cssOf } from '@/components/css'
import {
  BADGE_MAX, BADGE_NONE, BADGE_OVER, CLS_SEP, CRED_INCLUDE, HREF_APP_HEAD, HREF_MSG_HEAD, HREF_PICKS, KIND_PICKS,
  KIND_REPLY, KIND_TEXT_KEY, METHOD_POST, URL_NOTIFY, URL_SEEN,
} from './constants'
import type { BellToggleIn, ItemTextIn, LoadNotifyIn, NotifyFact, NotifyItem, NotifyRespJson } from './types'
import css from './notify.module.css'

/**
 * 造「拉通知清单」:按本机时区预选的省带上(今日推荐按它算)。拉不成拨「拉失败了」(铃铛不出数字,面板出一句)。
 *
 * @param x 两个落格。
 * @returns 拉的函数。
 */
export function makeLoadNotify(x: LoadNotifyIn): () => Promise<void> {
  return async function loadNotify(): Promise<void> {
    try {
      const r = await fetch(URL_NOTIFY + homeProvinceOf(), { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setFailed(true)
        return
      }
      x.setData(toNotifyFact(await r.json() as NotifyRespJson))
    } catch {
      x.setFailed(true)
    }
  }
}

/**
 * 回包 → 清单(行构造器:缺席按空读)。
 *
 * @param d 回包。
 * @returns 清单。
 */
export function toNotifyFact(d: NotifyRespJson): NotifyFact {
  let items: NotifyItem[] = []
  if (d.items != null) {
    items = d.items
  }
  let unseen = 0
  if (d.unseen != null) {
    unseen = d.unseen
  }
  return { items, unseen }
}

/**
 * 造「开 / 关面板」:开的那一下,有没看过的就记「看过了」、红色数字当场归零(条目自己的「新」标留到下次拉)。
 *
 * @param x 开合、清单与它们的落格。
 * @returns 手柄。
 */
export function makeBellToggle(x: BellToggleIn): () => void {
  return function toggleBell(): void {
    if (x.open) {
      x.setOpen(false)
      return
    }
    x.setOpen(true)
    if (x.data != null && x.data.unseen > 0) {
      x.setData({ items: x.data.items, unseen: 0 })
      void postSeen()
    }
  }
}

/**
 * 记「看过了」。写不成服务端已留痕;下次拉回来数字还在,不算丢。
 *
 * @returns 无。
 */
export async function postSeen(): Promise<void> {
  try {
    await fetch(URL_SEEN, { method: METHOD_POST, credentials: CRED_INCLUDE })
  } catch {
    return
  }
}

/**
 * 一条的那一句(回信 / 退信 / 已发出带公司名,今日推荐带条数)。
 *
 * @param x 这一条与取词函数。
 * @returns 一句。
 */
export function itemTextOf(x: ItemTextIn): string {
  const key = KIND_TEXT_KEY[x.item.kind]
  if (key == null) {
    return x.item.label
  }
  return x.t(key, { co: x.item.label, n: x.item.n })
}

/**
 * 一条的去处:回信去收件箱那一封;退信 / 已发出去「我的」页弹只读投递框;今日推荐去「我的」页。
 *
 * @param item 这一条。
 * @returns 站内路径。
 */
export function itemHrefOf(item: NotifyItem): string {
  if (item.kind === KIND_REPLY) {
    return HREF_MSG_HEAD + String(item.id)
  }
  if (item.kind === KIND_PICKS) {
    return HREF_PICKS
  }
  return HREF_APP_HEAD + String(item.id)
}

/**
 * 铃铛上的红色数字(0 = 不出;超过 BADGE_MAX 写「9+」)。
 *
 * @param n 没看过几条。
 * @returns 写法;空串 = 不出。
 */
export function badgeOf(n: number): string {
  if (n <= 0) {
    return BADGE_NONE
  }
  if (n > BADGE_MAX) {
    return String(BADGE_MAX) + BADGE_OVER
  }
  return String(n)
}

/**
 * 一条的类名:基座 + 没看过的加粗底色。
 *
 * @param unseen 没看过。
 * @returns 拼好的 className。
 */
export function rowClsOf(unseen: boolean): string {
  if (unseen) {
    return [cssOf(css.row), cssOf(css.rowNew)].join(CLS_SEP)
  }
  return cssOf(css.row)
}

/**
 * 造「点一条」:整页去它的去处(「我的」页的节、收件箱那一封、只读投递框都只在挂上时读地址栏,原地改参数不会弹)。
 *
 * @param item 这一条。
 * @returns 手柄。
 */
export function makeGoItem(item: NotifyItem): () => void {
  return function goItem(): void {
    window.location.assign(itemHrefOf(item))
  }
}
