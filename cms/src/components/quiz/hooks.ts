'use client'
/**
 * quiz 域的状态机器:选职业控件的十格状态(已选码、名字表、搜索词与候选、在途标、
 * 热门榜与真榜到没到、当前分类与分类目录、防抖计时器)与目标省控件的两格状态。
 * 体内不留函数体 —— 带口径的步骤全在 ./functions 的工厂与在途工作者里
 * (注释即它们的 JSDoc),这里只剩 useState、具名 effect 壳与工厂装配
 * (形制同 news 的 useCarousel 与 account 的 useAccountPage)。
 * 2026-08-28 换装批自 OccPicker.tsx / ProvincePicker.tsx 的组件体收进来。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { useEffect, useRef, useState } from 'react'
import { LEN_ZERO, TEXT_NONE } from './constants'
import {
  broadCats, dupCountOf, initialTitlesOf, makeBootstrap, makeCatPickOf, makeCatSelect,
  makeCatalogLoad, makeCandPickOf, makeOccNext, makePickOf, makeProvAny, makeProvDone,
  makeProvPickOf, makeSearch, makeSearchRun, makeTitlesFill, occBaseOf, occListOf, popularRowsOf,
  topGivenOf,
} from './functions'
import type {
  Cand, CatalogMap, OccPanel, OccPickerHookIn, PickOfIn, ProvPanel, ProvPickerHookIn, TitleMap, Top,
} from './types'

/**
 * 选职业整机。首屏先用内置常用清单,不让冷启动的全表 GROUP BY 把题目冻成骨架 8 秒;
 * 服务端给了热门榜就一次成型,一个请求都不发。
 *
 * @param x 取词函数、界面语言码、进来时已选的码、服务端热门榜与两个出口。
 * @returns 十格状态的现值 + 五只手柄与三个手柄工厂。
 */
export function useOccPicker(x: OccPickerHookIn): OccPanel {
  const [nocs, setNocs] = useState<string[]>(x.initial)
  const [titles, setTitles] = useState<TitleMap>(function initTitles(): TitleMap {
    return initialTitlesOf({ t: x.t, initial: x.initial })
  })
  const [q, setQ] = useState(TEXT_NONE)
  const [cands, setCands] = useState<Cand[]>([])
  const [searching, setSearching] = useState(false)
  const [top, setTop] = useState<Top[]>(function initTop(): Top[] {
    const given = x.initialTop
    if (given != null && given.length > LEN_ZERO) {
      return given
    }
    return popularRowsOf({ t: x.t })
  })
  const [topLoaded, setTopLoaded] = useState(topGivenOf({ initialTop: x.initialTop }))
  const [cat, setCat] = useState(TEXT_NONE)
  const [catalogByCat, setCatalogByCat] = useState<CatalogMap>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(function bootstrap() {
    if (topGivenOf({ initialTop: x.initialTop })) {
      return
    }
    return makeBootstrap({ setTop, setTopLoaded, setTitles, nocs, lang: x.lang })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 首屏快照只拉一次;语言切换由逐码查询刷新
  }, [])

  useEffect(function loadCatalog() {
    if (cat === TEXT_NONE) {
      return
    }
    if (Object.prototype.hasOwnProperty.call(catalogByCat, cat)) {
      return
    }
    return makeCatalogLoad({ cat, setCatalogByCat })()
  }, [cat, catalogByCat])

  useEffect(function runSearch() {
    return makeSearchRun({ q, timer, setCands, setSearching })()
  }, [q])

  useEffect(function fillTitles() {
    return makeTitlesFill({ nocs, titles, lang: x.lang, setTitles })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- titles 是这个 effect 的产物,进依赖会自己触发自己
  }, [nocs, x.lang])

  const catRows = catalogByCat[cat]
  const base = occBaseOf({ t: x.t, top })
  const list = occListOf({ cat, catRows, base })
  const pick: PickOfIn = { nocs, setNocs, setTitles, onChange: x.onChange, setQ, setCands }

  return {
    nocs,
    titles,
    q,
    cands,
    searching,
    cat,
    cats: broadCats(),
    list,
    catLoading: cat !== TEXT_NONE && catRows == null,
    topLoaded,
    dupCount: dupCountOf({ list, lang: x.lang }),
    onSearch: makeSearch({ setQ, setCands }),
    candPickOf: makeCandPickOf(pick),
    pickOf: makePickOf(pick),
    catPickOf: makeCatPickOf({ setCat }),
    onCatSelect: makeCatSelect({ setCat }),
    onNext: makeOccNext({ nocs, onDone: x.onDone }),
  }
}

/**
 * 目标省整机。「还不确定」与十省是**互斥**的两态:选了具体省就不再是「还不确定」,
 * 选「还不确定」就把具体省清空。
 *
 * @param x 进来时已选的省码与「还不确定」态、三个出口。
 * @returns 两格状态的现值 + 三只手柄与一个手柄工厂。
 */
export function useProvincePicker(x: ProvPickerHookIn): ProvPanel {
  const [selected, setSelected] = useState<string[]>(x.initial)
  const [anyProv, setAnyProv] = useState(x.unsure === true)

  const panel: ProvPanel = {
    selected,
    anyProv,
    pickOf: makeProvPickOf({ selected, setSelected, setAnyProv, onChange: x.onChange }),
    onAny: makeProvAny({ setSelected, setAnyProv, onChange: x.onChange }),
    onNext: makeProvDone({ selected, anyProv, onDone: x.onDone }),
  }
  if (x.onFinish != null) {
    panel.onFinish = makeProvDone({ selected, anyProv, onDone: x.onFinish })
  }
  return panel
}
