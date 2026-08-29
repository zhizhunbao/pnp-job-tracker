'use client'
/**
 * ① 先回答他点名问的那个省(中介推的那个)—— 版式顺序由 Frank 2026-08-11 定死,
 * 这一块永远排最前。段首只说一句「最快的替代是哪档」;「关于『概率』」整块
 * 2026-08-11 Frank 撤掉 —— 批准率、邀请数、名额剩余已在 bullet 里逐条摆着,
 * 摆事实不需要再配一段解说词。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { fastestTierOf, provNameOf, tierLabelOf } from './functions'
import { CaseLead } from './caselead'
import { CasePath } from './casepath'
import type { CaseAskedIn } from './types'
import css from './cases.module.css'

/**
 * 「他问的那个省」卡。
 *
 * @param props 整份答案与取词函数(逐格注释见 CaseAskedIn)。
 * @returns 卡;答案里没有点名通道 = null。
 */
export function CaseAsked({ answer, t }: CaseAskedIn) {
  if (answer.asked == null) {
    return null
  }
  return (
    <div className={css.card}>
      <h2 className={css.h2}>{t('case.askedTitle', { prov: provNameOf({ t, code: answer.asked.province }) })}</h2>
      <CaseLead lines={[t('case.askedFastest', { fastest: tierLabelOf({ t, tier: fastestTierOf({ answer }) }) })]} />
      <CasePath v={answer.asked} rank={null} t={t} answer={answer} />
    </div>
  )
}
