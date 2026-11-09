'use client'
/**
 * me 桶子桶 sub 的状态机器:定价框开合、挂上拉一次付款记录(懒查 Stripe)、挂上拉一次新岗推送设置并可改可存。
 * 2026-11-07 自 account 桶 useSubscription 与 myjobs 桶 usePush 在新域并成一台(两段同住「我的订阅」一页)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { useEffect, useState } from 'react'
import { TEXT_NONE } from './constants'
import {
  makeFlagSet, makeLoadPush, makePaymentsLoad, makeSavePush, proOf, untilOf, untilTextOf,
} from './functions'
import type { PaymentRows, SubIn, SubPanel } from './types'

/**
 * 「我的订阅」一页的状态机器。
 *
 * @param x 取词函数与 Pro 到期日。
 * @returns 方案、定价框开合、付款记录与新岗推送的状态和手柄。
 */
export function useSub(x: SubIn): SubPanel {
  const [open, setOpen] = useState(false)
  const [payments, setPayments] = useState<PaymentRows | null>(null)
  const [payFailed, setPayFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [freq, setFreq] = useState(TEXT_NONE)
  const [email, setEmail] = useState(TEXT_NONE)
  const [note, setNote] = useState(TEXT_NONE)
  const [busy, setBusy] = useState(false)

  useEffect(function firstLoad() {
    void makePaymentsLoad({ setItems: setPayments, setFailed: setPayFailed })()
    void makeLoadPush({ setFreq, setEmail, setReady, setFailed })()
  }, [])

  const until = untilOf(x)
  return {
    pro: proOf({ until }),
    until: untilTextOf(until),
    open,
    onOpen: makeFlagSet({ set: setOpen, v: true }),
    onClose: makeFlagSet({ set: setOpen, v: false }),
    payments,
    payFailed,
    push: {
      ready,
      failed,
      freq,
      setFreq,
      email,
      setEmail,
      note,
      busy,
      onSave: makeSavePush({ freq, email, t: x.t, setNote, setBusy }),
    },
  }
}
