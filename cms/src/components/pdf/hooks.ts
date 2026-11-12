'use client'
/**
 * pdf 桶的状态机器:预览整机 useResumePages(2026-11-07 自 account 桶在新域重写)。
 * 2026-11-12 撤掉翻页与缩放的状态(Frank「全站的简历都应该是默认铺满当前的吧」「这个不嵌入一个框呢?」「也别翻页」),
 * 只剩:打开文档、盯容器的宽、按宽画全部页。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { useEffect, useState } from 'react'
import { TEXT_NONE } from './constants'
import { makeDocDrop, makePagesDraw, makeWidthWatch, openPdfDoc } from './functions'
import type { MaybePdfDoc, ResumePagesHookIn, ResumePagesPanel } from './types'

/**
 * 预览整机:打开原件;放页的容器挂上后盯着它的宽,每一页按这个宽画进去(从上到下排);
 * 容器明显变宽后停一下再重画清楚;文档随预览区销毁。容器宽是 0(所在的框还没露出来)时先不画,露出来再画。
 *
 * @param x 原件地址。
 * @returns 容器回调、画完 / 画不了。
 */
export function useResumePages(x: ResumePagesHookIn): ResumePagesPanel {
  const [box, setBox] = useState<HTMLDivElement | null>(null)
  const [doc, setDoc] = useState<MaybePdfDoc>(null)
  const [width, setWidth] = useState(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(function openDoc() {
    if (x.src === TEXT_NONE) {
      return
    }
    void openPdfDoc({ src: x.src, setDoc, setFailed })
  }, [x.src])

  useEffect(function holdDoc() {
    if (doc == null) {
      return
    }
    return makeDocDrop(doc)
  }, [doc])

  useEffect(function watchWidth() {
    if (box == null) {
      return
    }
    return makeWidthWatch({ box, setWidth })
  }, [box])

  useEffect(function drawPages() {
    if (doc == null || box == null || width === 0) {
      return
    }
    return makePagesDraw({ doc, box, width, setReady, setFailed })
  }, [doc, box, width])

  return { onBoxMount: setBox, ready, failed }
}
