'use client'
/**
 * 收件箱第一张卡(2026-10-10 批 3):卡头「收件箱」,下面灰字「投递邮箱」+ 专属地址(收件箱没开通不出这一段),
 * 再是「同时转到 <账户邮箱>」勾选(默认勾上;存不上退回并出一句)。网页端两样并一行,手机各占一行。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { CARD_HEAD_CLS, CARD_MD_CLS, INPUT_CHECKBOX, TEXT_NONE } from './constants'
import type { InboxAddrIn } from './types'
import css from './inbox.module.css'

/**
 * 地址卡。
 *
 * @param props 整机面板与取词函数。
 * @returns 白卡。
 */
export function InboxAddr({ p, t }: InboxAddrIn) {
  if (p.data == null) {
    return null
  }
  return (
    <section className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t('ib.title')}</div>
      <div className={css.addrRow}>
        {p.data.address !== TEXT_NONE && (
          <span className={css.addr}>
            <span className={css.addrK}>{t('ib.addr')}</span>
            <span className={css.addrV}>{p.data.address}</span>
          </span>
        )}
        <label className={css.fwd}>
          <input type={INPUT_CHECKBOX} checked={p.data.forward} onChange={p.onForward} />
          <span>{t('ib.forward', { e: p.data.account })}</span>
        </label>
      </div>
      {p.fwdNote !== TEXT_NONE && <div className={css.fwdNote}>{p.fwdNote}</div>}
    </section>
  )
}
