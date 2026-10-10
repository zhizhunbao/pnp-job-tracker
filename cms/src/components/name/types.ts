/**
 * name 组件桶的形状。
 *
 * @author Frank
 * @time 2026-10-09 06:40:00
 */

/**
 * Name 的 props(tsx props,可选格是协议:没给 = 这一种不出)。
 */
export type NameIn = {
  /**
   * 英文原名(主文案)。
   */
  en: string

  /**
   * 界面语译名(灰字小注;英文界面或没有 = 空串,只出一行)。
   */
  sub: string

  /**
   * 链接地址:站内整页(职位页 / 公司页,Ctrl 点新标签开)或外链(Google 地图)。没给也没给 onOpen = 不可点,英文黑字。
   */
  href?: string

  /**
   * 普通左键点了做什么(开职位框 / 公司框);没给 + 有 href = 外链,新标签开;给了没 href = 只开框、没有整页(池键公司)。
   */
  onOpen?: () => void
}

/**
 * 点名字的手柄(链接的 onClick)。
 */
export type NameClickFn = (e: React.MouseEvent) => void

/**
 * `cityMapOf` 的入参:这一处的城市与省码(Frank「城市 和 省份 点击 跳 google 地图啊」)。
 */
export type CityMapIn = {
  /**
   * 城市英文名。
   */
  city: string

  /**
   * 两位省码。
   */
  province: string
}

/**
 * `mapHrefOf` 的入参:查哪一级与城市、省码。
 */
export type MapHrefIn = {
  /**
   * 查哪一级:city / province。
   */
  level: string

  /**
   * 城市英文名(查省份时空串)。
   */
  city: string

  /**
   * 两位省码。
   */
  province: string
}

/**
 * 界面语三字面量(各域自抄)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形;形状本桶自己声明)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 一个名字的两行:英文原名与界面语译名(英文界面或没译名 = 空串)。
 */
export type NameView = {
  /**
   * 英文原名。
   */
  en: string

  /**
   * 界面语译名。
   */
  sub: string
}

/**
 * `subOf` 的入参:界面语与库里的两种译名。
 */
export type SubIn = {
  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 中文译名(没有 = 空串)。
   */
  zh: string

  /**
   * 韩文译名(没有 = 空串)。
   */
  ko: string
}

/**
 * `provNameOf` 的入参:省码、界面语与取词函数。
 */
export type ProvNameOfIn = {
  /**
   * 两位省码。
   */
  code: string

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 取词函数(省名词条)。
   */
  t: TFn
}

/**
 * 弹框总线上的公司层(与 advisor / peek 的同名形状同形,本桶自抄)。
 */
export type CoLayer = {
  /**
   * 层的种类。
   */
  kind: 'company'

  /**
   * 这一家。
   */
  co: CoPeek
}

/**
 * 公司框是哪一家。
 */
export type CoPeek = {
  /**
   * 公司页 slug。
   */
  slug: string

  /**
   * 公司名。
   */
  name: string
}

/**
 * `makeCoPeek` 的入参。
 */
export type CoPeekIn = {
  /**
   * 弹框总线的叠层手柄(modal 桶 usePeekBus 的 push)。
   */
  push: (layer: CoLayer) => void

  /**
   * 这一家。
   */
  co: CoPeek
}

/**
 * JobName 的 props(tsx props)。
 */
export type JobNameIn = {
  /**
   * 职位号(点了按号叠开职位框,Ctrl 点新标签开职位页)。
   */
  id: number

  /**
   * 职位名英文原文。
   */
  title: string

  /**
   * 职位名底下那行灰字(jobtitle 桶口径由调用方算好;英文界面或没有 = 空串)。
   */
  sub: string
}

/**
 * CompanyName 的 props(tsx props)。
 */
export type CompanyNameIn = {
  /**
   * 公司英文名。
   */
  name: string

  /**
   * 公司页 slug(没有 = 空串,黑字不可点)。
   */
  slug: string

  /**
   * 中文译名(没有 = 空串)。
   */
  zh: string

  /**
   * 韩文译名(没有 = 空串)。
   */
  ko: string
}

/**
 * CityName 的 props(tsx props)。
 */
export type CityNameIn = {
  /**
   * 城市英文名。
   */
  city: string

  /**
   * 两位省码(地图查询带上,同名城市不串省)。
   */
  province: string

  /**
   * 中文译名(没有 = 空串)。
   */
  zh: string

  /**
   * 韩文译名(没有 = 空串)。
   */
  ko: string
}

/**
 * ProvName 的 props(tsx props)。
 */
export type ProvNameIn = {
  /**
   * 两位省码。
   */
  code: string
}
