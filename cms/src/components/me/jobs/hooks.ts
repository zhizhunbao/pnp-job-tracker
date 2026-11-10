'use client'
/**
 * me 桶子桶 jobs 的状态机器:页签、三张清单的取数(今日推荐 / 我的收藏 / 我的投递)、打码行上沿、
 * 职位名与公司名的懒翻表、进「我的求职」先弹五题。
 * 2026-11-07 自 myjobs 桶与 account 桶的 useJobsQuiz 在新域重写:三张清单的取数提到页一级(页签上要挂三个数),
 * 懒翻表与打码行量位仍在各自页签里(没切过去的页签不翻)。
 * 同日 Frank「现在都按 Azure 的来」:打码行撤,量打码行上沿的 useLockTop 跟着撤。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { useEffect, useState } from 'react'
import { makeLoadAlias } from '@/components/companies'
import { untranslatedOf, useTitleMap } from '@/components/jobtitle'
import {
  CO_SEP, GEN_NONE, STAGE_ALL, TEXT_NONE, URL_APPLIED, URL_APPLIED_DEL, URL_SAVED, URL_SAVED_DEL,
  ST_DRAFT,
} from './constants'
import {
  loadProfile, makeAskClose, makeAskOk, makeCoLand, makeFillHide, makeFlag, makeLoadMyJobs,
  makeRemoveMine, makeRemovePick, untranslatedCosOf,
  stageDefOf, ymdOf,
} from './functions'
import { makeLoadPicks, makeSwap } from './recommend'
import { downloadRecord, recordCsvOf } from './record'
import type { RecordRow } from './record'
import type {
  AskDel, AskPanel, FillPanel, JobsHookIn, JobsPanel, LazyCompaniesIn, LazyTitlesIn,
  MyJobItem, MyJobsHookIn, MyJobsPanel, PfView, PicksFact, PicksHookIn, PicksPanel, TitledItem,
  RecordExportIn,
} from './types'

/**
 * 「我的求职」一页整机:三张清单(2026-11-09 页签挪到侧边栏,当前出哪一张由页面递来,不在这里记)。
 * 投出一封(重拉代数)推荐与我的投递重拉;我的收藏只拉一次(旧件只重挂投递表)。
 *
 * @param x 重拉代数、答档案代数与是不是 Pro。
 * @returns 页签与三张清单。
 */
export function useJobs(x: JobsHookIn): JobsPanel {
  const picks = usePicks({ gen: x.gen, asked: x.asked, pro: x.pro })
  const saved = useMyJobs({ url: URL_SAVED, delHead: URL_SAVED_DEL, gen: GEN_NONE })
  const applied = useMyJobs({ url: URL_APPLIED, delHead: URL_APPLIED_DEL, gen: x.gen })
  return { picks, saved, applied }
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

  return { items, failed, stage, setStage, remove: makeRemoveMine({ urlHead: x.delHead, items, setItems }) }
}

/**
 * 删除确认框整机(10-12 旧桶 useAskDel 照抄):等着确认的那一次、请确认、确认、取消。
 *
 * @returns 删除确认框整机。
 */
export function useAskDel(): AskPanel {
  const [ask, setAsk] = useState<AskDel | null>(null)
  return { ask, onAsk: setAsk, onOk: makeAskOk({ ask, setAsk }), onCancel: makeAskClose(setAsk) }
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
    remove: makeRemovePick({ data, setData }),
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
 * 「补全档案」提示条整机(2026-11-07 代替进页自动弹五题):挂上取一次档案;✕ 了这一页不再出(换页回来再出,档案补全了自然不出)。
 *
 * @returns 档案与 ✕。
 */
export function useFill(): FillPanel {
  const [view, setView] = useState<PfView | null>(null)
  const [hidden, setHidden] = useState(false)
  useEffect(function loadOnce() {
    void loadProfile({ setView })
  }, [])
  return { view, hidden, onHide: makeFillHide({ setHidden }) }
}

/**
 * 「导出求职记录」的手柄(2026-11-08 清单第 7 条):发出过的投递,一行一条(草稿不算求职活动)。
 *
 * @param x 投递清单与取词函数。
 * @returns 点击手柄。
 */
export function useRecordExport(x: RecordExportIn): () => void {
  return function onExport(): void {
    const rows: RecordRow[] = []
    if (x.items == null) {
      return
    }
    for (const it of x.items) {
      if (it.stage !== ST_DRAFT) {
        const def = stageDefOf(it.stage)
        let status = it.stage
        if (def != null) {
          status = x.t(def.labelKey)
        }
        rows.push({ date: ymdOf(it.updatedAt), title: it.title, company: it.company, status })
      }
    }
    const head = {
      date: x.t('mj.col.appliedOn'),
      title: x.t('mj.col.title'),
      company: x.t('mj.col.company'),
      status: x.t('mj.col.status'),
    }
    downloadRecord({ csv: recordCsvOf({ head, rows }), day: ymdOf(new Date().toISOString()) })
  }
}
