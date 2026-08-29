'use client'
/**
 * 担保记录深块(#184 收编;#197 移到合并块之后;有 LMIA 记录或 AIP 指定才出)。
 * Frank 2026-07-26「没拆列的先拆」:最近获批原来把「季度 + 份数」揉在一格,
 * 现拆成三列跨行对齐。
 * #200(Frank「这个废话不用加」):担保记录副标题(历史事实,非能担保判定)撤;
 * 来源行同批撤;结论彩条 2026-08-09 随「不要解释文字」拍板撤 —— 数据行自己说话。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位(三列改本域自己的事实网格,见 .facts)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanySpNocs } from './companyspnocs'
import { CompanyStreamRow } from './companystreamrow'
import { CARD_HEAD_CLS, CARD_MD_CLS, DASH_EM, TEXT_NONE } from './constants'
import { streamsOf } from './functions'
import type { CompanySponsorCardIn } from './types'
import css from './companies.module.css'

/**
 * 担保记录卡。
 *
 * @param props 公司档案、取词函数与界面语言(逐格注释见 CompanySponsorCardIn)。
 * @returns 一张卡。
 */
export function CompanySponsorCard({ company, t, lang }: CompanySponsorCardIn) {
  const rows = []
  for (const stream of streamsOf({ streams: company.lmiaStreams, t })) {
    rows.push(<CompanyStreamRow key={stream.label + stream.count} stream={stream} t={t} />)
  }
  let batches: string | number = DASH_EM
  if (company.lmiaLmias != null) {
    batches = company.lmiaLmias
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t('gr.dim.coSponsor')}</div>
      <div>
        <div className={css.facts}>
          {rows}
          {company.lmiaLastQuarter !== TEXT_NONE && (
            <>
              <span className={css.factK}>{t('co.spQuarter')}</span>
              <span className={css.factV}>{company.lmiaLastQuarter}</span>
              <span className={css.factN}>{t('co.spBatchN', { n: batches })}</span>
            </>
          )}
        </div>
        {company.lmiaNocs.length > 0 && <CompanySpNocs rows={company.lmiaNocs} t={t} lang={lang} />}
      </div>
    </div>
  )
}
