/**
 * input 域的纯函数。
 *
 * @author Frank
 * @time 2026-08-24 15:00:00
 */
import type { InputClsIn, InputSize } from './types'
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
  return out.join(' ')
}
