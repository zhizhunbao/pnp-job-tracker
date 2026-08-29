'use client'
/**
 * 时间组的事实块:四字段各看各的(07-06 用户拍板)—— 状态/下架互为语境成对出现;
 * 发布带首次收录;抓取单独。「下架口径」注只跟状态/下架两格
 * (发布、抓取时间与下架判定无关,挂过去是答非所问)。
 * 挂帖时长(痛点盘点 P0 零抓取项)是新鲜度信号,弹框只在客户端开,无水合差异。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { useState } from 'react'
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { ymd } from '@/lib/time'
import { FIELD_CLOSED_AT, FIELD_DATE_POSTED, FIELD_LAST_SEEN, FIELD_STATUS } from './constants'
import { FactsBox } from './factsbox'
import { daysUpOf, statusTextOf } from './functions'
import type { FieldFactsIn } from './types'

/**
 * 渲染时间字段的事实块。
 *
 * @param props 点开的是哪一格与取数包。
 * @returns 那几行时间。
 */
export function TimeFacts({ field, f }: FieldFactsIn) {
  const t = makeT(f.lang)
  const [openedAt] = useState(Date.now)
  const isStatusish = field === FIELD_STATUS || field === FIELD_CLOSED_AT
  const isPosted = field === FIELD_DATE_POSTED
  const days = daysUpOf({ job: f.job, openedAt })
  return (
    <FactsBox>
      {isStatusish && <Row k={t('col.status')}>{statusTextOf({ t, job: f.job })}</Row>}
      {isPosted && <Row k={t('col.datePosted')}>{ymd(f.job.datePosted)}</Row>}
      {isPosted && days != null && <Row k={t('fact.daysUp')}>{t('fact.daysUpVal', { n: days })}</Row>}
      {isPosted && <Row k={t('col.firstSeen')}>{ymd(f.job.firstSeen)}</Row>}
      {field === FIELD_LAST_SEEN && <Row k={t('col.lastSeen')}>{ymd(f.job.lastSeen)}</Row>}
      {isStatusish && <Row k={t('col.closedAt')}>{ymd(f.job.closedAt)}</Row>}
    </FactsBox>
  )
}
