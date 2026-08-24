/**
 * input 组件域的桶 —— 通用文本框 + **全站输入件共用的尺寸档**
 * (2026-08-24 由 field 域拆出:Frank「field 从字面上看不懂」「拆成三个」;
 * select / search 是输入件的特化,从本域取基座类与 InputSize)。
 * 对应 lib 域:无(通用件)。
 *
 * @author Frank
 * @time 2026-08-24 15:00:00
 */
export { SIZE_DEFAULT } from './constants'
export { Input } from './input'
export { inputClsOf } from './functions'
export type { InputClsIn, InputIn, InputSize } from './types'
