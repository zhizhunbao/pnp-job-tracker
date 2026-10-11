'use client'
/**
 * 顶栏通知铃铛(2026-10-11 批 5「提示统一 + 顶栏铃铛」,照 Azure 门户的 Notifications):只在登录后出(顶栏判);
 * 铃铛右上角红色数字 = 上次打开以后的新通知;点开一张挂在钮下的面板(同账户头像下拉的形:钮下右对齐、点外面 / Esc 关)。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { useRef } from 'react'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconBell } from '@/components/icons'
import { BADGE_NONE, PLAIN_BTN_KIND } from './constants'
import { badgeOf } from './functions'
import { useBell } from './hooks'
import { BellPop } from './bellpop'
import type { BellIn } from './types'
import css from './notify.module.css'

/**
 * 铃铛钮 + 面板。
 *
 * @param props 取词函数。
 * @returns 铃铛。
 */
export function Bell({ t }: BellIn) {
  const ref = useRef<HTMLSpanElement>(null)
  const b = useBell({ ref })
  let badge = BADGE_NONE
  if (b.data != null) {
    badge = badgeOf(b.data.unseen)
  }
  return (
    <span ref={ref} className={cssOf(css.wrap)}>
      <Button kind={PLAIN_BTN_KIND} onClick={b.toggle} ariaLabel={t('nt.title')} title={t('nt.title')}
        expanded={b.open} className={cssOf(css.bell)}>
        <IconBell />
        {badge !== BADGE_NONE && <span className={cssOf(css.badge)}>{badge}</span>}
      </Button>
      {b.open && <BellPop t={t} data={b.data} failed={b.failed} onClose={b.close} />}
    </span>
  )
}
