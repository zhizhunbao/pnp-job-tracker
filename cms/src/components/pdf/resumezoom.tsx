'use client'
/**
 * 预览弹框翻页条旁的「− 百分比 +」(2026-10-06 Frank「这个可以鼠标滚动放大缩小吧」:滚轮之外给触控板、
 * 不知道能滚的人一个看得见的入口;点百分比回整页)。2026-11-07 自 account 桶在新域重写。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconMinus, IconPlus } from '@/components/icons'
import { ZOOM_KIND } from './constants'
import type { ResumeZoomIn } from './types'
import css from './pdf.module.css'

/**
 * 渲染缩放钮组。
 *
 * @param props 百分比、能否放大 / 缩小、三个手柄与取词函数。
 * @returns 钮组。
 */
export function ResumeZoom({ pct, canIn, canOut, onIn, onOut, onReset, t }: ResumeZoomIn) {
  return (
    <span className={cssOf(css.zoom)}>
      <Button kind={ZOOM_KIND} className={cssOf(css.zoomBtn)} ariaLabel={t('rf.zoomOut')} disabled={canOut === false}
        onClick={onOut}>
        <IconMinus />
      </Button>
      <Button kind={ZOOM_KIND} className={cssOf(css.zoomPct)} ariaLabel={t('rf.zoomReset')} onClick={onReset}>
        {pct}
      </Button>
      <Button kind={ZOOM_KIND} className={cssOf(css.zoomBtn)} ariaLabel={t('rf.zoomIn')} disabled={canIn === false}
        onClick={onIn}>
        <IconPlus />
      </Button>
    </span>
  )
}
