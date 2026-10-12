'use client'
/**
 * timeline 域的状态机器:省筛 / 类型筛 / 流筛三格,外加界面语言。
 * 体内不留函数体 —— 带口径的步骤全在 ./functions 的工厂里(注释即它们的 JSDoc),
 * 这里只剩 useState 与工厂装配(形制同 news 的 useNewsFilter)。
 * 三个筛选都是纯客户端的:本页事件不足百条,来回请求不值得。
 * 2026-10-03 资讯页签四分(页签改叫「抽选」):政策公告撤出时间线,类型筛与它的三只手柄撤,剩省筛 / 流筛两格。
 * 2026-10-12 抽选页三段式:流筛改成卡筛(记点中的节奏卡键,按卡的流名清单筛);多交界面语(译名灰字按它取)
 * 与节奏卡的折叠状态(全站折叠件 pager 的 useFold:先出 10 张,「展开 N 条 / 收起」)。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { useState } from 'react'
import { useLang } from '@/components/i18n'
import { useFold } from '@/components/pager'
import { TEXT_NONE } from './constants'
import { makeDrillOf, makeProvPickOf, makeStreamClear } from './functions'
import type { TimelineHookIn, TimelinePanel } from './types'

/**
 * 时间线整机:两个筛选的现值与它们的手柄、界面语、节奏卡折叠。语言/文案全站一处(LangProvider),
 * 初值由服务端 cookie 定,所以取词函数在这里接。
 *
 * @param x 节奏卡折起来的张数。
 * @returns 机器面板。
 */
export function useTimeline(x: TimelineHookIn): TimelinePanel {
  const [lang, , t] = useLang()
  const [prov, setProv] = useState(TEXT_NONE)
  const [pick, setPick] = useState(TEXT_NONE)
  const fold = useFold({ hidden: x.hidden })

  return {
    t,
    lang,
    prov,
    pick,
    extra: fold.extra,
    onMore: fold.onMore,
    onFold: fold.onFold,
    provPickOf: makeProvPickOf({ setProv, setPick }),
    onStreamClear: makeStreamClear({ setPick }),
    drillOf: makeDrillOf({ setProv, setPick }),
  }
}
