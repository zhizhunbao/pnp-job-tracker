/**
 * 账户页(/account)从组件体里迁出来的函数。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」:逐项事件手柄用 makeXxx 工厂
 * (样张 select 的 optionLabelOf / makeSelectChange),闭包变量改 XxxIn 显式入参。
 *
 * @author Frank
 * @time 2026-08-26 15:28:17
 */
import type { AddTypedFn, AddTypedIn, NickKeyFn, NickKeyIn } from './types'

/**
 * 造一枚「加输入框里这一个」的按钮手柄:输入框里敲的东西直接加 ——
 * 5 位码按码加,否则加命中的第一条。
 * (原先埋在 input 的 onKeyDown 箭头里 —— 换 field 域的 Search 后,键盘出口归
 *  组件域统一定,这条页面专属行为提成具名函数并给一个显式的钮。)
 *
 * @param x 当前输入、命中清单与加码函数。
 * @returns 点一下加一个职业的手柄。
 */
export function makeAddTyped(x: AddTypedIn): AddTypedFn {
  return function addTyped(): void {
    const v = x.q.trim()
    if (/^\d{5}$/.test(v)) {
      x.addNoc(v)
      return
    }
    if (x.hits[0] != null) {
      x.addNoc(x.hits[0].noc)
    }
  }
}

/**
 * 造一枚昵称框的键盘手柄:Enter 存、Esc 取消。
 *
 * @param x 存昵称与退出编辑两个动作。
 * @returns 挂到输入框 onKeyDown 上的手柄。
 */
export function makeNickKey(x: NickKeyIn): NickKeyFn {
  return function onNickKey(e: { key: string }): void {
    if (e.key === 'Enter') {
      x.saveNick()
    }
    if (e.key === 'Escape') {
      x.setNick(null)
    }
  }
}
