'use client'
/**
 * start 域的状态机器:整页那一台(语言、主图数据、橱窗全量、切省、两处条数档、
 * 导航跟随与全部派生)、橱窗单表那三台(六格筛选 / 五只下拉的选项 / 命中行与页态)、
 * 职业榜手机卡的页态。
 * 体内不留函数体 —— 带口径的步骤全在 ./functions 的工厂与 xxxOf 里(注释即它们的 JSDoc),
 * 这里只剩 useState / useMemo、具名 effect 壳与工厂装配(形制同 news 的 useNewsFilter
 * 与 stats 的 useMarketChart)。
 * 2026-08-28 换装批自 Pulse.tsx 的三个组件体收进来。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { useEffect, useMemo, useState } from 'react'
import { hasVerdictSignal } from '@/components/employers'
import { useLang } from '@/components/i18n'
import { useMarketStats } from '@/components/stats'
import { makeT } from '@/lib/i18n'
import { CARD_PAGE_SIZE, KEY_SEP, KIND_NAMED, LANG_EN, TEXT_NONE, TOPN_MIN } from './constants'
import {
  broadOptsOf, fineOptsOf, makeFilterPick, makeNavWatch, makeProvPick, makeSelectChange, makeSponsorLoad,
  midOptsOf, natOccOf, nocProvsOf, numCardsOf, occBoardsOf, occSelOptsOf, occSelValuesOf, provInitOf,
  provOccOf, provOptsOf, provRowsOf, provStatOf, shownSponsorsOf, sponsorLabelsOf, sponsorNoteOf,
  streamOptsOf,
} from './functions'
import type {
  CardPageIn, NocCatMap, OccBoardPanel, PulseIn, PulsePanel, SponsorBoardHookIn, SponsorBoardPanel,
  SponsorBoards, SponsorFilterState, SponsorOptsHookIn, SponsorOptsPanel, TFn,
} from './types'

/**
 * #313:橱窗三分表 SSR 只带每表前几十行(RSC payload 6.5MB 瘦身),挂载后拉全量换上
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
 * 橱窗单表的六格筛选现值与落格。四级联动(大类→中类→小类→职业)由 makeFilterPick
 * 把下面几级一并清空 —— 换了大类还留着旧中类,选项对不上就成了死筛。
 *
 * @returns 六格现值与六只换值手柄。
 */
export function useSponsorFilters(): SponsorFilterState {
  const [fProv, setFProv] = useState(TEXT_NONE)
  const [fStream, setFStream] = useState(TEXT_NONE)
  const [fBroad, setFBroad] = useState(TEXT_NONE)
  const [fMid, setFMid] = useState(TEXT_NONE)
  const [fFine, setFFine] = useState(TEXT_NONE)
  const [fNoc, setFNoc] = useState(TEXT_NONE)

  return {
    fProv,
    fStream,
    fBroad,
    fMid,
    fFine,
    fNoc,
    onProv: setFProv,
    onStream: setFStream,
    onBroad: makeFilterPick({ set: setFBroad, resets: [setFMid, setFFine, setFNoc] }),
    onMid: makeFilterPick({ set: setFMid, resets: [setFFine, setFNoc] }),
    onFine: makeFilterPick({ set: setFFine, resets: [setFNoc] }),
    onNoc: setFNoc,
  }
}

/**
 * 橱窗单表五只下拉的选项。选项只列本表真实存在的值(小样本橱窗表不比全量职位板,
 * 摆满 89 个中类全是死选项),且逐级受上一级收窄。
 *
 * @param x 本表的行、人群档、职业名候选、界面语言、分类映射与六格现值。
 * @returns 五只下拉的选项与职业筛那份带显示名的选项。
 */
export function useSponsorOpts(x: SponsorOptsHookIn): SponsorOptsPanel {
  const occSel = useMemo(function pickOcc() {
    return occSelOptsOf({
      rows: x.rows,
      occOpts: x.occOpts,
      lang: x.lang,
      nocCat: x.nocCat,
      fBroad: x.f.fBroad,
      fMid: x.f.fMid,
      fFine: x.f.fFine,
    })
  }, [x.rows, x.occOpts, x.lang, x.nocCat, x.f.fBroad, x.f.fMid, x.f.fFine])

  const prov = useMemo(function pickProv() {
    return provOptsOf({ rows: x.rows })
  }, [x.rows])

  const stream = useMemo(function pickStream() {
    return streamOptsOf({ rows: x.rows, kind: x.kind })
  }, [x.rows, x.kind])

  const broad = useMemo(function pickBroad() {
    return broadOptsOf({ rows: x.rows, nocCat: x.nocCat })
  }, [x.rows, x.nocCat])

  const mid = useMemo(function pickMid() {
    return midOptsOf({ rows: x.rows, nocCat: x.nocCat, fBroad: x.f.fBroad })
  }, [x.rows, x.nocCat, x.f.fBroad])

  const fine = useMemo(function pickFine() {
    return fineOptsOf({ rows: x.rows, nocCat: x.nocCat, fBroad: x.f.fBroad, fMid: x.f.fMid })
  }, [x.rows, x.nocCat, x.f.fBroad, x.f.fMid])

  return { opts: { prov, stream, broad, mid, fine, occ: occSelValuesOf(occSel) }, occSel }
}

/**
 * 橱窗单表的整机:六格筛选 + 五只下拉的选项与显示名 + 命中行 + 手机卡页态。
 * 换了筛选就回第一页。
 *
 * @param x 本表的行、人群档、取词函数、界面语言、总数与三张字典。
 * @returns 整机面板。
 */
export function useSponsorBoard(x: SponsorBoardHookIn): SponsorBoardPanel {
  const f = useSponsorFilters()
  const [page, setPage] = useState(0)
  const filterKey = [f.fProv, f.fStream, f.fBroad, f.fMid, f.fFine, f.fNoc].join(KEY_SEP)
  const [filterKeySeen, setFilterKeySeen] = useState(filterKey)
  if (filterKey !== filterKeySeen) {
    setFilterKeySeen(filterKey)
    setPage(0)
  }

  const o = useSponsorOpts({ rows: x.rows, kind: x.kind, occOpts: x.occOpts, lang: x.lang, nocCat: x.nocCat, f })

  const shown = useMemo(function pickShown() {
    return shownSponsorsOf({ rows: x.rows, f, nocCat: x.nocCat })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- f 每次渲染都是新对象;真正的依赖是它那六格值,已压成 filterKey
  }, [x.rows, x.nocCat, filterKey])

  const maxPage = Math.max(1, Math.ceil(shown.length / CARD_PAGE_SIZE))
  return {
    f,
    opts: o.opts,
    labels: sponsorLabelsOf({ t: x.t, catMids: x.catMids, lang: x.lang, occSel: o.occSel }),
    shown,
    page: Math.min(page, maxPage - 1),
    maxPage,
    note: sponsorNoteOf({ t: x.t, shown: shown.length, total: x.total }),
    showVerdict: x.kind === KIND_NAMED && hasVerdictSignal(x.rows),
    onPage: setPage,
  }
}

/**
 * 把脉首页的整机:界面语言、主图四份数据、橱窗全量、切省与两处条数档、导航跟随,
 * 以及吃这些现值算出来的七份派生。
 *
 * @param x 页面门取好的那份 SSR 数据。
 * @returns 整机面板。
 */
export function usePulse(x: PulseIn): PulsePanel {
  const [lang, , t] = useLang()
  const market = useMarketStats()
  const sponsorFull = useSponsorFull()
  const navSec = useNavSec()
  const tEn = useEnglishT()
  const [drawsN, setDrawsN] = useState(TOPN_MIN)
  const [newsN, setNewsN] = useState(TOPN_MIN)
  const [prov, setProv] = useState(provInitOf(x.stats.provPreset))

  let sponsor = x.stats.sponsor
  if (sponsorFull != null) {
    sponsor = sponsorFull
  }

  const natOcc = useMemo(function pickNat() {
    return natOccOf({ market })
  }, [market])

  const nocProvs = useMemo(function pickNocProvs() {
    return nocProvsOf({ market })
  }, [market])

  const nocCat: NocCatMap = useMemo(function pickNocCat() {
    return new Map(Object.entries(x.stats.nocCat))
  }, [x.stats.nocCat])

  const boards = useMemo(function pickBoards() {
    if (natOcc == null) {
      return null
    }
    return occBoardsOf({ natOcc, nocProvs })
  }, [natOcc, nocProvs])

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

  return {
    t,
    lang,
    market,
    sponsor,
    numCards,
    boards,
    nocProvs,
    nocCat,
    provRows,
    provStat,
    provOcc,
    prov,
    onProvSelect: makeSelectChange({ set: setProv }),
    provPickOf: makeProvPick({ setProv }),
    drawsN,
    onDrawsN: setDrawsN,
    newsN,
    onNewsN: setNewsN,
    tEn,
    navSec,
  }
}
