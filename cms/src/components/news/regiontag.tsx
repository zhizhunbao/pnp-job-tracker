'use client'
/**
 * 域内小件:地区标 —— 省名/联邦名的小药丸,列表、头条、详情三处共用同一枚。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { regionClsOf, regionLabelOf } from './functions'
import type { RegionTagIn } from './types'

/**
 * 渲染一枚地区标。
 *
 * @param props 取词函数与地区码。
 * @returns 地区标。
 */
export function RegionTag({ t, region }: RegionTagIn) {
  return (
    <span className={regionClsOf({ region })}>{regionLabelOf({ t, region })}</span>
  )
}
