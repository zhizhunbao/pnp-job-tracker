/**
 * I 批遗留收口(#114):站级 og 分享图 1200×630(无页面级 og 时的全站兜底;职位页有
 * 自己的动态版)。2026-08-29 Frank 拍板立 og 域:版式与全部尺寸常量迁
 * components/og(SiteOgCard),本壳只剩框架定名导出 + 一行裹卡 —— 文件名与
 * size/contentType/alt/default 四个导出名都是 Next 元数据图约定,必须留在此处。
 *
 * @author Frank
 * @time 2026-07-20 14:25:54
 */
import { ImageResponse } from 'next/og'
import { OG_SITE_ALT, OG_SIZE, OG_TYPE, SiteOgCard } from '@/components/og'

export const size = OG_SIZE
export const contentType = OG_TYPE
export const alt = OG_SITE_ALT

/**
 * 站点分享图的壳:裹卡出图,没有别的。
 *
 * @returns 分享卡片图。
 */
export default async function Image() {
  return new ImageResponse(<SiteOgCard />, size)
}
