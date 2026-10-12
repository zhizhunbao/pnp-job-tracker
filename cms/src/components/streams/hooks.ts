'use client'
/**
 * streams 域的状态机器:当前省份 + 界面语言;挂载时按设备时区预选一次。
 * 体内不留函数体 —— 带口径的步骤在 ./functions(形制同 timeline 的 useTimeline)。
 * 2026-10-03 资讯页签四分:「申请步骤」页(同桶 Steps)也用这一台(同一排省份胶囊、同一个预选口径)。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { TEXT_NONE } from './constants'
import { applyStartProv, applyStartStepsProv, makeProvPickOf } from './functions'
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

/**
 * 「申请步骤」页整机(2026-10-11 申请步骤分区筛选批 1;2026-10-12 Frank「去掉其他筛选,只保留省份切换」后只剩省份):
 * 取词函数、界面语言、当前省份(含 all = 全部省份)与逐省手柄;挂载时认一次地址,不按时区预选。
 * @returns 机器面板。
 */
export function useSteps(): StreamsPanel {
  const [lang, , t] = useLang()
  const [prov, setProv] = useState(TEXT_NONE)

  useEffect(function presetFromUrl() {
    applyStartStepsProv({ setProv })
  }, [])

  return { t, lang, prov, provPickOf: makeProvPickOf({ setProv }) }
}
