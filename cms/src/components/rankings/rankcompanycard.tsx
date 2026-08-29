'use client'
/**
 * 公司榜的手机卡(E8-08 #121,2026-07-20 Frank「按逻辑拆」):#排名进标题行,
 * 数字的语义色与桌面那几列一致 —— 同一份数据在两种形态下不许长两个样。
 * 公司名链官网(#199 撤的是**表格里**那处外链,卡上这一处是卡片唯一的去处所以留着);
 * 卡底「在职位板查看」是这家公司在招岗的入口。
 * 2026-08-28 换装批自 Ranking.tsx 的 RankCompanyCard 整体重写成小写件形制。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { LinkButton } from '@/components/button'
import { Card, CardAction, CardKV } from '@/components/card'
import { cssOf } from '@/components/css'
import { RANK_GAP, TARGET_BLANK, TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { RankCompanyCardIn } from './types'
import css from './rankings.module.css'

/**
 * 公司榜手机卡。
 *
 * @param props 这一行的展示行。
 * @returns 一张公司卡。
 */
export function RankCompanyCard({ r }: RankCompanyCardIn) {
  const items = [{ k: r.lmiaLabel, v: <DashText v={r.lmia} /> }]
  if (r.lmiaQuarter !== TEXT_NONE) {
    items.push({ k: r.quarterLabel, v: <span className={css.dim}>{r.lmiaQuarter}</span> })
  }
  if (r.showNamed) {
    items.push({ k: r.namedLabel, v: <span className={css.warn}>{r.namedText}</span> })
  }
  items.push({ k: r.openLabel, v: <span>{r.cardOpenText}</span> })
  items.push({ k: r.avgLabel, v: <span>{r.avgText}</span> })
  return (
    <Card>
      <div className={css.cardName}>
        <span className={css.cardRank}>{r.rankMark}</span>
        {RANK_GAP}
        {r.officialUrl === TEXT_NONE && r.company}
        {r.officialUrl !== TEXT_NONE && (
          <LinkButton href={r.officialUrl} target={TARGET_BLANK} className={cssOf(css.cardLink)}>
            {r.company}
          </LinkButton>
        )}
      </div>
      {r.province !== TEXT_NONE && <div className={css.cardProv}>{r.province}</div>}
      <CardKV items={items} />
      <CardAction>
        <LinkButton href={r.goHref} className={cssOf(css.cardAction)}>{r.goLabel}</LinkButton>
      </CardAction>
    </Card>
  )
}
