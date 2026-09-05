'use client'
/**
 * 域内小件:政策动态那一行链接(2026-09-04 重构:政策动态段撤,/news 承载,这里只留一行入口;
 * 抽选表 Frank 走查要求保留,住 DrawsSection)。
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
    <Band>
      <LinkButton href={URL_NEWS} className={drawsLinkClsOf()}>
        {t('home.pulse.all')}
      </LinkButton>
    </Band>
  )
}
