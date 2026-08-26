/**
 * banner 域的形状:模块页头三件(Banner 选形/GradientBanner 渐变带/ImageBanner 图版)
 * 与轮播机的进出口。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 模块名(定 banner 的配色档;home 复用 jobs 档 —— 主品牌蓝不发明新色)。
 */
export type BannerModule = 'home' | 'jobs' | 'pathways' | 'rank' | 'stats' | 'news'

/**
 * 关键数字块(≤3,Frank:「显示关键信息但不能太多」;仅图版渲染)。
 */
export type BannerStat = {
  /**
   * 数字。
   */
  v: React.ReactNode

  /**
   * 数字的标签。
   */
  label: React.ReactNode
}

/**
 * Banner 的 props(两形态一组件:images 传了且没挂 = 图版,否则渐变带兜底)。
 */
export type BannerIn = {
  /**
   * 模块名(定配色档)。
   */
  module: BannerModule

  /**
   * 标题前图标(可省)。
   */
  icon?: React.ReactNode

  /**
   * 模块标题。
   */
  title: React.ReactNode

  /**
   * 副题(可省)。
   */
  sub?: React.ReactNode

  /**
   * 右槽(钮/链接;可省)。
   */
  right?: React.ReactNode

  /**
   * 实景图组(可省 = 渐变带;图挂了自动回落渐变带,发布零风险)。
   */
  images?: readonly string[]

  /**
   * 关键数字块(仅图版渲染,最多 STATS_MAX 个)。
   */
  stats?: BannerStat[]

  /**
   * L1-01 landing 首屏加高档:130 → 200(门面比二级页重);其余槽位语法不变。
   */
  tall?: boolean
}

/**
 * GradientBanner(渐变带形态)的 props。
 */
export type GradientBannerIn = {
  /**
   * 模块名(定配色档)。
   */
  module: BannerModule

  /**
   * 标题前图标(可省)。
   */
  icon: React.ReactNode

  /**
   * 模块标题。
   */
  title: React.ReactNode

  /**
   * 副题(可省 = null)。
   */
  sub: React.ReactNode

  /**
   * 右槽(可省 = null)。
   */
  right: React.ReactNode
}

/**
 * ImageBanner(图版形态)的 props(轮播机面板由 Banner 摊平传入)。
 */
export type ImageBannerIn = {
  /**
   * 模块名(定暗化层的模块色)。
   */
  module: BannerModule

  /**
   * 标题前图标(可省 = null)。
   */
  icon: React.ReactNode

  /**
   * 模块标题。
   */
  title: React.ReactNode

  /**
   * 副题(可省 = null)。
   */
  sub: React.ReactNode

  /**
   * 右槽(可省 = null)。
   */
  right: React.ReactNode

  /**
   * 关键数字块(可省 = null;最多渲 STATS_MAX 个,手机藏)。
   */
  stats: BannerStat[] | null

  /**
   * 加高档。
   */
  tall: boolean

  /**
   * 轮播图组(非空,Banner 选形时已判)。
   */
  imgs: readonly string[]

  /**
   * 当前图序(可能超组长,消费端取模)。
   */
  idx: number

  /**
   * 鼠标进入 = 暂停轮播。
   */
  onEnter: () => void

  /**
   * 鼠标离开 = 恢复轮播。
   */
  onLeave: () => void

  /**
   * 点圆点直接切到第 i 张。
   */
  pick: (i: number) => void

  /**
   * 任一张图挂了 = 整版回落渐变带。
   */
  fail: () => void
}

/**
 * BannerDots(轮播圆点排小件)的 props。
 */
export type BannerDotsIn = {
  /**
   * 图组(<2 张不渲染)。
   */
  imgs: readonly string[]

  /**
   * 当前张(已取模)。
   */
  cur: number

  /**
   * 点第 i 颗点切到第 i 张。
   */
  pick: (i: number) => void
}

/**
 * useCarousel 交回的机器面板。
 */
export type CarouselOut = {
  /**
   * 可用的图组;null = 没图/图挂了(该走渐变带)。
   */
  imgs: readonly string[] | null

  /**
   * 当前图序(消费端取模)。
   */
  idx: number

  /**
   * 鼠标进入 = 暂停。
   */
  onEnter: () => void

  /**
   * 鼠标离开 = 恢复。
   */
  onLeave: () => void

  /**
   * 直接切到第 i 张。
   */
  pick: (i: number) => void

  /**
   * 报图挂(整版回落渐变带)。
   */
  fail: () => void
}

/**
 * 圆点点击手柄形状(点这一颗就切到它对应的那张)。
 */
export type DotPickFn = () => void

/**
 * makeDotPick 的入参(2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,
 * 原 BannerDots 循环体内的 pickThis 迁出,闭包的图序改走这格显式入参)。
 */
export type DotPickIn = {
  /**
   * 切图回调。
   */
  pick: (i: number) => void

  /**
   * 这一颗点对应的图序。
   */
  i: number
}
