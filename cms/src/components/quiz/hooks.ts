'use client'
/**
 * quiz 域的状态机器:选职业控件的十格状态(已选码、名字表、搜索词与候选、在途标、
 * 热门榜与真榜到没到、当前分类与分类目录、防抖计时器)与目标省控件的两格状态。
 * 体内不留函数体 —— 带口径的步骤全在 ./functions 的工厂与在途工作者里
 * (注释即它们的 JSDoc),这里只剩 useState、具名 effect 壳与工厂装配
 * (形制同 news 的 useCarousel 与 account 的 useAccountPage)。
 * 2026-08-28 换装批自 OccPicker.tsx / ProvincePicker.tsx 的组件体收进来。
 * 2026-10-04 A2:选职业整机多收专业码(热门那一屏按专业取,取的路上整排骨架),面板多交整份落格与「码 + 名」两格
 * (大号档借 profile 桶已选标签件要的)。同日收口:面板再交「按专业取的还在路上」一格(大号档的已选标签这一拍不渲)。
 * 2026-10-05:多一格组键表(点选 / 逐码查询记下的「码 → 中文短名」),与几份清单里带短名的行叠成此刻的组键;
 * 面板交出的清单、命中、已选都按它收拢成职业(同组几个码一个),码本身照旧整份回传。
 * 2026-10-05 访客第 3 题改左右两栏(Frank「也改成左右 两部分吗?」「改啊」):面板多交左栏的切换手柄(onRail,与分类页签改同一格
 * 当前分类);上面 A2 那句「整份落格与『码 + 名』两格」(setNocs / named,借 profile 桶已选标签件要的)撤 —— 已选一行改由本桶自己摆,
 * × 走 pickOf。「按专业取的还在路上」一格照交(停在推荐时右边那块摆加载中)。
 * 同日收口:面板多交 searchOn(在不在搜,isOccQuery 判;原常规档 OccBody 与大号档 OccRail 各写一遍)。
 * 同日 Frank「点过来的时候 有一个闪 的过程」:访客向导开屏就挂这台机器(第 2 题时专业码还在变),首屏取数改成专业码一变就重取
 * (上一趟中止),换码那一拍把「真榜到了」撤回(渲染里比对上一次的码,不另起 effect),免得第 3 题先摆旧专业的推荐再换。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { useEffect, useRef, useState } from 'react'
import { TEXT_NONE } from './constants'
import {
  broadCats, dupCountOf, initialTitlesOf, isAllOn, isOccQuery, makeAllPick, makeBootstrap, makeCatPickOf, makeCatSelect,
  makeCatalogLoad, makeCandPickOf, makeOccNext, makePickOf, makeProvAny, makeProvDone,
  makeProvPickOf, makeRailPick, makeSearch, makeSearchRun, makeTitlesFill, occBaseOf, occItemsOf, occKeysOf, occListOf,
  pickedOf, topGivenOf, topSeedOf,
} from './functions'
import type {
  Cand, CatalogMap, KeyMap, OccPanel, OccPickerHookIn, OccSearchHookIn, PickOfIn, ProvPanel, ProvPickerHookIn, TitleMap,
  Top, TopForIn,
} from './types'

/**
 * 选职业整机。首屏先用内置常用清单,不让冷启动的全表 GROUP BY 把题目冻成骨架 8 秒;
 * 服务端给了热门榜就一次成型,一个请求都不发。
 * 2026-10-04 A2:给了专业码,首屏不摆内置清单(与专业对不上,先摆再换就是一次重排),整排骨架等按专业取的那份。
 *
 * @param x 取词函数、界面语言码、进来时已选的码、服务端热门榜、两个出口与专业码。
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
    return topSeedOf({ t: x.t, initialTop: x.initialTop, majorCode: x.majorCode })
  })
  const [topLoaded, setTopLoaded] = useState(topGivenOf({ initialTop: x.initialTop }))
  useTopFor({ majorCode: x.majorCode, setTopLoaded })
  const [cat, setCat] = useState(TEXT_NONE)
  const [catalogByCat, setCatalogByCat] = useState<CatalogMap>({})
  const [keys, setKeys] = useState<KeyMap>({})
  const known = occKeysOf({ keys, top, catalog: catalogByCat, cands })

  useEffect(function bootstrap() {
    if (topGivenOf({ initialTop: x.initialTop })) {
      return
    }
    return makeBootstrap({ setTop, setTopLoaded, setTitles, nocs, lang: x.lang, majorCode: x.majorCode })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 首屏快照只拉一次;语言切换由逐码查询刷新;2026-10-05 起专业码一变重取(访客向导开屏就挂)
  }, [x.majorCode])

  useEffect(function loadCatalog() {
    if (cat === TEXT_NONE) {
      return
    }
    if (Object.prototype.hasOwnProperty.call(catalogByCat, cat)) {
      return
    }
    return makeCatalogLoad({ cat, setCatalogByCat })()
  }, [cat, catalogByCat])

  useOccSearch({ q, setCands, setSearching })

  useEffect(function fillTitles() {
    return makeTitlesFill({ nocs, titles, keys: known, lang: x.lang, setTitles, setKeys })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- titles 是这个 effect 的产物,进依赖会自己触发自己
  }, [nocs, x.lang])

  const catRows = catalogByCat[cat]
  const hold = x.majorCode !== TEXT_NONE && topLoaded === false
  const base = occBaseOf({ t: x.t, top, hold })
  const list = occListOf({ cat, catRows, base, keys: known })
  const picked = pickedOf({ nocs, keys: known })
  const pick: PickOfIn = { nocs, keys: known, setNocs, setTitles, setKeys, onChange: x.onChange, setQ, setCands }

  return {
    picked,
    titles,
    q,
    searchOn: isOccQuery(q),
    hits: occItemsOf({ rows: cands, keys: known }),
    searching,
    cat,
    cats: broadCats(),
    list,
    catLoading: cat !== TEXT_NONE && catRows == null,
    topLoaded,
    hold,
    dupCount: dupCountOf({ list, lang: x.lang }),
    onSearch: makeSearch({ setQ, setCands }),
    candPickOf: makeCandPickOf(pick),
    pickOf: makePickOf(pick),
    catPickOf: makeCatPickOf({ setCat }),
    onCatSelect: makeCatSelect({ setCat }),
    onRail: makeRailPick({ setCat }),
    allOn: isAllOn({ items: list, picked }),
    onAll: makeAllPick({ p: pick, items: list, lang: x.lang }),
    onNext: makeOccNext({ nocs, onDone: x.onDone }),
  }
}

/**
 * 专业码一变就把「真榜到了」撤回(在渲染里比对上一次的码 —— React 文档「props 变了调整 state」的写法,不另起 effect,
 * 不多闪一帧)。2026-10-05 访客向导开屏就挂选职业机器时立,自 useOccPicker 拆出(函数行数闸)。
 *
 * @param x 现在的专业码与「真榜到了」的 setter。
 * @returns 无。
 */
function useTopFor(x: TopForIn): void {
  const [topFor, setTopFor] = useState(x.majorCode)
  if (topFor !== x.majorCode) {
    setTopFor(x.majorCode)
    x.setTopLoaded(false)
  }
}

/**
 * 搜索的防抖运行器(计时器住这里)。2026-10-05 自 useOccPicker 拆出(函数行数闸),行为不变。
 *
 * @param x 搜索词与两个 setter。
 * @returns 无。
 */
function useOccSearch(x: OccSearchHookIn): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { setCands, setSearching } = x
  useEffect(function runSearch() {
    return makeSearchRun({ q: x.q, timer, setCands, setSearching })()
  }, [x.q, setCands, setSearching])
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
