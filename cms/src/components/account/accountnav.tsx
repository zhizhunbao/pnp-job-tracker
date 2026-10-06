'use client'
/**
 * account 域的结构:账户页左卡里的节导航 —— 六枚节钮 + 分隔线 + 退出登录。
 * 分隔线只在桌面纵排时渲染:窄屏 sidebar 是一条横排,中间插一条横线会把那一行切断。
 * 2026-08-26 自 app/(frontend)/account/page.tsx 迁出(页面「纯拼装门」改造批),
 * 节表进 constants 的 SEC_TABS、选中态与标签裁切进 functions,内联样式逐格迁类。
 * 同日 Frank 追加「<button 这种不允许直接使用」:节钮改经 Button(kind ghost 素底,
 * 视觉仍由本域加倍类全量定形)。
 * 2026-10-05 Frank「退出登录去掉吧」:分隔线与退出登录钮删(退出留在页头头像菜单),只剩节钮。
 *
 * 2026-10-05 Frank「tab 不应该是横着的么」「我不是有现成的 tab 组件吗」:左侧栏一列竖钮换成 tabs 桶的通用页签条
 * (横排、键盘左右切换、aria 都由它管),本件只递清单与切换手柄。
 *
 * @author Frank
 * @time 2026-08-26 20:30:20
 */
import { Tabs } from '@/components/tabs'
import { ACCT_BANNER_TITLE_KEY, ACCT_TAB_ID } from './constants'
import { makeSecChange, secTabItemsOf } from './functions'
import type { AccountNavIn } from './types'

/**
 * 账户页节导航:横排页签条。
 *
 * @param props 当前节、取词函数与切节回调。
 * @returns 页签条。
 */
export function AccountNav({ sec, t, onPick }: AccountNavIn) {
  return (
    <Tabs ariaLabel={t(ACCT_BANNER_TITLE_KEY)}
      idPrefix={ACCT_TAB_ID}
      value={sec}
      onChange={makeSecChange({ onPick })}
      items={secTabItemsOf({ t })} />
  )
}
