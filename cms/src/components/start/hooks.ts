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
import { useLang } from '@/components/i18n'
import { useMarketStats } from '@/components/stats'
import { makeT } from '@/lib/i18n'
import { DLI_KIND_ALL, LANG_EN, NAV_IDS, SUB_IDS_SEP, TEXT_NONE } from './constants'
import {
  cityAipTableOf, cityIndTablesOf, empSecsOf, foldFlippedOf, indicatorGeosOf, macroPointsOf, makeCityLoad,
  makeMacroLoad,
  opsPointsOf, prGeosOf,
  cityPilotTablesOf, dliKindChipsOf, toCityDliRows, toCityMainRows,
  trackSecView, makeNavWatch,
  makeSponsorLoad, nocInfoOf, numCardsOf, pilotSecsOf, occSecsOf, provRowsOf, toJobsRows,
} from './functions'
import type {
  CardPageIn, CityData, CityPanel, CityPanelIn, CityPilotTable,
  EmpExtra, EmpSecsHookIn, EmpSecsPanel, FoldOut, MacroData, NocCatMap, OccBoardPanel,
  NavSubIn, PulseIn, PulsePanel, SponsorBoards, TFn,
  NocProvsMap,
} from './types'

/**
 * #313:担保雇主三分表 SSR 只带每表前几十行(RSC payload 6.5MB 瘦身),挂载后拉全量换上
 * (手法照 occ 大表的 /api/stats/market);拉挂 / 拉到空表就继续用 SSR 那几十行,不闪不塌。
 *
 * @returns 全量三分表;还没到手则 null。
 */
export function useSponsorFull(): SponsorBoards | null {
  const [full, setFull] = useState<SponsorBoards | null>(null)

  useEffect(function loadSponsors() {
    return makeSponsorLoad({ setSponsorFull: setFull })()
  }, [])

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
 * @returns 两份点;null = 加载中。
 */
export function useMacroStats(): MacroData | null {
  const [macroData, setMacroData] = useState<MacroData | null>(null)

  useEffect(function loadMacro() {
    return makeMacroLoad({ setMacroData })()
  }, [])

  return macroData
}

/**
 * 城市段五份的挂载后拉取(2026-09-11 重设计批,照 useMacroStats 的形;
 * null = 还在路上,段渲占位)。
 *
 * @returns 五份数据;null = 加载中。
 */
export function useCityStats(): CityData | null {
  const [cityData, setCityData] = useState<CityData | null>(null)

  useEffect(function loadCity() {
    return makeCityLoad({ setCityData })()
  }, [])

  return cityData
}

/**
 * 城市段整机:五份数据 + 各表展示行(派生全 useMemo,滚动跟随重渲不重算 2,700 行)。
 *
 * @param x 取词函数与语言。
 * @returns 城市段面板。
 */
export function useCityPanel(x: CityPanelIn): CityPanel {
  const data = useCityStats()

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

  return { data, mainRows, indTables, pilotTables, dliRows, dliChips }
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
 * 子导航行的滚动跟随(2026-09-11 Frank「页面滚动时候 这部分也得亮」):跟随机同 useNavSec,
 * 锚点清单 = 当前段的子项,段切换整份换(依赖键 = 清单拼串,同段重渲不重挂监听)。
 *
 * @param x 子锚点清单。
 * @returns 当前子分区 id;'' = 还没滚到任何子锚点。
 */
export function useNavSub(x: NavSubIn): string {
  const [subSec, setSubSec] = useState(TEXT_NONE)
  const key = x.ids.join(SUB_IDS_SEP)

  useEffect(function watchSub() {
    return makeNavWatch({ ids: key.split(SUB_IDS_SEP), setNavSec: setSubSec })()
  }, [key])

  return subSec
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
 * 雇主段的行业分表 + 三试点表;担保雇主全量到手前用 SSR 那几十行
 * (身份档 2026-09-12 Frank「用一张表就行了」随两档合并退役)。
 *
 * @param x SSR 数据、主图与语言。
 * @returns 分表。
 */
export function useEmpSecs(x: EmpSecsHookIn): EmpSecsPanel {
  const [, , t] = useLang()
  const sponsorFull = useSponsorFull()

  let sponsor = x.stats.sponsor
  if (sponsorFull != null) {
    sponsor = sponsorFull
  }

  const nocCat: NocCatMap = useMemo(function pickNocCat() {
    return new Map(Object.entries(x.stats.nocCat))
  }, [x.stats.nocCat])

  const nocInfo = useMemo(function pickNocInfo() {
    return nocInfoOf({ natOcc: x.stats.natOcc, lang: x.lang })
  }, [x.stats.natOcc, x.lang])

  const extra: EmpExtra = useMemo(function pickExtra() {
    return {
      rcip: new Set<string>(x.stats.rcipNames),
      fcip: new Set<string>(x.stats.fcipNames),
      briefs: new Map(Object.entries(x.stats.briefs)),
    }
  }, [x.stats.rcipNames, x.stats.fcipNames, x.stats.briefs])

  const secs = useMemo(function pickEmpSecs() {
    return empSecsOf({ t, sponsor, nocCat, nocInfo, extra, lang: x.lang })
  }, [t, sponsor, nocCat, nocInfo, extra, x.lang])

  const pilotSecs = useMemo(function pickPilotSecs() {
    return pilotSecsOf({ t, sponsor, nocCat, nocInfo, extra, lang: x.lang })
  }, [t, sponsor, nocCat, nocInfo, extra, x.lang])

  return { secs, pilotSecs }
}

/**
 * 把脉首页的整机:界面语言、主图四份数据、切省、导航跟随,
 * 以及吃这些现值算出来的派生(职业分表 / 雇主分表 / LMIA 分表 / 省份 / 城市 / 趋势)。
 *
 * @param x 页面门取好的那份 SSR 数据。
 * @returns 整机面板。
 */
export function usePulse(x: PulseIn): PulsePanel {
  const [lang, , t] = useLang()
  const market = useMarketStats()
  const macroData = useMacroStats()
  const emp = useEmpSecs({ stats: x.stats, lang })
  const navSec = useNavSec()
  const tEn = useEnglishT()
  const nocProvs: NocProvsMap = useMemo(function pickNocProvs() {
    return new Map(Object.entries(x.stats.nocProvs))
  }, [x.stats.nocProvs])

  const occSecs = useMemo(function pickOccSecs() {
    return occSecsOf({ t, natOcc: x.stats.natOcc })
  }, [t, x.stats.natOcc])

  const numCards = useMemo(function pickCards() {
    return numCardsOf({ t, total: x.stats.total, named: x.stats.named, pulse: x.stats.pulse })
  }, [t, x.stats.total, x.stats.named, x.stats.pulse])

  const indGeos = useMemo(function pickIndGeos() {
    return indicatorGeosOf({
      t,
      lang,
      macro: macroPointsOf(macroData),
      ops: opsPointsOf(macroData),
      provExtra: x.stats.provExtra,
    })
  }, [t, lang, macroData, x.stats.provExtra])

  const prGeos = useMemo(function pickPrGeos() {
    return prGeosOf({ t, lang, macro: macroPointsOf(macroData), ops: opsPointsOf(macroData) })
  }, [t, lang, macroData])

  useEffect(function trackSecChange() {
    if (navSec !== TEXT_NONE) {
      trackSecView(navSec)
    }
  }, [navSec])

  const jobsRows = useMemo(function pickJobsRows() {
    return toJobsRows({ rows: provRowsOf({ market }), t, lang })
  }, [market, t, lang])

  return {
    t,
    lang,
    market,
    numCards,
    occSecs,
    empSecs: emp.secs,
    pilotSecs: emp.pilotSecs,
    nocProvs,
    indGeos,
    prGeos,
    jobsRows,
    tEn,
    navSec,
    macroLoading: macroData == null,
  }
}
