'use client'
/**
 * me 桶子桶 jobs 的状态机器:页签、三张清单的取数(今日推荐 / 我的收藏 / 我的投递)、打码行上沿、
 * 职位名与公司名的懒翻表、进「我的求职」先弹五题。
 * 2026-11-07 自 myjobs 桶与 account 桶的 useJobsQuiz 在新域重写:三张清单的取数提到页一级(页签上要挂三个数),
 * 懒翻表与打码行量位仍在各自页签里(没切过去的页签不翻)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { makeLoadAlias } from '@/components/companies'
import { untranslatedOf, useTitleMap } from '@/components/jobtitle'
import { CO_SEP, GEN_NONE, STAGE_ALL, TEXT_NONE, URL_APPLIED, URL_SAVED } from './constants'
import {
  firstTabOf, jobsQuizOpenOf, loadProfile, makeAskedDone, makeCoLand, makeFlag, makeLoadMyJobs, markJobsAsked,
  untranslatedCosOf,
} from './functions'
import { lockTopOf, makeLoadPicks, makeSwap } from './recommend'
import type {
  JobsHookIn, JobsPanel, JobsQuizHookIn, JobsQuizPanel, LazyCompaniesIn, LazyTitlesIn, LockTopIn, LockTopPanel,
  MyJobItem, MyJobsHookIn, MyJobsPanel, PfView, PicksFact, PicksHookIn, PicksPanel, TitledItem,
} from './types'

/**
 * 「我的求职」一页整机:当前页签(旧深链 `?sec=favs` 先落「我的收藏」)+ 三张清单。
 * 投出一封(重拉代数)推荐与我的投递重拉;我的收藏只拉一次(旧件只重挂投递表)。
 *
 * @param x 重拉代数、答档案代数与是不是 Pro。
 * @returns 页签与三张清单。
 */
export function useJobs(x: JobsHookIn): JobsPanel {
  const [tab, setTab] = useState(firstTabOf)
  const picks = usePicks({ gen: x.gen, asked: x.asked, pro: x.pro })
  const saved = useMyJobs({ url: URL_SAVED, gen: GEN_NONE })
  const applied = useMyJobs({ url: URL_APPLIED, gen: x.gen })
  return { tab, onTab: setTab, picks, saved, applied }
}

/**
 * 一张清单的整机:挂上拉一次,重拉代数变了再拉。
 *
 * @param x 清单接口与重拉代数。
 * @returns 清单、拉失败了没与阶段筛选。
 */
export function useMyJobs(x: MyJobsHookIn): MyJobsPanel {
  const [items, setItems] = useState<MyJobItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [stage, setStage] = useState<string>(STAGE_ALL)

  useEffect(function firstLoad() {
    void makeLoadMyJobs({ url: x.url, setItems, setFailed })()
  }, [x.url, x.gen])

  return { items, failed, stage, setStage }
}

/**
 * 今日推荐整机:挂上拉一次、重拉代数变了再拉(刚投出的岗从推荐里下去);答档案代数变了也重拉(五题答完按新答案推)。
 * 先列 PICKS_FIRST 条,点「显示更多」再列(expanded),展开着可「收起」;「换一批」批号变了重拉,免费号换满开定价框。
 *
 * @param x 重拉代数、答档案代数与是不是 Pro。
 * @returns 推荐、拉失败了没、定价框开关与几个手柄。
 */
export function usePicks(x: PicksHookIn): PicksPanel {
  const [data, setData] = useState<PicksFact | null>(null)
  const [failed, setFailed] = useState(false)
  const [upsell, setUpsell] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [batch, setBatch] = useState(0)

  useEffect(function firstLoad() {
    void makeLoadPicks({ setData, setFailed, fresh: x.asked > 0, batch })()
  }, [x.gen, x.asked, batch])

  return {
    data,
    failed,
    upsell,
    onUpsell: makeFlag({ set: setUpsell, v: true }),
    onUpsellClose: makeFlag({ set: setUpsell, v: false }),
    expanded,
    onExpand: makeFlag({ set: setExpanded, v: true }),
    onFold: makeFlag({ set: setExpanded, v: false }),
    onSwap: makeSwap({ pro: x.pro, batch, setBatch, setExpanded, setUpsell }),
  }
}

/**
 * 打码行上沿(2026-10-12 Frank「隐藏的 和 显示的 要对齐啊」「上下要对齐。有 中文 灰字的 要加上」):打码行并进同一张表后,
 * 「解锁其余 N 条」大钮要从第一条打码行盖起 —— 渲染后量一次(行高随内容变,写死会偏),行数或开关变了重量。
 *
 * @param x 有没有打码行与行数。
 * @returns 表格外框的 ref 与上沿像素。
 */
export function useLockTop(x: LockTopIn): LockTopPanel {
  const ref = useRef<HTMLDivElement | null>(null)
  const [top, setTop] = useState<number | null>(null)
  useLayoutEffect(function measureLock() {
    if (x.on === false) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 打码行的上沿只能在 DOM 提交后量(useLayoutEffect 正是为此),量完落格
      setTop(null)
      return
    }

    setTop(lockTopOf(ref.current))
  }, [x.on, x.n])
  return { ref, top }
}

/**
 * 一张清单的公司名懒翻表(2026-10-12 Frank「这个也需要中文灰字」):库里没存界面语译名的公司逐家走公司弹框那只懒翻手柄
 * (companies 桶 makeLoadAlias,翻完服务端写回公司表),回来只补灰字那一格;英文界面不翻;换了清单旧请求作废。
 *
 * @param x 清单行与界面语。
 * @returns 公司名 → 译名。
 */
export function useLazyCompanies(x: LazyCompaniesIn): Record<string, string> {
  const [cos, setCos] = useState<Record<string, string>>({})
  const names = untranslatedCosOf(x)
  const sig = names.join(CO_SEP)

  useEffect(function askCompanies() {
    const flag = { dead: false }
    for (const name of sig.split(CO_SEP)) {
      if (name !== TEXT_NONE) {
        makeLoadAlias({ name, lang: x.lang, setAlias: makeCoLand({ name, setCos }), onSettled: ignoreSettled })(flag)
      }
    }
    return function dropAsk() {
      flag.dead = true
    }
  }, [sig, x.lang])

  return cos
}

/**
 * 懒翻收尾回报(这里不用)。
 *
 * @param _done 收尾了。
 * @returns 无。
 */
function ignoreSettled(_done: boolean): void {
  return
}

/**
 * 一张清单的职位名懒翻表(2026-10-11 Frank「可以,按你说的改」:职位格照全站 jobtitle 口径补灰字):
 * 库里没存界面语译名的岗名批量懒翻,英文界面不翻;清单还没拉到给空表。
 *
 * @param x 清单行与界面语。
 * @returns 岗名 → 译名。
 */
export function useLazyTitles(x: LazyTitlesIn): Record<string, string> {
  const rows: TitledItem[] = []
  if (x.items != null) {
    for (const it of x.items) {
      rows.push({ title: it.title, titleZh: it.titleZh, titleKo: it.titleKo })
    }
  }
  return useTitleMap({ titles: untranslatedOf({ rows, lang: x.lang }), lang: x.lang })
}

/**
 * 「进我的求职先弹五题」整机(2026-10-11):挂上取一次档案;该弹就弹,弹出那一刻记进答案档(一人只自动弹一次);
 * 关了(保存或 ×)记这一页关过、交还调用方。
 *
 * @param x 关了之后的交还口。
 * @returns 档案、弹着没与关框手柄。
 */
export function useJobsQuiz(x: JobsQuizHookIn): JobsQuizPanel {
  const [view, setView] = useState<PfView | null>(null)
  const [closed, setClosed] = useState(false)
  useEffect(function loadOnce() {
    void loadProfile({ setView })
  }, [])
  const open = jobsQuizOpenOf({ view, closed })
  useEffect(function markAskedOnOpen() {
    if (open) {
      void markJobsAsked()
    }
  }, [open])
  return { view, open, onClose: makeAskedDone({ setClosed, onDone: x.onDone }) }
}
