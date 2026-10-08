'use client'
/**
 * 「我的」页两张岗位表(myjobs 组件桶)的状态机器:挂上拉一次清单;取消收藏靠面板递出的清单与落格;
 * 点公司名开公司弹框走 modal 域的弹框栈(× / Esc 只关最上面一层,同雇主板)。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { useLayerStack } from '@/components/modal'
import { makeLoadMyJobs, makePushCo, makePushJob } from './functions'
import type { MyJobItem, MyJobsHookIn, MyJobsPanel, PeekLayer } from './types'

/**
 * 一张表的整机。
 *
 * @param x 清单接口。
 * @returns 清单、改清单、拉失败了没、界面语与公司弹框栈。
 */
export function useMyJobs(x: MyJobsHookIn): MyJobsPanel {
  const [items, setItems] = useState<MyJobItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [lang] = useLang()
  const stack = useLayerStack<PeekLayer>()

  useEffect(function firstLoad() {
    void makeLoadMyJobs({ url: x.url, setItems, setFailed })()
  }, [x.url])

  return { items, setItems, failed, lang, stack, onOpenCompany: makePushCo(stack), onOpenJob: makePushJob(stack) }
}
