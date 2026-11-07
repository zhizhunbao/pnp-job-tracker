'use client'
/**
 * me 桶子桶 profile 的结构:页标题右边一颗主按钮「修改」(效果图:原先在「求职」卡卡头右上的「✎ 修改」挪到这里)。
 * 档案还没取到或取不到时不出。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { Button } from '@/components/button'
import { PF_EDIT_KEY, PF_LOAD_OK, PRIMARY_KIND } from './constants'
import type { ProfilePartIn } from './types'

/**
 * 「修改」钮。
 *
 * @param props 我的档案状态与取词。
 * @returns 主按钮;档案没到为 null。
 */
export function ProfileActs({ p, t }: ProfilePartIn) {
  if (p.load !== PF_LOAD_OK || p.view == null) {
    return null
  }
  return <Button kind={PRIMARY_KIND} onClick={p.onEdit}>{t(PF_EDIT_KEY)}</Button>
}
