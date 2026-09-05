'use client'
/**
 * banner 域的主结构:模块统一页头,两形态一组件(#66,2026-07-19 Frank「按这个做」)——
 * images 传了且没挂 = 实景图版(氛围轮播),否则浅色渐变带兜底。
 * 本组件只做选形:轮播机器在 hooks(useCarousel),两形态各归各文件。
 * 2026-09-05 /fe banner:right 右槽(零消费者)与 tall 加高档(全站统一 130)撤编;同日 Frank 拍板
 * 文字统一「图标 + 页名 + 一句副题」,stats 数字胶囊撤编(数字回各页表格工具栏)。
 * 2026-08-24 自 ui/Banner.tsx 按组件域形制迁入。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { GradientBanner } from './gradientbanner'
import { useCarousel } from './hooks'
import { ImageBanner } from './imagebanner'
import type { BannerIn } from './types'

/**
 * 模块页头(选形壳)。
 *
 * @param props 槽位与图组(见 BannerIn 逐格注释)。
 * @returns 图版或渐变带。
 */
export function Banner({
  module,
  icon,
  title,
  sub,
  images,
}: BannerIn) {
  let imagesIn: readonly string[] | null = null
  if (images != null) {
    imagesIn = images
  }
  const c = useCarousel(imagesIn)
  if (c.imgs == null) {
    return <GradientBanner module={module} icon={icon} title={title} sub={sub} />
  }
  return (
    <ImageBanner module={module}
      icon={icon}
      title={title}
      sub={sub}
      imgs={c.imgs}
      idx={c.idx}
      reach={c.reach}
      onEnter={c.onEnter}
      onLeave={c.onLeave}
      pick={c.pick}
      fail={c.fail} />
  )
}
