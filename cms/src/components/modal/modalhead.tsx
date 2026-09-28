'use client'
/**
 * 窗口形弹框标题栏的左块:灰色小标 + 大标题 + 译名行(右端挂切换控件)。
 * 页眉各弹框统一(Frank 2026-07-21「这三个也要保持一致」):灰色小标 + 纯名称。
 * 标题后不挂「思考中」后缀(Frank 2026-07-18):标题是这一屏是什么,不是这一刻在干什么。
 * #199(Frank「chiropractor 怎么没有翻译呢」):标题下挂译名(与详情页 H1 同款)。
 * 2026-09-16 Frank「右边的按钮部分和左边的中文翻译放到一行」「公司的也对照改一下」:译名拆成独占一整行的译名行,
 * 右端挂切换控件(ctl 槽),按下不起拖动。
 * 2026-09-28 并壳时立:advisor 的 AdvisorHead(字段 / 公司弹框)与 ActHead(职位描述弹框)两份逐字相同的版式并成这一件,
 * 小标里写什么由各弹框自己给。
 *
 * @author Frank
 * @time 2026-09-28 04:40:00
 */
import { cssOf } from '@/components/css'
import { CLS_SEP, TEXT_NONE } from './constants'
import type { ModalHeadIn } from './types'
import css from './modal.module.css'

/**
 * 渲染标题栏左块 + 译名行。
 *
 * @param props 小标、大标题、译名与切换控件。
 * @returns 左块 + 译名行。
 */
export function ModalHead({ kicker, title, sub, ctl }: ModalHeadIn) {
  return (
    <>
      <div className={cssOf(css.headL) + CLS_SEP + cssOf(css.headMain)}>
        <div className={cssOf(css.kicker)}>{kicker}</div>
        <h3 className={cssOf(css.title)}>{title}</h3>
      </div>
      <div className={cssOf(css.subRow)} data-nodrag>
        {sub !== TEXT_NONE && <div className={cssOf(css.sub)}>{sub}</div>}
        <span className={cssOf(css.subCtl)}>{ctl}</span>
      </div>
    </>
  )
}
