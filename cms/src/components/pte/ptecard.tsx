'use client'
/**
 * 域内小件:手机卡一张(整卡是真链接;题号 + 押题 | N 天前考过 / 题面 / 考过次数 | 练过)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { LinkButton } from '@/components/button'
import { cardClsOf } from './functions'
import type { PteCardViewIn } from './types'
import css from './pte.module.css'

/**
 * 渲染一张手机卡。
 *
 * @param props 取词函数与展示行。
 * @returns 一张卡。
 */
export function PteCard({ t, r }: PteCardViewIn) {
  return (
    <LinkButton href={r.href} className={cardClsOf({ done: r.done })}>
      <div className={css.mHead}>
        <span>
          {r.num}
        </span>
        <span>{r.seenText}</span>
      </div>
      <div className={css.mText}>{r.text}</div>
      <div className={css.mFoot}>
        <span>{t('pte.times', { n: r.times })}</span>
      </div>
    </LinkButton>
  )
}
