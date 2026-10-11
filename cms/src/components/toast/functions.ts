/**
 * toast 组件桶的行为:往总线上发一条提示、宿主收到后怎么排卡、卡的类名。
 * 2026-10-11 批 5(Frank「所有的消息 是不是应该统一放到一个地方显示」):全站操作结果的一句话统一走右上角这一处,
 * 不再各卡里自己摆一行绿字。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { cssOf } from '@/components/css'
import { CLS_SEP, DETAIL_NONE, EV_TOAST, TOAST_MAX } from './constants'
import { CACHE } from './variables'
import type { ToastDropIn, ToastItem, ToastItemIn, ToastKind, ToastListIn, ToastMsg } from './types'
import css from './toast.module.css'

/**
 * 弹一条右上角提示(全站任何地方调;骨架上的 ToastHost 收,没挂宿主的页面什么都不发生)。
 *
 * @param msg 哪一档、粗体那一行与可选的灰字副行。
 * @returns 无。
 */
export function toast(msg: ToastMsg): void {
  window.dispatchEvent(new CustomEvent<ToastMsg>(EV_TOAST, { detail: msg }))
}

/**
 * 总线事件里那一条。DOM 的监听签名只给 Event,detail 由 toast 一处发出,断言只住这一处。
 *
 * @param e 事件。
 * @returns 那一条提示。
 */
export function toastMsgOf(e: Event): ToastMsg {
  return (e as CustomEvent<ToastMsg>).detail
}

/**
 * 发一个新卡号。
 *
 * @returns 卡号。
 */
export function nextToastId(): number {
  CACHE.seq += 1
  return CACHE.seq
}

/**
 * 总线上那一条 → 一张卡(行构造器:副行不发按空串)。
 *
 * @param x 那一条与卡号。
 * @returns 一张卡。
 */
export function toToastItem(x: ToastItemIn): ToastItem {
  let detail = DETAIL_NONE
  if (x.msg.detail != null) {
    detail = x.msg.detail
  }
  return { id: x.id, kind: x.msg.kind, title: x.msg.title, detail }
}

/**
 * 叠上一张:新的在最后;超过 TOAST_MAX 张挤掉最早的。
 *
 * @param x 现有的卡与新来的一张。
 * @returns 新的卡表。
 */
export function toastListWith(x: ToastListIn): ToastItem[] {
  const all: ToastItem[] = []
  for (const it of x.list) {
    all.push(it)
  }
  all.push(x.item)
  return all.slice(Math.max(0, all.length - TOAST_MAX))
}

/**
 * 关掉一张。
 *
 * @param x 现有的卡与要关的卡号。
 * @returns 新的卡表。
 */
export function toastListWithout(x: ToastDropIn): ToastItem[] {
  const out: ToastItem[] = []
  for (const it of x.list) {
    if (it.id !== x.id) {
      out.push(it)
    }
  }
  return out
}

/**
 * 一张卡的类名:基座 + 档位色(查表,键完整性由 Record<ToastKind, string> 管)。
 *
 * @param kind 哪一档。
 * @returns 拼好的 className。
 */
export function toastClsOf(kind: ToastKind): string {
  const kindCls: Record<ToastKind, string> = {
    ok: cssOf(css.ok),
    warn: cssOf(css.warn),
    err: cssOf(css.err),
  }
  return [cssOf(css.card), kindCls[kind]].join(CLS_SEP)
}
