/**
 * shell 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { ShellBottom, ShellClsIn, ShellTop } from './types'
import css from './shell.module.css'

/**
 * 正文轨的类名预算:基座 + 上/下内衬偏差档(null = 默认 上 4px/下 32px,不叠修饰类)。
 * 档位 → 类是查表不是比较:数字档只在表里出现一次,键的合法性由 ShellTop/ShellBottom
 * 联合类型管着(加一档 = types 加一格 + css 加一类 + 这里加一行,漏哪个都是 tsc 红)。
 *
 * @param x 上/下内衬档。
 * @returns 拼好的 className。
 */
export function shellClsOf(x: ShellClsIn): string {
  const topCls: Record<ShellTop, string> = {
    0: css.top0,
    14: css.top14,
    16: css.top16,
    18: css.top18,
    32: css.top32,
    40: css.top40,
  }
  const bottomCls: Record<ShellBottom, string> = {
    0: css.bottom0,
    40: css.bottom40,
  }
  const cls = [css.shell]
  if (x.top != null) {
    cls.push(topCls[x.top])
  }
  if (x.bottom != null) {
    cls.push(bottomCls[x.bottom])
  }
  return cls.join(' ')
}
