'use client'
/**
 * 域内小件:雇主段 / LMIA 段的伞(2026-09-04 重构:行业各一表,不让用户筛)。
 * 两段同形只差表种与标题,一件两用:雇主段 = 在招且带担保信号;LMIA 段 = 技能类 LMIA 获批。
 * Frank「列出所有雇主没有意义,列出在招的有价值的雇主才有意义」「LMIA 应该单独算一个部分」。
 * 空段(一个行业都凑不出一行)整块不渲,绝不出空壳。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { Updated } from '@/components/time'
import { Band } from './band'
import { EmpBoardSec } from './empboardsec'
import { Sec } from './sec'
import type { EmpSectionIn } from './types'

/**
 * 渲染雇主段或 LMIA 段。
 *
 * @param props 锚点、伞标题、表种、更新时刻与行业分表。
 * @returns 一条色带;没有分表则 null。
 */
export function EmpSection({ t, id, title, kind, updatedAt, secs }: EmpSectionIn) {
  if (secs.length === 0) {
    return null
  }
  const items = []
  for (let i = 0; i < secs.length; i += 1) {
    const sec = secs[i]
    if (sec != null) {
      items.push(<EmpBoardSec key={sec.key} t={t} sec={sec} kind={kind} gap={i !== 0} />)
    }
  }
  return (
    <Band id={id}>
      <Sec title={title} right={<Updated iso={updatedAt} t={t} />}>{items}</Sec>
    </Band>
  )
}
