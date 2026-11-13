/**
 * LMIA 卡:这家雇主近两年的 LMIA 获批记录 —— 获批岗位与份数、最近获批的季度、近四个季度的岗位数、按通道分、按职业分。
 * 2026-11-13 Frank「做成单独的卡 LMIA AIP RCIP FCIP 都是单独的卡。这样比较清晰」「没有信息就不显示这个卡」:
 * 原先 LMIA 与指定雇主挤在一张「担保记录」卡里(CompanySponsorCard,2026-09-14 因常剩空标题被撤),现在一样东西一张卡,
 * 这一张只管 LMIA;一格记录都没有整卡不出(判据 functions 的 hasLmiaOf)。通道行与获批职业两件照用原来的。
 *
 * @author Frank
 * @time 2026-11-13 19:30:00
 */
import { cssOf } from '@/components/css'
import { CompanySpNocs } from './companyspnocs'
import { CompanyStreamRow } from './companystreamrow'
import { CARD_HEAD_CLS, CARD_MD_CLS, TEXT_NONE } from './constants'
import { hasLmiaOf, lmiaBatchNoteOf, streamsOf } from './functions'
import type { CompanyLmiaCardIn } from './types'
import css from './companies.module.css'

/**
 * LMIA 卡。
 *
 * @param props 公司档案、取词函数与界面语言(逐格注释见 CompanyLmiaCardIn)。
 * @returns 一张卡;没有 LMIA 记录时不渲。
 */
export function CompanyLmiaCard({ company, t, lang }: CompanyLmiaCardIn) {
  if (hasLmiaOf({ company }) === false) {
    return null
  }
  const rows = []
  for (const stream of streamsOf({ streams: company.lmiaStreams, t })) {
    rows.push(<CompanyStreamRow key={stream.label + stream.count} stream={stream} t={t} />)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t('co.lmia')}</div>
      <div>
        <div className={cssOf(css.facts)}>
          {company.lmiaPositions != null && company.lmiaPositions > 0 && (
            <>
              <span className={cssOf(css.factK)}>{t('co.lmiaPos')}</span>
              <span className={cssOf(css.factV)}>{company.lmiaPositions}</span>
              <span className={cssOf(css.factN)}>{lmiaBatchNoteOf({ company, t })}</span>
            </>
          )}
          {company.lmiaLastQuarter !== TEXT_NONE && (
            <>
              <span className={cssOf(css.factK)}>{t('co.spQuarter')}</span>
              <span className={cssOf(css.factV)}>{company.lmiaLastQuarter}</span>
              <span />
            </>
          )}
          {company.lmia4q != null && company.lmia4q > 0 && (
            <>
              <span className={cssOf(css.factK)}>{t('co.lmia4q')}</span>
              <span className={cssOf(css.factV)}>{company.lmia4q}</span>
              <span />
            </>
          )}
          {rows}
        </div>
        {company.lmiaNocs.length > 0 && <CompanySpNocs rows={company.lmiaNocs} t={t} lang={lang} />}
      </div>
    </div>
  )
}
