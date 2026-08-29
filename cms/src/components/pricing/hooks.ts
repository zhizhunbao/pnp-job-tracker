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
import { TEXT_NONE, UPGRADE_CLOSED } from './constants'
import {
  makeFlagSet, makePricingBuy, makeUpgradeBuy, makeUpgradeOpen, makeUpgradeSet, reloadPage, trackPricingModalOpen,
  trackPricingOpen, trackShotClick, trackUpgradeOpen,
} from './functions'
import type {
  PricingBuyHookIn, PricingBuyPanel, PricingModalPanel, PricingPanel, UpgradeCtaHookIn, UpgradeCtaPanel,
  UpgradeModalHookIn, UpgradeModalPanel, UpgradeOpen,
} from './types'

/**
 * 定价页整机:界面语言(全站一处 LangProvider,初值由服务端 cookie 定)、
 * 进页埋点一次、注册弹框的开关与完成后的整页重载。
 *
 * @returns 视图要的整块面板:状态 + 手柄。
 */
export function usePricingPage(): PricingPanel {
  const [lang, , t] = useLang()
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(function reportOpen() {
    trackPricingOpen()
  }, [])

  return {
    t,
    lang,
    authOpen,
    onShot: trackShotClick,
    onRegister: makeFlagSet({ set: setAuthOpen, v: true }),
    onAuthClose: makeFlagSet({ set: setAuthOpen, v: false }),
    onAuthDone: reloadPage,
  }
}

/**
 * 定价弹窗整机:开一次记一笔「定价被看到」,外加窗内点注册时那一层注册弹框的开关。
 *
 * @returns 视图要的整块面板:状态 + 手柄。
 */
export function usePricingModal(): PricingModalPanel {
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(function reportOpen() {
    trackPricingModalOpen()
  }, [])

  return {
    authOpen,
    onRegister: makeFlagSet({ set: setAuthOpen, v: true }),
    onAuthClose: makeFlagSet({ set: setAuthOpen, v: false }),
    onAuthDone: reloadPage,
  }
}

/**
 * 价卡购买流:一格忙态 + 一只手柄。忙态是两枚 Pro 钮共用的 —— 同一时刻只该有一条
 * Checkout 在飞,拿到 url 就整页跳走,所以忙态不必按档分开记。
 *
 * @param x 登录态与未登录时的注册出口。
 * @returns 视图要的整块面板:忙态 + 手柄。
 */
export function usePricingBuy(x: PricingBuyHookIn): PricingBuyPanel {
  const [busy, setBusy] = useState(false)
  return {
    busy,
    onBuy: makePricingBuy({ loggedIn: x.loggedIn, onRegister: x.onRegister, setBusy }),
  }
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

  useEffect(function reportOpen() {
    trackUpgradeOpen()
  }, [])

  return {
    busy,
    err,
    compare,
    onBuy: makeUpgradeBuy({ t: x.t, setBusy, setErr }),
    onCompareOpen: makeFlagSet({ set: setCompare, v: true }),
    onCompareClose: makeFlagSet({ set: setCompare, v: false }),
  }
}

/**
 * 升级钮整机:一格三态(什么都没开 / 升级弹框 / 注册弹框)与开关两只手柄。
 *
 * @param x 登录态。
 * @returns 视图要的整块面板:三态 + 手柄。
 */
export function useUpgradeCta(x: UpgradeCtaHookIn): UpgradeCtaPanel {
  const [open, setOpen] = useState<UpgradeOpen>(UPGRADE_CLOSED)
  return {
    open,
    onOpen: makeUpgradeOpen({ set: setOpen, loggedIn: x.loggedIn }),
    onClose: makeUpgradeSet({ set: setOpen, v: UPGRADE_CLOSED }),
  }
}
