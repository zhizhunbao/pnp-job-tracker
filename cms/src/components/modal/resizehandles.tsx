'use client'
/**
 * 域内小件:拖拽缩放的八个透明把手(四边 + 四角;光标按方向变;2026-09-04 edgeResize)。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { EDGE_E, EDGE_N, EDGE_NE, EDGE_NW, EDGE_S, EDGE_SE, EDGE_SW, EDGE_W } from './constants'
import type { ResizeHandlesIn } from './types'
import css from './modal.module.css'

/**
 * 渲染八个把手。
 *
 * @param props 把手起手工厂。
 * @returns 八个透明块。
 */
export function ResizeHandles({ startOf }: ResizeHandlesIn) {
  return (
    <>
      <div className={css.hN} onPointerDown={startOf(EDGE_N)} />
      <div className={css.hS} onPointerDown={startOf(EDGE_S)} />
      <div className={css.hE} onPointerDown={startOf(EDGE_E)} />
      <div className={css.hW} onPointerDown={startOf(EDGE_W)} />
      <div className={css.hNE} onPointerDown={startOf(EDGE_NE)} />
      <div className={css.hNW} onPointerDown={startOf(EDGE_NW)} />
      <div className={css.hSE} onPointerDown={startOf(EDGE_SE)} />
      <div className={css.hSW} onPointerDown={startOf(EDGE_SW)} />
    </>
  )
}
