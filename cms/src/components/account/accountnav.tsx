'use client'
/**
 * account 域的结构:账户页左卡里的节导航 —— 六枚节钮 + 分隔线 + 退出登录。
 * 分隔线只在桌面纵排时渲染:窄屏 sidebar 是一条横排,中间插一条横线会把那一行切断。
 * 2026-08-26 自 app/(frontend)/account/page.tsx 迁出(页面「纯拼装门」改造批),
 * 节表进 constants 的 SEC_TABS、选中态与标签裁切进 functions,内联样式逐格迁类。
 *
 * @author Frank
 * @time 2026-08-26 20:30:20
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { LOGOUT_BTN_KIND, SEC_TABS } from './constants'
import { makeSecPick, navBtnClsOf, navLabelOf } from './functions'
import type { AccountNavIn } from './types'
import css from './account.module.css'

/**
 * 账户页节导航。
 *
 * @param props 当前节、窄屏标记、取词函数、切节与退出两个回调。
 * @returns 节钮列 + 分隔线 + 退出登录钮。
 */
export function AccountNav({ sec, narrow, t, onPick, onLogout }: AccountNavIn) {
  const tabs: React.ReactNode[] = []
  for (const tab of SEC_TABS) {
    tabs.push(
      <button key={tab.sec}
        onClick={makeSecPick({ sec: tab.sec, onPick })}
        className={navBtnClsOf({ active: sec === tab.sec })}>
        {navLabelOf({ label: t(tab.labelKey) })}
      </button>,
    )
  }
  return (
    <>
      {tabs}
      {narrow === false && <div className={css.navDivider} />}
      <Button kind={LOGOUT_BTN_KIND} onClick={onLogout} className={cssOf(css.logoutBtn)}>{t('acct.logout')}</Button>
    </>
  )
}
