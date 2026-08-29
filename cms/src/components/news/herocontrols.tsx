'use client'
/**
 * 域内小件:头条轮播的箭头与圆点。只有一条头条时整层不渲(没有「下一条」)。
 * #212(第 26 轮体检续):圆点原来钮就是那颗 8×8 的点 —— 钮改透明热区
 * (手机 40×40),视觉点挪进内层 span。
 * 2026-08-27 换装批自 News.tsx 的 FeaturedGrid 拆出成文件,同批从大卡链接**里面**
 * 挪到它**旁边**(理由写在 news.module.css 的 .bigWrap 上:钮经 button 族之后
 * onClick 收不到事件,拦不住整卡跳转)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Button } from '@/components/button'
import { ARIA_NEXT, ARIA_PREV, ARROW_NEXT, ARROW_PREV, PLAIN_BTN_KIND, SLIDE_MIN } from './constants'
import { arrowClsOf, dotInClsOf, slideAriaOf } from './functions'
import type { HeroControlsIn } from './types'
import css from './news.module.css'

/**
 * 渲染轮播控件层。
 *
 * @param props 全部头条、当前张与三只手柄。
 * @returns 箭头 + 圆点排;只有一条时给 null。
 */
export function HeroControls({ slides, cur, onPrev, onNext, pickOf }: HeroControlsIn) {
  if (slides.length < SLIDE_MIN) {
    return null
  }
  const dots = []
  for (let i = 0; i < slides.length; i += 1) {
    const s = slides[i]
    if (s != null) {
      dots.push(
        <Button key={s.slug}
          kind={PLAIN_BTN_KIND}
          className={css.dot}
          ariaLabel={slideAriaOf({ i })}
          onClick={pickOf(i)}>
          <span className={dotInClsOf({ on: i === cur })} />
        </Button>,
      )
    }
  }
  return (
    <div className={css.bigCtl}>
      <Button kind={PLAIN_BTN_KIND} className={arrowClsOf({ next: false })} ariaLabel={ARIA_PREV} onClick={onPrev}>
        {ARROW_PREV}
      </Button>
      <Button kind={PLAIN_BTN_KIND} className={arrowClsOf({ next: true })} ariaLabel={ARIA_NEXT} onClick={onNext}>
        {ARROW_NEXT}
      </Button>
      <span className={css.dots}>{dots}</span>
    </div>
  )
}
