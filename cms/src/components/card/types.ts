/**
 * card 域的形状:卡片积木六件(Card/CardKV/CardAction/ProCard/LockedRows/JobCard)
 * 与两个内部小件(LinkText/JobCardRow)的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 可点文本的三形态数据:纯文本(不传 href/onClick)、链接、拦截成弹框的链接。
 */
export type CardLink = {
  /**
   * 显示文字。
   */
  text: string

  /**
   * 去处(可省 = 纯文本或只有 onClick)。
   */
  href?: string

  /**
   * 点击回调(如拦截成弹框;可省)。
   */
  onClick?: (e: React.MouseEvent) => void

  /**
   * 悬停提示(原生 title 属性;可省)。
   */
  title?: string

  /**
   * <a> 的 target(榜单卡岗名直链官方原帖要新开页;站内链不传即同标签)。
   */
  target?: string
}

/**
 * Card(白卡壳)的 props。
 */
export type CardIn = {
  /**
   * 调用方几何微调(各页密度不同的 padding 这类;过渡口,消费页形制化后收)。
   */
  style?: React.CSSProperties

  /**
   * 卡内容。
   */
  children: React.ReactNode
}

/**
 * CardKV 的一个条目。
 */
export type CardKvItem = {
  /**
   * 标签(条目里 k 在 v 上方)。
   */
  k: React.ReactNode

  /**
   * 值。
   */
  v: React.ReactNode

  /**
   * 独占一整行(长值用)。
   */
  wide?: boolean
}

/**
 * CardKV(键值区,两列 grid)的 props。
 */
export type CardKvIn = {
  /**
   * 条目清单(按行铺,一行两个条目)。
   */
  items: CardKvItem[]
}

/**
 * CardAction(操作行)的 props。
 */
export type CardActionIn = {
  /**
   * 操作件。
   */
  children: React.ReactNode
}

/**
 * ProCard(统一升级卡)的 props。
 */
export type ProCardIn = {
  /**
   * 琥珀短句(零符号、超长删词不折行)。
   */
  text: string

  /**
   * 钮文字(「解锁 Pro」)。
   */
  cta: string

  /**
   * 点击回调。
   */
  onClick: () => void

  /**
   * 悬浮在打码区正中(LockedRows 内部用)。
   */
  overlay?: boolean
}

/**
 * LockedRows(打码锁区)的 props。
 */
export type LockedRowsIn = {
  /**
   * 打码行数 = 真实剩余条数(数字真、纹理假 —— 真内容服务端不下发)。
   */
  n: number

  /**
   * 升级卡短句。
   */
  text: string

  /**
   * 升级卡钮文字。
   */
  cta: string

  /**
   * 升级卡点击回调。
   */
  onClick: () => void
}

/**
 * TextButton(可点文本钮,域内小件;原名 LinkText)的 props。
 */
export type TextButtonIn = {
  /**
   * 文本数据(三形态见 CardLink)。
   */
  v: CardLink

  /**
   * 底类(调用方给的字号/配色类)。
   */
  className: string
}

/**
 * JobCardRow(左右两格行,域内小件)的 props。
 */
export type JobCardRowIn = {
  /**
   * 左格(身份:公司、地点);null 且右格也 null 时整行不渲染。
   */
  left: React.ReactNode

  /**
   * 右格(数字:薪资、时间,右对齐连成竖线)。
   */
  right: React.ReactNode
}

/**
 * JobCard(职位卡手机形态)的 props。
 */
export type JobCardIn = {
  /**
   * 整卡去处(爬虫/长按新开页也靠它);onCardClick 可拦截。
   */
  href?: string

  /**
   * 整卡点击拦截(可省)。
   */
  onCardClick?: (e: React.MouseEvent) => void

  /**
   * 职位名:蓝字 14.5 不加粗(蓝色已说明可点,再加粗是同一件事说两遍)。
   */
  title: CardLink

  /**
   * NOC 官方职业名译名 —— 岗名看不懂时靠这条。
   */
  note?: string

  /**
   * 公司(可点则给 href/onClick)。
   */
  company?: CardLink

  /**
   * 紧跟公司名的小徽章(担保档等)—— 同属「身份」,不下放到胶囊排。
   */
  companyBadge?: React.ReactNode

  /**
   * 薪资(右列)。
   */
  salary?: React.ReactNode

  /**
   * 地点(市/省可能各自可点,交给调用方渲染)。
   */
  location?: React.ReactNode

  /**
   * 发布时间(右列)。
   */
  date?: React.ReactNode

  /**
   * 通道胶囊排(PNP/EE/AIP…),空则整行不出。
   */
  chips?: React.ReactNode

  /**
   * 右上角(星标等)。
   */
  action?: React.ReactNode

  /**
   * 页脚(更新时间等)。
   */
  footer?: React.ReactNode
}
