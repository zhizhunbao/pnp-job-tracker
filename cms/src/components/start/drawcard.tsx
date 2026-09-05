'use client'
/**
 * 域内小件:抽选表手机形态的一条(通道名 + 译名灰注 + 省标签 / 日期 / 分数线 / 邀请数
 * + 冷解读)。末条不出分隔线 —— 白卡自己有描边。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Tag } from '@/components/tag'
import { TEXT_NONE } from './constants'
import { drawRowClsOf } from './functions'
import type { DrawCardIn } from './types'
import css from './start.module.css'

/**
 * 渲染抽选表的一张手机卡。
 *
 * @param props 这一期的展示行、是不是最后一条与取词函数。
 * @returns 一条。
 */
export function DrawCard({ row, last, t }: DrawCardIn) {
  return (
    <div className={drawRowClsOf({ last })}>
      <div className={css.drawTitle}>{row.main}</div>
      {row.note !== TEXT_NONE && <div className={css.drawNote}>{row.note}</div>}
      <div className={css.drawMeta}>
        <Tag>{row.prog}</Tag>
        <span className={css.drawDate}>{row.date}</span>
        <span className={css.drawStatRight}>
          {t('home.dr.score')}<span className={css.drawVal}>{row.score}</span>
        </span>
        <span className={css.drawStat}>
          {t('home.dr.inv')}<span className={css.drawVal}>{row.invitations}</span>
        </span>
      </div>
      {row.read !== TEXT_NONE && <div className={css.drawRead}>{row.read}</div>}
    </div>
  )
}
