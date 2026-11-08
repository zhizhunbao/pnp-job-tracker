'use client'
/**
 * start 域的状态机器:整页那一台(语言、主图数据、担保雇主全量、切省、导航跟随与全部派生)、
 * 每张表各一把的 Top N、手机卡列表的页态。
 * 体内不留函数体 —— 带口径的步骤全在 ./functions 的工厂与 xxxOf 里(注释即它们的 JSDoc),
 * 这里只剩 useState / useMemo、具名 effect 壳与工厂装配(形制同 news 的 useNewsFilter
 * 与 stats 的 useMarketChart)。
 * 2026-08-28 换装批自 Pulse.tsx 的三个组件体收进来。
 * 2026-09-04 重构:雇主表六格筛选 / 五只下拉的三台状态机随筛选下拉撤;抽选 / 政策两处条数档撤,
 * Top N 一度每表各一把,同日 Frank 拍板撤(全量 + 分页);新增职业分表、雇主分表、LMIA 分表、城市行、趋势五份派生。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLang } from '@/components/i18n'
import { useMarketStats } from '@/components/stats'
import { makeT } from '@/lib/i18n'
import {
  DLI_KIND_ALL, EMPTY_DRAWS_PART, EMPTY_EMP_PART, EMPTY_NEWS_PART, EMPTY_OCC_PART, EMPTY_PROV_PART, ID_BOARDS, ID_CITY,
  ID_DRAWS, ID_NEWS, ID_PR_BAND, ID_PROV, ID_SE, LANG_EN, NAV_IDS, PART_DRAWS, PART_EMP, PART_NEWS, PART_OCC,
  PART_PROV, P_SUB, TEXT_NONE,
} from './constants'
import {
  cityAipTableOf, cityIndTablesOf, empSecsOf, foldFlippedOf, indicatorGeosOf, macroPointsOf, makeCityLoad,
  makeMacroLoad,
  opsPointsOf, prGeosOf,
  cityPilotTablesOf, dliKindChipsOf, toCityDliRows, toCityMainRows,
  trackSecView, makeNavWatch,
  makeSponsorLoad, numCardsOf, pilotSecsOf, occSecsOf, provRowsOf, toJobsRows, toDrawCellRows,
  drawsOf, empPiecesOf, makePartLoad, newsOf, nocProvsMapOf,
  partUrlOf, provExtraOf, pageSetOf,
  navSecOrFirstOf, navSubItemsOf, navSubOrFirstOf, pulseSideOf,
  pickOf, makeOnlyWatch,
} from './functions'
import type {
  DrawCellRow, DrawCellRowsIn,
  CardPageIn, CityData, CityPanel, CityPanelIn, CityPilotTable,
  EmpSecsHookIn, EmpSecsPanel, FoldOut, MacroData, OccBoardPanel,
  PulseIn, PulsePanel, PulseSideIn, PulseSideOut, SponsorBoards, TFn, PulseCardsIn, NumCardRow,
  NocProvsMap,
  DrawsPart, EmpPart, NewsPart, OccPart, ProvPart, PulseDerived, PulseDerivedIn, PulsePartHookIn,
} from './types'

/**
 * #313:担保雇主三分表 SSR 只带每表前几十行(RSC payload 6.5MB 瘦身),挂载后拉全量换上
 * (手法照 occ 大表的 /api/stats/market);拉挂 / 拉到空表就继续用 SSR 那几十行,不闪不塌。
 *
 * 2026-11-05 按段懒加载:雇主段到视口附近(on)才拉;SSR 不再带种子,没到手前段渲占位,拉挂给空表(段不渲)。
 *
 * @param on 雇主段到没到视口附近。
 * @returns 全量三分表;还没到手则 null。
 */
export function useSponsorFull(on: boolean): SponsorBoards | null {
  const [full, setFull] = useState<SponsorBoards | null>(null)

  useEffect(function loadSponsors() {
    if (on === false) {
      return
    }
    return makeSponsorLoad({ setSponsorFull: setFull })()
  }, [on])

  return full
}

/**
 * 二级导航的滚动跟随(2026-08-09 Frank「这个地方的高亮也不对啊」)。
 *
 * @returns 当前所在分区的锚点 id;'' = 还没滚到任何分区。
 */
/**
 * 宏观两份的挂载后拉取(2026-09-10 SSR 瘦身:macro_series 通道树批后 ~7,400 行把 /start
 * HTML 撑到 5MB+、水合卡死点击 —— 照 useMarketStats 的形拆出;null = 还在路上,
 * 省份 / PR 两段渲占位)。
 *
 * 2026-11-05 按段懒加载:省份或 PR 段到视口附近(on)才拉。
 *
 * @param on 省份 / PR 段有一个到了视口附近。
 * @returns 两份点;null = 加载中。
 */
export function useMacroStats(on: boolean): MacroData | null {
  const [macroData, setMacroData] = useState<MacroData | null>(null)

  useEffect(function loadMacro() {
    if (on === false) {
      return
    }
    return makeMacroLoad({ setMacroData })()
  }, [on])

  return macroData
}

/**
 * 城市段五份的挂载后拉取(2026-09-11 重设计批,照 useMacroStats 的形;
 * null = 还在路上,段渲占位)。
 *
 * 2026-11-05 按段懒加载:城市段到视口附近(on)才拉。
 *
 * @param on 城市段到没到视口附近。
 * @returns 五份数据;null = 加载中。
 */
export function useCityStats(on: boolean): CityData | null {
  const [cityData, setCityData] = useState<CityData | null>(null)

  useEffect(function loadCity() {
    if (on === false) {
      return
    }
    return makeCityLoad({ setCityData })()
  }, [on])

  return cityData
}

/**
 * 城市段整机:五份数据 + 各表展示行(派生全 useMemo,滚动跟随重渲不重算 2,700 行)。
 *
 * @param x 取词函数与语言。
 * @returns 城市段面板。
 */
export function useCityPanel(x: CityPanelIn): CityPanel {
  const data = useCityStats(x.on)

  const mainRows = useMemo(function pickCityMain() {
    if (data == null) {
      return []
    }
    return toCityMainRows({ rows: data.cities, t: x.t, lang: x.lang })
  }, [data, x.t, x.lang])

  const indTables = useMemo(function pickIndTables() {
    if (data == null) {
      return []
    }
    return cityIndTablesOf({ rows: data.industry, cities: data.cities, t: x.t, lang: x.lang })
  }, [data, x.t, x.lang])

  const pilotTables = useMemo(function pickPilotTables() {
    if (data == null) {
      return []
    }
    const out: CityPilotTable[] = []
    const aip = cityAipTableOf({ cities: data.cities, lang: x.lang, t: x.t })
    if (aip != null) {
      out.push(aip)
    }
    for (const tb of cityPilotTablesOf({ pilots: data.pilots, cities: data.cities, t: x.t })) {
      out.push(tb)
    }
    return out
  }, [data, x.lang, x.t])

  const [dliKind, setDliKind] = useState(DLI_KIND_ALL)
  const dliRows = useMemo(function pickDliRows() {
    if (data == null) {
      return []
    }
    return toCityDliRows({ rows: data.dli, t: x.t, lang: x.lang, kind: dliKind })
  }, [data, x.t, x.lang, dliKind])

  const dliChips = useMemo(function pickDliChips() {
    return dliKindChipsOf({ t: x.t, kind: dliKind, set: setDliKind })
  }, [x.t, dliKind])

  return { data, mainRows, indTables, pilotTables, dliRows, dliChips, dliKind }
}

/**
 * 一张表的折叠状态机(2026-09-10 PR 通道树批:大类行点开出通道细行;开合表按行键记,
 * 默认全收;一表一份,互不牵连)。
 *
 * @returns 开合表与翻转回调。
 */
export function useFold(): FoldOut {
  const [open, setOpen] = useState<Record<string, boolean>>({})

  function flip(key: string): void {
    setOpen(function flipKey(prev) {
      return foldFlippedOf({ prev, key })
    })
  }

  return { open, flip }
}

export function useNavSec(): string {
  const [navSec, setNavSec] = useState(TEXT_NONE)

  useEffect(function watchNav() {
    return makeNavWatch({ ids: NAV_IDS, setNavSec })()
  }, [])

  return navSec
}

/**
 * 首屏四格数字卡(2026-11-07 外框进 /start/layout.tsx:数字卡随 banner 住外框,由 usePulse 挪出)。
 *
 * @param x 取词函数与布局门取好的四格。
 * @returns 四张卡。
 */
export function usePulseCards(x: PulseCardsIn): NumCardRow[] {
  return useMemo(function pickCards() {
    return numCardsOf({ t: x.t, total: x.stats.total, named: x.stats.named, pulse: x.stats.pulse })
  }, [x.t, x.stats.total, x.stats.named, x.stats.pulse])
}

/**
 * 侧栏当前项与手机分区条文字(2026-11-07 两排页签改左侧导航;同日拆页后 Frank「每个页面是不是只显示自己的
 * 不要向下拉」「改成和 learn 那种」:当前子项 = 侧栏点的那一项,不再跟滚动;没点过 = 第一个子项)。
 * 原子导航滚动跟随 useNavSub(09-11 Frank「页面滚动时候 这部分也得亮」)随一页一表撤。
 *
 * @param x 取词函数、这一页的分区、点过的子项。
 * @returns 当前项的键、分区名、子项名。
 */
export function usePulseSide(x: PulseSideIn): PulseSideOut {
  const sec = navSecOrFirstOf(x.navSec)
  const subItems = navSubItemsOf({ t: x.t, navSec: sec })
  const subOn = navSubOrFirstOf({ subSec: x.pick, items: subItems })
  return pulseSideOf({ t: x.t, sec, subOn, subItems })
}

/**
 * 当前子项:读网址参数 `?t=<子项锚点 id>`(侧栏子项链接与分享链接都带;点了 Next 换参数并停在页顶,
 * banner + 卡片 + 表从上往下排 —— 锚点链接会滚到表,把 banner 卷上去)。
 *
 * @returns 子项锚点 id;'' = 没带参数(落第一个子项)。
 */
export function usePick(): string {
  return pickOf(useSearchParams().get(P_SUB))
}

/**
 * 只显示当前子项那一块(Microsoft Learn 一篇一页的形):本页所有子块里 id 不等于 on 的藏起来,
 * 懒加载后才挂上的子块同样处理。
 *
 * @param on 当前子项锚点 id。
 * @returns 无。
 */
export function useOnlyBlock(on: string): void {
  useEffect(function watchOnly() {
    return makeOnlyWatch(on)()
  }, [on])
}

/**
 * 抽选主文案要的英文取词函数(官方英文名与界面语言无关,整页只造一次)。
 *
 * @returns 英文取词函数。
 */
export function useEnglishT(): TFn {
  return useMemo(function makeEnglish() {
    return makeT(LANG_EN)
  }, [])
}

/**
 * 手机卡片列表的页态(桌面表格的页态在 Table 里,俩视图同刻只显示一个,各翻各的)。
 * 换了一榜(行的身份变了)就回第一页 —— 比对的是**原始行数组的身份**,不是洗过的展示行
 * (那份每次渲染都是新数组,拿它比会每帧回第一页)。
 * 2026-09-30 抽选表实撞:DrawsSection 递进来的正是现洗的展示行,滚动一重渲染就回第一页;展示行改走 useDrawRows 记住。
 *
 * @param x 本榜的原始行与每页几行。
 * @returns 当前页、总页数与翻页手柄。
 */
export function useCardPage(x: CardPageIn): OccBoardPanel {
  const [page, setPage] = useState(0)
  const [rowsSeen, setRowsSeen] = useState(x.rows)
  if (x.rows !== rowsSeen) {
    setRowsSeen(x.rows)
    setPage(0)
  }
  const maxPage = Math.max(1, Math.ceil(x.rows.length / x.pageSize))
  return { page: Math.min(page, maxPage - 1), maxPage, onPage: setPage }
}

/**
 * 雇主段的行业分表 + 三试点表(身份档 2026-09-12 Frank「用一张表就行了」随两档合并退役)。
 * 2026-11-05 按段懒加载:原料两份 —— 雇主段那一份(试点名单、简介、职业名)与担保雇主全量,都到了才出表;
 * 有一份没到 = loading(段渲占位)。SSR 种子随之退役。
 *
 * @param x 雇主段那一份、担保雇主全量与语言。
 * @returns 分表与在途态。
 */
export function useEmpSecs(x: EmpSecsHookIn): EmpSecsPanel {
  const [, , t] = useLang()
  const part = x.part
  const sponsor = x.sponsor

  const pieces = useMemo(function pickEmpPieces() {
    if (part == null) {
      return null
    }
    return empPiecesOf({ part, lang: x.lang })
  }, [part, x.lang])

  const secs = useMemo(function pickEmpSecs() {
    if (pieces == null || sponsor == null) {
      return []
    }
    return empSecsOf({ t, sponsor, nocCat: pieces.nocCat, nocInfo: pieces.nocInfo, extra: pieces.extra, lang: x.lang })
  }, [t, sponsor, pieces, x.lang])

  const pilotSecs = useMemo(function pickPilotSecs() {
    if (pieces == null || sponsor == null) {
      return []
    }
    return pilotSecsOf({
      t, sponsor, nocCat: pieces.nocCat, nocInfo: pieces.nocInfo, extra: pieces.extra, lang: x.lang,
    })
  }, [t, sponsor, pieces, x.lang])

  return { secs, pilotSecs, loading: pieces == null || sponsor == null }
}

/**
 * 一段数据的取数(/api/stats/pulse?part=…):on 了才拉,换语言重拉;接口挂了给空份(段不渲)。
 *
 * @param x 段名、语言、开关与空份。
 * @returns 那一段;还没到给 null。
 */
export function usePulsePart<T>(x: PulsePartHookIn<T>): T | null {
  const [data, setData] = useState<T | null>(null)
  const url = partUrlOf({ part: x.part, lang: x.lang })
  const empty = x.empty

  useEffect(function loadPart() {
    if (x.on === false) {
      return
    }
    return makePartLoad<T>({ url, set: setData, empty })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 空份是常量,不进依赖
  }, [x.on, url])

  return data
}

/**
 * 把脉首页的整机:界面语言、各段数据、导航跟随,
 * 以及吃这些现值算出来的派生(职业分表 / 雇主分表 / 省份 / PR / 抽选 / 政策)。
 * 2026-11-05 按段懒加载:SSR 只给首屏四格,其余各段的原料全部改成到了视口附近才取。
 * 2026-11-07 拆页后 Frank「把脉页可以去掉懒加载了吧。点哪个加载哪个吧」:一页一段,进页就取这一段,
 * 不再盯视口(原 useNearBands / makeNearWatch 一整套随之删除)。
 *
 * @param x 页面门取好的首屏四格。
 * @returns 整机面板。
 */
export function usePulse(x: PulseIn): PulsePanel {
  const [lang, , t] = useLang()
  const near = pageSetOf(x.sec)
  const empOn = near.has(ID_SE)
  const provOn = near.has(ID_PROV)
  const occ = usePulsePart<OccPart>({ part: PART_OCC, lang, on: near.has(ID_BOARDS), empty: EMPTY_OCC_PART })
  const emp = usePulsePart<EmpPart>({ part: PART_EMP, lang, on: empOn, empty: EMPTY_EMP_PART })
  const prov = usePulsePart<ProvPart>({ part: PART_PROV, lang, on: provOn, empty: EMPTY_PROV_PART })
  const draws = usePulsePart<DrawsPart>({ part: PART_DRAWS, lang, on: near.has(ID_DRAWS), empty: EMPTY_DRAWS_PART })
  const news = usePulsePart<NewsPart>({ part: PART_NEWS, lang, on: near.has(ID_NEWS), empty: EMPTY_NEWS_PART })
  const market = useMarketStats(provOn)
  const macroData = useMacroStats(provOn || near.has(ID_PR_BAND))
  const sponsor = useSponsorFull(empOn)
  const empSecs = useEmpSecs({ part: emp, sponsor, lang })
  const navSec = useNavSec()
  const tEn = useEnglishT()
  const derived = usePulseDerived({ t, lang, occ, provExtra: provExtraOf(prov), macroData, market })

  useEffect(function trackSecChange() {
    if (navSec !== TEXT_NONE) {
      trackSecView(navSec)
    }
  }, [navSec])

  return {
    t,
    lang,
    market,
    occSecs: derived.occSecs,
    empSecs: empSecs.secs,
    pilotSecs: empSecs.pilotSecs,
    nocProvs: derived.nocProvs,
    indGeos: derived.indGeos,
    prGeos: derived.prGeos,
    jobsRows: derived.jobsRows,
    tEn,
    navSec,
    macroLoading: macroData == null,
    empLoading: empSecs.loading,
    draws: drawsOf(draws),
    news: newsOf(news),
    cityOn: near.has(ID_CITY),
  }
}

/**
 * usePulse 的派生半边(自它拆出,守函数 75 行闸):职业分表、紧缺省映射、省份 / PR 两段的指标表与招聘对比行。
 * 派生全 useMemo,滚动跟随重渲不重算。
 *
 * @param x 取词、语言、职业段那一份、省卡增补、宏观两份与主图数据。
 * @returns 派生面板。
 */
function usePulseDerived(x: PulseDerivedIn): PulseDerived {
  const occ = x.occ
  const nocProvs: NocProvsMap = useMemo(function pickNocProvs() {
    return nocProvsMapOf(occ)
  }, [occ])

  const occSecs = useMemo(function pickOccSecs() {
    if (occ == null) {
      return null
    }
    return occSecsOf({ t: x.t, natOcc: occ.natOcc })
  }, [x.t, occ])

  const indGeos = useMemo(function pickIndGeos() {
    return indicatorGeosOf({
      t: x.t,
      lang: x.lang,
      macro: macroPointsOf(x.macroData),
      ops: opsPointsOf(x.macroData),
      provExtra: x.provExtra,
    })
  }, [x.t, x.lang, x.macroData, x.provExtra])

  const prGeos = useMemo(function pickPrGeos() {
    return prGeosOf({ t: x.t, lang: x.lang, macro: macroPointsOf(x.macroData), ops: opsPointsOf(x.macroData) })
  }, [x.t, x.lang, x.macroData])

  const jobsRows = useMemo(function pickJobsRows() {
    return toJobsRows({ rows: provRowsOf({ market: x.market }), t: x.t, lang: x.lang, extra: x.provExtra })
  }, [x.market, x.t, x.lang, x.provExtra])

  return { occSecs, nocProvs, indGeos, prGeos, jobsRows }
}

/**
 * 近期抽选表的展示行,内容没变就是同一份(2026-09-30 Frank 选「现在修」:把脉页翻页一滚动就跳回第 1 页)。
 * 原先 DrawsSection 每次渲染现洗一份新数组,递给卡片页态(useCardPage)与桌面表格(Table 的 useRows),两边都拿行数组的身份判
 * 「换了一榜」;滚动时导航跟随重渲染整页,两边就回第一页(实测翻到 3 / 6 滚三下回 1 / 6,补在第 6 页的 NS / ON 两行手机上
 * 几乎看不到;职业榜与雇主表的行本来就记住了,不受影响)。按原始行、两套取词函数与界面语言记住
 * (2026-11-05 Frank「通道名加链接再删」:门槛弹框撤,弹框手柄随之不再参与)。
 *
 * @param x 抽选行、两套取词函数与界面语言。
 * @returns 展示行。
 */
export function useDrawRows(x: DrawCellRowsIn): DrawCellRow[] {
  return useMemo(function pickDrawRows() {
    return toDrawCellRows({ rows: x.rows, t: x.t, tEn: x.tEn, lang: x.lang })
  }, [x.rows, x.t, x.tEn, x.lang])
}
