'use client'
/**
 * 分类组里单字段的事实块:点哪级只看哪级(含上级路径,07-06 用户点名:
 * 大分类弹窗不该混进中/小分类)。NOC 字段 = 全链 + 官方职责/任职要求
 * —— 五位码职业级信息只在这一格给。
 * 官方层级里有 36 个中类只有一个小类(两级同名),那时小类不再重复一遍,留空。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { NocDutiesView } from '@/components/jobs/nocdutiesview'
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { CLS_DEPTH_BROAD, CLS_DEPTH_FINE, CLS_DEPTH_MID, FIELD_NOC, FIELD_TEER } from './constants'
import { FactsBox } from './factsbox'
import { catTextOf, clsDepthOf, fineTextOf, nocOf, teerTextOf } from './functions'
import type { FieldFactsIn } from './types'

/**
 * 渲染分类字段的事实块。
 *
 * @param props 点开的是哪一格与取数包。
 * @returns 逐级分类行 + 官方职责/任职要求。
 */
export function ClassFacts({ field, f }: FieldFactsIn) {
  const t = makeT(f.lang)
  const depth = clsDepthOf(field)
  const noc = nocOf({ nocDesc: f.nocDesc, noc: f.job.noc })
  const isNoc = field === FIELD_NOC
  return (
    <FactsBox>
      {isNoc && <Row k={t('col.noc')}>{f.job.noc}</Row>}
      {isNoc && noc != null && <Row k={t('fact.nocTitle')}>{noc.title}</Row>}
      {(isNoc || field === FIELD_TEER) && <Row k={t('col.teer')}>{teerTextOf({ t, job: f.job })}</Row>}
      {(isNoc || depth >= CLS_DEPTH_BROAD) && (
        <Row k={t('col.broad')}>{catTextOf({ t, value: f.job.broad })}</Row>
      )}
      {(isNoc || depth >= CLS_DEPTH_MID) && <Row k={t('col.mid')}>{catTextOf({ t, value: f.job.mid })}</Row>}
      {(isNoc || depth >= CLS_DEPTH_FINE) && <Row k={t('col.fine')}>{fineTextOf({ t, job: f.job })}</Row>}
      {isNoc && <NocDutiesView noc={noc} lang={f.lang} />}
    </FactsBox>
  )
}
