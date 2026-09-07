'use client'
/**
 * 职位板横幅副标题的三条事实:总数 / 命中省提名清单岗 / 有外劳雇佣记录的雇主,同一行间距分开(Frank 2026-09-07「改成一行」)
 * (Frank 2026-09-07「把『全加拿大职位每日更新』那几个字替换掉 … 换成这个」:三条自筛选行搬回横幅,
 * 2026-09-05「三条出横幅进筛选行」的旧拍板由此推翻;筛选行不再重复出)。
 *
 * @author Frank
 * @time 2026-09-07 00:30:00
 */
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { BannerFactsIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染横幅三条事实。
 *
 * @param props 三条文案(空串的不出)。
 * @returns 一行三条。
 */
export function BannerFacts({ count, named, lmia }: BannerFactsIn) {
  return (
    <>
      <span className={cssOf(css.factLine)}>{count}</span>
      {named !== TEXT_NONE && <span className={cssOf(css.factLine)}>{named}</span>}
      {lmia !== TEXT_NONE && <span className={cssOf(css.factLine)}>{lmia}</span>}
    </>
  )
}
