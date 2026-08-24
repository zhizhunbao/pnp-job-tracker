/**
 * banner 域的死值。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 模块 → banner 图组(1280×300 已裁,出处记 cms/public/img/banners/SOURCES.md;
 * Commons 实景,致谢挂 img title,画面无水印)。调用点传 BANNER_IMGS.jobs 即开图版。
 */
export const BANNER_IMGS = {
  /**
   * home(L1-01 landing 首屏):复用既有已裁图起步(Pier 21 移民博物馆/多伦多/佩姬湾),
   * 不新增下载;换专属图 = 改这三个路径。
   */
  home: ['/img/banners/pathways-2.jpg', '/img/banners/jobs-1.jpg', '/img/banners/stats-3.jpg'],

  /**
   * 职位板三张。
   */
  jobs: ['/img/banners/jobs-1.jpg', '/img/banners/jobs-2.jpg', '/img/banners/jobs-3.jpg'],

  /**
   * 通道页三张。
   */
  pathways: ['/img/banners/pathways-1.jpg', '/img/banners/pathways-2.jpg', '/img/banners/pathways-3.jpg'],

  /**
   * 排行榜三张。
   */
  rank: ['/img/banners/rank-1.jpg', '/img/banners/rank-2.jpg', '/img/banners/rank-3.jpg'],

  /**
   * 统计页三张。
   */
  stats: ['/img/banners/stats-1.jpg', '/img/banners/stats-2.jpg', '/img/banners/stats-3.jpg'],

  /**
   * news(2026-07-31 Frank「没有图片的 banner 加上对应的图片」):照 home 先例复用
   * 既有已裁图不新增下载 —— 国会山(政策感最贴动态)/雾中高楼/卡尔加里天际线;
   * 要换专属图改这三个路径。
   */
  news: ['/img/banners/pathways-1.jpg', '/img/banners/rank-1.jpg', '/img/banners/jobs-3.jpg'],
} as const

/**
 * 轮播间隔(B类氛围轮播 —— 前景信息恒定,区别于 news 头条的 A类内容轮播)。
 */
export const ROTATE_MS = 8000

/**
 * 关键数字块上限(Frank:「显示关键信息但不能太多」)。
 */
export const STATS_MAX = 3

/**
 * 「减少动态」系统偏好的媒体查询串(命中就不轮播,静止在第一张)。
 */
export const REDUCED_MOTION_MQ = '(prefers-reduced-motion: reduce)'
