'use client'
/**
 * 域内小件:省份段地区块的标题 —— 通行短名 + 地区码灰注 + 译名 + 竞争度胶囊
 * (Frank 2026-09-06「竞争度和 PR 数量是需要的」:竞争度挂块标题右侧)。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { GEO_CA, TEXT_NONE } from './constants'
import type { GeoTitleIn } from './types'
import css from './start.module.css'

/**
 * 渲染地区块标题。
 *
 * @param props 地区块。
 * @returns 一行标题内容(放进 Sec 的 h2)。
 */
export function GeoTitle({ geo }: GeoTitleIn) {
  return (
    <>
      <span className={css.provName}>{geo.name}</span>
      {geo.code !== GEO_CA && <span className={css.provCode}>{geo.code}</span>}
      {geo.localeName !== TEXT_NONE && <span className={css.note}>{geo.localeName}</span>}
      {geo.tierCls !== TEXT_NONE && <span className={geo.tierCls}>{geo.tierText}</span>}
    </>
  )
}
