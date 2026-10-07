'use client'
/**
 * account 域的状态机器:useAccountPage 一台管整页(登录态/节切换/深链/昵称编辑/
 * 购买/登出)。2026-08-26 Frank 看完「纯拼装门」第一版实拍「还是有一堆函数啊」——
 * page.tsx 里的 state/effect/handler 全部收进这里,门只剩一行 hook + 拼装
 * (闸 local/page-no-logic;hooks 抽屉先例 modal/hooks.ts)。
 * 同日续(Frank「hooks 有很多匿名函数需要抽到 functions 吧」):体内不留任何
 * 函数体与注释 —— 带口径的步骤全在 ./functions 的工厂里(注释即它们的 JSDoc),
 * 这里只剩 useState、具名 effect 壳与工厂装配。
 * 2026-09-23 账户页撤到三节(Frank「只保留一个 我的简历 我的收藏 我的求职」):昵称编辑与购买
 * 两组状态随概览、购买两节删除;已存筛选节撤掉,它的整机 useSavedSearches 一并删除。
 * 2026-10-05「我的简历」换装:简历文字存档整机 useResumeArchive 退役,新立 useResumeFile(原件上传 / 删除)
 * 与 useResumeThumb(pdf.js 画首页缩略图)。
 *
 * @author Frank
 * @time 2026-08-26 21:55:00
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { useIsNarrow } from '@/components/modal'
import { RF_ERR_NONE, SEC_DEFAULT, ZOOM_HOME, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from './constants'
import {
  makeAdd, makeAskOf, makeDefaultOf, makeDeleteOf, makeDragLeave, makeDragOver, makeFileDrop, makeFilePick,
  makePickerOf, makePreviewClose, makePreviewOf, makeRefresh, makeSureClear, makeResumeListLoad,
  makeResumeUpload, okFlagOf,
  planOf, renderPdfPages, renderPdfThumb, secLinkOf, showPdfPage,
  applyViewTo, makeDocDrop, makeGripDown, makeGripMove, makeGripUp, makePageTurn, makeWheelBind, makeZoomHome,
  makeZoomRedraw, makeZoomStep, zoomPctOf,
} from './functions'
import type {
  AccountPanel, MaybeResumeMeta, Me, ResumeFilePanel, ResumeMetas, ResumePagesPanel, ResumeThumbHookIn,
  ResumeThumbPanel, MaybePdfDoc, MaybeZoomGrip, ZoomView,
  Sec, SubscriptionPanel, WeeklyHookIn, WeeklyPanel,
} from './types'

/**
 * 账户页整机:登录态查询与刷新、`?ok=`/`?sec=` 深链、昵称就地编辑(E11-01)、
 * 时长包购买(E3-03)、登出。一台机器不拆 —— 这些状态互相咬合(登出要刷新、
 * 存昵称要刷新、购买读 t 出话术),拆开就得互相穿参数。
 * 2026-09-23 概览、购买两节撤掉后,昵称编辑与购买在途两组状态随件删除;回跳标记 payOk 留着 ——
 * 支付成功提示改由页面门在右列最上面挂 PayOkNotice(三节都出)。
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

  useEffect(function firstLoad() {
    makeRefresh({ setMe, setChecked })()
  }, [])

  return {
    lang,
    setLang: setLangSaved,
    t,
    narrow,
    sec,
    me,
    checked,
    payOk,
    onPick: setSec,
    plan: planOf(me),
  }
}

/**
 * 周报开关的退订态(E9-02b):初值取库里的现状,勾选时先本地拨、再 PATCH 跟投(makeWeeklyToggle)。
 * 2026-10-06 自原收藏清单整机 useSavedJobs 拆出(收藏清单改成 myjobs 桶的表,开关单独拼在下面)。
 *
 * @param x 库里的退订现状。
 * @returns 退订态与落格。
 */
export function useWeeklyOptin(x: WeeklyHookIn): WeeklyPanel {
  const [optOut, setOptOut] = useState<boolean>(x.weeklyOptOut)
  return { optOut, setOptOut }
}

/**
 * 「我的订阅」节整机(2026-10-04):只有定价框开合一格;定价框本身(选档、下单、登录态)归 pricing 桶。
 *
 * @returns 定价框开合与它的 setter。
 */
export function useSubscription(): SubscriptionPanel {
  const [open, setOpen] = useState(false)
  return { open, setOpen }
}

/**
 * 「我的简历」整机(2026-10-05;10-06 改一人多份):挂载拉一次清单;新加(选文件 / 拖进来)、替换某一份、
 * 删某一份(就地二次确认)、设默认、开关预览弹框、拖放高亮与报错都在这一台 —— 所有份共用一个隐藏文件框,
 * 点「替换文件」先记下替换哪一份再打开它。
 *
 * @returns 「我的简历」的面板。
 */
export function useResumeFile(): ResumeFilePanel {
  const [checked, setChecked] = useState(false)
  const [items, setItems] = useState<ResumeMetas>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>(RF_ERR_NONE)
  const [sure, setSure] = useState<number | null>(null)
  const [dragOn, setDragOn] = useState(false)
  const [preview, setPreview] = useState<MaybeResumeMeta>(null)
  const [replaceId, setReplaceId] = useState<number | null>(null)
  const [input, setInput] = useState<HTMLInputElement | null>(null)

  const reload = makeResumeListLoad({ setItems, setChecked })
  useEffect(function firstLoad() {
    makeResumeListLoad({ setItems, setChecked })()
  }, [])

  const upload = makeResumeUpload({ replaceId, reload, setBusy, setErr })
  const act = { reload, setSure, setErr }
  return {
    checked,
    items,
    busy,
    err,
    sure,
    dragOn,
    preview,
    onInputMount: setInput,
    onAdd: makeAdd({ input, setReplaceId }),
    onPick: makeFilePick({ upload }),
    onDragOver: makeDragOver({ upload, setDragOn }),
    onDragLeave: makeDragLeave({ upload, setDragOn }),
    onDrop: makeFileDrop({ upload, setDragOn }),
    replaceOf: makePickerOf({ input, setReplaceId }),
    askOf: makeAskOf({ setSure, setErr }),
    onCancel: makeSureClear({ setSure, setErr }),
    deleteOf: makeDeleteOf(act),
    defaultOf: makeDefaultOf(act),
    previewOf: makePreviewOf({ setPreview }),
    onPreviewClose: makePreviewClose({ setPreview }),
  }
}

/**
 * 预览弹框整机:容器挂上就把原件逐页画进去(只露第一页);翻页时只换露哪一页,不重画。
 * 2026-10-06 加缩放(Frank「这个可以鼠标滚动放大缩小吧」):视图(倍数 + 平移)套在放页容器上;
 * 滚轮原生挂在舞台上,拖动 / 捏合走舞台的指针事件;倍数停下后按新倍数重画当前页;翻页回整页;文档随弹框销毁。
 *
 * @param x 原件地址。
 * @returns 容器 / 舞台回调、画完 / 画不了、页数与翻页、缩放状态与手柄。
 */
export function useResumePages(x: ResumeThumbHookIn): ResumePagesPanel {
  const [box, setBox] = useState<HTMLDivElement | null>(null)
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const [doc, setDoc] = useState<MaybePdfDoc>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [count, setCount] = useState(0)
  const [index, setIndex] = useState(0)
  const [view, setView] = useState<ZoomView>(ZOOM_HOME)
  const [grip, setGrip] = useState<MaybeZoomGrip>(null)

  useEffect(function drawPages() {
    if (box == null || x.src === RF_ERR_NONE) {
      return
    }
    void renderPdfPages({ box, src: x.src, setReady, setFailed, setCount, setDoc })
  }, [box, x.src])

  useEffect(function holdDoc() {
    if (doc == null) {
      return
    }
    return makeDocDrop(doc)
  }, [doc])

  useEffect(function turnPage() {
    if (box != null && ready) {
      showPdfPage({ box, index })
    }
  }, [box, ready, index])

  useEffect(function wheelZoom() {
    if (stage == null) {
      return
    }
    return makeWheelBind({ stage, setView })
  }, [stage])

  useEffect(function showView() {
    if (box != null) {
      applyViewTo({ box, view })
    }
  }, [box, view])

  useEffect(function sharpen() {
    if (doc == null || box == null || ready === false) {
      return
    }
    return makeZoomRedraw({ doc, box, index, zoom: view.zoom })
  }, [doc, box, ready, index, view.zoom])

  const grips = { view, grip, setView, setGrip }
  return {
    onBoxMount: setBox,
    onStageMount: setStage,
    ready,
    failed,
    count,
    index,
    onPage: makePageTurn({ setIndex, setView }),
    zoomed: view.zoom > ZOOM_MIN,
    pct: zoomPctOf(view),
    canIn: view.zoom < ZOOM_MAX,
    canOut: view.zoom > ZOOM_MIN,
    onZoomIn: makeZoomStep({ stage, setView, factor: ZOOM_STEP }),
    onZoomOut: makeZoomStep({ stage, setView, factor: 1 / ZOOM_STEP }),
    onZoomReset: makeZoomHome({ setView }),
    onGripDown: makeGripDown(grips),
    onGripMove: makeGripMove(grips),
    onGripUp: makeGripUp(grips),
  }
}

/**
 * 缩略图整机:画布挂上且有地址时画一次;地址变了(换了文件)重画。
 *
 * @param x 原件地址(空串 = 不画)。
 * @returns 画布回调与「画好了」。
 */
export function useResumeThumb(x: ResumeThumbHookIn): ResumeThumbPanel {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(function drawThumb() {
    if (canvas == null || x.src === RF_ERR_NONE) {
      return
    }
    void renderPdfThumb({ canvas, src: x.src, setReady })
  }, [canvas, x.src])

  return { onCanvasMount: setCanvas, ready }
}
