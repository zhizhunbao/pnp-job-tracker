'use client'
/**
 * 域内小件:题目播放件(一颗圆钮 + 标签;音源是浏览器朗读,批三换盒子 TTS 直链)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { KIND_ICON } from './constants'
import type { PtePlayerIn } from './types'
import css from './pte.module.css'

/**
 * 渲染播放件。
 *
 * @param props 标签、在播、点击与禁用。
 * @returns 播放件。
 */
export function PtePlayer({ label, playing, onClick, disabled }: PtePlayerIn) {
  let mark = <span className={css.markPlay} />
  if (playing) {
    mark = <span className={css.markStop} />
  }
  return (
    <div className={css.player}>
      <Button kind={KIND_ICON} onClick={onClick} disabled={disabled} ariaLabel={label} className={cssOf(css.playBtn)}>
        {mark}
      </Button>
      <span className={css.playerLabel}>{label}</span>
    </div>
  )
}
