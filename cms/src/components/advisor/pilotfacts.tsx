'use client'
/**
 * 乡村/法语社区试点(RCIP/FCIP)的事实块。E6-11 三态直判:城市在参与社区 = 命中(粗筛),
 * 否则「不在试点社区」。口径红线走卡下的注:试点是社区推荐制且雇主须先被社区**指定**,
 * 命中 ≠ 可走。批B:雇主已获社区指定是强一级信号,只做正向展示 ——
 * false 可能只是名单未公布,不写反话。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位。
 * 2026-10-09 N6 批(Frank「职位名、公司名、地点同形」「城市 和 省份 点击 跳 google 地图」「点击默认弹框」):两处名字换 name 桶 ——
 * 社区行没有社区名、退回市名时标签换 CityName(英文蓝链 + 界面语市名灰字,点了去 Google 地图;有社区名的照旧纯文字,
 * 社区不是城市表里的一座市,没有译名可挂);指定雇主行的标签(公司名)换 CompanyName(点了叠开公司弹框;职位行不带公司译名,灰字暂缺)。
 * 原「社区名或市名」派生 pilotAreaOf 随之退役(两支各渲各的)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { CityName, CompanyName } from '@/components/name'
import { VerdictPill } from '@/components/pnp'
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { NOC_HEAD, TEXT_NONE } from './constants'
import { FactsBox } from './factsbox'
import { pilotOccTextOf, pilotPillOf } from './functions'
import type { AdvisorFactsIn } from './types'

/**
 * 渲染试点社区事实块。
 *
 * @param props 取数包。
 * @returns 直判行 + 社区行 + 指定雇主行 + 职业清单行。
 */
export function PilotFacts({ f }: AdvisorFactsIn) {
  const t = makeT(f.lang)
  const on = f.job.pilot !== TEXT_NONE
  const pill = pilotPillOf({ t, on })
  return (
    <FactsBox note={t('fact.pilotGate')}>
      <Row k={t('fact.verdict')}><VerdictPill tone={pill.tone}>{pill.text}</VerdictPill></Row>
      {on && f.job.pilotCommunity !== TEXT_NONE && <Row k={f.job.pilotCommunity}>{f.job.pilot}</Row>}
      {on && f.job.pilotCommunity === TEXT_NONE && (
        <Row k={<CityName city={f.job.city} province={f.job.province} zh={f.job.cityZh} ko={f.job.cityKo} />}>
          {f.job.pilot}
        </Row>
      )}
      {on && f.job.pilotEmployer && (
        <Row k={<CompanyName name={f.job.company} slug={f.job.companySlug} zh={TEXT_NONE} ko={TEXT_NONE} />}>
          {t('fact.pilotEmp')}
        </Row>
      )}
      {on && f.job.pilotOcc !== TEXT_NONE && (
        <Row k={NOC_HEAD + f.job.noc}>{pilotOccTextOf({ t, job: f.job })}</Row>
      )}
    </FactsBox>
  )
}
