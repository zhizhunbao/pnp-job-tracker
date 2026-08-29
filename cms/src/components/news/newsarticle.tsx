'use client'
/**
 * 域内小件:详情页正文卡 —— meta 行 + 官方原标题 + 转载姿势行 + QC 提示 + AI 速读框 +
 * 机器翻译声明 + 官方英文原文(带逐段对照)。
 * 2026-08-27 换装批自 News.tsx 的 NewsDetail 拆出成文件;原先包在 useMemo 里的分段
 * 改成 functions 的 parasOf 逐次求值(纯字符串切分,与本桶其余派生同一形)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { REGION_QC } from './constants'
import { parasOf } from './functions'
import { ImpBadge } from './impbadge'
import { NewsBody } from './newsbody'
import { NewsSource } from './newssource'
import { NewsSummary } from './newssummary'
import { RegionTag } from './regiontag'
import type { NewsArticleIn } from './types'
import css from './news.module.css'

/**
 * 渲染详情页正文卡。
 *
 * @param props 库行与速读/对照两样的状态手柄(逐格注释见 NewsArticleIn)。
 * @returns 正文卡。
 */
export function NewsArticle({
  t,
  lang,
  row,
  summary,
  sumState,
  transOn,
  trans,
  trState,
  onSum,
  onTrans,
}: NewsArticleIn) {
  return (
    <article className={css.article}>
      <div className={css.detMeta}>
        <RegionTag t={t} region={row.region} />
        <ImpBadge t={t} lang={lang} importance={row.importance} note={row.importanceNote} />
        <span>{t('news.published', { d: row.date })}</span>
      </div>
      <h1 className={css.detTitle}>{row.title}</h1>
      <NewsSource t={t}
        lang={lang}
        region={row.region}
        url={row.url}
        summary={summary}
        sumState={sumState}
        transOn={transOn}
        trState={trState}
        onSum={onSum}
        onTrans={onTrans} />
      {row.region === REGION_QC && <div className={css.qcNote}>{t('news.qcNote')}</div>}
      {summary != null && <NewsSummary t={t} summary={summary} />}
      {transOn && <div className={css.aiNote}>{t('news.aiNote')}</div>}
      <NewsBody paras={parasOf({ text: row.bodyEn })} transParas={parasOf({ text: trans })} on={transOn} />
    </article>
  )
}
