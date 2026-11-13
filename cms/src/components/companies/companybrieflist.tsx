'use client'
/**
 * AI 整理简介里「主营业务」那一节:小标题 + 要点列表(一条一行,各带自己的中文对照)。
 * 2026-11-13 Frank「主营业务也应该是 AI 整理的 bullets」:原先这一节和别的节一样是一段散文;现在按行拆成圆点列表
 * (拆法见 functions 的 briefItemsOf),与职位描述的要点同一个读法。别的节(所在地、规模、成立时间……)照旧走 CompanyBriefSec。
 * 同日 Frank「只有一条就不用 bullets 了吧」:只有一条的不走本件,照旧一段话(CompanyBriefBody 判,两条以上才出列表)。
 *
 * @author Frank
 * @time 2026-11-13 01:30:00
 */
import { cssOf } from '@/components/css'
import { CompanyZhLine } from './companyzhline'
import { CLS_SEP, TEXT_NONE } from './constants'
import { briefItemsOf, secBodyClsOf, secClsOf, secHeadClsOf } from './functions'
import type { CompanyBriefListIn } from './types'
import css from './companies.module.css'

/**
 * 要点列表形的一节。
 *
 * @param props 小标题键、正文、译文、取词函数与扁平态(逐格注释见 CompanyBriefListIn)。
 * @returns 一节。
 */
export function CompanyBriefList({ labelKey, text, zh, t, flat }: CompanyBriefListIn) {
  const rows = []
  for (const [i, it] of briefItemsOf({ text, zh }).entries()) {
    rows.push(
      <li key={i}>
        {it.en}
        {it.zh !== TEXT_NONE && <CompanyZhLine text={it.zh} />}
      </li>,
    )
  }
  return (
    <div className={secClsOf({ flat })}>
      <div className={secHeadClsOf({ flat })}>{t(labelKey)}</div>
      <ul className={secBodyClsOf({ flat }) + CLS_SEP + cssOf(css.briefList)}>{rows}</ul>
    </div>
  )
}
