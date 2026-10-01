'use client'
/**
 * 域内小件:省份胶囊行(九省,一次看一省;字用界面语言全名,同时间线的省份胶囊)。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
import { Chip } from '@/components/chip'
import { PROV_KEY_HEAD, STREAM_PROVS } from './constants'
import type { ProvChipsIn } from './types'
import css from './streams.module.css'

/**
 * 渲染省份胶囊行。
 *
 * @param props 取词函数、当前省份与逐省手柄。
 * @returns 胶囊行。
 */
export function ProvChips({ t, prov, provPickOf }: ProvChipsIn) {
  const chips = []
  for (const code of STREAM_PROVS) {
    chips.push(<Chip key={code} onClick={provPickOf(code)} active={prov === code}>{t(PROV_KEY_HEAD + code)}</Chip>)
  }
  return <div className={css.chips}>{chips}</div>
}
