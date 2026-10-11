'use client'
/**
 * toast 组件桶的状态机器:宿主(听总线、持卡表)与一张卡(到点自己收、点 × 收)。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { useCallback, useEffect, useState } from 'react'
import { EV_TOAST, TOAST_TTL_MS } from './constants'
import { nextToastId, toastListWith, toastListWithout, toastMsgOf, toToastItem } from './functions'
import type { ToastCardHookIn, ToastHostPanel, ToastItem } from './types'

/**
 * 宿主:挂上就听提示总线,来一条叠一张(最多 TOAST_MAX 张);卸载撤听。
 *
 * @returns 现有的卡与「关一张」。
 */
export function useToastHost(): ToastHostPanel {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(function listen() {
    function onToast(e: Event): void {
      const item = toToastItem({ msg: toastMsgOf(e), id: nextToastId() })
      function next(prev: ToastItem[]): ToastItem[] {
        return toastListWith({ list: prev, item })
      }
      setItems(next)
    }
    window.addEventListener(EV_TOAST, onToast)
    function off(): void {
      window.removeEventListener(EV_TOAST, onToast)
    }
    return off
  }, [])
  const close = useCallback(function closeOne(id: number): void {
    function next(prev: ToastItem[]): ToastItem[] {
      return toastListWithout({ list: prev, id })
    }
    setItems(next)
  }, [])
  return { items, close }
}

/**
 * 一张卡:挂上起表,TOAST_TTL_MS 后自己收;卸载(先被 × 关了、被挤掉)停表。
 *
 * @param x 这一张与宿主的「关一张」。
 * @returns 点 × 的手柄。
 */
export function useToastCard(x: ToastCardHookIn): () => void {
  const id = x.item.id
  const close = x.close
  const onClose = useCallback(function closeMe(): void {
    close(id)
  }, [close, id])
  useEffect(function autoClose() {
    const h = window.setTimeout(onClose, TOAST_TTL_MS)
    function stop(): void {
      window.clearTimeout(h)
    }
    return stop
  }, [onClose])
  return onClose
}
