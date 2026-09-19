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
import { useColPick } from '@/components/table'
import {
  ALIAS_KEYS_SEP, ALIAS_POLL_MS, ALIAS_POLL_ROUNDS_MAX, COLS_STORE_KEY, Q_DEBOUNCE_MS, TEXT_NONE,
} from './constants'
import {
  boardUrlOf, colKeysOf, employerColsOf, forceKeysOf, loadBoard, makeClear, makeEe, makeEntryPick, makeFoldToggle,
  addrQsOf, aliasPollKeysOf, applyHomeProv, foldCountOf, loadAliasPatch, makeCategory, reportSeen,
  makeCity, makeCloseJob, makeCloseModal, makeDistrict,
  makeLmiaPick, makeMore, makeProv,
  makeQCommit, makeSector, makeSort,
  qsOf, sortStateOf,
} from './functions'
import type {
  AliasPatch, AliasPollIn, EmpJob, EmpModal, EmployersIn, EmployersPanel, EmpPeekPanel, MoreIn, PoolFilters, PoolPage,
  QCommitIn,
} from './types'

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
  const [fold, setFold] = useState(foldCountOf({ f: x.initialFilters }) > 0)
  const peek = useEmpPeek(x)
  const first = useRef(true)
  const held = useRef<PoolPage | null>(null)
  const sent = useRef(new Set<string>())
  const qs = qsOf({ f })
  const addr = addrQsOf({ f })
  const pick = useColPick({
    cols: employerColsOf({ t, shown: [] }), storeKey: COLS_STORE_KEY, force: forceKeysOf({ f }), initial: x.initialCols,
  })

  useQDebounce({ f, q: qDraft, setF })

  useHomeProv({ f: x.initialFilters, setF })

  useEffect(function holdData() {
    held.current = data
    void reportSeen({ lang, rows: data.rows, sent: sent.current })
  }, [data, lang])

  useEffect(function syncBoard() {
    if (first.current === true) {
      first.current = false
      return
    }
    window.history.replaceState(null, TEXT_NONE, boardUrlOf({ qs: addr }))
    const ctl = new AbortController()
    setLoading(true)
    void loadBoard({ qs, signal: ctl.signal, setData, setLoading, prev: held.current })
    return function abortLoad() {
      ctl.abort()
    }
  }, [qs, addr])

  const aliases = useAliasPoll({ lang, rows: data.rows })

  return {
    lang,
    t,
    f,
    data,
    aliases,
    loading,
    qDraft,
    updatedAt: x.updatedAt,
    peek,
    sort: sortStateOf({ f }),
    onQDraft: setQDraft,
    onProv: makeProv({ f, setF }),
    onSector: makeSector({ f, setF }),
    onCity: makeCity({ f, setF }),
    onDistrict: makeDistrict({ f, setF }),
    onEe: makeEe({ f, setF }),
    onCategory: makeCategory({ f, setF }),
    onEntry: makeEntryPick({ f, setF }),
    onLmia: makeLmiaPick({ f, setF }),
    cols: employerColsOf({ t, shown: colKeysOf({ cols: pick.cols }) }),
    pick: pick.view,
    pickRef: pick.boxRef,
    fold,
    onFold: makeFoldToggle({ fold, setFold }),
    onSort: makeSort({ f, setF }),
    onClear: makeClear({ f, setF, setQDraft }),
    onMore: makeMore({ f, setF }),
  }
}

/**
 * 灰字译名自动补(2026-09-19 Frank「我不想在刷新一下页面,才显示 中文灰字。我需要他自动显示」):板上有还没灰字的行时,
 * 每隔 ALIAS_POLL_MS 拿这些行的键去问一次,问到的进补丁表,行构造那头只补灰字那一格 —— 不重取整页
 * (「显示更多」是一页页接起来的,重取会把接好的列表打回一页)。接力方式:补丁表每轮换一份新的 → 本 effect 重跑 → 排下一轮;
 * 要问的键变了(有进展 / 换了筛选)轮数清零,原地踏步满 ALIAS_POLL_ROUNDS_MAX 轮就停。
 *
 * @param x 界面语言与板上的行。
 * @returns 补丁表。
 */
function useAliasPoll(x: AliasPollIn): AliasPatch {
  const [patch, setPatch] = useState<AliasPatch>({})
  const rounds = useRef(0)
  const lastSig = useRef(TEXT_NONE)
  const sig = aliasPollKeysOf({ lang: x.lang, rows: x.rows, patch }).join(ALIAS_KEYS_SEP)

  useEffect(function pollAliases() {
    if (sig !== lastSig.current) {
      lastSig.current = sig
      rounds.current = 0
    }
    if (sig === TEXT_NONE || rounds.current >= ALIAS_POLL_ROUNDS_MAX) {
      return
    }
    const id = setTimeout(function askAliases() {
      rounds.current += 1
      void loadAliasPatch({ keys: sig.split(ALIAS_KEYS_SEP), patch, setPatch })
    }, ALIAS_POLL_MS)
    return function cancelAsk() {
      clearTimeout(id)
    }
  }, [sig, patch])

  return patch
}

/**
 * 搜索框防抖:草稿停手一会儿才落进筛选(2026-09-19 自 useEmployersPage 原样提出 —— 那台机器超了行数上限,体一字未动)。
 *
 * @param x 当前筛选、搜索草稿与落格。
 * @returns 无。
 */
function useQDebounce(x: QCommitIn): void {
  const f = x.f
  const qDraft = x.q
  const setF = x.setF
  useEffect(function debounceQuery() {
    if (qDraft === f.q) {
      return
    }
    const id = setTimeout(makeQCommit({ f, q: qDraft, setF }), Q_DEBOUNCE_MS)
    return function cancelCommit() {
      clearTimeout(id)
    }
  }, [qDraft, f, setF])
}

/**
 * 弹框层(2026-09-19 Frank「这个链接还是改成弹框公司吧」):点雇主名开公司弹框,框里点在招职位叠开职位描述弹框、
 * 点相似雇主同框换一家。自成一台小机器 —— 它与筛选 / 懒取那一摊状态互不咬合。
 *
 * @param x 页面 props(只读分层态)。
 * @returns 弹框层面板。
 */
function useEmpPeek(x: EmployersIn): EmpPeekPanel {
  const [modal, setModal] = useState<EmpModal | null>(null)
  const [peekJob, setPeekJob] = useState<EmpJob | null>(null)
  return {
    plan: x.plan,
    modal,
    onOpenCompany: setModal,
    onCloseModal: makeCloseModal({ setModal }),
    peekJob,
    onOpenJob: setPeekJob,
    onCloseJob: makeCloseJob({ setPeekJob }),
  }
}

/**
 * 首屏预选本省:只在挂载时按进来那一刻的筛选判一次(判据见 applyHomeProv)。
 *
 * @param x 进来时的筛选与落格。
 * @returns 无。
 */
function useHomeProv(x: MoreIn): void {
  useEffect(function presetHomeProv() {
    applyHomeProv(x)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时按进来那一刻的筛选判一次
  }, [])
}
