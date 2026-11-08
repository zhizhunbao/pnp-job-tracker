'use client'
/**
 * gate 域的结构:一页表单里叠开的选择器框(「专业」「想做的工作」两格的长清单不铺在面板里,点「修改」叠一层;
 * 全站窗口形弹框,手机上全屏)。选的时候即时改表单里的值,「选好了」只是关框。
 *
 * @author Frank
 * @time 2026-11-07 19:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Modal } from '@/components/modal'
import { FORM_PRIMARY_KIND, GATE_MODAL_SIZE } from './constants'
import type { GatePickBoxIn } from './types'
import css from './gate.module.css'

/**
 * 叠开的选择器框。
 *
 * @param props 标题、「选好了」的字、关框回调与选择器本体。
 * @returns 弹框。
 */
export function GatePick({ title, doneText, onDone, children }: GatePickBoxIn) {
  return (
    <Modal onClose={onDone} size={GATE_MODAL_SIZE} draggable edgeResize>
      <div className={cssOf(css.wizard)}>
        <div className={cssOf(css.pickTitle)}>{title}</div>
        <div className={cssOf(css.picker)}>{children}</div>
        <div className={cssOf(css.pickFoot)}>
          <Button kind={FORM_PRIMARY_KIND} onClick={onDone}>{doneText}</Button>
        </div>
      </div>
    </Modal>
  )
}
