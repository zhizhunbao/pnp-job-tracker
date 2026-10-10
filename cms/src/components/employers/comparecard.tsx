'use client'
/**
 * 对比页里一家雇主的手机卡:卡标题是雇主名(有官网就做成外链)+ 别名灰注,
 * 卡身是维度键值行 —— 键取维度名、值调这一维度的单元格组件。
 * 「简介」那一条独占整行(长文本挤在两列里读不了)。
 * 2026-08-27 换装批自 Compare.tsx 的卡片段提出成文件。
 * 2026-10-09 N6 批(Frank「职位名、公司名、地点同形」「点击默认弹框」):卡标题换 name 桶的 CompanyName —— 英文在上、
 * 界面语别名灰字在下(原名 + .cardAlias 两格并成一件)。对照的事实行不带公司 slug,开不了公司框:有官网的照旧蓝链
 * 新标签开官网(规范:外站链接照旧;卡里只有这一处官网入口),没官网黑字(数据口补上 slug 再换开公司框)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Card, CardKV } from '@/components/card'
import { useLang } from '@/components/i18n'
import { Name, subOf } from '@/components/name'
import { DIM_BRIEF_KEY, TEXT_NONE } from './constants'
import type { CompareCardIn } from './types'
import css from './employers.module.css'

/**
 * 对比页里一家雇主的手机卡。
 *
 * @param props 这一家的展示行与维度行(见 CompareCardIn 逐格注释)。
 * @returns 一张卡。
 */
export function CompareCard({ r, dims }: CompareCardIn) {
  const [lang] = useLang()
  const sub = subOf({ lang, zh: r.aliasZh, ko: r.aliasKo })
  const items = []
  for (const d of dims) {
    items.push({ k: d.label, v: d.render(r), wide: d.key === DIM_BRIEF_KEY })
  }
  return (
    <Card>
      <div className={css.cardTitle}>
        {r.website === TEXT_NONE && <Name en={r.name} sub={sub} />}
        {r.website !== TEXT_NONE && <Name en={r.name} sub={sub} href={r.website} />}
      </div>
      <CardKV items={items} />
    </Card>
  )
}
