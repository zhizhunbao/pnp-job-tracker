'use client'
/**
 * timeline 域的状态机器:省筛 / 类型筛 / 流筛三格,外加界面语言。
 * 体内不留函数体 —— 带口径的步骤全在 ./functions 的工厂里(注释即它们的 JSDoc),
 * 这里只剩 useState 与工厂装配(形制同 news 的 useNewsFilter)。
 * 三个筛选都是纯客户端的:本页事件不足百条,来回请求不值得。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { useState } from 'react'
import { useLang } from '@/components/i18n'
import { KIND_POLICY, TEXT_NONE } from './constants'
import { makeDrillOf, makeKindDraw, makeKindPick, makeProvPickOf, makeStreamClear } from './functions'
import type { TimelinePanel } from './types'

/**
 * 时间线整机:三个筛选的现值与它们的手柄。语言/文案全站一处(LangProvider),
 * 初值由服务端 cookie 定,所以取词函数在这里接。
 *
 * @returns 机器面板(取词函数、三个筛选的现值、四只手柄与两个手柄工厂)。
 */
export function useTimeline(): TimelinePanel {
  const [, , t] = useLang()
  const [prov, setProv] = useState(TEXT_NONE)
  const [kind, setKind] = useState(TEXT_NONE)
  const [stream, setStream] = useState(TEXT_NONE)

  return {
    t,
    prov,
    kind,
    stream,
    provPickOf: makeProvPickOf({ setProv, setStream }),
    onKindAll: makeKindPick({ setKind, setStream, kind: TEXT_NONE }),
    onKindDraw: makeKindDraw({ setKind }),
    onKindPolicy: makeKindPick({ setKind, setStream, kind: KIND_POLICY }),
    onStreamClear: makeStreamClear({ setStream }),
    drillOf: makeDrillOf({ setProv, setKind, setStream }),
  }
}
