'use client'
/**
 * 域内小件:AI 速读框(P1f)—— 生成后常驻正文上方。标题行自报「机器生成」,
 * 不让它冒充官方摘要。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { BOLT_PREFIX, GEN_SEP } from './constants'
import type { NewsSummaryIn } from './types'
import css from './news.module.css'

/**
 * 渲染 AI 速读框。
 *
 * @param props 取词函数与速读正文。
 * @returns 速读框。
 */
export function NewsSummary({ t, summary }: NewsSummaryIn) {
  return (
    <div className={css.sum}>
      <div className={css.sumHead}>
        {BOLT_PREFIX}{t('news.aiSum')}
        <span className={css.sumGen}>{GEN_SEP}{t('news.aiGen')}</span>
      </div>
      <div className={css.sumBody}>{summary}</div>
    </div>
  )
}
