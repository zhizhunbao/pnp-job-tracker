'use client'
/**
 * 铃铛面板(2026-10-11 批 5):卡头「通知」,下面新的在前一条一行 + 时刻;没有通知、拉失败各一句。
 * 开着才挂,开着才排进 Esc 队(不跟账户下拉、弹框抢 Esc)。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { cssOf } from '@/components/css'
import { useEscClose } from '@/components/modal'
import { ROLE_DIALOG } from './constants'
import { BellRow } from './bellrow'
import type { BellPopIn } from './types'
import css from './notify.module.css'

/**
 * 面板。
 *
 * @param props 取词函数、清单、拉失败了没有与关面板。
 * @returns 挂在钮下的面板。
 */
export function BellPop({ t, data, failed, onClose }: BellPopIn) {
  useEscClose(onClose)
  const rows = []
  if (data != null) {
    for (const it of data.items) {
      rows.push(<BellRow key={it.kind + it.id} t={t} item={it} />)
    }
  }
  return (
    <div role={ROLE_DIALOG} aria-label={t('nt.title')} className={cssOf(css.pop)}>
      <div className={cssOf(css.head)}>{t('nt.title')}</div>
      {failed && <div className={cssOf(css.note)}>{t('nt.fail')}</div>}
      {failed === false && data != null && rows.length === 0 && <div className={cssOf(css.note)}>{t('nt.empty')}</div>}
      {rows.length > 0 && <div className={cssOf(css.list)}>{rows}</div>}
    </div>
  )
}
