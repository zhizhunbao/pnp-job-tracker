/**
 * og 域的桶 —— 分享图(Open Graph)版式的唯一出口(2026-08-29 Frank 拍板立域:
 * 两张卡的画图零件与 35 枚版面常量此前散在 start/jobs 两个业务桶寄人篱下)。
 * 2026-08-30 归目录批:约定件退役,消费者只剩 app/og/[file]/route.ts 一个壳;
 * HTTP 芯 ogFileResponse 住本桶(首例,理由见其文件头),ImageResponse 随芯进桶 ——
 * ⚠️ 本桶从此**只许路由壳消费**(芯的取数链沾 payload,client import 即 build 炸)。
 *
 * @author Frank
 * @time 2026-08-29 16:30:00
 */
export { OG_H, OG_JOB_ALT, OG_SITE_ALT, OG_W } from './constants'
export { JobOgCard } from './jobogcard'
export { SiteOgCard } from './siteogcard'
export { ogFileResponse } from './ogresponse'
