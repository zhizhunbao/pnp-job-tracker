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

/**
 * 轮播圆点的无障碍标签词干:读屏念出来是「bg 1」「bg 2」——bg 是 background 的缩写,
 * 后面接第几张背景图。圆点本身没有可读文字(就是一颗 6×6 的点),不给 aria-label
 * 读屏只会念「按钮」,三颗点分不清点的是哪一张;用缩写而不是整句,是因为每颗点都要
 * 念一遍,越短越不打断浏览。
 */
export const DOT_LABEL = 'bg'

/**
 * 圆点排要渲染出来,至少得有几张图。只有一张时整排不画 —— 一颗孤零零的点既切不了图,
 * 又让人以为还有别的张可以点。
 */
export const DOT_IMGS_MIN = 2

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形,
 * Button 只出统一的语义与可达性(disabled/aria)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 背景图的致谢文字,挂在 img 的 title 上(鼠标悬停可见)。图全部取自 Wikimedia Commons
 * 的实景照(出处逐张记在 `cms/public/img/banners/SOURCES.md`),画面上不压水印 ——
 * 致谢改挂这里,既标了出处又不弄脏画面。这是出处站点的**专名**,不随界面语言变,
 * 所以留在常量而不是进 i18n。
 */
export const IMG_CREDIT = 'Wikimedia Commons'
