'use client'
/**
 * ② 其余路径,由易到难。走查 #299:整页太长(英文态 5.5k px)——
 * **前 HEAD_N 条摊开、其余收进 details**。第 6 条往后都是「更慢或更难」的,
 * 先看不着不影响判断;用原生 details 是因为内容仍在 DOM 里,爬虫照样吃得到
 * (不是懒加载)。
 * 2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」「展开 20, 再展开 20, 再开其余, 收起」:
 * details 换成 pager 桶 FoldLine(一次展开 20 条,展开着可收起);没展开的几条仍渲进 DOM(包在 hidden 里),爬虫照样吃得到。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { FoldLine, useFold } from '@/components/pager'
import { HEAD_N, K_CASE_UNIT } from './constants'
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
  const hidden = Math.max(0, flat.length - HEAD_N)
  const f = useFold({ hidden })
  if (flat.length === 0) {
    return null
  }
  const head = []
  const rest = []
  for (const [i, v] of flat.entries()) {
    if (i < HEAD_N + f.extra) {
      head.push(<CasePath key={v.key} v={v} rank={i + 1} t={t} answer={answer} />)
    } else {
      rest.push(<CasePath key={v.key} v={v} rank={i + 1} t={t} answer={answer} />)
    }
  }
  return (
    <div className={css.card}>
      <h2 className={css.h2}>{t('case.othersTitle')}</h2>
      {head}
      {rest.length > 0 && <div hidden>{rest}</div>}
      <FoldLine t={t}
        unit={t(K_CASE_UNIT)}
        hidden={hidden}
        extra={f.extra}
        busy={false}
        onMore={f.onMore}
        onFold={f.onFold} />
    </div>
  )
}
