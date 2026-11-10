'use client'
/**
 * pricing 域的状态机器:usePricingPage 一台管整页(界面语言、进页埋点、注册弹框的
 * 开关);2026-08-28 第二波再添四台管定价件 —— 定价弹窗、价卡购买流、升级弹框、
 * 升级钮。体内不留函数体 —— 带口径的步骤全在 ./functions 的工厂里(注释即它们的
 * JSDoc),这里只剩 useState、具名 effect 壳与工厂装配(形制同 account 的
 * useAccountPage 与 news 的 useNewsFilter)。
 *
 * @author Frank
 * @time 2026-08-28 12:45:00
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { PLAN_DEFAULT, TEXT_NONE } from './constants'
import {
  makeFlagSet, makePlanPick, makePlanSelect, makeUpgradeBuy, reloadPage, trackPricingOpen, trackUpgradeOpen,
} from './functions'
import type { PricePlan, PricingPanel, UpgradeModalHookIn, UpgradeModalPanel } from './types'

/**
 * 定价页整机:界面语言(全站一处 LangProvider,初值由服务端 cookie 定)、
 * 进页埋点一次、注册弹框的开关与完成后的整页重载。
 *
 * 2026-11-09 定价页与定价弹框并进升级框一种形态(Frank「可以」):本台只剩取词与进页埋点 —— 营销截图、注册弹框的开关
 * 随旧卡撤(注册框归升级框正文的 useUpgradeModal);定价弹窗整机 usePricingModal 与价卡购买流 usePricingBuy 整台撤。
 *
 * @returns 视图要的面板:取词函数。
 */
export function usePricingPage(): PricingPanel {
  const [, , t] = useLang()

  useEffect(function reportOpen() {
    trackPricingOpen()
  }, [])

  return { t }
}

/**
 * 升级弹框整机:开一次记一笔「看到卖点」,购买流两格状态,外加「对比」那一层定价弹窗的开关。
 *
 * @param x 取词函数。
 * @returns 视图要的整块面板:状态 + 手柄。
 */
export function useUpgradeModal(x: UpgradeModalHookIn): UpgradeModalPanel {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(TEXT_NONE)
  const [compare, setCompare] = useState(false)
  const [plan, setPlan] = useState<PricePlan>(PLAN_DEFAULT)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(function reportOpen() {
    trackUpgradeOpen()
  }, [])

  const onBuy = makeUpgradeBuy({ t: x.t, setBusy, setErr, back: x.back })

  function pickOf(p: PricePlan): () => void {
    return makePlanSelect({ plan: p, set: setPlan })
  }

  let onPay = makePlanPick({ plan, onBuy })
  if (x.loggedIn === false) {
    onPay = makeFlagSet({ set: setAuthOpen, v: true })
  }

  return {
    busy,
    err,
    compare,
    plan,
    pickOf,
    onPay,
    authOpen,
    onAuthClose: makeFlagSet({ set: setAuthOpen, v: false }),
    onAuthDone: reloadPage,
    onBuy,
    onCompareOpen: makeFlagSet({ set: setCompare, v: true }),
    onCompareClose: makeFlagSet({ set: setCompare, v: false }),
  }
}
