'use client'
/**
 * resources 页面域的一件:一张通道门槛卡 —— 折叠卡(原生 details),摘要行 = 通道名 + 条数,
 * 展开后一行一条门槛:人话标签、官方原句(灰注)、官方页链接。锚点 id 供把脉页 / 弹框直链。
 * 2026-09-06 Frank「放到资料库吗」立;折叠用原生特性不造件(Ponytail ③)。
 *
 * @author Frank
 * @time 2026-09-06 23:30:00
 */
import { LinkButton } from '@/components/button'
import { LINK_TARGET_BLANK, TEXT_NONE } from './constants'
import { ruleAnchorOf, ruleTitleOf } from './functions'
import type { ResRuleCardIn } from './types'
import css from './resources.module.css'

/**
 * 渲染一张通道门槛卡。
 *
 * @param props 取词函数与这一组。
 * @returns 折叠卡。
 */
export function ResRuleCard({ t, group }: ResRuleCardIn) {
  const rows = []
  for (const r of group.rows) {
    rows.push(
      <li key={r.label + r.quote} className={css.ruleRow}>
        {r.stream !== TEXT_NONE && <span className={css.ruleStream}>{r.stream}</span>}
        <span className={css.ruleLabel}>{r.label}</span>
        <span className={css.ruleQuote}>{r.quote}</span>
        <LinkButton href={r.url} target={LINK_TARGET_BLANK} className={css.ruleLink}>{t('res.go')}</LinkButton>
      </li>,
    )
  }
  return (
    <details id={ruleAnchorOf(group.key)} className={css.ruleCard}>
      <summary className={css.ruleSummary}>
        <span className={css.ruleTitle}>{ruleTitleOf({ t, group })}</span>
        <span className={css.ruleCount}>{group.rows.length}</span>
      </summary>
      <ul className={css.ruleList}>{rows}</ul>
    </details>
  )
}
