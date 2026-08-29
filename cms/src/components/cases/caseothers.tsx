'use client'
/**
 * ② 其余路径,由易到难。走查 #299:整页太长(英文态 5.5k px)——
 * **前 HEAD_N 条摊开、其余收进 details**。第 6 条往后都是「更慢或更难」的,
 * 先看不着不影响判断;用原生 details 是因为内容仍在 DOM 里,爬虫照样吃得到
 * (不是懒加载)。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { HEAD_N } from './constants'
import { flatRowsOf } from './functions'
import { CasePath } from './casepath'
import type { CaseOthersIn } from './types'
import css from './cases.module.css'

/**
 * 「其余路径」卡。
 *
 * @param props 整份答案与取词函数(逐格注释见 CaseOthersIn)。
 * @returns 卡;一条替代都没有 = null。
 */
export function CaseOthers({ answer, t }: CaseOthersIn) {
  const flat = flatRowsOf({ answer })
  if (flat.length === 0) {
    return null
  }
  const head = []
  const rest = []
  for (const [i, v] of flat.entries()) {
    if (i < HEAD_N) {
      head.push(<CasePath key={v.key} v={v} rank={i + 1} t={t} answer={answer} />)
    } else {
      rest.push(<CasePath key={v.key} v={v} rank={i + 1} t={t} answer={answer} />)
    }
  }
  return (
    <div className={css.card}>
      <h2 className={css.h2}>{t('case.othersTitle')}</h2>
      {head}
      {rest.length > 0 && (
        <details>
          <summary className={css.moreSummary}>{t('case.showMore', { n: rest.length })}</summary>
          {rest}
        </details>
      )}
    </div>
  )
}
