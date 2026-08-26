/**
 * tabs 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { KEY_END, KEY_HOME, KEY_LEFT, KEY_RIGHT } from './constants'
import type { ClickFn, TabClickIn, TabItem, TabKeysFn, TabKeysIn } from './types'

/**
 * 造一枚键盘导航手柄(WAI-ARIA tabs 模式):← → 相邻循环、Home/End 跳两端,
 * 切换后把焦点跟过去。工厂形态 —— 手柄要闭包住这一渲染的清单与当前值。
 * (原先有个 'home'/'end' 字符串方向参数,2026-08-24 撤编成「跳到第几个」的数字 ——
 * 少一种自家串,魔字符串闸就少一类要豁免的东西。)
 *
 * @param x 清单/当前值/切换回调/焦点查找。
 * @returns 挂到每个页签上的 onKeyDown。
 */
export function makeTabKeys(x: TabKeysIn): TabKeysFn {
  function isCurrent(it: TabItem): boolean {
    return it.key === x.value
  }

  function moveTo(next: number) {
    const item = x.items[next]
    if (item == null) {
      return
    }
    x.onChange(item.key)
    const el = x.focusOf(item.key)
    if (el != null) {
      el.focus()
    }
  }

  function moveBy(delta: number) {
    const i = x.items.findIndex(isCurrent)
    moveTo((i + delta + x.items.length) % x.items.length)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === KEY_RIGHT) {
      e.preventDefault()
      moveBy(1)
    } else if (e.key === KEY_LEFT) {
      e.preventDefault()
      moveBy(-1)
    } else if (e.key === KEY_HOME) {
      e.preventDefault()
      moveTo(0)
    } else if (e.key === KEY_END) {
      e.preventDefault()
      moveTo(x.items.length - 1)
    }
  }

  return onKey
}

/**
 * 造一枚页签的点击手柄(2026-08-26 同批,自 Tabs 的循环体内迁出)。
 *
 * @param x 切换回调与这一枚的身份键。
 * @returns 挂到 button 上的 onClick。
 */
export function makeTabClick(x: TabClickIn): ClickFn {
  function click() {
    x.onChange(x.key)
  }

  return click
}
