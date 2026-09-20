'use client'
/**
 * companies 域的状态机器:公司本体族的三台 —— K 调查简介的懒查(useCompanyAi)、
 * 缓存简介的懒翻(useCompanyTrans)、公司弹框的取数与两个开关(useCompanyPanel)。
 * 体内只有 useState、具名 effect 壳与工厂装配;取数步骤与它们的口径注释全在
 * ./functions 的 make* 工厂里(hooks 抽屉的形制照样张 account/hooks.ts)。
 *
 * 取数一律带取消标记:弹框换公司/换职位很频繁,拆卸后再落格就是往已卸载的组件上写。
 *
 * @author Frank
 * @time 2026-08-28 16:26:43
 */
import { useCallback, useEffect, useState } from 'react'
import { EV_KEY_DOWN, KEY_ESCAPE, LANG_EN, TEXT_NONE, TITLES_KEY_SEP,
} from './constants'
import {
  ignoreFlag, isSiteActive, makeLoadAlias, makeLoadBrief, makeLoadDescTrans, makeLoadPanel, makeLoadTitles,
  makeLoadTrans, makeOpenSite,
} from './functions'
import type {
  CompanyAiHookIn, CompanyAiPanel, CompanyAliasHookIn, CompanyAliasPanel, CompanyBriefFact, CompanyJobFact,
  CompanyPanelData, CompanyPanelHookIn, CompanyPanelState, CompanyPeek, CompanyPeekPanel, CompanyTransHookIn,
  CompanySiteHookIn, CompanyTransPanel, DeadFlag, DescTransHookIn, SitePanel,
  TitleMapHookIn,
} from './types'

/**
 * K 调查简介的懒查(#158 Frank 2026-07-19 批:首开自动调查,命中缓存秒回;
 * 查不到/掉线整块消失不留孤儿)。换了公司当场清空重查 —— 别拿上一家的简介占位。
 * 中文对照(#185)打开且这一门语言不是英文时再懒翻一份存着,切换零延迟。
 * 2026-09-17 Frank「自动拨开去掉,但是后台要自动翻译」:不再等开关 —— 中 / 韩界面简介一到就在后台翻好存着,开关只管显不显。
 *
 * 2026-09-20:官网那条工种还没报上去 / 还在办的时候只查库不现查;办完 / 查无 / 不再等的那一拍再查一遍,这时才放开联网现查兜底。
 *
 * @param x 公司名、界面语言与官网那条工种办到哪一步。
 * @returns 加载态、查到的简介与译文。
 */
export function useCompanyAi(x: CompanyAiHookIn): CompanyAiPanel {
  const [loading, setLoading] = useState(true)
  const [fact, setFact] = useState<CompanyBriefFact | null>(null)
  const [trans, setTrans] = useState<string | null>(null)
  const [prevCompany, setPrevCompany] = useState(x.company)

  if (prevCompany !== x.company) {
    setPrevCompany(x.company)
    setLoading(true)
    setFact(null)
    setTrans(null)
  }

  const storedOnly = x.stage === TEXT_NONE || isSiteActive(x.stage)

  useEffect(function loadBrief() {
    const flag: DeadFlag = { dead: false }
    makeLoadBrief({ company: x.company, setFact, setLoading, storedOnly })(flag)
    return function stop(): void {
      flag.dead = true
    }
  }, [x.company, storedOnly])

  useEffect(function loadTrans() {
    const flag: DeadFlag = { dead: false }
    if (trans == null && fact != null && x.lang != null && x.lang !== LANG_EN) {
      makeLoadTrans({ company: x.company, lang: x.lang, setTrans, setBusy: ignoreFlag })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [x.lang, x.company, trans, fact])

  return { loading, fact, trans }
}

/**
 * 官网那条工种在公司卡上的面板(2026-09-20):卡一开就报一声点开(等到有真人动作才报),简介区是空的就接着问进度;
 * 换了公司当场清空重报。
 *
 * @param x 公司名与要不要等结果。
 * @returns 办到哪一步 + 办完补上来的官网与总部。
 */
export function useCompanySite(x: CompanySiteHookIn): SitePanel {
  const [site, setSite] = useState<SitePanel>({
    stage: TEXT_NONE, website: TEXT_NONE, hq: TEXT_NONE, hqSource: TEXT_NONE,
  })
  const [prevName, setPrevName] = useState(x.name)

  if (prevName !== x.name) {
    setPrevName(x.name)
    setSite({ stage: TEXT_NONE, website: TEXT_NONE, hq: TEXT_NONE, hqSource: TEXT_NONE })
  }

  useEffect(function openSite() {
    const flag: DeadFlag = { dead: false }
    if (x.name !== TEXT_NONE) {
      makeOpenSite({ name: x.name, wait: x.wait, setSite })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [x.name, x.wait])

  return site
}

/**
 * 缓存简介(库里已有 aiBrief,直渲不用懒查)那条路径的懒翻:与 useCompanyAi 内的
 * 懒翻同款,拿到存一份切换零延迟。名录厚简介那条路径不翻(它是官网原文,#185
 * 对照针对的是 K 调查五节)。
 *
 * 2026-09-16 Frank「可以,就这样做」:交回三样 —— 译文、首拍只查库在途(正文等它)、现场翻译在途(页眉开关显「翻译中…」)。
 * 2026-09-17 Frank「自动拨开去掉,但是后台要自动翻译」:不再等开关,中 / 韩界面一开框就在后台翻好存着;
 * 「只查库在途」(pending / hold)撤 —— 开关默认关,正文没必要为它留白。交回两样。
 *
 * @param x 公司名、缓存简介、厚简介标记与界面语言。
 * @returns 译文与现场翻译在途态。
 */
export function useCompanyTrans(x: CompanyTransHookIn): CompanyTransPanel {
  const [trans, setTrans] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(function loadTrans() {
    const flag: DeadFlag = { dead: false }
    if (trans == null && x.hasDesc === false && x.aiBrief !== '' && x.lang !== LANG_EN) {
      makeLoadTrans({ company: x.name, lang: x.lang, setTrans, setBusy })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [x.hasDesc, x.aiBrief, x.name, x.lang, trans])

  return { trans, busy }
}

/**
 * 公司弹框整机(E8-11 B1):按岗位号取公司(与 /companies/[slug] 页面同一份数据,
 * 免额度)+ 中文对照与 AI 速读两个开关。换了职位当场清空重取。
 * 2026-09-16 Frank「公司的也对照改一下」:中文对照开关挪进弹框页眉译名行,开合归 advisor 的 useAdvisorModal(showZh),
 * 本机不再自持 showTrans,经 CompanyPanel 的 props 递进来。
 * 2026-09-18 雇主板点雇主名开同一个弹框:那里没有职位,job 可为 null、改按 slug 取。
 *
 * @param x 当前这一行职位。
 * @returns 加载态与取到的数据。
 */
export function useCompanyPanel(x: CompanyPanelHookIn): CompanyPanelState {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CompanyPanelData | null>(null)
  const [prevJob, setPrevJob] = useState(x.job)
  const [prevSlug, setPrevSlug] = useState(x.slug)

  if (prevJob !== x.job || prevSlug !== x.slug) {
    setPrevJob(x.job)
    setPrevSlug(x.slug)
    setLoading(true)
    setData(null)
  }
  let jobId: string | number | null = null
  if (x.job != null) {
    jobId = x.job.id
  }
  const slug = x.slug

  useEffect(function loadPanel() {
    const flag: DeadFlag = { dead: false }
    makeLoadPanel({ jobId, slug, setData, setLoading })(flag)
    return function stop(): void {
      flag.dead = true
    }
  }, [jobId, slug])

  return { loading, data }
}

/**
 * 公司别名(2026-09-14 懒翻公司名):库里有就用库里的;没有且界面非英文,开一次就打一次接口,回来落格。
 *
 * @param x 公司名、界面语言与库里已有的别名。
 * @returns 别名;'' = 还没有。
 */
export function useCompanyAlias(x: CompanyAliasHookIn): CompanyAliasPanel {
  const [alias, setAlias] = useState<string | null>(x.cached)
  const [settled, setSettled] = useState(x.cached !== TEXT_NONE)
  const [prevCached, setPrevCached] = useState(x.cached)
  if (prevCached !== x.cached) {
    setPrevCached(x.cached)
    setAlias(x.cached)
    setSettled(x.cached !== TEXT_NONE)
  }
  const name = x.name
  const lang = x.lang
  const want = (alias == null || alias === TEXT_NONE) && name !== TEXT_NONE && lang !== LANG_EN

  useEffect(function loadAlias() {
    const flag: DeadFlag = { dead: false }
    if (want) {
      makeLoadAlias({ name, lang, setAlias, onSettled: setSettled })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [want, name, lang])

  let text = TEXT_NONE
  if (alias != null) {
    text = alias
  }
  return { alias: text, settled: settled || lang === LANG_EN || name === TEXT_NONE }
}

/**
 * 一组职位名的译名表(2026-09-14):组合变了就再打一次接口;英文界面或空组不打。
 *
 * @param x 要翻的一组与界面语言。
 * @returns 职位名 → 译名(还没回来是空表)。
 */
export function useTitleMap(x: TitleMapHookIn): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({})
  const key = x.titles.join(TITLES_KEY_SEP)
  const lang = x.lang
  const want = key !== TEXT_NONE && lang !== LANG_EN

  useEffect(function loadTitles() {
    const flag: DeadFlag = { dead: false }
    if (want) {
      makeLoadTitles({ titles: key.split(TITLES_KEY_SEP), lang, setMap })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [want, key, lang])

  return map
}

/**
 * 官网简介的对照(2026-09-14):中 / 韩界面且有官网简介才打一次接口。
 * 2026-09-17:has 由调用方并入页眉对照开关 —— 开关关着不打接口(Frank「这个 公司的 弹框 也 默认关闭」)。
 * 2026-09-17 同日 Frank「后台要自动翻译」改回:不看开关,有官网简介就翻好存着,开关只管出不出那一行。
 *
 * @param x 公司名、界面语言与有没有官网简介。
 * @returns 译文;'' = 还没有。
 */
export function useCompanyDescTrans(x: DescTransHookIn): string {
  const [trans, setTrans] = useState<string | null>(null)
  const name = x.name
  const lang = x.lang
  const want = x.has && name !== TEXT_NONE && lang !== LANG_EN && trans === null

  useEffect(function loadDesc() {
    const flag: DeadFlag = { dead: false }
    if (want) {
      makeLoadDescTrans({ name, lang, setTrans })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [want, name, lang])

  if (trans == null) {
    return TEXT_NONE
  }
  return trans
}

/**
 * 公司页上叠开的两个弹框(2026-09-19 Frank「这种里面的链接都改成弹框显示…要想看其他的还得点回来」):
 * 点在招职位 = 职位描述弹框;点相似雇主 = 公司弹框,框里再点相似雇主就同框换一家(不往上叠、不记历史)。Esc 全关(同职位板)。
 *
 * @returns 两格状态与四个手柄。
 */
export function useCompanyPeek(): CompanyPeekPanel {
  const [job, setJob] = useState<CompanyJobFact | null>(null)
  const [co, setCo] = useState<CompanyPeek | null>(null)
  const onCloseJob = useCallback(function closeJob(): void {
    setJob(null)
  }, [])
  const onCloseCo = useCallback(function closeCo(): void {
    setCo(null)
  }, [])
  const open = job != null || co != null
  useEffect(function watchEsc() {
    if (open === false) {
      return
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === KEY_ESCAPE) {
        setJob(null)
        setCo(null)
      }
    }
    window.addEventListener(EV_KEY_DOWN, onKey)
    return function stopEscWatch(): void {
      window.removeEventListener(EV_KEY_DOWN, onKey)
    }
  }, [open])
  return { job, co, onOpenJob: setJob, onOpenCompany: setCo, onCloseJob, onCloseCo }
}
