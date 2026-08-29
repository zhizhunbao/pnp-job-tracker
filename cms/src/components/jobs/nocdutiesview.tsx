'use client'
/**
 * NOC 官方主要职责 / 任职要求(StatCan Elements)。noc 来自 noc-descriptions 维度,
 * 无则整块不渲 —— 官方没收录就不编。
 * 2026-08-28 换装批自 Jd.tsx 重写落位(小标题上的抓取日期由 headOf 拼)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { makeT } from '@/lib/i18n'
import { nocBlockHeadOf } from './functions'
import { NocDutiesBlock } from './nocdutiesblock'
import type { NocDutiesViewIn } from './types'

/**
 * 渲染官方职责与要求。
 *
 * @param props 本岗 NOC 的官方描述与界面语言。
 * @returns 两块描述;维表里没有就什么都不渲。
 */
export function NocDutiesView({ noc, lang }: NocDutiesViewIn) {
  if (noc == null) {
    return null
  }
  const t = makeT(lang)
  return (
    <>
      {noc.duties !== '' && (
        <NocDutiesBlock label={nocBlockHeadOf({ head: t('fact.nocDuties'), fetched: noc.fetched })}
          text={noc.duties} />
      )}
      {noc.requirements !== '' && (
        <NocDutiesBlock label={nocBlockHeadOf({ head: t('fact.nocReqs'), fetched: noc.fetched })}
          text={noc.requirements} />
      )}
    </>
  )
}
