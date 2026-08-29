'use client'
/**
 * plan 域的结构:一张该职业分省竞争手机卡。竞争比不在这里第三处重复
 * (2026-08-15 随初评表格化):初评与竞争卡已各有一份。
 * 2026-08-28 换装批自 Decision.tsx 的 dpOccCards 行提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import type { OccCompCardRowIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一张职业竞争手机卡。
 *
 * @param props 这一行展示行。
 * @returns 一张卡。
 */
export function OccCompCardRow({ r }: OccCompCardRowIn) {
  return (
    <div className={css.occRow}>
      <div className={css.rowHead}>
        <b className={css.rowProv}>{r.provName}</b>
        <span className={css.rowCode}>{r.provCode}</span>
        <span className={css.rowNum}>{r.openMain}</span>
      </div>
      <div className={css.occMeta}>{r.meta}</div>
    </div>
  )
}
