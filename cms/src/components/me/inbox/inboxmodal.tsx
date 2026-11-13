'use client'
/**
 * me 桶子桶 inbox 的结构:窄屏点一封信弹的框(全站窗口形弹框,手机上全屏;里面是同一个阅读区)。
 * 2026-11-13 Frank「先修收件箱问题」:弹框标题从主题换成发件人 —— 标题栏固定一行,长主题会被截断;完整主题由阅读区的大字主题出。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { Modal, ModalHead } from '@/components/modal'
import { IB_MODAL_H, IB_MODAL_PREF, IB_MODAL_W, TEXT_NONE } from './constants'
import { InboxRead } from './inboxread'
import { senderOf } from './functions'
import type { InboxReadIn } from './types'

/**
 * 窄屏读信弹框。
 *
 * @param props 收件箱状态、那一封与取词。
 * @returns 弹框。
 */
export function InboxModal({ p, m, t }: InboxReadIn) {
  const head = <ModalHead kicker={t('ib.title')} title={senderOf(m)} sub={TEXT_NONE} ctl={null} />
  return (
    <Modal onClose={p.onUnpick} win={{ head, memo: IB_MODAL_PREF, w: IB_MODAL_W, h: IB_MODAL_H, jd: false }}>
      <InboxRead p={p} m={m} t={t} />
    </Modal>
  )
}
