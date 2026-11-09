'use client'
/**
 * me 桶子桶 sub 的状态机器:定价框开合、挂上拉一次付款记录(懒查 Stripe)、挂上拉一次新岗推送设置并可改可存。
 * 2026-11-07 自 account 桶 useSubscription 与 myjobs 桶 usePush 在新域并成一台(两段同住「我的订阅」一页)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { useEffect, useState } from 'react'
import { useIsNarrow } from '@/components/modal'
import { TEXT_NONE } from './constants'
import {
  alertRowsOf, makeAlertAskClose, makeAlertAskOk, makeFlagSet, makeLoadAlerts, makeLoadPush, makePaymentsLoad,
  makeProfileFreq, makeSavePush, proOf, untilOf, untilTextOf,
} from './functions'
import type { AlertAsk, AlertDoc, PaymentRows, SubIn, SubPanel } from './types'

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
  const [docs, setDocs] = useState<AlertDoc[]>([])
  const [alertsFailed, setAlertsFailed] = useState(false)
  const [ask, setAsk] = useState<AlertAsk | null>(null)
  const narrow = useIsNarrow()

  useEffect(function firstLoad() {
    void makePaymentsLoad({ setItems: setPayments, setFailed: setPayFailed })()
    void makeLoadPush({ setFreq, setEmail, setReady, setFailed })()
    void makeLoadAlerts({ setDocs, setFailed: setAlertsFailed })()
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
    alerts: {
      narrow,
      failed: alertsFailed,
      rows: alertRowsOf({
        docs,
        profileFreq: freq,
        onProfileFreq: makeProfileFreq({ email, t: x.t, setFreq, setNote, setBusy }),
        t: x.t,
        setDocs,
        setAsk,
      }),
      ask,
      onAskOk: makeAlertAskOk({ ask, setAsk }),
      onAskClose: makeAlertAskClose(setAsk),
    },
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
