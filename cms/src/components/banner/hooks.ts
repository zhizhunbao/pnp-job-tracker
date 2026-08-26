'use client'
/**
 * banner 域的状态机器:背景轮播(crossfade 定时器 + hover 暂停 + 坏图降级)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { useEffect, useState } from 'react'
import { REDUCED_MOTION_MQ, ROTATE_MS } from './constants'
import type { CarouselOut } from './types'

/**
 * 背景轮播整机:8s 换一张(循环),hover 暂停,任一张图挂了整组作废(imgs 归 null,
 * 调用方回落渐变带 —— 发布零风险的兜底);系统偏好「减少动态」时静止在第一张。
 * 定时器 effect 只依赖 [imgs, paused]:imgs 是从 props 派生的同一引用(死图/空组归 null);
 * paused 变化要重挂定时器。
 *
 * @param images 图组;null/空 = 没图。
 * @returns 机器面板(可用图组、当前序、四枚手柄)。
 */
export function useCarousel(images: readonly string[] | null): CarouselOut {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dead, setDead] = useState(false)

  let imgs: readonly string[] | null = null
  if (dead === false && images != null && images.length > 0) {
    imgs = images
  }

  useEffect(function bind() {
    if (imgs == null || imgs.length < 2 || paused) {
      return
    }
    if (typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_MQ).matches) {
      return
    }
    const n = imgs.length

    function tick() {
      function next(i: number): number {
        return (i + 1) % n
      }
      setIdx(next)
    }

    const id = setInterval(tick, ROTATE_MS)

    function off() {
      clearInterval(id)
    }
    return off
  }, [imgs, paused])

  function onEnter() {
    setPaused(true)
  }

  function onLeave() {
    setPaused(false)
  }

  function pick(i: number) {
    setIdx(i)
  }

  function fail() {
    setDead(true)
  }

  return { imgs, idx, onEnter, onLeave, pick, fail }
}
