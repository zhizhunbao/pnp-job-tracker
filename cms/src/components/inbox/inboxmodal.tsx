'use client'
/**
 * 手机阅读框(2026-10-10 批 3;Frank「点击默认弹框」「弹框一律窗口形」):通用 modal 桶的窗口形 —— 标题栏灰色小标「收件箱」+ 信的标题,
 * 手机全屏;正文是阅读区(不再重复标题)。关框取消选中。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { Modal, ModalHead } from '@/components/modal'
import { MODAL_H, MODAL_PREF, MODAL_W, TEXT_NONE } from './constants'
import { subjectOf } from './functions'
import { InboxRead } from './inboxread'
import type { InboxModalIn } from './types'

/**
 * 手机阅读框。
 *
 * @param props 整机面板、那一封与取词函数。
 * @returns 窗口形弹框。
 */
export function InboxModal({ p, m, t }: InboxModalIn) {
  const head = <ModalHead kicker={t('ib.title')} title={subjectOf({ m, t })} sub={TEXT_NONE} ctl={null} />
  return (
    <Modal onClose={p.onUnpick} win={{ head, memo: MODAL_PREF, w: MODAL_W, h: MODAL_H, jd: false }}>
      <InboxRead p={p} m={m} t={t} withTitle={false} />
    </Modal>
  )
}
