'use client'
/**
 * J3 五节整理版:[ROLE]/[REQS]/[PAY]/[WORKHOURS]/[APPLY] 标记文本 → 五节。
 * 逐节的档与文案由 functions 的 jdSectionViewsOf 先算好(口径注释都在那儿),这里只铺版。
 * 2026-08-28 换装批自 Jd.tsx 重写落位。
 * 2026-09-14 Frank「职位描述里也应该显示工作地点吧」「应该单独一个分类吧」「放到最后吧」:「工作地点」合成节排最后(街址或市 + 省,带省译名对照)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { jdLocationSectionOf, jdSectionViewsOf } from './functions'
import { JdSection } from './jdsection'
import type { JdFormattedViewIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染五节整理版。
 *
 * @param props 整理版文本、取词函数、译文与三样兜底。
 * @returns 五节。
 */
export function JdFormattedView({
  text, t, fallbackPay, applyUrl, applyEmail, underTitle, trans, location, locationZh,
}: JdFormattedViewIn) {
  const secs = []
  for (const sec of jdSectionViewsOf({ text, t, trans, fallbackPay, applyUrl, applyEmail, underTitle })) {
    secs.push(<JdSection key={sec.m} sec={sec} />)
  }
  const loc = jdLocationSectionOf({ t, location, locationZh, applyUrl, applyEmail })
  if (loc != null) {
    secs.push(<JdSection key={loc.m} sec={loc} />)
  }
  return (
    <div className={cssOf(css.fmt)}>{secs}</div>
  )
}
