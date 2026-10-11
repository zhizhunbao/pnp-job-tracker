'use client'
/**
 * 「按职位改写」三栏对照框(2026-10-10 投递框三步,Frank「按职位改写 应该是显示老的 jd 新的 三屏 同时显示」;
 * docs/design/我的求职-三段-20261009.md 1.9 / 2.9):叠在投递框上的窗口形弹框(通用 modal 桶,手机全屏),
 * 三栏 原来的 / 职位要求 / 改写后(手机竖排),底部「再写一次」「用这一版」。只有 Pro 开得出来(免费号点改写弹升级框)。
 * 设计稿的多色高亮(一条要求一种颜色,三栏对应说法同色)这一版先不做。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */
import { Button } from '@/components/button'
import { Loading } from '@/components/loading'
import { Modal, ModalHead } from '@/components/modal'
import {
  APPLY_MODAL_H, APPLY_MODAL_PREF, BTN_GHOST, ERR_NONE, KICKER_KEY, RW_MODAL_W, TEXT_NONE, WRITING_KEY,
} from './constants'
import type { ApplyStepIn } from './types'
import css from './apply.module.css'

/**
 * 三栏对照框。
 *
 * @param props 整机面板(对照框开着时才挂)。
 * @returns 窗口形弹框;没开给空。
 */
export function ApplyRewrite({ p }: ApplyStepIn) {
  if (p.rw == null) {
    return null
  }
  const head = <ModalHead kicker={p.t(KICKER_KEY)} title={p.t('ap.rwTitle')} sub={TEXT_NONE} ctl={null} />
  return (
    <Modal onClose={p.onRwClose} win={{ head, memo: APPLY_MODAL_PREF, w: RW_MODAL_W, h: APPLY_MODAL_H, jd: false }}>
      {p.rw.busy && <Loading text={p.t(WRITING_KEY)} />}
      {p.rw.err !== ERR_NONE && <div className={css.bad}>{p.t(p.rw.err)}</div>}
      {p.rw.busy === false && p.rw.err === ERR_NONE && (
        <div className={css.rwCols}>
          <div>
            <div className={css.rwLabel}>{p.t('ap.rwBefore')}</div>
            <div className={css.paperText}>{p.rw.before}</div>
          </div>
          <div>
            <div className={css.rwLabel}>{p.t('ap.rwJd')}</div>
            <div className={css.paperText}>{p.rw.jd}</div>
          </div>
          <div>
            <div className={css.rwLabel}>{p.t('ap.rwAfter')}</div>
            <div className={css.paperText}>{p.rw.after}</div>
          </div>
        </div>
      )}
      <div className={css.foot}>
        <Button kind={BTN_GHOST} onClick={p.onRwAgain} disabled={p.rw.busy}>{p.t('ap.rwAgain')}</Button>
        <Button onClick={p.onRwUse} disabled={p.rw.busy || p.rw.after === TEXT_NONE}>{p.t('ap.rwUse')}</Button>
      </div>
    </Modal>
  )
}
