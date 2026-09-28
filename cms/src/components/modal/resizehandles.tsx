'use client'
/**
 * 域内小件:拖拽缩放的八个透明把手(四边 + 四角;光标按方向变;2026-09-04 edgeResize)。
 * 顺序即渲染顺序:四条边在前、四个角在后 —— 角块要盖在边条上,不然角上只能拉一个方向。
 * 2026-09-28 并壳(Frank「别并存啊」):advisor 浮层壳那份八向手柄并进来,全站只剩这一份;
 * 几何取浮层那份(边条让开 14px 给角块、角块 14 × 14 —— 职位描述 / 公司 / 字段三个最常开的弹框一直是这个手感),
 * 原本域的 10 / 12px 随之退役。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { EDGES } from './constants'
import { edgeClsOf } from './functions'
import type { ResizeHandlesIn } from './types'

/**
 * 渲染八个把手。
 *
 * @param props 把手起手工厂。
 * @returns 八个透明块。
 */
export function ResizeHandles({ startOf }: ResizeHandlesIn) {
  const out = []
  for (const edge of EDGES) {
    out.push(<div key={edge} onPointerDown={startOf(edge)} className={edgeClsOf(edge)} />)
  }
  return <>{out}</>
}
