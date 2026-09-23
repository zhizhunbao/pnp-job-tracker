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
import { useEffect, useRef, useState } from 'react'
import { useLayerStack } from '@/components/modal'
import { LANG_EN, MS_PER_SEC, TEXT_NONE, TICK_MS,
} from './constants'
import {
  ignoreFlag, isSiteActive, makeLoadAlias, makeLoadBrief, makeLoadDescTrans, makeLoadPanel,
  makeLoadTrans, makeOpenSite, makePushCoLayer, makePushJobLayer, nextRevOf,
} from './functions'
import type {
  CompanyAiHookIn, CompanyAiPanel, CompanyAliasHookIn, CompanyAliasPanel, CompanyBriefFact,
  CompanyOfJobHookIn, CompanyPanelData, CompanyPanelHookIn, CompanyPanelState, CompanyPeekPanel,
  CompanyTransHookIn,
  CompanySiteHookIn, CompanyTransPanel, DeadFlag, DescTransHookIn, PeekLayer, SitePanel,
} from './types'

/**
 * K 调查简介的懒查(#158 Frank 2026-07-19 批:首开自动调查,命中缓存秒回;
 * 查不到/掉线整块消失不留孤儿)。换了公司当场清空重查 —— 别拿上一家的简介占位。
 * 中文对照(#185)打开且这一门语言不是英文时再懒翻一份存着,切换零延迟。
 * 2026-09-17 Frank「自动拨开去掉,但是后台要自动翻译」:不再等开关 —— 中 / 韩界面简介一到就在后台翻好存着,开关只管显不显。
 *
 * 2026-09-20:官网那条工种还没报上去 / 还在办的时候只查库不现查;办完 / 查无 / 不再等的那一拍再查一遍,这时才放开联网现查兜底。
 * 2026-09-21 交回多一格 live(联网现查在途):简介位只在现查时出「AI 调查中…」,开框那一拍只查库不出(原先一闪就没)。
 *
 * @param x 公司名、界面语言与官网那条工种办到哪一步。
 * @returns 加载态、查到的简介、译文与这一拍是不是现查。
 */
export function useCompanyAi(x: CompanyAiHookIn): CompanyAiPanel {
  const [loading, setLoading] = useState(true)
  const [fact, setFact] = useState<CompanyBriefFact | null>(null)
  const [trans, setTrans] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [prevCompany, setPrevCompany] = useState(x.company)

  if (prevCompany !== x.company) {
    setPrevCompany(x.company)
    setLoading(true)
    setFact(null)
    setTrans(null)
    setLive(false)
  }

  const storedOnly = x.stage === TEXT_NONE || isSiteActive(x.stage)

  useEffect(function loadBrief() {
    const flag: DeadFlag = { dead: false }
    makeLoadBrief({ company: x.company, setFact, setLoading, setLive, storedOnly })(flag)
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

  return { loading, fact, trans, live }
}

/**
 * 官网那条工种在公司卡上的面板(2026-09-20):卡一开就报一声点开(等到有真人动作才报),简介区是空的就接着问进度;
 * 换了公司当场清空重报。
 * 2026-09-21 Frank「都修」:不再只在简介区空着时问 —— 一律问到办完,办完那一拍调 x.onDone(卡叫宿主整卡重取)。
 * onDone 存进 ref 读最新的:它随卡上铺没铺简介换函数,放进依赖就会把「点开」重报一遍。
 *
 * @param x 公司名与办完回调。
 * @returns 办到哪一步 + 办完补上来的官网与总部。
 */
export function useCompanySite(x: CompanySiteHookIn): SitePanel {
  const [site, setSite] = useState<SitePanel>({
    stage: TEXT_NONE, website: TEXT_NONE, hq: TEXT_NONE, hqSource: TEXT_NONE, ahead: 0,
  })
  const [prevName, setPrevName] = useState(x.name)
  const doneRef = useRef(x.onDone)

  if (prevName !== x.name) {
    setPrevName(x.name)
    setSite({ stage: TEXT_NONE, website: TEXT_NONE, hq: TEXT_NONE, hqSource: TEXT_NONE, ahead: 0 })
  }

  useEffect(function keepDone() {
    doneRef.current = x.onDone
  }, [x.onDone])

  useEffect(function openSite() {
    const flag: DeadFlag = { dead: false }
    function done(): void {
      doneRef.current()
    }
    if (x.name !== TEXT_NONE) {
      makeOpenSite({ name: x.name, setSite, onDone: done })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [x.name])

  return site
}

/**
 * 排队计时器(2026-09-22 Frank「排队中是不是要加个计时器」):开着时每秒走一格,从卡上看到排队那一拍起算;
 * 关上(不在排队中)归零停摆。起点在渲染中随开关落格(prevName 同款先例),effect 里只订秒针,不直接落格。
 *
 * @param on 计时开关(排队中 = true)。
 * @returns 已等秒数。
 */
export function useTickSec(on: boolean): number {
  const [startAt, setStartAt] = useState(0)
  const [nowMs, setNowMs] = useState(0)
  if (on && startAt === 0) {
    // eslint-disable-next-line react-hooks/purity -- 计时起点就是「此刻」,只在开关翻开的那一拍取一次
    const t = Date.now()
    setStartAt(t)
    setNowMs(t)
  }
  if (on === false && startAt !== 0) {
    setStartAt(0)
  }
  useEffect(function tickSec() {
    if (on === false) {
      return function idle(): void {
        return undefined
      }
    }
    const id = window.setInterval(function tickOne() {
      setNowMs(Date.now())
    }, TICK_MS)
    return function stop(): void {
      window.clearInterval(id)
    }
  }, [on])
  if (on === false || startAt === 0) {
    return 0
  }
  return Math.floor((nowMs - startAt) / MS_PER_SEC)
}

/**
 * 缓存简介(库里已有 aiBrief,直渲不用懒查)那条路径的懒翻:与 useCompanyAi 内的
 * 懒翻同款,拿到存一份切换零延迟。名录厚简介那条路径不翻(它是官网原文,#185
 * 对照针对的是 K 调查五节)。
 *
 * 2026-09-16 Frank「可以,就这样做」:交回三样 —— 译文、首拍只查库在途(正文等它)、现场翻译在途(页眉开关显「翻译中…」)。
 * 2026-09-17 Frank「自动拨开去掉,但是后台要自动翻译」:不再等开关,中 / 韩界面一开框就在后台翻好存着;
 * 「只查库在途」(pending / hold)撤 —— 开关默认关,正文没必要为它留白。交回两样。
 * 2026-09-21 Frank「都修」:简介换了(官网那条活办完、整卡重取回来的是官网版)译文当场清掉重取 ——
 * 原先手里有译文就不再取,新简介底下挂的还是旧简介的中文。
 *
 * @param x 公司名、缓存简介、厚简介标记与界面语言。
 * @returns 译文与现场翻译在途态。
 */
export function useCompanyTrans(x: CompanyTransHookIn): CompanyTransPanel {
  const [trans, setTrans] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [prevBrief, setPrevBrief] = useState(x.aiBrief)

  if (prevBrief !== x.aiBrief) {
    setPrevBrief(x.aiBrief)
    setTrans(null)
    setBusy(false)
  }

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
  const [rev, setRev] = useState(0)

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
  }, [jobId, slug, rev])

  function reload(): void {
    setRev(nextRevOf)
  }

  return { loading, data, reload }
}

/**
 * 按岗位号取公司(2026-09-21 职位页 / 职位弹框里的公司信息卡:手里只有岗位号;与公司弹框同一个接口、同一份数据)。
 * 换了岗位当场清空重取。
 *
 * @param x 岗位号。
 * @returns 加载态与取到的数据。
 */
export function useCompanyOfJob(x: CompanyOfJobHookIn): CompanyPanelState {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CompanyPanelData | null>(null)
  const [prevId, setPrevId] = useState(x.jobId)
  const [rev, setRev] = useState(0)

  if (prevId !== x.jobId) {
    setPrevId(x.jobId)
    setLoading(true)
    setData(null)
  }
  const jobId = x.jobId

  useEffect(function loadCompanyOfJob() {
    const flag: DeadFlag = { dead: false }
    makeLoadPanel({ jobId, slug: TEXT_NONE, setData, setLoading })(flag)
    return function stop(): void {
      flag.dead = true
    }
  }, [jobId, rev])

  function reload(): void {
    setRev(nextRevOf)
  }

  return { loading, data, reload }
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
 * 2026-09-21 改成弹框栈(Frank「点公司就弹公司的框?然后还能点回来」):点在招职位 / 相似雇主都往上叠,只关最上面一层;
 * 上面「Esc 全关」随之作废 —— Esc 由栈自己管,也只关最上面一层。框里点相似雇主同框换一家的口径不变(渲染件 PeekStack 接手)。
 *
 * @returns 弹框栈与两个手柄。
 */
export function useCompanyPeek(): CompanyPeekPanel {
  const stack = useLayerStack<PeekLayer>()
  return { stack, onOpenJob: makePushJobLayer(stack), onOpenCompany: makePushCoLayer(stack) }
}
