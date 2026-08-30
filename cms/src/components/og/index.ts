/**
 * og 域的桶 —— 分享图(Open Graph)版式的唯一出口(2026-08-29 Frank 拍板立域:
 * 两张卡的画图零件与 35 枚版面常量此前散在 start/jobs 两个业务桶寄人篱下)。
 * 2026-08-30 归目录批:约定件退役,消费者只剩 app/og/[file]/route.ts 一个壳;
 * HTTP 芯 ogFileResponse 住本桶(首例,理由见其文件头)但从 ./server 门出 ——
 * 本桶照 lib 两门制:index 只放浏览器安全的卡与常量,沾库的芯走 server 门(2026-08-30 补)。
 *
 * @author Frank
 * @time 2026-08-29 16:30:00
 */
export { OG_H, OG_JOB_ALT, OG_SITE_ALT, OG_W } from './constants'
export { JobOgCard } from './jobogcard'
export { SiteOgCard } from './siteogcard'
