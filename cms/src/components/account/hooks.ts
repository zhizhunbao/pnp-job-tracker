'use client'
/**
 * account 域的状态机器:useAccountPage 一台管整页(登录态/节切换/深链/昵称编辑/
 * 购买/登出)。2026-08-26 Frank 看完「纯拼装门」第一版实拍「还是有一堆函数啊」——
 * page.tsx 里的 state/effect/handler 全部收进这里,门只剩一行 hook + 拼装
 * (闸 local/page-no-logic;hooks 抽屉先例 modal/hooks.ts)。
 * 同日续(Frank「hooks 有很多匿名函数需要抽到 functions 吧」):体内不留任何
 * 函数体与注释 —— 带口径的步骤全在 ./functions 的工厂里(注释即它们的 JSDoc),
 * 这里只剩 useState、具名 effect 壳与工厂装配。
 *
 * @author Frank
 * @time 2026-08-26 21:55:00
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { useIsNarrow } from '@/components/modal'
import { SEC_DEFAULT, TEXT_NONE } from './constants'
import {
  makeBuy, makeLoadSavedJobs, makeLoadSearches, makeLogout, makeNickEdit, makeNickKey, makeRefresh, makeResumeClear,
  makeSaveNick, okFlagOf, proOf, resumeAtSeedOf, resumeCurSeedOf, secLinkOf,
} from './functions'
import type {
  AccountPanel, Me, ResumeHookIn, ResumePanel, SavedJobFact, SavedJobsHookIn, SavedJobsPanel, SavedSearchesPanel,
  SavedSearchFact, Sec,
} from './types'

/**
 * 账户页整机:登录态查询与刷新、`?ok=`/`?sec=` 深链、昵称就地编辑(E11-01)、
 * 时长包购买(E3-03)、登出。一台机器不拆 —— 这些状态互相咬合(登出要刷新、
 * 存昵称要刷新、购买读 t 出话术),拆开就得互相穿参数。
 *
 * @returns 门(page.tsx)要的整块面板:状态 + 手柄。
 */
export function useAccountPage(): AccountPanel {
  const [sec, setSec] = useState<Sec>(SEC_DEFAULT)
  const narrow = useIsNarrow()
  const [lang, setLangSaved, t] = useLang()

  const [me, setMe] = useState<Me>(null)
  const [checked, setChecked] = useState(false)
  const [payOk, setPayOk] = useState(false)
  const [buying, setBuying] = useState(false)
  const [buyErr, setBuyErr] = useState(TEXT_NONE)
  const [nick, setNick] = useState<string | null>(null)
  const [nickBusy, setNickBusy] = useState(false)

  useEffect(function readPayOk() {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 故意分两步:地址栏参数只有浏览器里读得到,服务端画首帧时没有,活过来后再补
    setPayOk(okFlagOf())
  }, [])

  useEffect(function readSecLink() {
    const s = secLinkOf()
    if (s != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 故意分两步:地址栏参数只有浏览器里读得到,服务端画首帧时没有,活过来后再补
      setSec(s)
    }
  }, [])

  const refresh = makeRefresh({ setMe, setChecked })

  useEffect(function firstLoad() {
    makeRefresh({ setMe, setChecked })()
  }, [])

  const saveNick = makeSaveNick({ nick, me, setNick, setNickBusy, refresh })

  return {
    lang,
    setLang: setLangSaved,
    t,
    narrow,
    sec,
    me,
    checked,
    payOk,
    buying,
    buyErr,
    nick,
    nickBusy,
    pro: proOf({ me }),
    onPick: setSec,
    onLogout: makeLogout({ refresh }),
    onNickEdit: makeNickEdit({ me, setNick }),
    onNickChange: setNick,
    onNickSave: saveNick,
    onNickKey: makeNickKey({ saveNick, setNick }),
    onBuy: makeBuy({ t, setBuying, setBuyErr }),
  }
}

/**
 * 收藏岗清单整机(E9-01):挂载拉一次清单,行内改状态/移除靠面板递出的清单与落格;
 * 周报退订态(E9-02b)显示语义取反在渲染层做。
 *
 * @param x 周报退订现状(favs 视图给 null)。
 * @returns 收藏清单的面板。
 */
export function useSavedJobs(x: SavedJobsHookIn): SavedJobsPanel {
  const [items, setItems] = useState<SavedJobFact[] | null>(null)
  const [optOut, setOptOut] = useState<boolean>(x.weeklyOptOut === true)

  useEffect(function firstLoad() {
    makeLoadSavedJobs({ setItems })()
  }, [])

  return { items, setItems, optOut, setOptOut }
}

/**
 * 已存筛选整机(E5-03):挂载拉一次清单;删除后由 refresh 重拉(删除以服务端为准,
 * 不做本地乐观移除)。
 *
 * @returns 已存筛选的面板。
 */
export function useSavedSearches(): SavedSearchesPanel {
  const [items, setItems] = useState<SavedSearchFact[] | null>(null)

  useEffect(function firstLoad() {
    makeLoadSearches({ setItems })()
  }, [])

  return { items, refresh: makeLoadSearches({ setItems }) }
}

/**
 * 简历存档整机(E11-08 §2):正文与时刻的初值来自父页已拉到的档案(本件不自己拉),
 * 展开与二次确认两格纯 UI 态;清除走工厂(先本地移除再跟投)。
 *
 * @param x 登录人 id 与档案两格。
 * @returns 简历存档的面板。
 */
export function useResumeArchive(x: ResumeHookIn): ResumePanel {
  const [cur, setCur] = useState<string>(resumeCurSeedOf(x))
  const [at, setAt] = useState<string>(resumeAtSeedOf(x))
  const [open, setOpen] = useState(false)
  const [sure, setSure] = useState(false)

  return {
    cur,
    at,
    open,
    sure,
    setOpen,
    setSure,
    onClear: makeResumeClear({ userId: x.userId, setCur, setAt, setOpen, setSure }),
  }
}
