'use client'
/**
 * 条目式分区卡(工作、教育、证书、志愿、奖项、自定义分区):卡头「添加」,下面一条一框;没有条目只留卡头(照 Job Bank;2026-11-07 Frank 嫌解释句不专业,空态那句撤)。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Button } from '@/components/button'
import { BTN_SECONDARY } from './constants'
import { CvCard } from './cvcard'
import { CvItem } from './cvitem'
import type { CvListCardIn } from './types'

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
      {rows}
    </CvCard>
  )
}
