'use client'
/**
 * 「我的简历」删除确认框(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」):照 myjobs 桶 AskDelModal 的形,
 * 框是 modal 桶 ConfirmModal,本件只递字;点「删除」才真删原件。
 *
 * @author Frank
 * @time 2026-10-12 21:00:00
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
    <ConfirmModal title={t('rf.delAsk')} body={a.ask.name} okText={t('rf.delete')} cancelText={t('rf.cancel')}
      onOk={a.onOk} onCancel={a.onCancel} />
  )
}
