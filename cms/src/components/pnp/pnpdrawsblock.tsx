'use client'
/**
 * 本省最近抽选事实块(E6-04)。score 是省自评分制(SIRS/WEOI/MPNP EOI),非 CRS ——
 * 只陈列事实,不判定资格。kind=notice(如 ON 2026-06 改制)渲染通告行;省内无数据(SK/QC 等)
 * 整块不出现。改制省列现行规则、不再铺已关闭通道的历史(判据与登记表见 constants 的 STREAM_REFORM)。
 * 2026-07-25 Frank 走查#12:抽选列表四列对齐(日期/流名/最低分/份邀请)—— 整块一个 grid,
 * 列宽跨行对齐(非逐行 flex);SIRS 口径脚注删(#11,「分数只与本省历史比」已是常识噪音)。
 * 2026-08-28 换装批自 Pnp.tsx 整体重写成小写件形制。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { makeT } from '@/lib/i18n'
import { DrawNotice } from './drawnotice'
import { DrawRow } from './drawrow'
import {
  drawNoticeTextOf, drawRowsOf, drawsClsOf, drawsTitleOf, firstDrawOf, isNoticeRow, reformOf, toDrawRow,
} from './functions'
import { ReformRules } from './reformrules'
import type { PnpDrawsBlockIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染本省最近抽选块。
 *
 * @param props 省码、界面语言、全部抽选行与条数上限(逐格注释见 PnpDrawsBlockIn)。
 * @returns 抽选块;本省既无抽选也没改制时给 null(整块不出现)。
 */
export function PnpDrawsBlock({ province, lang, draws, limit }: PnpDrawsBlockIn) {
  const t = makeT(lang)
  const reform = reformOf({ province })
  let cap: number | null = null
  if (limit != null) {
    cap = limit
  }
  const rows = drawRowsOf({ province, draws, reform, limit: cap })
  if (rows.length === 0 && reform == null) {
    return null
  }
  const lines = []
  let i = 0
  for (const d of rows) {
    if (isNoticeRow(d)) {
      lines.push(<DrawNotice key={String(i)} text={drawNoticeTextOf({ t, draw: d })} />)
    } else {
      lines.push(<DrawRow key={String(i)} r={toDrawRow({ t, lang, draw: d, index: i, reform })} />)
    }
    i += 1
  }
  return (
    <div>
      <div className={css.cardHead}>{drawsTitleOf({ t, reform, first: firstDrawOf(rows) })}</div>
      {reform != null && <ReformRules t={t} reform={reform} />}
      <div className={drawsClsOf({ empty: rows.length === 0 })}>{lines}</div>
    </div>
  )
}
