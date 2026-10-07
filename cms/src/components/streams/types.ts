/**
 * streams 域(资讯 →「通道与门槛」页)的自足形状:整机面板、省份胶囊行的 props 与手柄工厂的入参。
 * 门槛卡的形状不在这里:卡住 pnp 桶(PnpProvStreams),本域只递界面语言与省码两格。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语言(三字面量本域自抄)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 无参无返的点击手柄(省份胶囊的 onClick)。
 */
export type ClickFn = () => void

/**
 * 逐省的手柄工厂:给省码,换一只切到那个省的手柄。
 */
export type ProvPickOfFn = (code: string) => ClickFn

/**
 * useStreams 交回的面板。
 */
export type StreamsPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(门槛卡的灰字直白名挑哪一语)。
   */
  lang: Lang

  /**
   * 当前省码;'' = 还没选(首帧)。
   */
  prov: string

  /**
   * 逐省的手柄工厂。
   */
  provPickOf: ProvPickOfFn
}

/**
 * ProvChips 的 props。
 */
export type ProvChipsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前省码。
   */
  prov: string

  /**
   * 逐省的手柄工厂。
   */
  provPickOf: ProvPickOfFn
}

/**
 * provHrefOf 的入参(2026-10-04 页签带省份)。
 */
export type ProvHrefIn = {
  /**
   * 页签地址(站内路径)。
   */
  base: string

  /**
   * 当前省码;'' = 还没选。
   */
  prov: string
}

/**
 * makeProvPickOf 与 applyStartProv 的入参。
 */
export type ProvPickIn = {
  /**
   * 省份落格。
   */
  setProv: (v: string) => void
}
