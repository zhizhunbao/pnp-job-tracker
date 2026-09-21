'use client'
/**
 * 一组职位行(2026-09-21 Frank「这个下面显示中文翻译,不要显示公司」,相关职位卡用):每行是公司弹框「在招职位」同一个 JobMiniRow,
 * 岗名下那行灰字 = 界面语言的职位名译名 —— 库里存好的直接出,没有的这一组一次发齐懒翻(与在招职位卡同一个 useTitleMap、
 * 同一个接口,翻好的落库,下回同名岗直接有);英文界面不出灰字。口径与职位描述弹框标题下那行同源(标题译名,不放职业分类名)。
 *
 * @author Frank
 * @time 2026-09-21 18:30:00
 */
import { JobMiniRow } from './jobminirow'
import { miniSubOf, untranslatedOf } from './functions'
import { useTitleMap } from './hooks'
import type { JobMiniListIn } from './types'

/**
 * 渲染一组职位行。
 *
 * @param props 这一组的行、界面语言与点一行的去处(逐格注释见 JobMiniListIn)。
 * @returns 若干行。
 */
export function JobMiniList({ rows, lang, onOpenJob }: JobMiniListIn) {
  const map = useTitleMap({ titles: untranslatedOf({ rows, lang }), lang })
  const items = []
  for (const row of rows) {
    items.push(
      <JobMiniRow key={row.id} id={row.id}
        title={row.title}
        sub={miniSubOf({ row, lang, map })}
        salaryText={row.salaryText}
        city={row.city}
        onOpenJob={onOpenJob} />,
    )
  }
  return <>{items}</>
}
