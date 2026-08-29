'use client'
/**
 * 出处清单:一条出处 = **一行**(标签 | 数值 | 官方站点名 —— 旧版把标签/数值/
 * Open/抓取时间摞成四行,8 条就是 32 行)。抓取时间挪进链接的 title:它是取证
 * 信息,不是每行都要看的东西。value = null → valueText 原文;两者都空整格留白,
 * 不编「暂无」(总红线)。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { ymd } from '@/lib/time'
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TARGET_BLANK } from './constants'
import { factValueOf, isExtUrl, srcNameOf } from './functions'
import type { ChatSourcesIn } from './types'
import css from './chat.module.css'

/**
 * 出处清单(开关在操作条那一行,这里只渲清单本体)。
 *
 * @param props 真用到的事实与取词函数(逐格注释见下方内联形状)。
 * @returns 出处清单。
 */
export function ChatSources({ facts, t }: ChatSourcesIn) {
  const rows = []
  for (const [k, f] of facts.entries()) {
    let title = f.evidence.url
    if (f.evidence.fetched !== '') {
      title = t('match.srcFetched', { d: ymd(f.evidence.fetched) })
    }
    let target = null
    if (isExtUrl({ url: f.evidence.url })) {
      target = TARGET_BLANK
    }
    rows.push(
      <div className={css.cbFact} key={k}>
        <span className={css.cbFactL}>{f.label}</span>
        <span className={css.cbFactV}>{factValueOf({ f })}</span>
        {target != null && (
          <LinkButton className={cssOf(css.cbFactS)} href={f.evidence.url} title={title} target={target}>
            {srcNameOf({ url: f.evidence.url })}
          </LinkButton>
        )}
        {target == null && (
          <LinkButton className={cssOf(css.cbFactS)} href={f.evidence.url} title={title}>
            {srcNameOf({ url: f.evidence.url })}
          </LinkButton>
        )}
      </div>,
    )
  }
  return (
    <div className={css.cbSrc}>
      <div>{rows}</div>
    </div>
  )
}
