'use client'
/**
 * me 域的状态机器:整页(登录态、节、深链、付款回跳、未读数、两个代数;2026-11-07 替 account 桶 useAccountPage,
 * banner 副题「已投 N 封」随横幅撤,不再拉)与窄屏抽屉。
 *
 * @author Frank
 * @time 2026-11-07 15:30:00
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { useIsNarrow } from '@/components/modal'
import { SEC_DEFAULT } from './constants'
import {
  bindUnread, makeDrawerSet, makeGenBump, makeMePick, makeOnApplied, makeRefresh, payOkToast, proOf,
  secLinkOf, untilOf,
} from './functions'
import type { MeFrameIn, MeFrameOut, MePagePanel, MeSec, MeUser } from './types'

/**
 * 「我的」整页的状态机器。
 *
 * @returns 整页状态与手柄。
 */
export function useMePage(): MePagePanel {
  const [sec, setSec] = useState<MeSec>(SEC_DEFAULT)
  const narrow = useIsNarrow()
  const [, , t] = useLang()
  const [me, setMe] = useState<MeUser | null>(null)
  const [checked, setChecked] = useState(false)
  const [appliedGen, setAppliedGen] = useState(0)
  const [unread, setUnread] = useState(0)
  const [askedGen, setAskedGen] = useState(0)

  useEffect(function readPayOk() {
    payOkToast(t)
  }, [t])

  useEffect(function readSecLink() {
    const s = secLinkOf()
    if (s != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 故意分两步:地址栏参数只有浏览器里读得到,服务端画首帧时没有,活过来后再补
      setSec(s)
    }
  }, [])

  useEffect(function firstLoad() {
    void makeRefresh({ setMe, setChecked })()
  }, [])

  useEffect(function bindInboxUnread() {
    return bindUnread({ setUnread })
  }, [])

  const until = untilOf(me)
  return {
    t,
    narrow,
    sec,
    me,
    checked,
    onPick: setSec,
    pro: proOf({ until }),
    until,
    appliedGen,
    onApplied: makeOnApplied({ setGen: setAppliedGen, t }),
    unread,
    askedGen,
    onAsked: makeGenBump({ setGen: setAskedGen }),
  }
}

/**
 * 「我的」框架的状态机器。
 *
 * @param x 换节回调。
 * @returns 抽屉状态与三个手柄。
 */
export function useMeFrame(x: MeFrameIn): MeFrameOut {
  const [drawer, setDrawer] = useState(false)
  return {
    drawer,
    onOpen: makeDrawerSet({ setDrawer, open: true }),
    onClose: makeDrawerSet({ setDrawer, open: false }),
    onPick: makeMePick({ onPick: x.onPick, setDrawer }),
  }
}
