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
import { useEffect, useState } from 'react'
import { LANG_EN } from './constants'
import { makeAiToggle, makeLoadBrief, makeLoadPanel, makeLoadTrans, makeToggle } from './functions'
import type {
  CompanyAiHookIn, CompanyAiPanel, CompanyBriefFact, CompanyPanelData, CompanyPanelHookIn, CompanyPanelState,
  CompanyTransHookIn, DeadFlag,
} from './types'

/**
 * K 调查简介的懒查(#158 Frank 2026-07-19 批:首开自动调查,命中缓存秒回;
 * 查不到/掉线整块消失不留孤儿)。换了公司当场清空重查 —— 别拿上一家的简介占位。
 * 中文对照(#185)打开且这一门语言不是英文时再懒翻一份存着,切换零延迟。
 *
 * @param x 公司名、对照开关与界面语言。
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

  useEffect(function loadBrief() {
    const flag: DeadFlag = { dead: false }
    makeLoadBrief({ company: x.company, setFact, setLoading })(flag)
    return function stop(): void {
      flag.dead = true
    }
  }, [x.company])

  useEffect(function loadTrans() {
    const flag: DeadFlag = { dead: false }
    if (x.showTrans && trans == null && fact != null && x.lang != null && x.lang !== LANG_EN) {
      makeLoadTrans({ company: x.company, lang: x.lang, setTrans })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [x.showTrans, x.lang, x.company, trans, fact])

  return { loading, fact, trans }
}

/**
 * 缓存简介(库里已有 aiBrief,直渲不用懒查)那条路径的懒翻:与 useCompanyAi 内的
 * 懒翻同款,拿到存一份切换零延迟。名录厚简介那条路径不翻(它是官网原文,#185
 * 对照针对的是 K 调查五节)。
 *
 * @param x 公司名、缓存简介、厚简介标记、对照开关与界面语言。
 * @returns 译文;null = 还没翻/不用翻。
 */
export function useCompanyTrans(x: CompanyTransHookIn): string | null {
  const [trans, setTrans] = useState<string | null>(null)

  useEffect(function loadTrans() {
    const flag: DeadFlag = { dead: false }
    if (x.showTrans && trans == null && x.hasDesc === false && x.aiBrief !== '' && x.lang !== LANG_EN) {
      makeLoadTrans({ company: x.name, lang: x.lang, setTrans })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [x.showTrans, x.hasDesc, x.aiBrief, x.name, x.lang, trans])

  return trans
}

/**
 * 公司弹框整机(E8-11 B1):按岗位号取公司(与 /companies/[slug] 页面同一份数据,
 * 免额度)+ 中文对照与 AI 速读两个开关。换了职位当场清空重取。
 *
 * @param x 当前这一行职位。
 * @returns 加载态、取到的数据与两个开关。
 */
export function useCompanyPanel(x: CompanyPanelHookIn): CompanyPanelState {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CompanyPanelData | null>(null)
  const [showTrans, setShowTrans] = useState(false)
  const [aiOn, setAiOn] = useState(false)
  const [prevJob, setPrevJob] = useState(x.job)

  if (prevJob !== x.job) {
    setPrevJob(x.job)
    setLoading(true)
    setData(null)
  }

  useEffect(function loadPanel() {
    const flag: DeadFlag = { dead: false }
    makeLoadPanel({ jobId: x.job.id, setData, setLoading })(flag)
    return function stop(): void {
      flag.dead = true
    }
  }, [x.job])

  return {
    loading,
    data,
    showTrans,
    onToggleTrans: makeToggle({ on: showTrans, set: setShowTrans }),
    aiOn,
    onToggleAi: makeAiToggle({ on: aiOn, set: setAiOn }),
  }
}
