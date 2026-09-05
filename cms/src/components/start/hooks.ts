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
import { ID_PGWP, LANG_EN, TEXT_NONE } from './constants'
import {
  cityRowsOf, empSecsOf, makeKindPick, makeNavWatch, makeProvPick, makeSelectChange, makeSponsorLoad, natOccOf,
  nocInfoOf, nocProvsOf, numCardsOf, pilotSecsOf, occSecsOf, provInitOf, provOccOf, provRowsOf, provStatOf, trendOf,
} from './functions'
import type {
  CardPageIn, EmpExtra, EmpKind, EmpSecsHookIn, EmpSecsPanel, NocCatMap, OccBoardPanel, PulseIn, PulsePanel,
  SponsorBoards, TFn,
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
export function useNavSec(): string {
  const [navSec, setNavSec] = useState(TEXT_NONE)

  useEffect(function watchNav() {
    return makeNavWatch({ setNavSec })()
  }, [])

  return navSec
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
 * 雇主段的行业分表(按当前身份档)+ 三试点表;担保雇主全量到手前用 SSR 那几十行。
 *
 * @param x SSR 数据、主图、语言与身份档。
 * @returns 当前档的分表。
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
    return nocInfoOf({ market: x.market, lang: x.lang })
  }, [x.market, x.lang])

  const extra: EmpExtra = useMemo(function pickExtra() {
    return {
      rcip: new Set<string>(x.stats.rcipNames),
      fcip: new Set<string>(x.stats.fcipNames),
      briefs: new Map(Object.entries(x.stats.briefs)),
    }
  }, [x.stats.rcipNames, x.stats.fcipNames, x.stats.briefs])

  const secs = useMemo(function pickEmpSecs() {
    return empSecsOf({ t, sponsor, nocCat, nocInfo, extra, kind: x.kind, lang: x.lang })
  }, [t, sponsor, nocCat, nocInfo, extra, x.kind, x.lang])

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
  const [empKind, setEmpKind] = useState<EmpKind>(ID_PGWP)
  const emp = useEmpSecs({ stats: x.stats, market, lang, kind: empKind })
  const navSec = useNavSec()
  const tEn = useEnglishT()
  const [prov, setProv] = useState(provInitOf(x.stats.provPreset))

  const natOcc = useMemo(function pickNat() {
    return natOccOf({ market })
  }, [market])

  const nocProvs = useMemo(function pickNocProvs() {
    return nocProvsOf({ market })
  }, [market])

  const occSecs = useMemo(function pickOccSecs() {
    if (natOcc == null) {
      return null
    }
    return occSecsOf({ t, natOcc })
  }, [t, natOcc])

  const numCards = useMemo(function pickCards() {
    return numCardsOf({ t, total: x.stats.total, named: x.stats.named, pulse: x.stats.pulse })
  }, [t, x.stats.total, x.stats.named, x.stats.pulse])

  const provRows = useMemo(function pickProvRows() {
    return provRowsOf({ market })
  }, [market])

  const provStat = useMemo(function pickProvStat() {
    return provStatOf({ rows: provRows, prov })
  }, [provRows, prov])

  const provOcc = useMemo(function pickProvOcc() {
    return provOccOf({ market, prov })
  }, [market, prov])

  const cityRows = useMemo(function pickCityRows() {
    return cityRowsOf({ market })
  }, [market])

  const trend = useMemo(function pickTrend() {
    return trendOf({ t, daily: x.stats.daily })
  }, [t, x.stats.daily])

  return {
    t,
    lang,
    market,
    numCards,
    occSecs,
    empSecs: emp.secs,
    pilotSecs: emp.pilotSecs,
    empKind,
    kindPickOf: makeKindPick({ setKind: setEmpKind }),
    nocProvs,
    provRows,
    provStat,
    provOcc,
    prov,
    onProvSelect: makeSelectChange({ set: setProv }),
    provPickOf: makeProvPick({ setProv }),
    cityRows,
    trend,
    tEn,
    navSec,
  }
}
