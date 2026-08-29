'use client'
/**
 * verdict 域的状态机器:判定面板的取数与错误留痕、条件格的省页签选中项。
 * 体内不留函数体 —— 带口径的步骤全在 ./functions 的工厂与步骤函数里
 * (注释即它们的 JSDoc),这里只剩 useState、具名 effect 壳与工厂装配
 * (形制同 news 的 useNewsDetail 与 account 的 useAccountPage)。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { useEffect, useState } from 'react'
import { TEXT_NONE } from './constants'
import { activeProvOf, initialWireOf, makeTabChange, startVerdictLoad } from './functions'
import type {
  ConditionTabsPanel, MaybeVerdictWire, UseConditionTabsIn, UseVerdictIn, VerdictPanel,
} from './types'

/**
 * 判定面板整机。SSR 那份直接当初值:首屏就有结论与三关,
 * 骨架只在**纯客户端入口**(职位板弹窗)才出现。
 * 重算只认三格(岗位、重算计数、SSR 那份在不在):本地答案在 effect 里现读 ——
 * 把它进依赖表 = 用户每敲一下都重打一次判定请求。
 *
 * @param x 岗位 id、重算计数与 SSR 那份。
 * @returns 现有的判定结果与错误旗标。
 */
export function useVerdict(x: UseVerdictIn): VerdictPanel {
  const [wire, setWire] = useState<MaybeVerdictWire>(initialWireOf({ initial: x.initial }))
  const [err, setErr] = useState(false)
  const hasInitial = x.initial != null

  useEffect(function loadVerdict() {
    return startVerdictLoad({
      jobId: x.jobId,
      refreshKey: x.refreshKey,
      hasInitial,
      setWire,
      setErr,
    })
  }, [x.jobId, x.refreshKey, hasInitial])

  return { wire, err }
}

/**
 * 条件格的省页签整机(选过的那个还在就用它,否则落第一个 ——
 * 页签次序与选中项都不许随答案变动而跳)。
 *
 * @param x 出现过的省码。
 * @returns 当前省码与切页签手柄。
 */
export function useConditionTabs(x: UseConditionTabsIn): ConditionTabsPanel {
  const [tab, setTab] = useState(TEXT_NONE)
  return {
    active: activeProvOf({ provs: x.provs, tab }),
    onChange: makeTabChange({ setTab }),
  }
}
