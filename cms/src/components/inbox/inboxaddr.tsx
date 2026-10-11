'use client'
/**
 * 收件箱第一张卡(2026-10-10 批 3):卡头「收件箱」,下面灰字「投递邮箱」+ 专属地址(收件箱没开通不出这一段),
 * 再是「同时转到 <账户邮箱>」勾选(默认勾上;存不上退回并出一句)。网页端两样并一行,手机各占一行。
 * 2026-10-11 Frank「用户看到投递邮箱,脑袋不会疼吗」:专属地址是系统接线,用户不用知道,撤「投递邮箱 + 地址」那一段,卡里只剩转发勾选。
 * 2026-10-11 批 5「提示统一 + 顶栏铃铛」:存上 / 没存上的那一句改右上角提示,卡下那一行撤。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { CARD_HEAD_CLS, CARD_MD_CLS, INPUT_CHECKBOX } from './constants'
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
        <label className={css.fwd}>
          <input type={INPUT_CHECKBOX} checked={p.data.forward} onChange={p.onForward} />
          <span>{t('ib.forward', { e: p.data.account })}</span>
        </label>
      </div>
    </section>
  )
}
