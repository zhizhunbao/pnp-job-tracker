'use client'
/**
 * 一个省的小节:省名标题(人话名主文案 + 省码灰标签,站规 ui-plain-language)
 * 下面挂这个省的每一条通道表。小节自带锚点 id —— 页顶的省导航按它跳。
 * 2026-08-28 换装批自 Occupations.tsx 的省循环体提出成文件。
 * 2026-10-09 N 批(Frank「职位名、公司名、地点同形」):标题换全站名字两行 —— 英文全名在上、界面语省名灰字在下
 * (name 桶 Name + provNameOf),省码灰标签撤;标题仍是带锚点的小节头,不做地图链接。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */
import { useLang } from '@/components/i18n'
import { Name, provNameOf } from '@/components/name'
import { Title } from '@/components/title'
import { provAnchorIdOf } from './functions'
import { StreamTable } from './streamtable'
import type { ProvSectionIn } from './types'

/**
 * 一个省的小节。
 *
 * @param props 这个省的分组与取词函数(逐格注释见 ProvSectionIn)。
 * @returns 省小节。
 */
export function ProvSection({ prov, t }: ProvSectionIn) {
  const [lang] = useLang()
  const head = provNameOf({ code: prov.prov, lang, t })
  const tables = []
  for (const s of prov.streams) {
    tables.push(<StreamTable key={s.stream} stream={s} t={t} />)
  }
  return (
    <section id={provAnchorIdOf({ code: prov.prov })}>
      <Title>
        <Name en={head.en} sub={head.sub} />
      </Title>
      {tables}
    </section>
  )
}
