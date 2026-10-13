'use client'
/**
 * 删除确认框(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」):全站「删除」先弹它,点「删除」才真删、点「取消」或 × 关掉什么都不做。
 * 窗口形(标题栏、可拖、记住位置;手机全屏),同全站弹框;文案全由调用方传(本桶不放裸串)。
 *
 * @author Frank
 * @time 2026-10-12 20:00:00
 */
import { Button } from '@/components/button'
import { CONFIRM_CANCEL_KIND, CONFIRM_H, CONFIRM_OK_KIND, CONFIRM_PREF, CONFIRM_W } from './constants'
import { Modal } from './modal'
import type { ConfirmIn } from './types'
import css from './modal.module.css'

/**
 * 渲染删除确认框。
 *
 * @param props 标题、正文、两颗钮的字与两个手柄。
 * @returns 弹框。
 */
export function ConfirmModal({ title, body, okText, cancelText, onOk, onCancel }: ConfirmIn) {
  return (
    <Modal onClose={onCancel} win={{ head: title, memo: CONFIRM_PREF, w: CONFIRM_W, h: CONFIRM_H, jd: false }}>
      <div className={css.confirmBody}>{body}</div>
      <div className={css.confirmActs}>
        <Button kind={CONFIRM_CANCEL_KIND} onClick={onCancel}>{cancelText}</Button>
        <Button kind={CONFIRM_OK_KIND} onClick={onOk}>{okText}</Button>
      </div>
    </Modal>
  )
}
