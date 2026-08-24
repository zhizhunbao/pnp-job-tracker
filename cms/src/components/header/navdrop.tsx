'use client'
/**
 * header 域的桌面 hover 下拉(E8-07 E 统一交互;资料库/资讯共用):
 * 面板 = 白卡描边圆角,当前项蓝底高亮;机器在 hooks 的 useHoverOpen。
 * 2026-08-24 自 Header 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */
import { IconChevronDown } from '@/components/icons'
import { LinkButton } from '@/components/button'
import { withOn } from './functions'
import { useHoverOpen } from './hooks'
import type { NavDropIn } from './types'
import css from './header.module.css'

/**
 * hover 下拉。
 *
 * @param props 触发器与条目(见 NavDropIn 逐格注释)。
 * @returns 下拉。
 */
export function NavDrop({ label, icon, highlight, items }: NavDropIn) {
  const h = useHoverOpen()
  const links = []
  for (const it of items) {
    let on = false
    if (it.active) {
      on = true
    }
    links.push(
      <LinkButton key={it.href} href={it.href} className={withOn({ base: css.dropItem, on })}>{it.label}</LinkButton>,
    )
  }
  return (
    <span className={css.dropWrap} onMouseEnter={h.enter} onMouseLeave={h.leave} onFocus={h.enter} onBlur={h.onBlur}>
      <button className={withOn({ base: css.dropBtn, on: highlight })} onClick={h.toggle}>
        {icon} {label} <span className={css.dropCaret}><IconChevronDown /></span>
      </button>
      {h.open && <span className={css.dropPanel}>{links}</span>}
    </span>
  )
}
