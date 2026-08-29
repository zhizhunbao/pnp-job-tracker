'use client'
/**
 * 一条判定理由的 bullet:官方原文默认收起,理由那句话自己就是开关(虚下划线示意
 * 可点),展开才出原文 + 官方来源链接 —— **不加「官方原文」那四个字**,一页十条
 * 路径要重复二十几遍,多出来的字数为零。没有原文的理由就是一行带色档的字。
 * 用原生 details 是因为内容仍在 DOM 里,爬虫照样吃得到(不是懒加载)。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TARGET_BLANK } from './constants'
import { reasonClsOf, reasonTextOf } from './functions'
import type { CaseReasonIn } from './types'
import css from './cases.module.css'

/**
 * 一条判定理由。
 *
 * @param props 那条理由与取词函数(逐格注释见 CaseReasonIn)。
 * @returns 一条 bullet。
 */
export function CaseReason({ r, t }: CaseReasonIn) {
  let official = null
  if (r.evidence != null && r.evidence.url != null && r.evidence.url !== '') {
    official = (
      <LinkButton href={r.evidence.url} target={TARGET_BLANK} className={cssOf(css.official)}>
        {t('case.official')}
      </LinkButton>
    )
  }
  if (r.quote == null || r.quote === '') {
    return (
      <li className={css.reason}>
        <span className={reasonClsOf({ kind: r.kind })}>{reasonTextOf({ t, r })}</span>
      </li>
    )
  }
  return (
    <li className={css.reason}>
      <details>
        <summary className={`${cssOf(css.reasonAsk)} ${reasonClsOf({ kind: r.kind })}`}>
          {reasonTextOf({ t, r })}
        </summary>
        <span className={css.quoteLine}>
          {r.quote}
          {official}
        </span>
      </details>
    </li>
  )
}
