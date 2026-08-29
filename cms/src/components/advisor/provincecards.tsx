'use client'
/**
 * 省级卡组(仅点省进来;Frank「点省看省,点市看市」):移民难度 + 体量 + 最近抽选 + 官方新闻。
 * 后两块复用既有件,块自身无数据会返回 null → 外层卡也不渲(不出空壳)。
 * 2026-08-28 换装批自 Advisor.tsx 的 LocationPanel 省级段提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { NewsLatestBlock, PnpDrawsBlock } from '@/components/pnp'
import { CARD_MD_CLS, DRAWS_LIMIT_THREE, PROV_QC, TEXT_NONE } from './constants'
import { DifficultyCard } from './difficultycard'
import { diffCellsOf, hasDrawsOf, hasNewsOf, volRowsOf } from './functions'
import type { AdvisorProvInfo, DiffFactor, ProvinceCardsIn } from './types'
import { VolumeCard } from './volumecard'

/**
 * 渲染省级卡组。
 *
 * @param props 取词函数、界面语言、这一岗、省级取数与两张表(逐格注释见 ProvinceCardsIn)。
 * @returns 省级各卡。
 */
export function ProvinceCards({ t, lang, job, prov, pnpDraws, news }: ProvinceCardsIn) {
  const isQc = job.province === PROV_QC
  let tier = TEXT_NONE
  let factors: DiffFactor[] = []
  let info: AdvisorProvInfo | null = null
  if (prov != null) {
    info = prov.info
    if (prov.difficulty != null) {
      if (prov.difficulty.tier != null) {
        tier = prov.difficulty.tier
      }
      if (prov.difficulty.factors != null) {
        factors = prov.difficulty.factors
      }
    }
  }
  const volRows = volRowsOf({ t, info, isQc })
  return (
    <>
      {tier !== TEXT_NONE && (
        <DifficultyCard t={t} tier={tier}
          cells={diffCellsOf({ t, province: job.province, factors, pnpDraws })} />
      )}
      {volRows.length > 0 && <VolumeCard t={t} rows={volRows} isQc={isQc} />}
      {hasDrawsOf({ province: job.province, pnpDraws, isQc }) && (
        <div className={CARD_MD_CLS}>
          <PnpDrawsBlock province={job.province} lang={lang} draws={pnpDraws} limit={DRAWS_LIMIT_THREE} />
        </div>
      )}
      {hasNewsOf({ province: job.province, news }) && (
        <div className={CARD_MD_CLS}>
          <NewsLatestBlock province={job.province} lang={lang} news={news} />
        </div>
      )}
    </>
  )
}
