'use client'
/**
 * pdf 桶的状态机器:预览整机 useResumePages(2026-11-07 自 account 桶在新域重写,入出参与原件同形)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { useEffect, useState } from 'react'
import { TEXT_NONE, ZOOM_HOME, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from './constants'
import {
  applyViewTo, makeDocDrop, makeGripDown, makeGripMove, makeGripUp, makePageTurn, makeWheelBind, makeZoomHome,
  makeZoomRedraw, makeZoomStep, renderPdfPages, showPdfPage, zoomPctOf,
} from './functions'
import type { MaybePdfDoc, MaybeZoomGrip, ResumePagesHookIn, ResumePagesPanel, ZoomView } from './types'

/**
 * 预览弹框整机:容器挂上就把原件逐页画进去(只露第一页);翻页时只换露哪一页,不重画。
 * 2026-10-06 加缩放(Frank「这个可以鼠标滚动放大缩小吧」):视图(倍数 + 平移)套在放页容器上;
 * 滚轮原生挂在舞台上,拖动 / 捏合走舞台的指针事件;倍数停下后按新倍数重画当前页;翻页回整页;文档随弹框销毁。
 *
 * @param x 原件地址。
 * @returns 容器 / 舞台回调、画完 / 画不了、页数与翻页、缩放状态与手柄。
 */
export function useResumePages(x: ResumePagesHookIn): ResumePagesPanel {
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
    if (box == null || x.src === TEXT_NONE) {
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
