'use client'
/**
 * 域内小件:招聘对比的一张省卡(手机形态):省名三格 + 五个数
 * (AIP 岗行与看岗位钮 2026-09-10 Frank「这两列 删掉」随桌面两列同撤,表卡同形;
 * 2026-09-11 Frank「中位时薪,最低时薪 最高时薪」中位年薪行换时薪三行)。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { TEXT_NONE } from './constants'
import { KvRow } from './kvrow'
import type { JobsCardIn } from './types'
import css from './start.module.css'

/**
 * 渲染一张省卡。
 *
 * @param props 这一行与取词函数。
 * @returns 卡。
 */
export function JobsCard({ row, t }: JobsCardIn) {
  return (
    <div className={css.card}>
      <div className={css.provCardHead}>
        <span className={css.provCardName}>{row.name}</span>
        {row.localeName !== TEXT_NONE && <span className={css.note}>{row.localeName}</span>}
      </div>
      <div className={css.provCardBody}>
        <KvRow k={t('stats.openJobs')} v={<strong>{row.openText}</strong>} />
        <KvRow k={t('stats.new7d')} v={row.new7Text} />
        <KvRow k={t('stats.wageLowH')} v={row.wageLowText} />
        <KvRow k={t('stats.wageMedH')} v={row.wageMedText} />
        <KvRow k={t('stats.wageHighH')} v={row.wageHighText} />
      </div>
    </div>
  )
}
