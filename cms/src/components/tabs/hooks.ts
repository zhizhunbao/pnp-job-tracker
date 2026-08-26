/**
 * tabs 域的机器(调用位被 React 规则定死的那一格)。2026-08-26 Frank 立
 * 「tsx 组件体内不许声明内嵌函数」时立件 —— 页签的焦点跟随与键盘导航自 Tabs 体内迁出。
 *
 * @author Frank
 * @time 2026-08-26 16:00:00
 */
import { useRef } from 'react'

import { makeTabKeys } from './functions'
import type { TabKeysHookIn, TabKeysHookOut, TabRefFn } from './types'

/**
 * 页签焦点机:按 key 记住每枚页签钮,交回「收元素的回调 ref 工厂」与键盘手柄。
 * 页签元素表整台机器自己拿着、不出这个文件 —— 渲染期把 ref 交给普通函数会被
 * react-hooks/refs 判成「渲染期读 ref」(手法同 table 的 useColWidths.thRefOf)。
 * makeTabKeys 的构造留在按键事件里(2026-08-26 上午那批的判定,搬家不许把它退回去)。
 *
 * @param x 页签清单、当前值与切换回调。
 * @returns 机器面板(回调 ref 工厂与键盘手柄)。
 */
export function useTabKeys(x: TabKeysHookIn): TabKeysHookOut {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  function refOf(key: string): TabRefFn {
    function setRef(el: HTMLButtonElement | null) {
      refs.current[key] = el
    }
    return setRef
  }

  function focusOf(key: string): HTMLButtonElement | null {
    const el = refs.current[key]
    if (el == null) {
      return null
    }
    return el
  }

  function onKey(e: React.KeyboardEvent) {
    const handle = makeTabKeys({ items: x.items, value: x.value, onChange: x.onChange, focusOf })
    handle(e)
  }

  return { refOf, onKey }
}
