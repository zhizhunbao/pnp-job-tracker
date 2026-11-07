'use client'
/**
 * me 桶子桶 profile 的结构:「我的通道」点一行的弹框(2026-10-13;全站弹框一律窗口形):标题栏写通道官方英文名 + 界面语名、小标写省份,
 * 正文是 pnp 桶 PnpStreamDetail(门槛卡 + 申请步骤卡)。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { Modal, ModalHead } from '@/components/modal'
import { PnpStreamDetail } from '@/components/pnp'
import { MS_MODAL_H, MS_MODAL_PREF, MS_MODAL_W } from './constants'
import type { MyStreamModalIn } from './types'

/**
 * 渲染通道弹框。
 *
 * @param props 界面语、省码、通道编号、标题三格与关框。
 * @returns 窗口形弹框。
 */
export function MyStreamModal({ lang, province, streamKey, title, sub, kicker, onClose }: MyStreamModalIn) {
  const head = <ModalHead kicker={kicker} title={title} sub={sub} ctl={null} />
  return (
    <Modal onClose={onClose} win={{ head, memo: MS_MODAL_PREF, w: MS_MODAL_W, h: MS_MODAL_H, jd: false }}>
      <PnpStreamDetail lang={lang} province={province} streamKey={streamKey} />
    </Modal>
  )
}
