/**
 * input 域的形状:输入件的**共同尺寸档**与文本框契约。
 * (2026-08-24 由 field 域拆出;尺寸档留在这里给 select/search 引用 ——
 * 筛选行里三件并排,高度必须同源。)
 *
 * @author Frank
 * @time 2026-08-24 15:00:00
 */

/**
 * 输入件尺寸档:sm 32(图表控件行)/ md 38(筛选行)/ lg 42(独立搜索区)。
 * **全站输入件共用这一套** —— select 与 search 都从本域取。
 */
export type InputSize = 'sm' | 'md' | 'lg'

/**
 * Input(通用文本框)的 props。
 */
export type InputIn = {
  /**
   * 当前值。
   */
  value: string

  /**
   * 改值回调(收已取出的字符串 —— 调用点不必再写 e.target.value)。
   */
  onChange: (v: string) => void

  /**
   * 占位提示。
   */
  placeholder?: string

  /**
   * 尺寸档(可省 = md,与 Select 同高)。
   */
  size?: InputSize

  /**
   * 手机虚拟键盘的回车键样式(搜索框传 'search')。
   */
  enterKeyHint?: 'search' | 'done' | 'go'

  /**
   * 最大字数。
   */
  maxLength?: number

  /**
   * 挂载即聚焦。
   */
  autoFocus?: boolean

  /**
   * 无障碍名(没有可见 label 时传)。
   */
  ariaLabel?: string

  /**
   * 键盘事件(Enter 提交、Esc 取消这类)。
   */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void

  /**
   * 调用方追加的全局规范类(如手机触控靶 sbCtl / jtSearch 的伸缩位),
   * 长相仍归本域。
   */
  className?: string
}

/**
 * inputClsOf 的入参。
 */
export type InputClsIn = {
  /**
   * 尺寸档。
   */
  size: InputSize

  /**
   * 搜索形态(左右留出图标与清除钮的位)。
   */
  search: boolean

  /**
   * 调用方追加类;null = 没有。
   */
  extra: string | null
}
