'use client'
/**
 * 域内小件:节奏状态胶囊(2026-10-12 抽选页三段式;小信号一律胶囊)—— 比平常晚出 warn「比平常晚」、
 * 久未抽选出 gray「久未抽选」,正常不出。状态在数据层判好(比平均间隔多晚 7 天以上且超 1.5 倍 / 3 倍)。
 *
 * @author Frank
 * @time 2026-10-12 17:30:00
 */
import { Tag } from '@/components/tag'
import { STATUS_IDLE, STATUS_LATE, TAG_GRAY, TAG_WARN } from './constants'
import type { StatusTagIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染状态胶囊。
 *
 * @param props 取词函数与节奏状态。
 * @returns 胶囊;正常时不渲。
 */
export function StatusTag({ t, status }: StatusTagIn) {
  if (status === STATUS_LATE) {
    return <span className={css.tags}><Tag variant={TAG_WARN}>{t('tl.late')}</Tag></span>
  }
  if (status === STATUS_IDLE) {
    return <span className={css.tags}><Tag variant={TAG_GRAY}>{t('tl.idle')}</Tag></span>
  }
  return null
}
