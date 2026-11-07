'use client'
/**
 * 条目式分区卡(工作、教育、证书、志愿、奖项、自定义分区):卡头「添加」,下面一条一框;没有条目一句「留空就不出现在简历上」。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Button } from '@/components/button'
import { BTN_SECONDARY } from './constants'
import { CvCard } from './cvcard'
import { CvItem } from './cvitem'
import type { CvListCardIn } from './types'
import css from './cv.module.css'

/**
 * 条目式分区卡。
 *
 * @param props 整机面板与分区配置。
 * @returns 卡。
 */
export function CvListCard({ p, conf }: CvListCardIn) {
  const rows = []
  for (const [i, e] of p.draft[conf.key].entries()) {
    rows.push(<CvItem key={i} p={p} conf={conf} e={e} index={i} />)
  }
  const acts = <Button kind={BTN_SECONDARY} sm onClick={p.addOf(conf.key)}>{p.t('cv.add')}</Button>
  return (
    <CvCard head={p.t(conf.card)} acts={acts}>
      {rows.length === 0 && <div className={css.note}>{p.t('cv.empty')}</div>}
      {rows}
    </CvCard>
  )
}
