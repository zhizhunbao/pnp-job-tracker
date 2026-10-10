'use client'
/**
 * 一组职位行(2026-09-21 Frank「这个下面显示中文翻译,不要显示公司」,相关职位卡用):每行是公司弹框「在招职位」同一个 JobMiniRow,
 * 岗名下那行灰字 = 界面语言的职位名译名 —— 库里存好的直接出,没有的这一组一次发齐懒翻(与在招职位卡同一个 useTitleMap、
 * 同一个接口,翻好的落库,下回同名岗直接有);英文界面不出灰字。口径与职位描述弹框标题下那行同源(标题译名,不放职业分类名)。
 * 2026-10-09 N6 批:行里城市换 name 桶 CityName,多递省码(地图查询用);相关职位接口不带市名译名,城市只出英文。
 * 行内已不读 onOpenJob(岗名换 JobName 经总线自开),照旧递着,上游接线另批清。
 * 2026-10-09 N6b 批:上游接线清了 —— 这一格撤,相关职位卡不再往下递点一行的去处。
 *
 * @author Frank
 * @time 2026-09-21 18:30:00
 */
import { JobMiniRow } from './jobminirow'
import { untranslatedOf, useTitleMap } from '@/components/jobtitle'
import { miniSubOf } from './functions'
import type { JobMiniListIn } from './types'

/**
 * 渲染一组职位行。
 *
 * @param props 这一组的行与界面语言(逐格注释见 JobMiniListIn)。
 * @returns 若干行。
 */
export function JobMiniList({ rows, lang }: JobMiniListIn) {
  const map = useTitleMap({ titles: untranslatedOf({ rows, lang }), lang })
  const items = []
  for (const row of rows) {
    items.push(
      <JobMiniRow key={row.id} id={row.id}
        title={row.title}
        sub={miniSubOf({ row, lang, map })}
        salaryText={row.salaryText}
        city={row.city}
        province={row.province} />,
    )
  }
  return <>{items}</>
}
