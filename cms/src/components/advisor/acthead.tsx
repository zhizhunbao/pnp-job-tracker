'use client'
/**
 * 职位描述弹框的页眉左块:灰色小标 + 岗位名 + NOC 官方职业名译名。
 * 页眉与其余弹框统一灰(Frank 2026-07-21;「打开完整页」在 JobBody 的胶囊钮行)。
 * #199(Frank「chiropractor 怎么没有翻译呢」):标题下挂译名(与详情页 H1 同款,英文界面不出)。
 * 第 5 轮 #16:试用额度可见化 —— 剩余次数由 JobBody 回传后挂在这里。
 * 2026-08-28 换装批自 Advisor.tsx 的 ActModal 页眉段提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { ActHeadIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染职位描述弹框的页眉左块。
 *
 * @param props 取词函数、岗位名、译名与剩余次数。
 * @returns 页眉左块。
 */
export function ActHead({ t, title, sub, freeLeft }: ActHeadIn) {
  return (
    <div className={cssOf(css.headL)}>
      <div className={cssOf(css.kicker)}>
        {t('act.descTitle')}
        {freeLeft != null && <span className={cssOf(css.kickerSub)}>{t('advisor.left', { n: freeLeft })}</span>}
      </div>
      <h3 className={cssOf(css.title)}>{title}</h3>
      {sub !== TEXT_NONE && <div className={cssOf(css.sub)}>{sub}</div>}
    </div>
  )
}
