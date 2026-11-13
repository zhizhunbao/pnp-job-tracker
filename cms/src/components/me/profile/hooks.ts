'use client'
/**
 * me 桶子桶 profile 的状态机器:我的档案(挂上取一次档案、开 / 关 / 保存编辑弹框)与「我的通道」(看哪个省、开着哪条通道)。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { EV_BUILD, EV_UPLOADED, PF_LOAD_BUSY, PF_START_WHO, TEXT_NONE } from './constants'
import {
  loadProfile, makeEditOpen, makeFlagSet, makeProfileSaved, makeProvPickOf, makeStreamOpenOf, makeTextSet,
  makeUploadedFill, msInitProvOf,
} from './functions'
import type { MyStreamsHookIn, MyStreamsPanel, PfView, ProfileHookIn, ProfilePanel } from './types'

/**
 * 我的档案整机(2026-10-09「我的档案」批):挂上取一次档案;「修改」开访客向导同款的编辑弹框,保存成功关框并换一代重取。
 * 2026-11-07 多一格 autoEdit:从「我的求职」顶上那条「补全档案」点「去补全」过来,一进页就开着修改面板。
 * 2026-11-12 Frank「和我修改简历那一部分合并一下」:听「要生成简历」的页面事件(简历卡空态的钮),打开修改面板。
 * 2026-11-12 Frank「这个应该是自动填的吧」:听「简历上传成了」的页面事件,档案还有空格就打开修改面板并自动从简历填写。
 *
 * @param x 取词函数。
 * @returns 我的档案的面板。
 */
export function useProfile(x: ProfileHookIn): ProfilePanel {
  const [lang] = useLang()
  const [view, setView] = useState<PfView | null>(null)
  const [load, setLoad] = useState(PF_LOAD_BUSY)
  const [editing, setEditing] = useState(x.autoEdit)
  const [start, setStart] = useState(TEXT_NONE)
  const [gen, setGen] = useState(0)
  useEffect(function loadOnGen() {
    void loadProfile({ setView, setLoad })
  }, [gen])
  useEffect(function listenBuild() {
    const onBuild = makeEditOpen({ setStart, setEditing, start: TEXT_NONE })
    window.addEventListener(EV_BUILD, onBuild)
    return function stopListen(): void {
      window.removeEventListener(EV_BUILD, onBuild)
    }
  }, [])
  useEffect(function listenUploaded() {
    const onUploaded = makeUploadedFill({ view, setStart, setEditing })
    window.addEventListener(EV_UPLOADED, onUploaded)
    return function stopListen(): void {
      window.removeEventListener(EV_UPLOADED, onUploaded)
    }
  }, [view])
  return {
    t: x.t,
    lang,
    load,
    view,
    editing,
    start,
    onEdit: makeEditOpen({ setStart, setEditing, start: TEXT_NONE }),
    onAsk: makeEditOpen({ setStart, setEditing, start: PF_START_WHO }),
    onClose: makeFlagSet({ set: setEditing, v: false }),
    onSaved: makeProfileSaved({ setEditing, setGen, gen, onChanged: x.onChanged }),
  }
}

/**
 * 「我的通道」卡整机(2026-10-13):看哪个省(默认档案的所在省,不在通道省份里就联邦)、开着哪条通道的弹框。
 *
 * @param x 档案的所在省码。
 * @returns 省份、开着的通道与几个手柄。
 */
export function useMyStreams(x: MyStreamsHookIn): MyStreamsPanel {
  const [prov, setProv] = useState(msInitProvOf(x.prov))
  const [open, setOpen] = useState(TEXT_NONE)
  return {
    prov,
    provPickOf: makeProvPickOf({ setProv, setOpen }),
    open,
    openOf: makeStreamOpenOf({ setOpen }),
    onClose: makeTextSet({ set: setOpen, v: TEXT_NONE }),
  }
}
