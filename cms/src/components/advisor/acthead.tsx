'use client'
/**
 * 职位描述弹框的页眉左块:灰色小标 + 岗位名 + NOC 官方职业名译名。
 * 页眉与其余弹框统一灰(Frank 2026-07-21;「打开完整页」在 JobBody 的胶囊钮行)。
 * #199(Frank「chiropractor 怎么没有翻译呢」):标题下挂译名(与详情页 H1 同款,英文界面不出)。
 * 第 5 轮 #16:试用额度可见化 —— 剩余次数由 JobBody 回传后挂在这里。
 * 2026-08-28 换装批自 Advisor.tsx 的 ActModal 页眉段提出成件。
 * 2026-09-16 Frank「右边的按钮部分和左边的中文翻译放到一行」「可以」:译名自左块拆出成译名行,右端挂切换控件(ctl 槽,
 * jobs 桶 JdSwitches);译名行在标题栏里折到窗口钮下方占满整宽,按下不起拖动(点控件不会把弹框拖走)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import { makeActsDown } from './functions'
import type { ActHeadIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染职位描述弹框的页眉左块。
 *
 * @param props 取词函数、岗位名、译名、剩余次数与切换控件。
 * @returns 页眉左块 + 译名行。
 */
export function ActHead({ t, title, sub, freeLeft, ctl }: ActHeadIn) {
  return (
    <>
      <div className={`${cssOf(css.headL)} ${cssOf(css.headMain)}`}>
        <div className={cssOf(css.kicker)}>
          {t('act.descTitle')}
          {freeLeft != null && <span className={cssOf(css.kickerSub)}>{t('advisor.left', { n: freeLeft })}</span>}
        </div>
        <h3 className={cssOf(css.title)}>{title}</h3>
      </div>
      <div className={cssOf(css.subRow)} onPointerDown={makeActsDown({ stop: true })}>
        {sub !== TEXT_NONE && <div className={cssOf(css.sub)}>{sub}</div>}
        <span className={cssOf(css.subCtl)}>{ctl}</span>
      </div>
    </>
  )
}
