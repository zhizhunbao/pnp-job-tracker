'use client'
/**
 * 域内小件:相似职位的一组。分组小标题代替逐行标注(同一组三行都写「同省同职业」是重复文案);
 * 行形态不自造 —— 与公司弹框「在招职位」同一个 JobMiniRow(左岗名右薪资城市)。
 * 同公司组的灰字小注留空:组标题已经说了同公司,再贴一遍公司名既重复又在 375 上被截断。
 * 2026-08-28 换装批自 Job.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { JobMiniRow } from '@/components/companies'
import { cssOf } from '@/components/css'
import { subOf } from './functions'
import type { RelatedGroupIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染相似职位的一组。
 *
 * @param props 组小标题、这一组的行与要不要写公司名小注。
 * @returns 小标题 + 若干行。
 */
export function RelatedGroup({ label, rows, withCompany }: RelatedGroupIn) {
  const items = []
  for (const r of rows) {
    items.push(
      <JobMiniRow key={r.id} id={r.id}
        title={r.title}
        sub={subOf({ withCompany, company: r.company })}
        salaryText={r.salaryText}
        city={r.city} />,
    )
  }
  return (
    <div>
      <div className={cssOf(css.relGroup)}>{label}</div>
      {items}
    </div>
  )
}
