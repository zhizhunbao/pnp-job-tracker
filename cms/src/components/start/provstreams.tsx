'use client'
/**
 * 域内小件:该省提名通道那一行(与 /stats 省页同源 stream_labels)。
 * 无清单的省整行不出 —— **不写「暂无」**。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Tag } from '@/components/tag'
import { SEP_LIST, TAG_VARIANT_WARN } from './constants'
import { makeStreamLabel } from './functions'
import type { ProvStreamsIn } from './types'
import css from './start.module.css'

/**
 * 渲染该省提名通道那一行。
 *
 * @param props 取词函数与通道名清单串。
 * @returns 一行标签。
 */
export function ProvStreams({ t, labels }: ProvStreamsIn) {
  const label = makeStreamLabel({ t })
  const tags = []
  for (const s of labels.split(SEP_LIST)) {
    tags.push(<Tag key={s} variant={TAG_VARIANT_WARN}>{label(s)}</Tag>)
  }
  return (
    <div className={css.streams}>
      <span className={css.nowrap}>{t('pulse.s4.streams')}</span>
      {tags}
    </div>
  )
}
