'use client'
/**
 * 一条通道 = 省 + 官方通道名 + 档位徽章 + 判定核给的理由(CaseReason)+
 * 工作机会数 + 该省供需 bullet。省名与官方通道名之间留空用样式不用全角空格
 * (全角空格在英文行里是一道明显的洞);工作机会那条:同档排序就是按它排的,
 * 排序依据必须看得见 —— 跨省通道(AIP/RCIP/联邦)没有单一省份,查不到就不编、
 * 直接不出。运营数字与判定理由同列同字号,一条一个 bullet。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import type { OpsFacts } from '@/lib/ruling/server'
import { OPENING_KEY, REASON_KEY_HEAD } from './constants'
import {
  badgeClsOf, badgeTextOf, openingLineOf, pathProvOf, pathStreamOf, supplyBitsOf, visibleReasonsOf,
} from './functions'
import { CaseReason } from './casereason'
import type { CasePathIn } from './types'
import css from './cases.module.css'

/**
 * 一条通道。
 *
 * @param props 该通道判定、序号、取词函数与整份答案(逐格注释见 CasePathIn)。
 * @returns 一条通道块。
 */
export function CasePath({ v, rank, t, answer }: CasePathIn) {
  const items = []
  for (const [i, r] of visibleReasonsOf({ reasons: v.reasons }).entries()) {
    items.push(<CaseReason key={REASON_KEY_HEAD + i} r={r} t={t} />)
  }
  const opening = answer.openings[v.province]
  if (opening != null) {
    items.push(<li key={OPENING_KEY} className={css.reason}>{openingLineOf({ t, o: opening })}</li>)
  }
  const opsRaw = answer.ops[v.province]
  let ops: OpsFacts | null = null
  if (opsRaw != null) {
    ops = opsRaw
  }
  for (const s of supplyBitsOf({ t, o: ops })) {
    items.push(<li key={s} className={`${css.reason} ${css.reasonOps}`}>{s}</li>)
  }
  return (
    <div className={css.path}>
      <div className={css.pathHead}>
        {rank != null && <span className={css.rank}>{rank}</span>}
        <span className={css.stream}>
          {pathProvOf({ t, v })}
          <span className={css.nameGap} />
          {pathStreamOf({ t, v })}
        </span>
        <span className={badgeClsOf({ v })}>{badgeTextOf({ t, v })}</span>
      </div>
      <ul className={css.reasons}>{items}</ul>
    </div>
  )
}
