'use client'
/**
 * 一个省的小节:省名标题(人话名主文案 + 省码灰标签,站规 ui-plain-language)
 * 下面挂这个省的每一条通道表。小节自带锚点 id —— 页顶的省导航按它跳。
 * 2026-08-28 换装批自 Occupations.tsx 的省循环体提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */
import { Tag } from '@/components/tag'
import { Title } from '@/components/title'
import { TAG_VARIANT_REGION } from './constants'
import { provAnchorIdOf, provNameOf } from './functions'
import { StreamTable } from './streamtable'
import type { ProvSectionIn } from './types'

/**
 * 一个省的小节。
 *
 * @param props 这个省的分组与取词函数(逐格注释见 ProvSectionIn)。
 * @returns 省小节。
 */
export function ProvSection({ prov, t }: ProvSectionIn) {
  const tables = []
  for (const s of prov.streams) {
    tables.push(<StreamTable key={s.stream} stream={s} t={t} />)
  }
  return (
    <section id={provAnchorIdOf({ code: prov.prov })}>
      <Title>
        {provNameOf({ t, code: prov.prov })} <Tag variant={TAG_VARIANT_REGION}>{prov.prov}</Tag>
      </Title>
      {tables}
    </section>
  )
}
