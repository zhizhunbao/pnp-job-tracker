/**
 * review 子桶 pick 的形状(本桶自声明,只声明真读的格)。
 *
 * @author Frank
 * @time 2026-11-11 23:30:00
 */

/**
 * 一块高亮里本桶真读的两格。
 */
export type HlMark = {
  /**
   * 是不是句头那块。
   */
  first: boolean

  /**
   * 对上的要求序号(0 = 无依据的句子)。
   */
  n: number
}

/**
 * 点选要求的入参。
 */
export type PickActiveIn = {
  /**
   * 选中的要求。
   */
  active: number

  /**
   * 点的这一条。
   */
  n: number

  /**
   * 点高亮。
   */
  setActive: (n: number) => void
}

/**
 * 点高亮的手柄。
 */
export type HlPickFn = (e: React.MouseEvent) => void

/**
 * isActiveUnder 的入参。
 */
export type ActiveUnderIn = {
  /**
   * 点击位置的横坐标(视口内)。
   */
  x: number

  /**
   * 点击位置的纵坐标(视口内)。
   */
  y: number

  /**
   * 选中着的那一条的序号(0 = 没选)。
   */
  active: number
}
