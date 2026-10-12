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
import { KIND_KEY_HEAD, LEN_KEY_HEAD, TEXT_NONE } from './constants'
import {
  applyStartProv, applyStartSteps, filterOf, makeAddEdu, makeClearEdu, makeClearWho, makeEduPickOf, makeEduProvLabel,
  makeEduRemoveOf, makeLabelOf, makeProvPickOf, makeStepsProvPickOf, makeWhoPickOf,
} from './functions'
import type { StepsPanel, StepsState, StreamsPanel } from './types'

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
 * 「申请步骤」页整机(2026-10-11 申请步骤分区筛选批 1;设计 docs/design/资讯/申请步骤-分区筛选-20261011.md):
 * 取词函数、界面语言、筛选状态(省份含「全部省份」/ 身份 / 教育经历,整份跟着地址走)与各手柄。
 * 挂载时认一次地址;不按时区预选省份(Frank「省份 可能 不需要选」)。
 * @returns 机器面板。
 */
export function useSteps(): StepsPanel {
  const [lang, , t] = useLang()
  const [s, setS] = useState<StepsState>({ prov: TEXT_NONE, who: TEXT_NONE, edu: [] })

  useEffect(function presetFromUrl() {
    applyStartSteps({ setS })
  }, [])

  const x = { s, setS }
  return {
    t,
    lang,
    s,
    filter: filterOf(s),
    provPickOf: makeStepsProvPickOf(x),
    whoPickOf: makeWhoPickOf(x),
    clearWho: makeClearWho(x),
    eduPickOf: makeEduPickOf(x),
    addEdu: makeAddEdu(x),
    eduRemoveOf: makeEduRemoveOf(x),
    clearEdu: makeClearEdu(x),
    eduProvLabel: makeEduProvLabel(t),
    eduKindLabel: makeLabelOf({ t, head: KIND_KEY_HEAD }),
    eduLenLabel: makeLabelOf({ t, head: LEN_KEY_HEAD }),
  }
}
