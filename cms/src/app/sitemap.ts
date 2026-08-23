/**
 * /sitemap.xml(核心页平铺表)— 壳。芯在 lib/seo/functions.ts(coreSitemapOf;
 * 2026-08-23 seo 立域批)。文件名是 Next Metadata 框架定的,不能改名;
 * 构建期静态烘焙,芯走 index 门(零库依赖)。职位/公司页在分片 sitemap 里。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */

export { coreSitemapOf as default } from '@/lib/seo'
