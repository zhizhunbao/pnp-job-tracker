'use client'
/**
 * 「我的」页两张岗位清单(myjobs 组件桶)的状态机器:挂上拉一次清单;取消收藏靠面板递出的清单与落格;
 * 点公司名开公司弹框走 modal 域的弹框栈(× / Esc 只关最上面一层,同雇主板);2026-10-08 进度板加阶段筛选一格。
 * 2026-10-09 N 批:弹框栈改用 modal 桶的代理栈 usePeekBus(只发消息),唯一的栈在全站骨架上的 PeekHost。
 * 同日 N6 批:职位名 / 公司名换 name 桶的 JobName / CompanyName(件自己往弹框总线上推层),本机不再持栈、不再递界面语。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { useEffect, useState } from 'react'
import { STAGE_ALL } from './constants'
import { makeLoadMyJobs } from './functions'
import type { MyJobItem, MyJobsHookIn, MyJobsPanel } from './types'

/**
 * 一张清单的整机。
 *
 * @param x 清单接口。
 * @returns 清单、改清单、拉失败了没与阶段筛选。
 */
export function useMyJobs(x: MyJobsHookIn): MyJobsPanel {
  const [items, setItems] = useState<MyJobItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [stage, setStage] = useState(STAGE_ALL)

  useEffect(function firstLoad() {
    void makeLoadMyJobs({ url: x.url, setItems, setFailed })()
  }, [x.url])

  return {
    items,
    setItems,
    failed,
    stage,
    setStage,
  }
}
