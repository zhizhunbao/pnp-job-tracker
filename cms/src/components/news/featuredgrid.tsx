'use client'
/**
 * 域内小件:头条区 1 大 + 4 小(v4 BBC/Reuters 式布局保留;v5 大卡恢复轮播 ——
 * Frank 2026-07-18「这部分应该加个轮播的功能」,推翻 v4「轮播退役」:5s 自动 + 圆点 +
 * 箭头,hover 暂停,右列恒显其余 4 条)。高度固定(Frank「banner 的高度应该是固定的」):
 * 图区恒 300px,标题/摘要行数截断,不随内容抖。
 * 2026-08-27 换装批自 News.tsx 提出成文件,轮播状态收进 hooks 的 useCarousel。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { sideSlidesOf, slideAtOf } from './functions'
import { HeroBig } from './herobig'
import { HeroControls } from './herocontrols'
import { HeroSideList } from './herosidelist'
import { useCarousel } from './hooks'
import type { FeaturedGridIn } from './types'
import css from './news.module.css'

/**
 * 渲染头条区。
 *
 * @param props 取词函数、界面语言与头条条目。
 * @returns 头条区;一条都没有时给 null。
 */
export function FeaturedGrid({ t, lang, slides }: FeaturedGridIn) {
  const car = useCarousel({ total: slides.length })
  const hero = slideAtOf({ slides, idx: car.cur })
  if (hero == null) {
    return null
  }
  return (
    <div className={css.top}>
      <div className={css.bigWrap} onMouseEnter={car.onEnter} onMouseLeave={car.onLeave}>
        <HeroBig t={t} lang={lang} hero={hero} />
        <HeroControls slides={slides} cur={car.cur} onPrev={car.onPrev} onNext={car.onNext} pickOf={car.pickOf} />
      </div>
      <HeroSideList t={t} lang={lang} items={sideSlidesOf({ slides, idx: car.cur })} />
    </div>
  )
}
