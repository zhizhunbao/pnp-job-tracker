'use client'
/**
 * 「我的求职」删除确认框(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」;
 * 11-07 新桶重写时随删除一起撤,同日「先做 5 条必备」接回,照 10-12 旧桶 myjobs/askdelmodal.tsx):
 * 三张清单共用,框是 modal 桶 ConfirmModal,本件只递字。
 *
 * @author Frank
 * @time 2026-11-07 23:40:00
 */
import { ConfirmModal } from '@/components/modal'
import type { AskDelModalIn } from './types'

/**
 * 渲染删除确认框(没有等着确认的不渲)。
 *
 * @param props 取词函数与删除确认框整机。
 * @returns 弹框。
 */
export function AskDelModal({ t, a }: AskDelModalIn) {
  if (a.ask == null) {
    return null
  }
  return (
    <ConfirmModal title={t('mj.delAsk')} body={a.ask.name} okText={t('mj.del')} cancelText={t('mj.cancel')}
      onOk={a.onOk} onCancel={a.onCancel} />
  )
}
