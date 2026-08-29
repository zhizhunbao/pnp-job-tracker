'use client'
/**
 * stats 域的状态机器:主图四份数据的客户端拉取、echarts 壳的三只 ref 与三道效果、
 * 全屏整机与统计主图的十二格筛选现值。体内不留函数体 —— 带口径的步骤全在 ./functions 的工厂里
 * (注释即它们的 JSDoc),这里只剩 useState、具名 effect 壳与工厂装配
 * (形制同 news 的 useCarousel 与 account 的 useAccountPage)。
 * 2026-08-28 换装批自 charts.tsx 的两个组件体收进来。
 *
 * @author Frank
 * @time 2026-08-28 12:43:43
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CHAN_ALL, CHART_H, DIR_DESC, G_PROV, MIN_JOBS_DEFAULT, SORT_JOBS, TEXT_NONE, X_OCC, Y2_OFF, Y2_WAGE,
} from './constants'
import {
  chartHeightOf, eeSetOf, emptyOf, fsBoxClsOf, groupOf, makeChartDispose, makeChartDraw, makeClickSync,
  makeFsEnterPseudo, makeFsExitPseudo, makeFsWatch, makeMarketLoad, marketBodyOf, marketOptionOf,
  marketPanelOf, medNameOf, natlOccOf, pnpSetOf, toggleFsAt,
} from './functions'
import type {
  BoxRef, ChanKey, ChartClickFn, ChartInst, FsView, GroupKey, MarketData, MarketPanel, MarketState, SortBy,
  SortDir, UseEChartIn, UseMarketChartIn, XKey, Y2Key,
} from './types'

/**
 * 主图四份数据的客户端拉取(SSR 瘦身,手法照 /jobs 的 /api/jobs/dims):主图四份数据与用户
 * 无关、mart 日更,不该 SSR 直出(occ ~3400 行占 /start HTML 大头)。
 *
 * @returns 四份数据;null = 加载中(调用侧渲占位高度防 CLS)。
 */
export function useMarketStats(): MarketData | null {
  const [data, setData] = useState<MarketData | null>(null)

  useEffect(function loadMarket() {
    return makeMarketLoad({ setData })()
  }, [])

  return data
}

/**
 * echarts 薄壳的整机:三只 ref(画布、实例、点击回调)与三道效果(回调转发、画图、卸载销毁)。
 *
 * @param x 这一次的 option、图高与点击回调。
 * @returns 挂到画布 div 上的 ref。
 */
export function useEChart(x: UseEChartIn): BoxRef {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const instRef = useRef<ChartInst | null>(null)
  const clickRef = useRef<ChartClickFn | null>(null)

  useEffect(function syncClick() {
    makeClickSync({ clickRef, onBarClick: x.onBarClick })()
  })

  useEffect(function drawChart() {
    return makeChartDraw({ boxRef, instRef, clickRef, option: x.option })()
  }, [x.option, x.height])

  useEffect(function watchDispose() {
    return makeChartDispose({ instRef })()
  }, [])

  return boxRef
}

/**
 * 全屏整机:全屏容器的 ref + 全屏态、随它变的图高、容器的类与开合手柄。
 *
 * **两条路一个钮**(2026-08-28 Frank 实机反馈「手机端展示全屏不生效」后加的第二条):
 * ① 原生路 —— 走 Element.requestFullscreen,全屏态跟着浏览器的 fullscreenchange 走
 *    (用户按 ESC / 返回手势退出时也要还原图高),所以听事件而不是自己记状态;
 * ② 伪全屏路 —— **iOS WebKit 至今没有 Element.requestFullscreen**(只有 `<video>` 有
 *    它自家的 webkitEnterFullscreen),而 iPhone 上 Safari 与 Chrome 都跑 WebKit;
 *    这是平台的 API 缺口(外部事实,判定写在 functions 的 fsSupportedOf),
 *    所以特性检测不通过、或原生调用被拒时改用 CSS 伪全屏:容器 position:fixed 铺满视口、
 *    盖过顶栏,body 锁滚动,退出还原。两条路共用 `fs` 这一格,视图不必知道走的是哪条。
 *
 * 容器尺寸突变后 echarts 要重新量:图高随 fs 变 → EChart 的画图效果(依赖 option 与 height)
 * 当场重跑 clear + setOption + resize,两条路都盖得住;转屏那一路由 makeFsWatch 听
 * window 的 resize 把视口高对回来。
 *
 * @returns [容器 ref, 全屏态与图高与类与手柄]。
 */
export function useFullscreen(): [BoxRef, FsView] {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [fs, setFs] = useState(false)
  const [pseudo, setPseudo] = useState(false)
  const [vh, setVh] = useState(CHART_H)

  useEffect(function watchFs() {
    return makeFsWatch({ boxRef, setFs, setVh })()
  }, [])

  const enterPseudo = makeFsEnterPseudo({ setPseudo, setFs, setVh })
  const exitPseudo = makeFsExitPseudo({ setPseudo, setFs, setVh })

  function onFs(): void {
    toggleFsAt({ el: boxRef.current, pseudo, enterPseudo, exitPseudo })
  }

  const view: FsView = {
    fs,
    chartH: chartHeightOf({ fs, vh }),
    boxCls: fsBoxClsOf({ pseudo }),
    onFs,
  }
  return [boxRef, view]
}

/**
 * 统计主图的十二格筛选现值与它们的落格(全屏那三格不在这里 —— 只有 MarketCanvas 读它,
 * 归 useFullscreen)。
 *
 * @returns 现值与落格。
 */
export function useMarketState(): MarketState {
  const [query, setQuery] = useState(TEXT_NONE)
  const [xKey, setXKey] = useState<XKey>(X_OCC)
  const [rawGroup, setGroup] = useState<GroupKey>(G_PROV)
  const [sortBy, setSortBy] = useState<SortBy>(SORT_JOBS)
  const [sortDir, setSortDir] = useState<SortDir>(DIR_DESC)
  const [y2, setY2] = useState<Y2Key>(Y2_WAGE)
  const [chan, setChan] = useState<ChanKey>(CHAN_ALL)
  const [minJobs, setMinJobs] = useState(MIN_JOBS_DEFAULT)
  const [fBroad, setFBroad] = useState(TEXT_NONE)
  const [fMid, setFMid] = useState(TEXT_NONE)
  const [fFine, setFFine] = useState(TEXT_NONE)
  const [more, setMore] = useState(false)

  return {
    query,
    xKey,
    rawGroup,
    sortBy,
    sortDir,
    y2,
    chan,
    minJobs,
    fBroad,
    fMid,
    fFine,
    more,
    setQuery,
    setXKey,
    setGroup,
    setSortBy,
    setSortDir,
    setY2,
    setChan,
    setMinJobs,
    setFBroad,
    setFMid,
    setFFine,
    setMore,
  }
}

/**
 * 统计主图整机:现值 + 派生的选项表 + 算好的 echarts option + 全部手柄。
 *
 * @param x 四份数据、取词函数、界面语言、通道清单与首屏窗档。
 * @returns 整机。
 */
export function useMarketChart(x: UseMarketChartIn): MarketPanel {
  const s = useMarketState()
  const group = groupOf({ xKey: s.xKey, group: s.rawGroup })
  const medName = medNameOf({ t: x.t, y2: s.y2 })

  const natl = useMemo(function pickNatl() {
    return natlOccOf({ occ: x.occ })
  }, [x.occ])

  const pnpSet = useMemo(function pickPnp() {
    return pnpSetOf({ channels: x.channels })
  }, [x.channels])

  const eeSet = useMemo(function pickEe() {
    return eeSetOf({ channels: x.channels })
  }, [x.channels])

  const option = useMemo(function buildOption() {
    const body = marketBodyOf({
      occ: x.occ,
      city: x.city,
      rows: x.rows,
      t: x.t,
      lang: x.lang,
      xKey: s.xKey,
      group,
      y2: s.y2,
      medName,
      sortBy: s.sortBy,
      sortDir: s.sortDir,
      query: s.query,
      chan: s.chan,
      minJobs: s.minJobs,
      fBroad: s.fBroad,
      fMid: s.fMid,
      fFine: s.fFine,
      pnpSet,
      eeSet,
      firstScreen: x.firstScreen,
    })
    return marketOptionOf({ body, t: x.t, showMed: s.y2 !== Y2_OFF, medName })
  }, [
    x.occ, x.city, x.rows, x.t, x.lang, x.firstScreen, s.xKey, group, s.y2, medName, s.sortBy, s.sortDir,
    s.query, s.chan, s.minJobs, s.fBroad, s.fMid, s.fFine, pnpSet, eeSet,
  ])

  return marketPanelOf({
    t: x.t,
    state: s,
    natl,
    group,
    medName,
    option,
    empty: emptyOf({ occ: x.occ, city: x.city }),
  })
}
