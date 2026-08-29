'use client'
/**
 * pnp 域的状态机器:省清单块、EE 类别块、联邦轮次卡与匹配明细卡各一台。
 * 体内不留函数体 —— 带口径的步骤全在 ./functions 的派生与工厂里(注释即它们的 JSDoc),
 * 这里只剩 useState、具名 effect 壳与工厂装配(形制同 news 的 useCarousel 与 account 的 useAccountPage)。
 * 折叠状态一律用键的集合而不是 `Record<string, boolean>`:开合只是一把键在不在,
 * 集合天然不用对象展开(宪法禁 `...`),也不会留下一堆 false 的死键。
 * 2026-08-28 换装批自 Pnp.tsx 的四个组件体收进来。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { makeT } from '@/lib/i18n'
import {
  eeGroupOf, eeHistOf, eeHitOf, eeShownOf, fedRoundsOf, makeCatToggleOf, makeFlagToggle, makeToggleOf,
  matchResultOf, nocRowsOf, pnpMatchOf, scrollIntoHit,
} from './functions'
import type { EeHookIn, EePanel, FedHookIn, FedPanel, MmHookIn, MmPanel, PnpListHookIn, PnpListPanel } from './types'

/**
 * 省提名清单块整机:取词、职业名字典、命中计算、命中行滚进视野与每张清单的折叠。
 * 高亮行随命中结论变化就近滚一次(尽量不动整个弹框)。
 *
 * @param x 本岗、界面语言、扁平清单与职业名字典。
 * @returns 取词函数、ref 盒、字典、命中结论与折叠状态。
 */
export function usePnpList(x: PnpListHookIn): PnpListPanel {
  const t = makeT(x.lang)
  const matchRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState<Set<string>>(new Set())

  const nocRows = useMemo(function dictOf() {
    return nocRowsOf(x.nocDesc)
  }, [x.nocDesc])

  const match = useMemo(function matchOf() {
    return pnpMatchOf({ job: x.job, occ: x.occ })
  }, [x.job, x.occ])

  useEffect(function scrollToHit() {
    scrollIntoHit({ ref: matchRef })
  }, [match.streams])

  return { t, matchRef, nocRows, match, open, toggleOf: makeToggleOf({ setKeys: setOpen }) }
}

/**
 * 联邦 EE 类别块整机:分组、历史轮次、命中与全景取舍,外加三处折叠
 * (类别历史单开一个、职业清单一律默认展开、全类别全景默认收起)。
 *
 * @param x 本岗、界面语言、扁平类别、全部抽选行与职业名字典。
 * @returns 取词函数、ref 盒、字典、三张派生清单与折叠状态。
 */
export function useEeCategory(x: EeHookIn): EePanel {
  const t = makeT(x.lang)
  const matchRef = useRef<HTMLDivElement | null>(null)
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  const nocRows = useMemo(function dictOf() {
    return nocRowsOf(x.nocDesc)
  }, [x.nocDesc])

  const histOf = useMemo(function histsOf() {
    return eeHistOf({ draws: x.draws })
  }, [x.draws])

  const grouped = useMemo(function groupsOf() {
    return eeGroupOf({ cats: x.cats })
  }, [x.cats])

  useEffect(function scrollToHit() {
    scrollIntoHit({ ref: matchRef })
  }, [grouped])

  const hit = eeHitOf({ grouped, noc: x.job.noc })
  return {
    t,
    matchRef,
    nocRows,
    grouped,
    hit,
    shown: eeShownOf({ grouped, hit, histOf, showAll }),
    histOf,
    openCat,
    catToggleOf: makeCatToggleOf({ openCat, setOpenCat }),
    closed,
    listToggleOf: makeToggleOf({ setKeys: setClosed }),
    showAll,
    onShowAll: makeFlagToggle({ setOn: setShowAll }),
  }
}

/**
 * 联邦抽选近况卡整机:算出要列的轮次 + 一个展开开关。
 *
 * @param x 全部抽选行。
 * @returns 展开态、开关与轮次。
 */
export function useFederalRounds(x: FedHookIn): FedPanel {
  const [open, setOpen] = useState(false)

  const rounds = useMemo(function roundsOf() {
    return fedRoundsOf({ draws: x.draws })
  }, [x.draws])

  return { open, onToggle: makeFlagToggle({ setOn: setOpen }), rounds }
}

/**
 * 匹配明细卡整机:取词 + 用同一 match() 在弹框端重算依据链(与服务端列一致)。
 *
 * @param x 本岗、界面语言、身份与档案、两张维度清单。
 * @returns 取词函数与匹配结论。
 */
export function useMeansForMe(x: MmHookIn): MmPanel {
  const t = makeT(x.lang)

  const result = useMemo(function resultOf() {
    return matchResultOf({ job: x.job, plan: x.plan, pnpOcc: x.pnpOcc, eeOcc: x.eeOcc })
  }, [x.job, x.plan, x.pnpOcc, x.eeOcc])

  return { t, result }
}
