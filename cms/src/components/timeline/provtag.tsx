'use client'
/**
 * 域内小件:省/联邦标 —— 节奏卡与事件行两处共用同一枚。省码为空 = 联邦发的,
 * 不是「省份没记」,所以那一档出的是「联邦」的字而不是空标。
 * 2026-08-28 换装批自 Timeline.tsx 的 provTag 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { Tag } from '@/components/tag'
import { TAG_FEDERAL, TAG_REGION, TEXT_NONE } from './constants'
import type { ProvTagIn } from './types'

/**
 * 渲染一枚省/联邦标。
 *
 * @param props 取词函数与省码。
 * @returns 省标或联邦标。
 */
export function ProvTag({ t, prov }: ProvTagIn) {
  if (prov === TEXT_NONE) {
    return <Tag variant={TAG_FEDERAL}>{t('tl.fed')}</Tag>
  }
  return <Tag variant={TAG_REGION}>{prov}</Tag>
}
