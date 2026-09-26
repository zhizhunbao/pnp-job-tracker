'use client'
/**
 * banner 域的图版形态(#66 → banner 图版,2026-07-19 Frank「按这个做」批设计总表;
 * 同日批槽位:标题+副题左下、数字胶囊右下、轮播圆点右上):恒 130px(tall 200)定框
 * cover 裁剪,背景 crossfade 氛围轮播 —— 前景信息恒定,区别于 news 头条的内容轮播。
 * 2026-09-05 /fe banner:tall 加高档撤编(全站统一 130);右槽撤编;img 只挂到 reach
 *(首帧只下首图,省手机 100–150KB,LCP 不再等三张)。同日 Frank 拍板文字统一:每页
 * 图标 + 页名 + 一句副题,副题 ≤18 汉字 / 40 英文字符一行放完(不折行不省略);数字胶囊撤编。
 * 2026-08-24 自 ui/Banner.tsx 拆出(一个 tsx 一个组件;轮播机器在 hooks)。
 * 2026-09-26 /fe 首页:外框随 compact 挂窄屏紧凑档类(图、暗化层、圆点在窄屏收起,见 banner.module.css 末段)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { cssOf } from '@/components/css'
import { BannerDots } from './bannerdots'
import { IMG_CREDIT } from './constants'
import { boxClsOf } from './functions'
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
  compact,
  imgs,
  idx,
  reach,
  onEnter,
  onLeave,
  pick,
  fail,
}: ImageBannerIn) {
  const boxCls = boxClsOf({ base: cssOf(css.imgBanner), module, compact })
  const cur = idx % imgs.length

  const imgEls = []
  for (let i = 0; i < imgs.length && i <= reach; i = i + 1) {
    let imgCls = css.img
    if (i === cur) {
      imgCls = `${css.img} ${css.imgOn}`
    }
    imgEls.push(
      // eslint-disable-next-line @next/next/no-img-element -- Wikimedia 外源图不进 next/image 优化管线(域名白名单与尺寸都不可控)
      <img key={imgs[i]} src={imgs[i]} alt="" title={IMG_CREDIT} onError={fail} className={imgCls} />,
    )
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
        {right != null && <div className={css.bodyRight}>{right}</div>}
      </div>
      <BannerDots imgs={imgs} cur={cur} pick={pick} />
    </div>
  )
}
