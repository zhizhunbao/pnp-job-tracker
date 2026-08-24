/**
 * field 域的形状:输入件家族的 props 契约(首住户 Select 量宽下拉)。
 *
 * @author Frank
 * @time 2026-08-24 10:00:00
 */

/**
 * 选项显示名函数(值 → 人话名;不传 = 值本身就是显示名)。
 */
export type SelectLabelFn = (v: string) => string

/**
 * 壳宽三档:sm=150(职位板)/ md=170(雇主板)/ lg=210(就业把脉)。
 */
export type SelectSize = 'sm' | 'md' | 'lg'

/**
 * Select(量宽自适应下拉)的 props。
 */
export type SelectIn = {
  /**
   * 当前值;'' = 未选(显示 all)。
   */
  value: string

  /**
   * 换值回调。
   */
  onChange: (v: string) => void

  /**
   * 选项值清单(当前值不在清单里也保留显示,见 listOf)。
   */
  opts: readonly string[]

  /**
   * 「全部」项的文案(空值档)。
   */
  all: string

  /**
   * 值 → 显示名(可省 = 原样)。
   */
  labelOf?: SelectLabelFn

  /**
   * 壳宽档(可省 = sm)。
   */
  size?: SelectSize

  /**
   * 手机 44px 触控靶(#276 手法;筛选行控件传它)。
   */
  tap?: boolean
}

/**
 * shownOf 的入参。
 */
export type ShownIn = {
  /**
   * 当前值。
   */
  value: string

  /**
   * 空值档文案。
   */
  all: string

  /**
   * 显示名函数;null = 原样。
   */
  labelOf: SelectLabelFn | null
}

/**
 * listOf 的入参。
 */
export type ListIn = {
  /**
   * 当前值。
   */
  value: string

  /**
   * 选项值清单。
   */
  opts: readonly string[]
}

/**
 * 输入框尺寸档:sm 32(图表控件行)/ md 38(筛选行,与 Select 同高)/ lg 42(独立搜索区)。
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
