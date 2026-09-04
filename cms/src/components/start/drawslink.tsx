'use client'
/**
 * 域内小件:抽选与政策动态那一行链接(2026-09-04 重构:原 S5 抽选表 + 政策动态段撤,
 * /news 与时间线已承载同一事实,这里只留一行入口)。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { LinkButton } from '@/components/button'
import { URL_NEWS } from './constants'
import { drawsLinkClsOf } from './functions'
import { Band } from './band'
import type { DrawsLinkIn } from './types'

/**
 * 渲染那一行链接。
 *
 * @param props 取词函数。
 * @returns 一条色带里一个链接。
 */
export function DrawsLink({ t }: DrawsLinkIn) {
  return (
    <Band white>
      <LinkButton href={URL_NEWS} className={drawsLinkClsOf()}>
        {t('pulse.drawsLink')}
      </LinkButton>
    </Band>
  )
}
