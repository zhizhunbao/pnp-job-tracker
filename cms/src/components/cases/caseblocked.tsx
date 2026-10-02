'use client'
/**
 * ③ 现在走不通的:整块收起 —— 它回答的是「哪些别去试」,不是他此刻要做的事。
 * 2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」「展开 20, 再展开 20, 再开其余, 收起」:
 * details 换成 pager 桶 FoldLine(一次展开 20 条,展开着可收起;导语随首次展开出);没展开的几条仍渲进 DOM(包在 hidden 里)。

 * 2026-10-02 Frank「这种全部默认显示 20 个可以吗?如果小于 20 全部显示?」(拍板「全站所有清单」):不再整块收起,默认露前 20 条(导语常显),不足 20 全露。 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { FOLD_FIRST, FoldLine, useFold } from '@/components/pager'
import { K_CASE_UNIT } from './constants'
import { CaseLead } from './caselead'
import { CasePath } from './casepath'
import type { CaseBlockedIn } from './types'
import css from './cases.module.css'

/**
 * 「现在走不通的」卡。
 *
 * @param props 整份答案与取词函数(逐格注释见 CaseBlockedIn)。
 * @returns 卡;没有被排除的通道 = null。
 */
export function CaseBlocked({ answer, t }: CaseBlockedIn) {
  const f = useFold({ hidden: Math.max(0, answer.excluded.length - FOLD_FIRST) })
  if (answer.excluded.length === 0) {
    return null
  }
  const rows = []
  const rest = []
  for (const [i, v] of answer.excluded.entries()) {
    if (i < FOLD_FIRST + f.extra) {
      rows.push(<CasePath key={v.key} v={v} rank={null} t={t} answer={answer} />)
    } else {
      rest.push(<CasePath key={v.key} v={v} rank={null} t={t} answer={answer} />)
    }
  }
  return (
    <div className={css.card}>
      <h2 className={`${css.h2} ${css.h2Tight}`}>{t('case.blockedTitle')}</h2>
      <CaseLead lines={[t('case.blockedLead')]} />
      {rows}
      {rest.length > 0 && <div hidden>{rest}</div>}
      <FoldLine t={t}
        unit={t(K_CASE_UNIT)}
        hidden={Math.max(0, answer.excluded.length - FOLD_FIRST)}
        extra={f.extra}
        busy={false}
        onMore={f.onMore}
        onFold={f.onFold} />
    </div>
  )
}
