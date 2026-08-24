/**
 * select 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 10:00:00
 */
import type { ListIn, SelectChangeFn, ShownIn } from './types'

/**
 * 镜像文本该显示什么:有值走显示名,空值走「全部」档文案。
 *
 * @param x 当前值/空值档文案/显示名函数。
 * @returns 镜像文本。
 */
export function shownOf(x: ShownIn): string {
  if (x.value === '') {
    return x.all
  }
  if (x.labelOf != null) {
    return x.labelOf(x.value)
  }
  return x.value
}

/**
 * 实际渲染的选项清单:当前值不在清单里也保留显示(联动下拉里上级一变,
 * 下级当前值可能已不在收窄后的选项里 —— 不保留就会显示成第一项)。
 *
 * @param x 当前值与清单。
 * @returns 渲染清单。
 */
export function listOf(x: ListIn): readonly string[] {
  if (x.value !== '' && x.opts.includes(x.value) === false) {
    return [x.value, ...x.opts]
  }
  return x.opts
}

/**
 * 造一枚下拉的事件拆包手柄(同 input 域 makeChange 的道理:组件收下事件对象,
 * 调用方只拿到选中的值)。
 *
 * @param onChange 收字符串的回调。
 * @returns 挂到 select 上的 onChange 手柄。
 */
export function makeSelectChange(onChange: (v: string) => void): SelectChangeFn {
  function change(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange(e.target.value)
  }
  return change
}
