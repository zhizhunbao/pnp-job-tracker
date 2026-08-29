'use client'
/**
 * 省级体量卡(人话名主文案 + 代码灰字小注:Frank「TFWP/IMP 用户都不知道是什么」)。
 * Frank 走查#6 改三列对齐(标签 | 数值 | 年份注);Frank 2026-07-26「每列都保证左对齐」。
 * Frank 走查#4:非 QC 的「来源:IRCC 开放数据…」删(footer 已统一声明);
 * QC 独立体系说明是实义,保留。
 * 2026-08-28 换装批自 Advisor.tsx 的 LocationPanel 卡③提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import {
  CARD_HEAD_CLS, CARD_MD_CLS, CLS_SEP, GRID_V_CLS, KEY_TAIL_K, KEY_TAIL_N, KEY_TAIL_V, SPACE, TEXT_NONE,
} from './constants'
import type { VolumeCardIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染省级体量卡。
 *
 * @param props 取词函数、体量行与是不是魁北克。
 * @returns 体量卡。
 */
export function VolumeCard({ t, rows, isQc }: VolumeCardIn) {
  const out = []
  for (const r of rows) {
    out.push(
      <span key={r.key + KEY_TAIL_K} className={cssOf(css.muted)}>
        {r.label}
        {r.code !== TEXT_NONE && (
          <span className={cssOf(css.gnoteS) + CLS_SEP + cssOf(css.gnote)}>{SPACE}{r.code}</span>
        )}
      </span>,
    )
    out.push(<span key={r.key + KEY_TAIL_V} className={GRID_V_CLS + CLS_SEP + cssOf(css.bold)}>{r.value}</span>)
    out.push(<span key={r.key + KEY_TAIL_N} className={cssOf(css.gnote)}>{r.note}</span>)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>
        {t('loc.vol')}{SPACE}<span className={cssOf(css.gnoteM)}>{t('loc.volTag')}</span>
      </div>
      <div className={cssOf(css.vol)}>{out}</div>
      {isQc && <div className={cssOf(css.qc)}>{t('loc.qc')}</div>}
    </div>
  )
}
