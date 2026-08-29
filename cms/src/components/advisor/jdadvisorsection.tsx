'use client'
/**
 * JD 框内嵌的 AI 顾问初判(2026-07-19 Frank:「像公司顾问一样自动生成,不要再点一下」)——
 * 打开职位描述即自动流式生成,不用再点「AI 顾问」钮;额度闸照走(402 升级卡 / 429 说人话);
 * 同岗会话内缓存,反复开关不重复烧额度。深挖(对比表 + 追问对话)仍在「AI 顾问」钮的完整弹框里。
 *
 * 壳 = 裸段(Frank「AI 顾问和职位描述分成两个卡片」「不要卡片套卡片」):组件自己不带壳,
 * 详情页包进独立卡、JD 弹框包分隔线段 —— 间隔样式归消费方。
 *
 * 2026-08-28 拆域批自 components/jobs/Jd.tsx 迁入(Frank 拍板):它是顾问域的肉,
 * 寄居 JD 文件是历史 —— 三个消费点(职位详情的 AI 速读卡、公司弹框、本域完整弹框)
 * 问的都是「这一岗/这家公司对我意味着什么」,那是顾问的问题,不是 JD 排版的问题。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconCompass } from '@/components/icons'
import { renderAI } from '@/components/jobs/renderai'
import { LockedText } from '@/components/pricing'
import { ADV_STREAMING, BTN_GHOST, CARET_BAR, FIELD_TITLE, SPACE } from './constants'
import { useAdvisorSection } from './hooks'
import type { JdAdvisorSectionIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染内嵌初判段。
 *
 * @param props 这一岗、界面语言、分层态、段标题与生成哪一种。
 * @returns 段头 + 按状态渲的正文。
 */
export function JdAdvisorSection({ job, lang, plan, title, field = FIELD_TITLE }: JdAdvisorSectionIn) {
  const a = useAdvisorSection({ job, lang, field, title, plan })
  return (
    <div>
      <div className={cssOf(css.head)}>
        <IconCompass />{SPACE}{a.head}
        {a.leftText !== '' && <span className={cssOf(css.left)}>{a.leftText}</span>}
      </div>
      {a.upgrade && <LockedText t={a.t} loggedIn={plan.loggedIn} />}
      {a.limited && <LockedText t={a.t} loggedIn={plan.loggedIn} msg={a.limitMsg} ctaLabel={a.limitCta} />}
      {a.loading && <p className={cssOf(css.note)}>{a.loadingText}</p>}
      {a.failed && (
        <p className={cssOf(css.note)}>
          {a.failText}
          <Button kind={BTN_GHOST} onClick={a.onRetry} className={cssOf(css.retry)}>{a.retryText}</Button>
        </p>
      )}
      {a.hasBody && (
        <div className={cssOf(css.body)}>
          {renderAI(a.text)}
          {a.status === ADV_STREAMING && <span className={cssOf(css.caret)}>{CARET_BAR}</span>}
        </div>
      )}
    </div>
  )
}
