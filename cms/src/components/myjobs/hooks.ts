'use client'
/**
 * 「我的」页两张岗位清单(myjobs 组件桶)的状态机器:挂上拉一次清单;取消收藏靠面板递出的清单与落格;
 * 点公司名开公司弹框走 modal 域的弹框栈(× / Esc 只关最上面一层,同雇主板);2026-10-08 进度板加阶段筛选一格。
 * 2026-10-09 N 批:弹框栈改用 modal 桶的代理栈 usePeekBus(只发消息),唯一的栈在全站骨架上的 PeekHost。
 * 同日 N6 批:职位名 / 公司名换 name 桶的 JobName / CompanyName(件自己往弹框总线上推层),本机不再持栈、不再递界面语。
 * 2026-10-10 批 2:加两台机器 —— usePicks(今日推荐:挂上拉一次 + 定价框开关)、usePush(新岗推送:拉设置、改、存)。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { useEffect, useState } from 'react'
import { STAGE_ALL, TEXT_NONE } from './constants'
import { makeFlag, makeLoadMyJobs, makeLoadPicks, scrollSavedIfLinked } from './functions'
import { makeLoadPush, makeSavePush } from './prefs'
import type {
  MyJobItem, MyJobsHookIn, MyJobsPanel, PicksFact, PicksHookIn, PicksPanel, PushIn, PushPanel,
} from './types'

/**
 * 一张清单的整机。
 *
 * @param x 清单接口。
 * @returns 清单、改清单、拉失败了没与阶段筛选。
 */
export function useMyJobs(x: MyJobsHookIn): MyJobsPanel {
  const [items, setItems] = useState<MyJobItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [stage, setStage] = useState(STAGE_ALL)

  useEffect(function firstLoad() {
    void makeLoadMyJobs({ url: x.url, setItems, setFailed })()
  }, [x.url])

  return {
    items,
    setItems,
    failed,
    stage,
    setStage,
  }
}

/**
 * 今日推荐整机:挂上拉一次、重拉代数变了再拉(刚投出的岗从推荐里下去);「升级 Pro」开定价框。
 *
 * @param x 重拉代数。
 * @returns 推荐、拉失败了没与定价框开关。
 */
export function usePicks(x: PicksHookIn): PicksPanel {
  const [data, setData] = useState<PicksFact | null>(null)
  const [failed, setFailed] = useState(false)
  const [upsell, setUpsell] = useState(false)

  useEffect(function firstLoad() {
    void makeLoadPicks({ setData, setFailed })()
  }, [x.gen])

  return {
    data,
    failed,
    upsell,
    onUpsell: makeFlag({ set: setUpsell, v: true }),
    onUpsellClose: makeFlag({ set: setUpsell, v: false }),
  }
}

/**
 * 新岗推送整机:挂上拉一次设置;改频率、改邮箱、点保存。
 *
 * @param x 取词函数。
 * @returns 设置、两个改手柄、保存后那一句与保存手柄。
 */
export function usePush(x: PushIn): PushPanel {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [freq, setFreq] = useState(TEXT_NONE)
  const [email, setEmail] = useState(TEXT_NONE)
  const [note, setNote] = useState(TEXT_NONE)
  const [busy, setBusy] = useState(false)

  useEffect(function firstLoad() {
    void makeLoadPush({ setFreq, setEmail, setReady, setFailed })()
  }, [])

  return {
    ready,
    failed,
    freq,
    setFreq,
    email,
    setEmail,
    note,
    busy,
    onSave: makeSavePush({ freq, email, t: x.t, setNote, setBusy }),
  }
}

/**
 * 旧深链 `?sec=favs` 落「我的求职」:收藏清单拉回来以后滚到收藏卡(2026-10-10 批 2,「我的收藏」页签撤)。
 *
 * @param loaded 收藏清单拉回来了没有。
 */
export function useScrollSaved(loaded: boolean): void {
  useEffect(function scrollOnLink() {
    if (loaded) {
      scrollSavedIfLinked()
    }
  }, [loaded])
}
