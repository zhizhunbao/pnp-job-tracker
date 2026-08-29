/**
 * og 域的桶 —— 分享图(Open Graph)版式的唯一出口(2026-08-29 Frank 拍板立域:
 * 两张卡的画图零件与 35 枚版面常量此前散在 start/jobs 两个业务桶寄人篱下)。
 * 消费者只有路由树里两个框架定名壳(opengraph-image.tsx);ImageResponse 归壳,
 * 本域只出元素树与尺寸 —— 域内零 next/og 依赖。
 *
 * @author Frank
 * @time 2026-08-29 16:30:00
 */
export { OG_JOB_ALT, OG_SITE_ALT, OG_SIZE, OG_TYPE } from './constants'
export { JobOgCard } from './jobogcard'
export { SiteOgCard } from './siteogcard'
