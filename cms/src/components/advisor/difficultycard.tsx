'use client'
/**
 * 移民难度卡(与 /stats 的难度卡同源渲染,复用同一套文案)。
 * Frank 走查#5 先把竞争比这类难度行从 flex 换行改成网格(值 | 口径)跨行对齐;
 * Frank 2026-07-26 走查再加一列成三列(标签 | 值 | 注),每列左对齐
 * —— 原来一行一整句,读不快也对不齐。
 * 2026-08-28 换装批自 Advisor.tsx 的 LocationPanel 卡②提出成件(三档色阶内联迁类)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { Grid } from '@/components/grid'
import {
  CARD_HEAD_CLS, CARD_MD_CLS, CLS_SEP, GRID_COLS_3, GRID_K_CLS, GRID_N_CLS, GRID_V_CLS, K_DIFF_HEAD,
  KEY_TAIL_K, KEY_TAIL_N, KEY_TAIL_V,
} from './constants'
import { diffToneClsOf } from './functions'
import type { DifficultyCardIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染移民难度卡。
 *
 * @param props 取词函数、难度档与三列格。
 * @returns 难度卡。
 */
export function DifficultyCard({ t, tier, cells }: DifficultyCardIn) {
  const out = []
  for (const c of cells) {
    out.push(<span key={c.key + KEY_TAIL_K} className={GRID_K_CLS}>{c.label}</span>)
    out.push(<span key={c.key + KEY_TAIL_V} className={GRID_V_CLS + CLS_SEP + cssOf(css.bold)}>{c.value}</span>)
    out.push(<span key={c.key + KEY_TAIL_N} className={GRID_N_CLS}>{c.note}</span>)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS + CLS_SEP + cssOf(css.cardHeadRow)}>
        {t('diff.title')}
        <span className={diffToneClsOf(tier)}>{t(K_DIFF_HEAD + tier)}</span>
      </div>
      <Grid cols={GRID_COLS_3}>{out}</Grid>
    </div>
  )
}
