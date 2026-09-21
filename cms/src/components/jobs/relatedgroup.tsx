'use client'
/**
 * 域内小件:相似职位的一组。分组小标题代替逐行标注(同一组三行都写「同省同职业」是重复文案);
 * 行形态不自造 —— 与公司弹框「在招职位」同一个 JobMiniRow(左岗名右薪资城市)。
 * 同公司组的灰字小注留空:组标题已经说了同公司,再贴一遍公司名既重复又在 375 上被截断。
 * 2026-08-28 换装批自 Job.tsx 提出成文件。
 * 2026-09-21 JobMiniRow 改点文件不走 companies 桶:职位描述弹框(advisor)正文下面也接相似职位卡(经 JobModalCards),
 * 而 companies 的桶反过来要 advisor 的弹框,走桶就成环。
 * 2026-09-21 Frank「这个下面显示中文翻译,不要显示公司」:两组的灰字一律改成职位名译名(英文界面不出),同职业组也不再出公司名 ——
 * 上面「同公司组留空」一条随之作废;行交给 companies 的 JobMiniList(同样点文件),译名的存 / 懒翻都在那边。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { JobMiniList } from '@/components/companies/jobminilist'
import { cssOf } from '@/components/css'
import type { RelatedGroupIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染相似职位的一组。
 *
 * @param props 组小标题、这一组的行、界面语言与点一行的去处。
 * @returns 小标题 + 若干行。
 */
export function RelatedGroup({ label, rows, lang, onOpenJob }: RelatedGroupIn) {
  return (
    <div>
      <div className={cssOf(css.relGroup)}>{label}</div>
      <JobMiniList rows={rows} lang={lang} onOpenJob={onOpenJob} />
    </div>
  )
}
