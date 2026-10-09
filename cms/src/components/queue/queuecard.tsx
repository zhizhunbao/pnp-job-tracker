'use client'
/**
 * 队列里当前这一岗的卡:职位名(链职位页)、公司、城市、薪资、已下架标;下面信的预览(前几行,「展开」看全文)。
 * 2026-10-08 Frank「展开 和 收起 完全没必要」:信全文铺开;「再投递之前 有让用户一项一项检查吗」:信下面接逐项检查(apply 桶同一个)。
 *
 * @author Frank
 * @time 2026-10-08 15:00:00
 */
import { ApplyCheck } from '@/components/apply'
import { LinkButton } from '@/components/button'
import { Tag } from '@/components/tag'
import { CLOSED_TAG, TEXT_NONE, URL_JOB_HEAD } from './constants'
import { locationOf } from './functions'
import type { QueueCardIn } from './types'
import css from './queue.module.css'

/**
 * 渲染一张卡。
 *
 * @param props 整机面板、这一岗与取词函数。
 * @returns 卡。
 */
export function QueueCard({ p, item, t }: QueueCardIn) {
  const loc = locationOf({ item, lang: p.lang })
  return (
    <div className={css.job}>
      <div className={css.jobTitle}>
        {item.jobId != null && (
          <LinkButton href={URL_JOB_HEAD + String(item.jobId)} onClick={p.onTitle} className={css.jobLink}>
            {item.title}
          </LinkButton>
        )}
        {item.jobId == null && item.title}
        {item.closed && <Tag variant={CLOSED_TAG}>{t('mj.closed')}</Tag>}
      </div>
      <div className={css.jobCo}>{item.company}</div>
      <div className={css.jobMeta}>
        {loc !== TEXT_NONE && <span>{loc}</span>}
        {item.salary !== TEXT_NONE && <span className={css.pay}>{item.salary}</span>}
      </div>
      <div className={css.letter}>{item.cover}</div>
      {p.checkRows.length > 0 && <ApplyCheck t={t} rows={p.checkRows} ticks={p.ticks} onTick={p.onTick} />}
    </div>
  )
}
