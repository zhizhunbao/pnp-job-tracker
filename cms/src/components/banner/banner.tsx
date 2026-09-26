'use client'
/**
 * banner 域的主结构:模块统一页头,两形态一组件(#66,2026-07-19 Frank「按这个做」)——
 * images 传了且没挂 = 实景图版(氛围轮播),否则浅色渐变带兜底。
 * 本组件只做选形:轮播机器在 hooks(useCarousel),两形态各归各文件。
 * 2026-09-05 /fe banner:right 右槽(零消费者)与 tall 加高档(全站统一 130)撤编;同日 Frank 拍板
 * 文字统一「图标 + 页名 + 一句副题」,stats 数字胶囊撤编(数字回各页表格工具栏)。
 * 2026-08-24 自 ui/Banner.tsx 按组件域形制迁入。
 * 2026-09-26 /fe 首页 Frank 看效果图点头(手机首屏把第一张职位卡提进上半屏):加窄屏紧凑档 compact ——
 * 窄屏收成「页名 + 副题 …… 右槽」一行,不出图;宽屏照旧。职位板先用,别的板要用传同一格。
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
  right = null,
  compact = false,
}: BannerIn) {
  let imagesIn: readonly string[] | null = null
  if (images != null) {
    imagesIn = images
  }
  const c = useCarousel(imagesIn)
  if (c.imgs == null) {
    return <GradientBanner module={module} icon={icon} title={title} sub={sub} right={right} compact={compact} />
  }
  return (
    <ImageBanner module={module}
      icon={icon}
      title={title}
      sub={sub}
      right={right}
      compact={compact}
      imgs={c.imgs}
      idx={c.idx}
      reach={c.reach}
      onEnter={c.onEnter}
      onLeave={c.onLeave}
      pick={c.pick}
      fail={c.fail} />
  )
}
