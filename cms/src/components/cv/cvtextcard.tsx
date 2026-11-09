'use client'
/**
 * 段落式分区卡(个人简介、技能):有字就逐行列出、卡头「修改」;没字只留卡头「添加」(2026-11-07 Frank 嫌解释句不专业,空态那句撤)。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Button } from '@/components/button'
import { cvLinesOf } from '@/lib/cv'
import { BTN_SECONDARY } from './constants'
import { CvCard } from './cvcard'
import { CvLines } from './cvlines'
import type { CvTextCardIn } from './types'

/**
 * 段落式分区卡。
 *
 * @param props 整机面板、哪一段与卡标题词条。
 * @returns 卡。
 */
export function CvTextCard({ p, k, head }: CvTextCardIn) {
  const lines = cvLinesOf(p.draft[k])
  const empty = lines.length === 0
  const acts = (
    <>
      {empty && <Button kind={BTN_SECONDARY} sm onClick={p.textEditOf(k)}>{p.t('cv.add')}</Button>}
      {empty === false && <Button kind={BTN_SECONDARY} sm onClick={p.textEditOf(k)}>{p.t('cv.edit')}</Button>}
    </>
  )
  return (
    <CvCard head={p.t(head)} acts={acts}>
      <CvLines lines={lines} />
    </CvCard>
  )
}
