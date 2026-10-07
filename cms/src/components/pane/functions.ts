/**
 * pane 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-10-05 13:36:47
 */
import { cssOf } from '@/components/css'
import type { PaneClsIn } from './types'
import css from './pane.module.css'

/**
 * 定高区的类名:基座(定高、贴边、上下细线)+ 装一列行时叠区内滚 + 上面有已选一行时叠让高。
 *
 * @param x 装不装一列行、上面有没有一行已选标签。
 * @returns 拼好的 className。
 */
export function paneClsOf(x: PaneClsIn): string {
  let cls = cssOf(css.pane)
  if (x.list) {
    cls = `${cls} ${cssOf(css.list)}`
  }
  if (x.belowTags) {
    cls = `${cls} ${cssOf(css.belowTags)}`
  }
  return cls
}

/**
 * 选择器竖排的类名:基座(竖排、块间距、吃满多出来的高、许比内容矮)+ 调用方的左栏宽类(2026-10-05 立)。
 *
 * @param railCls 调用方叠上的左栏宽类(见 PaneStackIn 的同名格)。
 * @returns 拼好的 className。
 */
export function stackClsOf(railCls: string): string {
  return `${cssOf(css.stack)} ${railCls}`
}
