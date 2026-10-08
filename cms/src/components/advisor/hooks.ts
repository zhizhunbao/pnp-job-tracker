'use client'
/**
 * advisor 域的状态机器:内嵌初判段的流式生成、额度回传与重试;浮层整机(拖动/拉伸/
 * 全屏/尺寸记忆)、JD 正文取数、点了才生成的 AI 段、职责译文、地点两级取数与弹框整台。
 * 体内不留注释 —— 带口径的步骤在 ./functions 的对应函数上(注释即它们的 JSDoc)。
 * 2026-08-28 拆域批随 JdAdvisorSection 自 components/jobs/Jd.tsx 迁入;
 * 同日换装批把 Advisor.tsx 的六台机器(原先摊在组件体里)收进本抽屉。
 * 2026-10-03 付费闭环批 A1:职位描述弹框整台(useActModal)接访客向导的收口 —— 记浏览、判起弹、注册后亮出这一岗。
 * 2026-10-07 浏览记录整条删(向导不再按它预选职业),「记浏览」一环撤。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { gateDueFor } from '@/lib/guest'
import { track } from '@/lib/track'
import {
  GROUP_COMPANY, LANG_EN, TEXT_NONE, TRACK_KIND_MODAL, TRACK_MODAL_HEAD, TRACK_MODAL_JD, TRACK_P_FIELD, TRACK_P_KIND,
  TRANS_IDLE,
} from './constants'
import {
  makeLoadCompanyJobs, makeLoadJobText, makeLoadNocTrans,
} from './functions'
import type {
  ActModalHookIn, ActModalPanel, AdvisorJob, AdvisorModalHookIn, AdvisorModalPanel, CompanyModalPanel, DeadFlag,
  JobTextIn, JobTextPanel, NocTrans, NocTransIn, NocTransPanel, TransStatus,
} from './types'

/**
 * 详情页 JD 正文的取数机器(打开职位弹框即取,换岗重取,拆卸时掐掉在途请求)。
 *
 * @param x 这一岗。
 * @returns 正文与「被防滥用闸挡下」的旗标。
 */
export function useJobText(x: JobTextIn): JobTextPanel {
  const [text, setText] = useState<string | null>(null)
  const [limited, setLimited] = useState(false)
  const job = x.job

  useEffect(function loadText() {
    const ctrl = new AbortController()
    makeLoadJobText({ applyUrl: job.applyUrl, id: job.id, signal: ctrl.signal, setText, setLimited })()
    return function stop(): void {
      ctrl.abort()
    }
  }, [job])

  return { text, limited }
}

/**
 * 职责/要求中文对照的机器:首次点才调翻译,拿到后前端存一份,切换英/中零延迟。
 *
 * @param x 五位码与界面语言。
 * @returns 对照面板。
 */
export function useNocTrans(x: NocTransIn): NocTransPanel {
  const [showTrans, setShow] = useState(false)
  const [status, setStatus] = useState<TransStatus>(TRANS_IDLE)
  const [trans, setTrans] = useState<NocTrans | null>(null)
  const autoLoad = x.lang !== LANG_EN
  const noc = x.noc
  const lang = x.lang

  useEffect(function loadOnOpen() {
    if (autoLoad === false) {
      return
    }
    makeLoadNocTrans({ noc, lang, setTrans, setShow, setStatus })()
  }, [autoLoad, noc, lang])

  function onToggle(): void {
    if (trans != null) {
      setShow(showTrans === false)
      return
    }
    makeLoadNocTrans({ noc: x.noc, lang: x.lang, setTrans, setShow, setStatus })()
  }

  return { showTrans, status, trans, onToggle }
}

/**
 * 顾问弹框的整台:长文机器 + 打开埋点(#129 功能级埋点:四类弹框打开各记一事件,
 * field = 入口格)+ 同公司在榜岗 + 清单译名开关(2026-07-25 Frank「和上面的中文翻译
 * 按钮联动」;Frank 走查:中文对照默认关,点了才显/才翻 —— 原先中文界面一打开就是
 * 对照态,当天推翻)。
 * 2026-09-16 Frank「公司的也对照改一下」「默认自动翻译」:showZh 中 / 韩界面默认开,同时也管公司弹框正文的对照行;
 * 开关本体在页眉译名行(AdvisorModal 递给 AdvisorHead 的 ctl 槽)。
 * 2026-09-17 Frank「这个 公司的 弹框 也 默认关闭」:showZh 一律默认关(与职位弹框 09-16 晚「默认中文对照都关闭吧」同口径,
 * 先铺英文再补中文行会跳);中 / 韩界面默认开的那句作废,拨开开关才懒翻。
 * 2026-09-17 同日 Frank「自动拨开去掉,但是后台要自动翻译」:译文改由公司域在后台预翻(不看这个开关),开关只管显不显;
 * transBusy 也只在开关拨开而译文未到时才回报(companybody 遮罩)。
 * 2026-09-19 Frank「开关都撤了,就自动翻译」:「中文对照」开关撤,中 / 韩界面对照恒显、英文界面恒不显(showZh 由界面语言直接定)。
 *
 * @param x 分组、入口格、这一岗与界面语言。
 * @returns 弹框整台面板。
 */
export function useAdvisorModal(x: AdvisorModalHookIn): AdvisorModalPanel {
  const showZh = x.lang !== LANG_EN
  const [companyJobsState, setCompanyJobs] = useState<AdvisorJob[]>([])
  const [companyAlias, setCompanyAlias] = useState(TEXT_NONE)
  const [transBusy, setTransBusy] = useState(false)
  const [gen, setGen] = useState(0)
  const isCompanyGroup = x.group === GROUP_COMPANY
  const group = x.group
  const field = x.field
  const company = x.job.company

  useEffect(function trackOpen() {
    track(TRACK_MODAL_HEAD + group, { [TRACK_P_FIELD]: field })
  }, [group, field])

  useEffect(function loadCompanyJobs() {
    const flag: DeadFlag = { dead: false }
    if (isCompanyGroup && company !== TEXT_NONE) {
      makeLoadCompanyJobs({ company, setJobs: setCompanyJobs })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [isCompanyGroup, company])

  function onRetranslated(): void {
    setCompanyAlias(TEXT_NONE)
    setGen(gen + 1)
  }

  let companyJobs = companyJobsState
  if (isCompanyGroup === false || company === TEXT_NONE) {
    companyJobs = []
  }
  return {
    showZh,
    companyJobs,
    companyAlias,
    onCompanyAlias: setCompanyAlias,
    transBusy,
    onTransBusy: setTransBusy,
    gen,
    onRetranslated,
  }
}

/**
 * 职位描述弹框的整台:额度可见化(第 5 轮 #16:JobBody 回传 X-Free-Left,
 * 免费用户看得见剩几次,402 不再是惊吓)+ 打开埋点(#129,kind 分开弹框与整页;
 * 它同时是漏斗第 1 步)。
 * 2026-10-03 付费闭环批 A1:全站职位弹框都经这一台(职位板 / 职位整页 / 公司页 / 雇主板四处的弹框栈,
 * 三份入栈手柄最后都画到这里),访客向导的收口就设在这 —— 开框那一拍先记一笔浏览、再判要不要先弹向导
 * (未登录、站内看过的不同职位算上这一岗够 3 个)。浏览记在判之前,向导「想做什么工作」那一步才预选得到
 * 刚点的这一岗;每层弹框按岗位号作 key,换岗即重挂,一层只记一次。向导盖着时不打开框埋点,注册完亮出这一岗才打。
 * 2026-10-04 改判(Frank「进来就要求用户登录注册」→「照这样改」):不再数第 3 个,未登录开职位弹框一律先弹向导;
 * 浏览照记(向导职业那一步的预选)。
 *
 * @param x 这一岗与分层态。
 * @returns 剩余次数与它的落格、要不要先弹向导与注册后的回调。
 */
export function useActModal(x: ActModalHookIn): ActModalPanel {
  const [freeLeft, setFreeLeft] = useState<number | null>(null)
  const [gen, setGen] = useState(0)
  const loggedIn = x.plan.loggedIn
  const [gate, setGate] = useState(function initGate(): boolean {
    return gateDueFor({ loggedIn })
  })
  const router = useRouter()

  function onRetranslated(): void {
    setGen(gen + 1)
  }

  function onGateDone(): void {
    setGate(false)
    router.refresh()
  }

  useEffect(function trackOpen() {
    if (gate) {
      return
    }
    track(TRACK_MODAL_JD, { [TRACK_P_KIND]: TRACK_KIND_MODAL })
  }, [gate])

  return { freeLeft, onFreeLeft: setFreeLeft, gen, onRetranslated, gate, onGateDone }
}

/**
 * 不带职位的公司弹框的状态:别名、翻译在途两格(中文对照开关 2026-09-19 撤,对照由界面语言直接定)
 * (2026-09-18;AdvisorModal 那台 useAdvisorModal 从一条职位出发,长文机器与同公司在榜岗这里都用不上)。
 *
 * @returns 三格状态与三个落格。
 */
export function useCompanyModal(): CompanyModalPanel {
  const [alias, setAlias] = useState(TEXT_NONE)
  const [transBusy, setTransBusy] = useState(false)
  const [jobs] = useState<AdvisorJob[]>([])
  return { alias, transBusy, jobs, onAlias: setAlias, onTransBusy: setTransBusy }
}
