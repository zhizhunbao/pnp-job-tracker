'use client'
/**
 * me 桶子桶 settings 的状态:哪个面板开着、两张表单的格、正在提交、报错。
 *
 * @author Frank
 * @time 2026-11-07 23:55:00
 */
import { useState } from 'react'
import { PANEL_EMAIL, PANEL_NONE, PANEL_PW, TEXT_NONE } from './constants'
import { makePanel, makeSubmitEmail, makeSubmitPw } from './functions'
import type { SettingsHookIn, SettingsPanel, SettingsPanelKey } from './types'

/**
 * 账户设置一页的整机。
 *
 * @param x 取词函数。
 * @returns 整机。
 */
export function useSettings(x: SettingsHookIn): SettingsPanel {
  const [panel, setPanel] = useState<SettingsPanelKey>(PANEL_NONE)
  const [cur, setCur] = useState(TEXT_NONE)
  const [next, setNext] = useState(TEXT_NONE)
  const [again, setAgain] = useState(TEXT_NONE)
  const [email, setEmail] = useState(TEXT_NONE)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(TEXT_NONE)

  function reset(): void {
    setCur(TEXT_NONE)
    setNext(TEXT_NONE)
    setAgain(TEXT_NONE)
    setEmail(TEXT_NONE)
    setErr(TEXT_NONE)
  }

  const close = makePanel({ key: PANEL_NONE, setPanel, reset })
  const submit = { t: x.t, cur, next, again, email, setBusy, setErr, close }
  return {
    panel,
    openPw: makePanel({ key: PANEL_PW, setPanel, reset }),
    openEmail: makePanel({ key: PANEL_EMAIL, setPanel, reset }),
    close,
    cur,
    setCur,
    next,
    setNext,
    again,
    setAgain,
    email,
    setEmail,
    busy,
    err,
    submitPw: makeSubmitPw(submit),
    submitEmail: makeSubmitEmail(submit),
  }
}
