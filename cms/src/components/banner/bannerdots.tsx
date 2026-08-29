'use client'
/**
 * banner 域的轮播圆点排小件(右上角):#212 —— 原来钮就是那颗 6×6 的点,手机上
 * 点不中,钮改透明热区、圆点挪进内层 span。只有一张图时整排不渲染。
 * 2026-08-24 自 ImageBanner 拆出(function-length 闸 90 行超限,按闸拆)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { Button } from '@/components/button'
import { DOT_IMGS_MIN, DOT_LABEL, PLAIN_BTN_KIND } from './constants'
import { makeDotPick } from './functions'
import type { BannerDotsIn } from './types'
import css from './banner.module.css'

/**
 * 圆点排;单图不渲染。
 *
 * @param props 图组/当前序/切图回调。
 * @returns 圆点排,或 null(不渲染)。
 */
export function BannerDots({ imgs, cur, pick }: BannerDotsIn) {
  if (imgs.length < DOT_IMGS_MIN) {
    return null
  }
  const dotEls = []
  for (let i = 0; i < imgs.length; i = i + 1) {
    let dotCls = css.dot
    const pickThis = makeDotPick({ pick, i })
    if (i === cur) {
      dotCls = `${css.dot} ${css.dotOn}`
    }
    dotEls.push(
      <Button key={imgs[i]}
        kind={PLAIN_BTN_KIND}
        ariaLabel={`${DOT_LABEL} ${i + 1}`}
        onClick={pickThis}
        className={css.dotBtn}>
        <span className={dotCls} />
      </Button>,
    )
  }
  return (
    <span className={css.dots}>
      {dotEls}
    </span>
  )
}
