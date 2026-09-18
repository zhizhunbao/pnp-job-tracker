'use client'
/**
 * employers 域的状态机器:useEmployersPage 一台管整块雇主板(筛选态、搜索防抖、
 * 深链回写与懒取)。
 * 🔴 性能(#313 同款):池表 8.8 万桶行不进 SSR payload —— SSR 只给第一页 + total,
 * 换筛选/翻页/换排序才打 /api/employers 懒取;失败保底继续显示手上这一页,不白屏。
 * 2026-09-13 雇主板批二:口径 / 社区 / 职业 / 抽屉四格状态退役,换成 行业组 / 开关 / 表头排序。
 * 体内不留任何函数体与带口径的注释 —— 步骤全在 ./functions 的工厂里(注释即它们的
 * JSDoc),这里只剩 useState、具名 effect 壳与工厂装配(样板 account/hooks.ts)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/components/i18n'
import { Q_DEBOUNCE_MS, TEXT_NONE } from './constants'
import {
  boardUrlOf, loadBoard, makeClear, makeEntryPick, makeFoldToggle, makeGroup, makeLmiaPick, makePage, makeProv,
  makeQCommit, makeSector, makeSort,
  qsOf, sortStateOf,
} from './functions'
import type { EmployersIn, EmployersPanel, PoolFilters, PoolPage } from './types'

/**
 * 雇主板整机:筛选态、搜索框防抖、筛选进 URL(replaceState —— 换筛选不该在历史里
 * 堆一串条目,也不该整页重载)与换页懒取。一台机器不拆 —— 这些状态互相咬合
 * (换筛选要回第一页、要重打 API、要改地址栏),拆开就得互相穿参数。
 *
 * @param x SSR 首帧的第一页与初始筛选。
 * @returns 视图要的整块面板:状态 + 手柄。
 */
export function useEmployersPage(x: EmployersIn): EmployersPanel {
  const [lang, , t] = useLang()
  const [f, setF] = useState<PoolFilters>(x.initialFilters)
  const [data, setData] = useState<PoolPage>(x.initial)
  const [loading, setLoading] = useState(false)
  const [qDraft, setQDraft] = useState(x.initialFilters.q)
  const [fold, setFold] = useState(x.initialFilters.entry || x.initialFilters.lmia)
  const first = useRef(true)
  const qs = qsOf({ f })

  useEffect(function debounceQuery() {
    if (qDraft === f.q) {
      return
    }
    const id = setTimeout(makeQCommit({ f, q: qDraft, setF }), Q_DEBOUNCE_MS)
    return function cancelCommit() {
      clearTimeout(id)
    }
  }, [qDraft, f])

  useEffect(function syncBoard() {
    if (first.current === true) {
      first.current = false
      return
    }
    window.history.replaceState(null, TEXT_NONE, boardUrlOf({ qs }))
    const ctl = new AbortController()
    setLoading(true)
    void loadBoard({ qs, signal: ctl.signal, setData, setLoading })
    return function abortLoad() {
      ctl.abort()
    }
  }, [qs])

  return {
    lang,
    t,
    f,
    data,
    loading,
    qDraft,
    updatedAt: x.updatedAt,
    sort: sortStateOf({ f }),
    onQDraft: setQDraft,
    onGroup: makeGroup({ f, setF }),
    onProv: makeProv({ f, setF }),
    onSector: makeSector({ f, setF }),
    onEntry: makeEntryPick({ f, setF }),
    onLmia: makeLmiaPick({ f, setF }),
    fold,
    onFold: makeFoldToggle({ fold, setFold }),
    onSort: makeSort({ f, setF }),
    onClear: makeClear({ f, setF, setQDraft }),
    onPage: makePage({ f, setF }),
  }
}
