'use client'
/**
 * 域内小件:窄屏专属的「我的匹配」入口条(dd24-#111,Frank「手机顶部加个我的匹配入口」)——
 * 桌面顶栏本就有匹配钮,手机上它折进侧滑抽屉首屏不可见,注册 teaser 卖匹配入口却要拉抽屉。
 * CSS 断点显隐(SSR 安全零闪);匹配视图激活时让位给状态条。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST, SPACE } from './constants'
import { IconTarget } from '@/components/icons'
import type { MatchEntryIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染窄屏入口条。
 *
 * @param props 钮面文案与点击手柄。
 * @returns 一条通栏钮。
 */
export function MatchEntry({ label, onClick }: MatchEntryIn) {
  return (
    <Button kind={BTN_GHOST} onClick={onClick}
      className={`${cssOf(css.onlyNarrow)} ${cssOf(css.mvEntry)}`}>
      <IconTarget />{SPACE}{label}
    </Button>
  )
}
