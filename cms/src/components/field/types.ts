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
