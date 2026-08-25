'use client'
/**
 * banner 域的轮播圆点排小件(右上角):#212 —— 原来钮就是那颗 6×6 的点,手机上
 * 点不中,钮改透明热区、圆点挪进内层 span。只有一张图时整排不渲染。
 * 2026-08-24 自 ImageBanner 拆出(function-length 闸 90 行超限,按闸拆)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { DOT_LABEL } from './constants'
import type { BannerDotsIn } from './types'
import css from './banner.module.css'

/**
 * 圆点排;单图不渲染。
 *
 * @param props 图组/当前序/切图回调。
 * @returns 圆点排,或 null(不渲染)。
 */
export function BannerDots({ imgs, cur, pick }: BannerDotsIn) {
  if (imgs.length < 2) {
    return null
  }
  const dotEls = []
  for (let i = 0; i < imgs.length; i = i + 1) {
    let dotCls = css.dot

    function pickThis() {
      pick(i)
    }

    if (i === cur) {
      dotCls = `${css.dot} ${css.dotOn}`
    }
    dotEls.push(
      <button key={imgs[i]} aria-label={`${DOT_LABEL} ${i + 1}`} onClick={pickThis} className={css.dotBtn}>
        <span className={dotCls} />
      </button>,
    )
  }
  return (
    <span className={css.dots}>
      {dotEls}
    </span>
  )
}
