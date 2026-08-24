/**
 * tabs 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { TabDir, TabItem, TabKeysFn, TabKeysIn } from './types'

/**
 * 造一枚键盘导航手柄(WAI-ARIA tabs 模式):← → 相邻循环、Home/End 跳两端,
 * 切换后把焦点跟过去。工厂形态 —— 手柄要闭包住这一渲染的清单与当前值。
 *
 * @param x 清单/当前值/切换回调/焦点查找。
 * @returns 挂到每个页签上的 onKeyDown。
 */
export function makeTabKeys(x: TabKeysIn): TabKeysFn {
  function isCurrent(it: TabItem): boolean {
    return it.key === x.value
  }

  function move(dir: TabDir) {
    const i = x.items.findIndex(isCurrent)
    let next = 0
    if (dir === 'end') {
      next = x.items.length - 1
    } else if (dir === 1 || dir === -1) {
      next = (i + dir + x.items.length) % x.items.length
    }
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

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      move(-1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      move('home')
    } else if (e.key === 'End') {
      e.preventDefault()
      move('end')
    }
  }

  return onKey
}
