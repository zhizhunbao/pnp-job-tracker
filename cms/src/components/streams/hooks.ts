'use client'
/**
 * streams 域的状态机器:当前省份 + 界面语言;挂载时按设备时区预选一次。
 * 体内不留函数体 —— 带口径的步骤在 ./functions(形制同 timeline 的 useTimeline)。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { TEXT_NONE } from './constants'
import { applyStartProv, makeProvPickOf } from './functions'
import type { StreamsPanel } from './types'

/**
 * 「通道与门槛」页整机:取词函数、界面语言、当前省份与逐省手柄。
 *
 * @returns 机器面板。
 */
export function useStreams(): StreamsPanel {
  const [lang, , t] = useLang()
  const [prov, setProv] = useState(TEXT_NONE)

  useEffect(function presetHomeProv() {
    applyStartProv({ setProv })
  }, [])

  return { t, lang, prov, provPickOf: makeProvPickOf({ setProv }) }
}
