'use client'
/**
 * me 桶子桶 sub 的结构:页标题右边那一颗钮(效果图 docs/design/我的/我的框架-20261107.md 2.5)。
 * 免费档「升级 Pro」(主钮)、Pro 档「续买」(时长包到期日顺延;次钮),两颗都打开全站同一个定价框
 * (2026-10-04 Frank「升级 Pro 这个删了,放到 我的 模块里,加一个我的订阅 可以吗?」;下单只此一处,本页不另造)。
 * 2026-11-07 照 Fluent 效果图从方案卡右边挪到页标题右边。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Button } from '@/components/button'
import { RENEW_BTN_KIND, UPGRADE_BTN_KIND } from './constants'
import type { SubPartIn } from './types'

/**
 * 页标题右边的钮。
 *
 * @param props 「我的订阅」状态与取词。
 * @returns 一颗钮。
 */
export function SubActs({ s, t }: SubPartIn) {
  if (s.pro) {
    return <Button kind={RENEW_BTN_KIND} onClick={s.onOpen}>{t('sub.renew')}</Button>
  }
  return <Button kind={UPGRADE_BTN_KIND} onClick={s.onOpen}>{t('up.cta2')}</Button>
}
