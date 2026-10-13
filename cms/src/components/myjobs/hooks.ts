'use client'
/**
 * 「我的」页两张岗位清单(myjobs 组件桶)的状态机器:挂上拉一次清单;取消收藏靠面板递出的清单与落格;
 * 点公司名开公司弹框走 modal 域的弹框栈(× / Esc 只关最上面一层,同雇主板);2026-10-08 进度板加阶段筛选一格。
 * 2026-10-09 N 批:弹框栈改用 modal 桶的代理栈 usePeekBus(只发消息),唯一的栈在全站骨架上的 PeekHost。
 * 同日 N6 批:职位名 / 公司名换 name 桶的 JobName / CompanyName(件自己往弹框总线上推层),本机不再持栈、不再递界面语。
 * 2026-10-10 批 2:加两台机器 —— usePicks(今日推荐:挂上拉一次 + 定价框开关)、usePush(新岗推送:拉设置、改、存)。
 * 2026-10-10 批 3:加两台 —— useAppHost(只读投递框宿主:读地址栏 `?app=`)、useAppView(框里:拉投递清单找那一行 + 拉往来)。
 * 2026-10-11:加 useLazyTitles(三张清单职位名灰字的懒翻表,jobtitle 桶 useTitleMap 包一层)。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { makeLoadAlias } from '@/components/companies'
import { untranslatedOf, useTitleMap } from '@/components/jobtitle'
import { CO_SEP, STAGE_ALL, TEXT_NONE, URL_APPLIED } from './constants'
import {
  itemByIdOf, makeAskClose, makeAskOk, makeCoLand, makeFlag, makeLoadMyJobs, scrollSavedIfLinked, untranslatedCosOf,
} from './functions'
import { lockTopOf, makeLoadPicks } from './recommend'
import { makeLoadPush, makeSavePush } from './prefs'
import { bindAppHost, closeAppView, makeLoadThread } from './thread'
import type {
  AppHostPanel, AppViewHookIn, AppViewPanel, AskDel, AskPanel, AvThread, LazyCompaniesIn, LazyTitlesIn, LockTopIn,
  LockTopPanel, MyJobItem, MyJobsHookIn, MyJobsPanel, PicksFact, PicksHookIn, PicksPanel, PushIn, PushPanel,
  TitledItem,
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
 * 2026-10-11:答档案代数变了也重拉(五题答完按新答案推)。
 * 2026-10-12:今日推荐与更多推荐合成一张卡,先列 PICKS_FIRST 条,点「显示更多」再列(expanded);「删除」本地先删那一行(setData)。
 *
 * @param x 重拉代数与答档案代数。
 * @returns 推荐、拉失败了没与定价框开关。
 */
export function usePicks(x: PicksHookIn): PicksPanel {
  const [data, setData] = useState<PicksFact | null>(null)
  const [failed, setFailed] = useState(false)
  const [upsell, setUpsell] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(function firstLoad() {
    void makeLoadPicks({ setData, setFailed, fresh: x.asked > 0 })()
  }, [x.gen, x.asked])

  return {
    data,
    failed,
    upsell,
    onUpsell: makeFlag({ set: setUpsell, v: true }),
    onUpsellClose: makeFlag({ set: setUpsell, v: false }),
    setData,
    expanded,
    onExpand: makeFlag({ set: setExpanded, v: true }),
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

/**
 * 只读投递框宿主整机(2026-10-10 批 3):挂上读一次地址栏 `?app=`,开关框与浏览器后退都重读。
 *
 * @returns 开着的投递行与关框。
 */
export function useAppHost(): AppHostPanel {
  const [id, setId] = useState<number | null>(null)
  useEffect(function bindHost() {
    return bindAppHost({ setId })
  }, [])
  return { id, onClose: closeAppView }
}

/**
 * 只读投递框整机(2026-10-10 批 3):挂上拉我的投递清单(找那一行画「职位信息」,单元格同清单)与这一条的往来。
 *
 * @param x 投递行 id。
 * @returns 那一行、往来与拉失败了没。
 */
export function useAppView(x: AppViewHookIn): AppViewPanel {
  const [items, setItems] = useState<MyJobItem[] | null>(null)
  const [thread, setThread] = useState<AvThread | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(function firstLoad() {
    void makeLoadMyJobs({ url: URL_APPLIED, setItems, setFailed })()
    void makeLoadThread({ appId: x.appId, setThread, setFailed })()
  }, [x.appId])

  let item: MyJobItem | null = null
  if (items != null) {
    item = itemByIdOf({ items, id: x.appId })
  }
  return { item, thread, failed: failed || (items != null && item == null) }
}

/**
 * 删除确认框整机(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」):点「删除」只记下要删哪一条,框里点「删除」才真删。
 *
 * @returns 等着确认的那一次、拨框手柄与两颗钮的手柄。
 */
export function useAskDel(): AskPanel {
  const [ask, setAsk] = useState<AskDel | null>(null)
  return { ask, setAsk, onOk: makeAskOk({ ask, setAsk }), onCancel: makeAskClose(setAsk) }
}

/**
 * 打码行上沿(2026-10-12 Frank「隐藏的 和 显示的 要对齐啊」「上下要对齐。有 中文 灰字的 要加上」):打码行并进同一张表后,「升级 Pro」大钮要从第一条打码行盖起 ——
 * 渲染后量一次(行高随内容变,写死会偏),行数或开关变了重量。
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
 * (companies 桶 makeLoadAlias,翻完服务端写回公司表,下次谁看都有),回来只补灰字那一格;英文界面不翻;换了清单旧请求作废。
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
