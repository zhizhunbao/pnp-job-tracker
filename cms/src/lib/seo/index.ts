/**
 * seo 域的构建期安全门:robots 与核心 sitemap 的纯拼装(零库依赖 ——
 * 这两个框架文件构建期静态烘焙,构建容器连不上正式库,进这门的必须查不了库)。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
export { coreSitemapOf, robotsOf } from './functions'
export type { Robots, Sitemap } from './types'
