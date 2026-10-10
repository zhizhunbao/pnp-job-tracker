'use client'
/**
 * 队列里当前这一岗的卡:职位名(链职位页)、公司、城市、薪资、已下架标;下面信的预览(前几行,「展开」看全文)。
 * 2026-10-08 Frank「展开 和 收起 完全没必要」:信全文铺开;「再投递之前 有让用户一项一项检查吗」:信下面接逐项检查(apply 桶同一个)。
 * 2026-10-09 N6 批(Frank「职位名、公司名、地点同形,省市分开」「城市 和 省份 点击 跳 google 地图」):职位名、公司名、城市、省份
 * 换 name 桶的现成件(JobName / CompanyName / CityName / ProvName)—— 英文在上、界面语译名灰字在下;职位名点了叠开职位框,
 * 城市、省份去 Google 地图,原只出城市译名一格(locationOf)撤,市和省各一份。队列行不带公司 slug 与公司 / 职位名译名,
 * 公司名暂为黑字一行、职位名不带灰字(数据口补上再接)。
 *
 * @author Frank
 * @time 2026-10-08 15:00:00
 */
import { ApplyMail } from '@/components/apply'
import { CityName, CompanyName, JobName, Name, ProvName } from '@/components/name'
import { Tag } from '@/components/tag'
import { CLOSED_TAG, TEXT_NONE } from './constants'
import type { QueueCardIn } from './types'
import css from './queue.module.css'

/**
 * 渲染一张卡。
 *
 * @param props 整机面板、这一岗与取词函数。
 * @returns 卡。
 */
export function QueueCard({ p, item, t }: QueueCardIn) {
  return (
    <div className={css.job}>
      <div className={css.jobTitle}>
        {item.jobId != null && <JobName id={item.jobId} title={item.title} sub={TEXT_NONE} />}
        {item.jobId == null && <Name en={item.title} sub={TEXT_NONE} />}
        {item.closed && <Tag variant={CLOSED_TAG}>{t('mj.closed')}</Tag>}
      </div>
      <div className={css.jobCo}>
        <CompanyName name={item.company} slug={TEXT_NONE} zh={TEXT_NONE} ko={TEXT_NONE} />
      </div>
      <div className={css.jobMeta}>
        {item.city !== TEXT_NONE && (
          <CityName city={item.city} province={item.province} zh={item.cityZh} ko={item.cityKo} />
        )}
        {item.province !== TEXT_NONE && <ProvName code={item.province} />}
        {item.salary !== TEXT_NONE && <span className={css.pay}>{item.salary}</span>}
      </div>
      {p.check.rows.length > 0 && <ApplyMail t={t} p={p.check} />}
    </div>
  )
}
