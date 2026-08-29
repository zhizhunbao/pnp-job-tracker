'use client'
/**
 * 职位组的事实块:雇佣形态 + 入职要求(E6-06/E6-07A 详情页结构化标注原文,零 LLM)
 * + 真实 JD 摘录。J1(2026-07-19 Frank):工时/雇佣期拆两行(禁「·」杂糅);
 * 未标注显灰字不再整行消失;证书一行一条。
 * 职位字段只做职位的事(07-06 用户拍板):职位名已在弹框标题,NOC/TEER 归分类弹框
 * —— 这里就是真实 JD。
 * 2026-08-28 换装批自 Advisor.tsx 的 TitleFacts 重写落位(取数迁 hooks 的 useJobText)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { JdTextView } from '@/components/jobs/jdtextview'
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { K_EMP_HEAD, K_TERM_HEAD, TEXT_NONE } from './constants'
import { FactsBox } from './factsbox'
import { excerptHeadClsOf, noTextOf } from './functions'
import { useJobText } from './hooks'
import type { TitleFactsIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染职位组的事实块。
 *
 * @param props 这一岗与界面语言。
 * @returns 事实行 + JD 摘录。
 */
export function TitleFacts({ job, lang }: TitleFactsIn) {
  const t = makeT(lang)
  const jd = useJobText({ job })
  const certs = []
  for (const c of job.certificates) {
    certs.push(<div key={c}>{c}</div>)
  }
  let certRows = null
  if (certs.length > 0) {
    certRows = certs
  }
  const gap = job.employmentHours !== TEXT_NONE || job.education !== TEXT_NONE || certs.length > 0
  return (
    <FactsBox>
      <Row k={t('col.empHours')}>
        {job.employmentHours !== TEXT_NONE && t(K_EMP_HEAD + job.employmentHours)}
        {job.employmentHours === TEXT_NONE && <span className={cssOf(css.muted)}>{t('fact.unstated')}</span>}
      </Row>
      <Row k={t('col.empTerm')}>
        {job.employmentTerm !== TEXT_NONE && t(K_TERM_HEAD + job.employmentTerm)}
        {job.employmentTerm === TEXT_NONE && <span className={cssOf(css.muted)}>{t('fact.unstated')}</span>}
      </Row>
      <Row k={t('fact.edu')}>{job.education}</Row>
      <Row k={t('fact.cert')}>{certRows}</Row>
      <div className={excerptHeadClsOf({ gap })}>{t('fact.jdExcerpt')}</div>
      {jd.limited && <div className={cssOf(css.excerpt)}>{t('jd.busy')}</div>}
      {jd.limited === false && jd.text == null && <div className={cssOf(css.excerpt)}>{t('act.loadingText')}</div>}
      {jd.limited === false && jd.text != null && jd.text !== TEXT_NONE && <JdTextView text={jd.text} />}
      {jd.limited === false && jd.text === TEXT_NONE && (
        <div className={cssOf(css.excerpt)}>{noTextOf({ t, job })}</div>
      )}
    </FactsBox>
  )
}
