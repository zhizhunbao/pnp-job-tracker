/**
 * input 域的纯函数。
 *
 * @author Frank
 * @time 2026-08-24 15:00:00
 */
import { CLS_SEP } from './constants'
import type { ChangeFn, InputClsIn, InputSize } from './types'
import css from './input.module.css'

/**
 * 文本框的类名预算:基座 + 尺寸档 + 搜索留位 + 调用方追加类。
 *
 * @param x 尺寸档/搜索形态/追加类。
 * @returns 拼好的 className。
 */
export function inputClsOf(x: InputClsIn): string {
  const bySize: Record<InputSize, string> = {
    sm: css.inputSm,
    md: css.inputMd,
    lg: css.inputLg,
  }
  const out = [css.input, bySize[x.size]]
  if (x.search) {
    out.push(css.inputSearch)
  }
  if (x.extra != null) {
    out.push(x.extra)
  }
  return out.join(CLS_SEP)
}

/**
 * 造一枚事件拆包手柄:原生 `<input>` 的 onChange 交回整个事件对象,而调用方只想要
 * 那个字符串 —— 这层转换收在组件域里一次,页面就不必七处各写一遍
 * `(e) => setX(e.target.value)`,也不必碰 e.target(工厂形态同 tabs 的 makeTabKeys)。
 *
 * @param onChange 收字符串的回调。
 * @returns 挂到 input 上的 onChange 手柄。
 */
export function makeChange(onChange: (v: string) => void): ChangeFn {
  function change(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
  }
  return change
}
