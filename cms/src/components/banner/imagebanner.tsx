'use client'
/**
 * banner 域的图版形态(#66 → banner 图版,2026-07-19 Frank「按这个做」批设计总表;
 * 同日批槽位:标题+副题左下、数字胶囊右下、轮播圆点右上):恒 130px(tall 200)定框
 * cover 裁剪,背景 crossfade 氛围轮播 —— 前景信息恒定,区别于 news 头条的内容轮播。
 * 2026-08-24 自 ui/Banner.tsx 拆出(一个 tsx 一个组件;轮播机器在 hooks)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { BannerDots } from './bannerdots'
import { IMG_CREDIT, STATS_MAX } from './constants'
import { moduleClsOf } from './functions'
import type { ImageBannerIn } from './types'
import css from './banner.module.css'

/**
 * 图版页头。
 *
 * @param props 槽位与轮播面板(见 ImageBannerIn 逐格注释)。
 * @returns 图版页头。
 */
export function ImageBanner({
  module,
  icon,
  title,
  sub,
  right,
  stats,
  tall,
  imgs,
  idx,
  onEnter,
  onLeave,
  pick,
  fail,
}: ImageBannerIn) {
  let boxCls = `${css.imgBanner} ${moduleClsOf(module)}`
  if (tall) {
    boxCls = `${boxCls} ${css.tall}`
  }
  const cur = idx % imgs.length

  const imgEls = []
  for (let i = 0; i < imgs.length; i = i + 1) {
    let imgCls = css.img
    if (i === cur) {
      imgCls = `${css.img} ${css.imgOn}`
    }
    imgEls.push(
      // eslint-disable-next-line @next/next/no-img-element -- Wikimedia 外源图不进 next/image 优化管线(域名白名单与尺寸都不可控)
      <img key={imgs[i]} src={imgs[i]} alt="" title={IMG_CREDIT} onError={fail} className={imgCls} />,
    )
  }

  const statEls = []
  if (stats != null) {
    for (let i = 0; i < stats.length && i < STATS_MAX; i = i + 1) {
      const s = stats[i]
      if (s == null) {
        continue
      }
      statEls.push(
        <span key={i} className={css.stat}>
          <b className={css.statV}>{s.v}</b>{s.label}
        </span>,
      )
    }
  }

  return (
    <div className={boxCls} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {imgEls}
      <div className={css.shade} />
      <div className={css.body}>
        <div className={css.bodyLeft}>
          <h1 className={`${css.h1} ${css.hShadow}`}>{icon}{title}</h1>
          {sub != null && <div className={css.imgSub}>{sub}</div>}
        </div>
        <div className={css.statRow}>
          {statEls}
          {right != null && <span className={css.rightPill}>{right}</span>}
        </div>
      </div>
      <BannerDots imgs={imgs} cur={cur} pick={pick} />
    </div>
  )
}
