'use client'
/**
 * 顾问弹框的页眉左块:灰色小标 + 大标题 + 译名副标。
 * 页眉三弹框统一(Frank 2026-07-21「这三个也要保持一致」):灰色小标 + 纯名称,
 * 与职位弹框「职位描述」同款。「AI 顾问」标只留移民弹框(唯一真在流式生成顾问内容的;
 * #176 分类零 AI,公司弹框的 AI 段 #167⑨ 已撤、只剩检索卡,挂「AI 顾问」名不副实)。
 * #174:「AI 顾问 · 移民 · 免费今日剩 N 次」两个「·」退役 —— 分组名与次数改空格灰注
 * (#171 详情页同款手法);靛色随 #108 杂色归一改灰。
 * 标题后不挂「思考中」后缀(Frank 2026-07-18):流式等待态由正文区「努力思考中」占位承担
 * —— 标题是这一屏是什么,不是这一刻在干什么。
 * #189 公司组额度注已随 E8-11 B1 退役:公司数据走 `/api/jobs/company` 免额度,没烧池无可显。
 * #185:公司弹框「打开完整页」移入正文顶部钮行(与职位弹框同款),页眉不再重复。
 * 2026-08-28 换装批自 Advisor.tsx 的页眉段提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { IconCompass } from '@/components/icons'
import { AI_ADVISOR_ON, GROUP_IMMIGRATION, K_GROUP_HEAD, TEXT_NONE } from './constants'
import type { AdvisorHeadBlockIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染顾问弹框的页眉左块。
 *
 * @param props 取词函数、分组、标题、副标与剩余次数。
 * @returns 页眉左块。
 */
export function AdvisorHead({ t, group, title, sub, freeLeft }: AdvisorHeadBlockIn) {
  const withAi = group === GROUP_IMMIGRATION && AI_ADVISOR_ON
  return (
    <div className={cssOf(css.headL)}>
      <div className={cssOf(css.kicker)}>
        {withAi === false && t(K_GROUP_HEAD + group)}
        {withAi && <IconCompass />}
        {withAi && t('advisor.tag')}
        {withAi && <span className={cssOf(css.kickerSub)}>{t(K_GROUP_HEAD + group)}</span>}
        {withAi && freeLeft != null && (
          <span className={cssOf(css.kickerSub)}>{t('advisor.left', { n: freeLeft })}</span>
        )}
      </div>
      <h3 className={cssOf(css.title)}>{title}</h3>
      {sub !== TEXT_NONE && <div className={cssOf(css.sub)}>{sub}</div>}
    </div>
  )
}
