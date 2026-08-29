'use client'
/**
 * 域内小件:头条大图。P1f(Frank「最好背景图能用真实的图片」)—— 省份地标实景照
 * (本站静态 /img/regions/,Wikimedia Commons 来源见 SOURCES.md,不外链不用 og 文字图)
 * + 底部渐变压字;缺图/加载失败退省色字标。
 * 图区定高 300(2026-07-19 Frank「图片不一样大小到现在都没解决」):此前 flex:1 弹性吃
 * 高度差,每张 slide 文字行数不同 → 图片忽大忽小;高度差改由下方文字区吸收,图恒定。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { IMG_CREDIT } from './constants'
import { heroClsOf, heroCodeOf, regionImgOf, regionPlaceOf } from './functions'
import { useDeadImage } from './hooks'
import type { HeroImageIn } from './types'
import css from './news.module.css'

/**
 * 渲染头条大图。
 *
 * @param props 地区码。
 * @returns 地标实景图 + 压字层 + 地名角标;图挂了给省色字标。
 */
export function HeroImage({ region }: HeroImageIn) {
  const img = useDeadImage()
  if (img.dead) {
    return (
      <div className={heroClsOf({ region, dead: true })}>
        <span className={css.heroCode}>{heroCodeOf({ region })}</span>
      </div>
    )
  }
  return (
    <div className={heroClsOf({ region, dead: false })}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 本站静态地标图:不需要 next/image 的优化,且要原生 onError 走缺图兜底 */}
      <img className={css.heroImg} src={regionImgOf({ region })} alt="" title={IMG_CREDIT} onError={img.onError} />
      <div className={css.heroScrim} />
      <span className={css.heroTag}>{regionPlaceOf({ region })}</span>
    </div>
  )
}
