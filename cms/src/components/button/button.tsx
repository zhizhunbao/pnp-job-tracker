'use client'
/**
 * button 域的结构:全站按钮的单一来源(#65 新增按钮一律从这拿,不许散装内联;
 * 2026-07-19 Frank「所有能点的按钮都要统一设计」)。六变体 × 三尺寸档,
 * href 传了渲 <a>(内链要被爬到),否则 <button>。
 * 2026-08-24 自 ui/Button.tsx 按组件域形制迁入(变体/尺寸样式表迁 module.css)。
 *
 * style 白名单:styleOverride 是调用方的几何微调过渡口(几十处消费页在传宽度/边距),
 * 消费页形制化批逐个收进各页的类后撤。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { KIND_DEFAULT } from './constants'
import { LinkButton } from './linkbutton'
import { btnClsOf } from './functions'
import type { ButtonIn } from './types'

/**
 * 统一按钮;禁用时 href 形态退回 <button>(a 没有 :disabled)。
 *
 * @param props 变体/尺寸/禁用/目标/微调/文字。
 * @returns 按钮或链接。
 */
export function Button({
  kind = KIND_DEFAULT,
  sm = false,
  lg = false,
  disabled = false,
  onClick,
  href,
  target,
  title,
  style,
  className,
  ariaLabel,
  active = false,
  expanded,
  haspopup,
  role,
  tabIndex,
  id,
  ariaControls,
  ariaSelected,
  pressed,
  onKeyDown,
  btnRef,
  type,
  children,
}: ButtonIn) {
  let extraCls: string | null = null
  if (className != null) {
    extraCls = className
  }
  const cls = btnClsOf({ kind, sm, lg, active, className: extraCls })
  if (href != null && href !== '' && disabled === false) {
    return (
      <LinkButton href={href} target={target} title={title} className={cls} style={style}>{children}</LinkButton>
    )
  }
  return (
    <button disabled={disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      title={title}
      aria-label={ariaLabel}
      aria-haspopup={haspopup}
      aria-expanded={expanded}
      aria-controls={ariaControls}
      aria-selected={ariaSelected}
      aria-pressed={pressed}
      role={role}
      tabIndex={tabIndex}
      id={id}
      ref={btnRef}
      type={type}
      className={cls}
      // eslint-disable-next-line react/forbid-dom-props -- 调用方几何微调的过渡口(见文件头)
      style={style}>{children}</button>
  )
}
