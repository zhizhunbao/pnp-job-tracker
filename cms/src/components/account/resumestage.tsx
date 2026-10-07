'use client'
/**
 * 预览弹框的舞台(灰底框,里面叠占位纸与放页容器;2026-10-06 加缩放:拖动 / 捏合的指针事件挂在这里,
 * 滚轮由 hooks 原生挂;挂载回调逐格收,理由同 resumeinput.tsx)。
 * 同日 Frank「可以拖动内部的 pdf 而不是 弹框」:舞台标 data-nodrag(modal 桶的拖动忽略名单认它),在舞台上按住只拖 PDF。
 *
 * @author Frank
 * @time 2026-10-06 19:30:00
 */
import { stageClsOf } from './functions'
import type { ResumeStageIn } from './types'

/**
 * 渲染舞台。
 *
 * @param props 挂载回调、放大了吗、指针与双击手柄、里面的东西。
 * @returns 舞台。
 */
export function ResumeStage({
  onMount, zoomed, onPointerDown, onPointerMove, onPointerUp, onDoubleClick, children,
}: ResumeStageIn) {
  return (
    <div ref={onMount}
      className={stageClsOf(zoomed)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      data-nodrag>
      {children}
    </div>
  )
}
