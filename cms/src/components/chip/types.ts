/**
 * chip 域的形状:筛选药丸的 props 契约与类名预算入参。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * Chip 的 props。
 * (原在 hot 与 onClick 之间的 lg 格 2026-10-05 撤:访客第 3 题改左右两栏后再没有 <Chip lg> 的消费者;Chip 体内照旧给 chipClsOf
 * 递 lg: false —— 那一格是类名预算入参 ChipClsIn 的,pnp 桶 sponsorleadcard 还按 lg: false 写死在调用里,等那边去掉再连 .lg / .lgOn
 * 一起删。原注照抄:大号档(一行时高 40、名字长就折行变高,字 15,灰底无描边,选中浅主色底 + 主色描边 + 勾;可省)。
 * 2026-10-04 访客四题改版立时写的是「高 40」(定高);同日 A2 改成至少 40、长名折行(CIP 专业英文名常过 40 字,见 chip.module.css 的 .lg)。)
 */
export type ChipIn = {
  /**
   * 是否选中(主色实底)。
   */
  active?: boolean

  /**
   * 是否强调红(未选中但要引起注意;选中态优先于它)。
   */
  hot?: boolean

  /**
   * 点击回调(可省 = 纯展示)。
   */
  onClick?: () => void

  /**
   * 去处(传了渲成真 <a>,内链要被爬到 —— 2026-09-03 PTE 题型胶囊是一页一型的路由,
   * 扩通用件而不是在业务桶 fork 第二种药丸)。
   */
  href?: string

  /**
   * 悬停提示(原生 title 属性;可省)。
   */
  title?: string

  /**
   * 调用方追加类:只用来接全局规范类(如手机触控靶 tapPad),
   * 长相仍归本域 —— 传别的类等于绕过药丸规格。
   */
  className?: string

  /**
   * 药丸文字。
   */
  children: React.ReactNode
}

/**
 * chipClsOf 的入参:两个态开关。
 */
export type ChipClsIn = {
  /**
   * 调用方追加的全局规范类(如 tapPad);null = 没有。
   */
  extra: string | null

  /**
   * 是否选中。
   */
  active: boolean

  /**
   * 是否强调红(选中态优先)。
   */
  hot: boolean

  /**
   * 是否大号档(大号的选中态是浅主色,不是主色实底)。
   */
  lg: boolean
}

/**
 * ChipTile 的 props(大号选择格;2026-10-04 付费闭环访客四题改版首例)。
 */
export type ChipTileIn = {
  /**
   * 是否选中(浅主色底 + 主色描边 + 右上角勾)。
   */
  active?: boolean

  /**
   * 图标(格子形在上,大卡形在左;可省)。
   */
  icon?: React.ReactNode

  /**
   * 主文字下面一行灰字小注(省码这类代码;可省)。
   */
  sub?: string

  /**
   * 形态:'tile' = 图标在上的格子(默认);'card' = 图标在左、字更大的整宽大卡。
   */
  shape?: 'tile' | 'card'

  /**
   * 点击回调(可省 = 纯展示)。
   */
  onClick?: () => void

  /**
   * 格子主文字。
   */
  children: React.ReactNode
}

/**
 * tileClsOf 的入参:三个开关。
 */
export type TileClsIn = {
  /**
   * 是否选中。
   */
  active: boolean

  /**
   * 是否大卡形(否 = 格子形)。
   */
  card: boolean
}

/**
 * ChipLine 的 props(一行选项;2026-10-05 访客第 2 题照掌上高考立)。
 */
export type ChipLineIn = {
  /**
   * 这一行的文字。
   */
  label: string

  /**
   * 要标主色的那一截(检索词;空串 = 不标)。不分大小写找第一处,找不到就整行不标。
   */
  mark: string

  /**
   * 选中(主色字 + 右侧勾,挂 aria-pressed)。
   */
  active: boolean

  /**
   * 点不动(灰字、不可点,原生 disabled —— 读屏报「不可用」;2026-10-05 访客第 2 题多选:选满 3 个时没选的行一律灰着,
   * 摘掉一个才恢复)。选中的行不会同时点不动(摘选得点它)。
   */
  disabled: boolean

  /**
   * 文字下面一行灰字小注(可省 = 不出;空串同样不出 —— 调用方逐行算小注、这一行没有时给空串)。2026-10-05 立:访客第 3 题两个职业
   * 显示名相同时挂官方英文名区分(同常规档胶囊的重名小注);小注在按钮里,读屏名也带上它。
   */
  sub?: string

  /**
   * 点这一行。
   */
  onClick: () => void
}

/**
 * markPartsOf 的入参。
 */
export type MarkPartsIn = {
  /**
   * 整行文字。
   */
  label: string

  /**
   * 要标的那一截(空串 = 不标)。
   */
  mark: string
}

/**
 * markPartsOf 的出参:整行切成命中前 / 命中 / 命中后三截(没命中 = 全在 pre)。
 */
export type MarkParts = {
  /**
   * 命中前那一截。
   */
  pre: string

  /**
   * 命中的那一截(没命中 = 空串)。
   */
  hit: string

  /**
   * 命中后那一截。
   */
  post: string
}

/**
 * lineClsOf 的入参。
 */
export type LineClsIn = {
  /**
   * 选中没有。
   */
  active: boolean

  /**
   * 点不动没有(2026-10-05 加)。
   */
  off: boolean
}
