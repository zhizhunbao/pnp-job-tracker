'use client'
/**
 * employers 域的状态机器:useEmployersPage 一台管整块雇主板(筛选态、搜索防抖、
 * 深链回写与懒取)。
 * 🔴 性能(#313 同款):名录 6,680 行不进 SSR payload —— SSR 只给第一页 + total,
 * 换筛选/翻页才打 /api/employers 懒取;失败保底继续显示手上这一页,不白屏。
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
  boardUrlOf, loadBoard, makeCity, makeClear, makeDrawerToggle, makeMode, makeNoc, makePage, makeProgram,
  makeProv, qsOf, withQOf,
} from './functions'
import type { EmployerFilters, EmployerPage, EmployersIn, EmployersPanel } from './types'

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
  const [f, setF] = useState<EmployerFilters>(x.initialFilters)
  const [data, setData] = useState<EmployerPage>(x.initial)
  const [loading, setLoading] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [qDraft, setQDraft] = useState(x.initialFilters.q)
  const first = useRef(true)
  const qs = qsOf({ f })

  useEffect(function debounceQuery() {
    if (qDraft === f.q) {
      return
    }
    const id = setTimeout(function commitQuery() {
      setF(withQOf({ f, q: qDraft }))
    }, Q_DEBOUNCE_MS)
    return function cancelCommit() {
      clearTimeout(id)
    }
  }, [qDraft, f])

  useEffect(function syncBoard() {
    if (first.current === true) {
      first.current = false
      return
    }
    window.history.replaceState(null, TEXT_NONE, boardUrlOf({ mode: f.mode, qs }))
    const ctl = new AbortController()
    setLoading(true)
    void loadBoard({ mode: f.mode, qs, signal: ctl.signal, setData, setLoading })
    return function abortLoad() {
      ctl.abort()
    }
  }, [f.mode, qs])

  return {
    lang,
    t,
    f,
    data,
    loading,
    drawer,
    qDraft,
    onQDraft: setQDraft,
    onDrawer: makeDrawerToggle({ drawer, setDrawer }),
    onMode: makeMode({ f, setF }),
    onProv: makeProv({ f, setF }),
    onProgram: makeProgram({ f, setF }),
    onCity: makeCity({ f, setF }),
    onNoc: makeNoc({ f, setF }),
    onClear: makeClear({ f, setF, setQDraft }),
    onPage: makePage({ f, setF }),
  }
}
