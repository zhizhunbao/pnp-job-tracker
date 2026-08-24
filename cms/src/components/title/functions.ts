/**
 * title 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import css from './title.module.css'

/**
 * eyebrow 的类名预算(默认靛蓝,深档叠 .eyebrowDeep)。
 *
 * @param deep 是否深靛蓝档。
 * @returns 拼好的 className。
 */
export function eyebrowClsOf(deep: boolean): string {
  if (deep) {
    return `${css.eyebrow} ${css.eyebrowDeep}`
  }
  return css.eyebrow
}
