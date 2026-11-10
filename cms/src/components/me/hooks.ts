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
import { JOB_TAB_DEFAULT, SEC_DEFAULT } from './constants'
import {
  bindUnread, makeDrawerSet, makeFill, makeGenBump, makeMePick, makeOnApplied, makeRefresh, makeSecPick, payOkToast,
  navKeyOf,
  emailBackToast,
  proOf,
  secLinkOf, untilOf,
} from './functions'
import type { MeFrameIn, MeFrameOut, MeJobTab, MePagePanel, MeSec, MeUser } from './types'

/**
 * 「我的」整页的状态机器。深链 `?sec=` 故意分两步读:地址栏参数只有浏览器里读得到,服务端画首帧时没有,活过来后再补。
 * 2026-11-09 三枚页签挪到侧边栏:多记「我的求职」当前的子项,导航亮的那一项由节与子项合出。
 *
 * @returns 整页状态与手柄。
 */
export function useMePage(): MePagePanel {
  const [sec, setSec] = useState<MeSec>(SEC_DEFAULT)
  const [jobTab, setJobTab] = useState<MeJobTab>(JOB_TAB_DEFAULT)
  const narrow = useIsNarrow()
  const [, , t] = useLang()
  const [me, setMe] = useState<MeUser | null>(null)
  const [checked, setChecked] = useState(false)
  const [appliedGen, setAppliedGen] = useState(0)
  const [unread, setUnread] = useState(0)
  const [askedGen, setAskedGen] = useState(0)
  const [autoEdit, setAutoEdit] = useState(false)

  useEffect(function readPayOk() {
    payOkToast(t)
    emailBackToast(t)
  }, [t])

  useEffect(function readSecLink() {
    const s = secLinkOf()
    if (s != null) {
      makeSecPick({ setSec, setAutoEdit, setJobTab })(s)
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
    jobTab,
    nav: navKeyOf({ sec, jobTab }),
    me,
    checked,
    onPick: makeSecPick({ setSec, setAutoEdit, setJobTab }),
    pro: proOf({ until }),
    until,
    appliedGen,
    onApplied: makeOnApplied({ setGen: setAppliedGen, t }),
    unread,
    askedGen,
    onAsked: makeGenBump({ setGen: setAskedGen }),
    autoEdit,
    onFill: makeFill({ setSec, setAutoEdit, setJobTab }),
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
