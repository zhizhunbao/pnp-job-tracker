/**
 * me 桶子桶 sub 的行为:Pro 判定、拉付款记录与洗成表行、拉 / 存新岗推送设置,外加定价框开合的小手柄。
 * 2026-11-07 自 account 桶(订阅节,2026-10-04 立、10-08 照 AIApply 的 Billing 改)与 myjobs 桶子桶 prefs
 * (新岗推送,2026-10-10 批 2 立、10-11 批 5 那一句挪右上角提示)在新域重写(Frank「全部在新域重写」):
 * 接口、事件名、提示照旧;付款记录拉失败不再按空清单读(效果图没付款时出「还没有付款」,失败照空读就成了假话)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { toast } from '@/components/toast'
import { DAY_MS, ymd } from '@/lib/time'
import { track } from '@/lib/track'
import {
  AMOUNT_DIGITS, CRED_INCLUDE, CUR_GAP, CUR_SIGN, EMAIL_MAX, EV_PUSH, E_EMAIL, FREQ_KEYS, FREQ_OFF, HDR_CONTENT_TYPE,
  METHOD_POST, MIME_JSON, PAY_COL_ACT, PAY_COL_AMOUNT, PAY_COL_DATE, PAY_COL_ITEM, PUT_MAIL, PUT_PENDING, TEXT_NONE,
  TOAST_ERR, TOAST_OK, TOAST_WARN, URL_PAYMENTS, URL_PUSH,
} from './constants'
import { PayReceiptCell } from './payreceiptcell'
import type {
  FlagSetIn, FreqLabelFn, LoadPushIn, PayCellRow, PayCellRowsIn, PayCol, PaymentRow, PaymentRows, PaymentsLoadIn,
  PaymentsRespJson, ProOfIn, PushNoteIn, PushPrefsJson, PushSaveJson, PushToast, SavePushIn, SubIn, TFn,
} from './types'

/**
 * Pro 到期日归一:缺席与 null 都读成 null。
 *
 * @param x 状态机器的入参。
 * @returns 到期日或 null。
 */
export function untilOf(x: SubIn): string | null {
  if (x.until == null) {
    return null
  }
  return x.until
}

/**
 * Pro 判定:到期日在此刻之后(时长包语义,没有订阅状态机)。
 * 2026-10-04 随「我的订阅」节立;与 components/header 的 proOf、lib/quota 的 isPro 同一口径(各域一份,收拢另立批)。
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
 * 到期日的显示底稿(没有 = 空串)。
 *
 * @param until 到期日或 null。
 * @returns 到期日或空串。
 */
export function untilTextOf(until: string | null): string {
  if (until == null) {
    return TEXT_NONE
  }
  return until
}

/**
 * 造一枚「把一个布尔格拨成定值」的小手柄(定价框的开 / 关)。
 *
 * @param x 拨哪格、拨成什么。
 * @returns 点一下拨过去的手柄。
 */
export function makeFlagSet(x: FlagSetIn): () => void {
  return function setFlag(): void {
    x.set(x.v)
  }
}

/**
 * 到期日还剩几天(向上取整;已过期给 0)。
 *
 * @param until 到期日(ISO)。
 * @returns 天数。
 */
export function daysLeftOf(until: string): number {
  const ms = new Date(until).getTime() - Date.now()
  if (ms <= 0) {
    return 0
  }
  return Math.ceil(ms / DAY_MS)
}

/**
 * 造「拉付款记录」(懒查 Stripe;没买过服务端给空清单):HTTP 失败与网络失败都拨「拉失败了」。
 *
 * @param x 清单落格与失败落格。
 * @returns 拉的函数。
 */
export function makePaymentsLoad(x: PaymentsLoadIn): () => Promise<void> {
  return async function loadPayments(): Promise<void> {
    try {
      const r = await fetch(URL_PAYMENTS, { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setFailed(true)
        return
      }
      x.setItems(toPaymentRows(await r.json() as PaymentsRespJson))
    } catch {
      x.setFailed(true)
    }
  }
}

/**
 * 回包 → 付款记录(缺席按空)。
 *
 * @param d 回包。
 * @returns 清单。
 */
export function toPaymentRows(d: PaymentsRespJson): PaymentRows {
  if (d.items == null) {
    return []
  }
  return d.items
}

/**
 * 一笔付款的金额字:货币前缀 + 两位小数(表里没有的货币码用大写码)。
 *
 * @param r 这一笔。
 * @returns 金额字。
 */
export function amountTextOf(r: PaymentRow): string {
  const sign = CUR_SIGN[r.currency]
  if (sign == null) {
    return r.currency.toUpperCase() + CUR_GAP + r.amount.toFixed(AMOUNT_DIGITS)
  }
  return sign + r.amount.toFixed(AMOUNT_DIGITS)
}

/**
 * 付款记录 → 展示行。
 *
 * @param x 清单与取词函数。
 * @returns 展示行。
 */
export function payCellRowsOf(x: PayCellRowsIn): PayCellRow[] {
  const out: PayCellRow[] = []
  for (const r of x.items) {
    out.push({
      key: r.id,
      date: ymd(r.paidAt),
      item: x.t('sub.proDays', { n: r.days }),
      amount: amountTextOf(r),
      receiptUrl: r.receiptUrl,
      receiptText: x.t('sub.receipt'),
    })
  }
  return out
}

/**
 * 付款记录表的四列:日期 / 内容 / 金额 / 操作。
 *
 * @param t 取词函数。
 * @returns 列组。
 */
export function payColsOf(t: TFn): PayCol[] {
  return [
    { key: PAY_COL_DATE, label: t('sub.col.date'), render: payDateOf, nowrap: true },
    { key: PAY_COL_ITEM, label: t('sub.col.item'), render: payItemOf, nowrap: true },
    { key: PAY_COL_AMOUNT, label: t('sub.col.amount'), render: payAmountOf, nowrap: true },
    { key: PAY_COL_ACT, label: t('col.actions'), render: PayReceiptCell, nowrap: true },
  ]
}

/**
 * 日期格。
 *
 * @param r 展示行。
 * @returns 年-月-日。
 */
export function payDateOf(r: PayCellRow): string {
  return r.date
}

/**
 * 内容格。
 *
 * @param r 展示行。
 * @returns 「Pro 90 天」。
 */
export function payItemOf(r: PayCellRow): string {
  return r.item
}

/**
 * 金额格。
 *
 * @param r 展示行。
 * @returns 金额字。
 */
export function payAmountOf(r: PayCellRow): string {
  return r.amount
}

/**
 * 付款记录的行身份。
 *
 * @param r 展示行。
 * @returns 会话 id。
 */
export function payKeyOf(r: PayCellRow): string {
  return r.key
}

/**
 * 造「拉一次推送设置」。
 *
 * @param x 落格。
 * @returns 拉设置的函数。
 */
export function makeLoadPush(x: LoadPushIn): () => Promise<void> {
  return async function loadPush(): Promise<void> {
    try {
      const r = await fetch(URL_PUSH, { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setFailed(true)
        return
      }
      const d = await r.json() as PushPrefsJson
      x.setFreq(freqInOf(d))
      let email = TEXT_NONE
      if (d.email != null) {
        email = d.email
      }
      x.setEmail(email)
      x.setReady(true)
    } catch {
      x.setFailed(true)
    }
  }
}

/**
 * 接口的频率 → 下拉的值(off / 缺席 / 认不得 = 空串,即「不发」档)。
 *
 * @param d 设置回包。
 * @returns 下拉的值。
 */
export function freqInOf(d: PushPrefsJson): string {
  if (d.freq == null || d.freq === FREQ_OFF || FREQ_KEYS[d.freq] == null) {
    return TEXT_NONE
  }
  return d.freq
}

/**
 * 下拉的值 → 接口的频率(空串 = off)。
 *
 * @param v 下拉的值。
 * @returns 接口的频率。
 */
export function freqOutOf(v: string): string {
  if (v === TEXT_NONE) {
    return FREQ_OFF
  }
  return v
}

/**
 * 造频率下拉的选项字。
 *
 * @param t 取词函数。
 * @returns 值 → 字。
 */
export function makeFreqLabel(t: TFn): FreqLabelFn {
  return function freqLabel(v: string): string {
    const key = FREQ_KEYS[v]
    if (key == null) {
      return v
    }
    return t(key)
  }
}

/**
 * 造「点保存」:POST 设置;邮箱格式不对贴在框下面,其余结果出右上角提示(已保存 / 确认信已发出 / 确认信没发出 / 没存上),
 * 不静默。
 *
 * @param x 频率、邮箱、取词函数与两个落格。
 * @returns 点击手柄。
 */
export function makeSavePush(x: SavePushIn): () => Promise<void> {
  return async function savePush(): Promise<void> {
    const email = x.email.trim()
    if (email === TEXT_NONE || email.length > EMAIL_MAX) {
      x.setNote(x.t('mj.pushBad'))
      return
    }
    x.setBusy(true)
    x.setNote(TEXT_NONE)
    try {
      const r = await fetch(URL_PUSH, {
        method: METHOD_POST,
        credentials: CRED_INCLUDE,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ freq: freqOutOf(x.freq), email }),
      })
      const d = await r.json() as PushSaveJson
      if (d.error === E_EMAIL) {
        x.setNote(x.t('mj.pushBad'))
      } else {
        toast(pushToastOf({ d, ok: r.ok, email, t: x.t }))
      }
      if (r.ok) {
        track(EV_PUSH, { on: String(freqOutOf(x.freq) !== FREQ_OFF) })
      }
    } catch {
      toast({ kind: TOAST_ERR, title: x.t('mj.pushFail'), detail: TEXT_NONE })
    }
    x.setBusy(false)
  }
}

/**
 * 存设置回包 → 右上角提示(2026-10-11 批 5「提示统一 + 顶栏铃铛」;换了邮箱 = 确认信已发出 + 灰字「点 <邮箱> 收到的链接后生效」)。
 *
 * @param x 回包、HTTP 成没成、邮箱与取词函数。
 * @returns 一条提示。
 */
export function pushToastOf(x: PushNoteIn): PushToast {
  if (x.ok === false) {
    return { kind: TOAST_ERR, title: x.t('mj.pushFail'), detail: TEXT_NONE }
  }
  if (x.d.result === PUT_PENDING) {
    return { kind: TOAST_OK, title: x.t('mj.pushMailSent'), detail: x.t('mj.pushPending', { e: x.email }) }
  }
  if (x.d.result === PUT_MAIL) {
    return { kind: TOAST_WARN, title: x.t('mj.pushMailFail'), detail: TEXT_NONE }
  }
  return { kind: TOAST_OK, title: x.t('mj.pushSaved'), detail: TEXT_NONE }
}
