'use client'
/**
 * account 域的状态机器:useAccountPage 一台管整页(登录态/节切换/深链/昵称编辑/
 * 购买/登出)。2026-08-26 Frank 看完「纯拼装门」第一版实拍「还是有一堆函数啊」——
 * page.tsx 里的 state/effect/handler 全部收进这里,门只剩一行 hook + 拼装
 * (闸 local/page-no-logic;hooks 抽屉先例 modal/hooks.ts)。
 * 同日续(Frank「hooks 有很多匿名函数需要抽到 functions 吧」):体内不留任何
 * 函数体与注释 —— 带口径的步骤全在 ./functions 的工厂里(注释即它们的 JSDoc),
 * 这里只剩 useState、具名 effect 壳与工厂装配。
 *
 * @author Frank
 * @time 2026-08-26 21:55:00
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { useIsNarrow } from '@/components/modal'
import { SEC_DEFAULT, TEXT_NONE } from './constants'
import {
  makeBuy,
  makeLogout,
  makeNickEdit,
  makeNickKey,
  makeRefresh,
  makeSaveNick,
  okFlagOf,
  proOf,
  secLinkOf,
} from './functions'
import type { AccountPanel, Me, Sec } from './types'

/**
 * 账户页整机:登录态查询与刷新、`?ok=`/`?sec=` 深链、昵称就地编辑(E11-01)、
 * 时长包购买(E3-03)、登出。一台机器不拆 —— 这些状态互相咬合(登出要刷新、
 * 存昵称要刷新、购买读 t 出话术),拆开就得互相穿参数。
 *
 * @returns 门(page.tsx)要的整块面板:状态 + 手柄。
 */
export function useAccountPage(): AccountPanel {
  const [sec, setSec] = useState<Sec>(SEC_DEFAULT)
  const narrow = useIsNarrow()
  const [lang, setLangSaved, t] = useLang()

  const [me, setMe] = useState<Me>(null)
  const [checked, setChecked] = useState(false)
  const [payOk, setPayOk] = useState(false)
  const [buying, setBuying] = useState(false)
  const [buyErr, setBuyErr] = useState(TEXT_NONE)
  const [nick, setNick] = useState<string | null>(null)
  const [nickBusy, setNickBusy] = useState(false)

  useEffect(function readPayOk() {
    setPayOk(okFlagOf())
  }, [])

  useEffect(function readSecLink() {
    const s = secLinkOf()
    if (s != null) {
      setSec(s)
    }
  }, [])

  const refresh = makeRefresh({ setMe, setChecked })

  useEffect(function firstLoad() {
    refresh()
  }, [])

  const saveNick = makeSaveNick({ nick, me, setNick, setNickBusy, refresh })

  return {
    lang,
    setLang: setLangSaved,
    t,
    narrow,
    sec,
    me,
    checked,
    payOk,
    buying,
    buyErr,
    nick,
    nickBusy,
    pro: proOf({ me }),
    onPick: setSec,
    onLogout: makeLogout({ refresh }),
    onNickEdit: makeNickEdit({ me, setNick }),
    onNickChange: setNick,
    onNickSave: saveNick,
    onNickKey: makeNickKey({ saveNick, setNick }),
    onBuy: makeBuy({ t, setBuying, setBuyErr }),
  }
}
