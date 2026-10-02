/**
 * pager 域的机器(2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」「展开 20, 再展开 20, 再开其余, 收起」):浏览器端已有全量的清单的展开状态 —— 已展开了几个,
 * 「展开」一次加 FOLD_STEP 个、「收起」归零(服务器分页的清单自己取数,只把已展开个数交给 FoldLine)。
 * 同日 AIP 指定雇主卡与相似雇主卡各写了一套「按页取 + 展开收起」的机器,并成 usePagedFold 一台(同一件事不许两套实现)。
 *
 * @author Frank
 * @time 2026-10-02 02:10:00
 */
import { useState } from 'react'
import {
  makeAppendPage, makeFoldMore, makeFoldUp, makeLoadPage, makePagedFold, makePagedMore, pagedExtraOf, pagedRowsOf,
} from './functions'
import type { FoldHookIn, FoldPanel, PagedFoldHookIn, PagedFoldPanel } from './types'

/**
 * 清单的展开状态。
 *
 * @param x 折起来的总数。
 * @returns 已展开个数与两只手柄。
 */
export function useFold(x: FoldHookIn): FoldPanel {
  const [extra, setExtra] = useState(0)
  return {
    extra: Math.min(extra, x.hidden),
    onMore: makeFoldMore({ hidden: x.hidden, setExtra }),
    onFold: makeFoldUp(setExtra),
  }
}

/**
 * 服务器按页取的清单的展开状态(2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」):首屏行由调用方带来,「展开」按页从接口取一页往后接
 * (一页的行数由接口定,与 FOLD_STEP 同数),直到总数;收起后再展开不重取。换一份清单由调用方给卡挂 React key 整个重置。
 *
 * @param x 首屏行、总数、接口地址与跳过起点。
 * @returns 要露的行、折起来几行、已展开几行、取数中与两只手柄。
 */
export function usePagedFold<T>(x: PagedFoldHookIn<T>): PagedFoldPanel<T> {
  const [rest, setRest] = useState<T[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const hidden = Math.max(0, x.total - x.top.length)
  const load = makeLoadPage<T>({
    url: x.url, offset: x.skip + rest.length, onRows: makeAppendPage<T>(setRest), setBusy,
  })
  return {
    rows: pagedRowsOf({ top: x.top, rest, open }),
    hidden,
    extra: pagedExtraOf({ open, loaded: rest.length }),
    busy,
    onMore: makePagedMore({ open, loaded: rest.length, remain: hidden - rest.length, busy, setOpen, load }),
    onFold: makePagedFold(setOpen),
  }
}
