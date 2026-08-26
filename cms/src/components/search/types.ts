/**
 * search 域的形状。尺寸档与 input 域同集(输入件共用一套高度);原先直接 type 引入
 * input 域的 InputSize,2026-08-26 依宪法 08-25「types 自声明」改为本域自声明。
 *
 * @author Frank
 * @time 2026-08-24 15:00:00
 */

/**
 * 尺寸档 —— 本域自声明(宪法 08-25「types 自声明」,2026-08-26 撤跨域 import;
 * 与 input 域的 InputSize 同集,结构相同即兼容,走样当场 tsc 红)。
 */
export type InputSize = 'sm' | 'md' | 'lg'

/**
 * Search(搜索框:左图标 + 可清除)的 props。
 */
export type SearchIn = {
  /**
   * 当前值。
   */
  value: string

  /**
   * 改值回调。
   */
  onChange: (v: string) => void

  /**
   * 占位提示(同时当无障碍名)。
   */
  placeholder: string

  /**
   * 尺寸档(可省 = lg,搜索框通常独占一行)。
   */
  size?: InputSize
}

/**
 * 无参无返的钮点击手柄形状(清除钮是这一形)。
 */
export type ClickFn = () => void

/**
 * makeSearchClear 的入参(2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,
 * 原 Search 体内的 clear 迁出,闭包的改值回调改走这格显式入参)。
 */
export type SearchClearIn = {
  /**
   * 改值回调(清除 = 交回空查询词)。
   */
  onChange: (v: string) => void
}
