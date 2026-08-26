'use client'
/**
 * auth 域的账户头像下拉 = 全站单一来源(2026-08-15 Frank「登录之后点这个应该还是
 * 下拉啊,怎么变成跳页面了」—— 先前 /jobs 有下拉、二级页是直达链接,同一个头像
 * 两种行为;收敛成一个组件,抄一份就等着两边菜单条目慢慢走散)。
 * 组件只管**按钮 + 开合**;弹层在 accountmenupop,登录/定价弹框仍归各自调用方。
 * 2026-08-24 组件域形制化(样式迁 module.css,点外面/Esc 两条关法进 hooks)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { useRef, useState } from 'react'

import { useEscClose } from '@/components/modal'
import { AccountMenuPop } from './accountmenupop'
import { Avatar } from './avatar'
import { ARIA_MENU, AVATAR_SIZE_MENU, MAIL_AT, NAME_FALLBACK, PRO_UNTIL_NONE, TITLE_NONE } from './constants'
import { useClickOutside } from './hooks'
import type { AccountMenuIn } from './types'
import css from './auth.module.css'

/**
 * 账户头像下拉(#63b:像 Google 那样只显示图标,名字/Pro 态挂 title)。
 *
 * @param props 身份与回调(见 AccountMenuIn 逐格注释)。
 * @returns 头像钮 + 下拉菜单。
 */
export function AccountMenu({ t, email, displayName, avatar, isPro, proUntil, onPricing }: AccountMenuIn) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLSpanElement>(null)
  useClickOutside({ ref: menuRef, open: menu, close: closeMenu })
  useEscClose(closeMenu)

  function closeMenu() {
    setMenu(false)
  }

  function toggleMenu() {
    setMenu(menu === false)
  }

  function clickUpgrade() {
    setMenu(false)
    if (onPricing != null) {
      onPricing()
    }
  }

  let shortName = NAME_FALLBACK
  if (displayName != null && displayName.trim() !== '') {
    shortName = displayName.trim()
  } else if (email != null) {
    const head = email.split(MAIL_AT)[0]
    if (head != null) {
      shortName = head
    }
  }
  let btnTitle = TITLE_NONE
  if (displayName != null && displayName.trim() !== '') {
    btnTitle = displayName.trim()
  } else if (email != null) {
    btnTitle = email
  }
  let btnCls = css.menuBtn
  if (menu) {
    btnCls = `${css.menuBtn} ${css.menuBtnOn}`
  }
  let proUntilIn = PRO_UNTIL_NONE
  if (proUntil != null) {
    proUntilIn = proUntil
  }
  let onUpgrade: (() => void) | null = null
  if (isPro === false && onPricing != null) {
    onUpgrade = clickUpgrade
  }

  return (
    <span ref={menuRef} className={css.menuWrap}>
      <button onClick={toggleMenu} title={btnTitle} aria-haspopup={ARIA_MENU} aria-expanded={menu} className={btnCls}>
        <Avatar src={avatar} name={shortName} email={email} size={AVATAR_SIZE_MENU} />
      </button>
      {menu && (
        <AccountMenuPop t={t}
          email={email}
          shortName={shortName}
          isPro={isPro}
          proUntil={proUntilIn}
          onUpgrade={onUpgrade} />
      )}
    </span>
  )
}
