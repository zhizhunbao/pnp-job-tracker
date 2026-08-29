'use client'
/**
 * 职位详情页正文(E8-07 A 件 → E8-11 B2,Frank「以弹框为准,job 只留 job 相关」):
 * 面包屑 + H1(职位名 + NOC 官方职业名译名对照)+ JD 身体(与 JD 弹框同一棵树)+ 返回,
 * closed 岗再接一张相似职位卡。
 * 砍(Frank 2026-07-22 三令):头部卡 meta(公司/城市/日期/chips)、与我的匹配、事实块、
 * 省提名/EE 卡、相关职位 —— 一条信息一个家,移民信号在移民弹框,公司在公司弹框/页。
 * 2026-08-10 Frank 两拍,详情页的移民入口全撤,本页回到「只讲这份 job」:
 * ① C6 通道卡(「这么多信息放到 job 详情基本是多余的,根本没人点」——近 30 天 148 次曝光,
 *    CTA 连事件表前 50 都没进);② #287 批D 判定卡入口(「放到 job 详情比较突兀」「根本就没人点」——
 *    同期全渠道合计仅 7 次,同窗口详情页浏览 318 次)。两者的组件与接口都保留,只是不再落在详情页。
 * OccReportCard 2026-08-06 摘(Frank「没什么用可以删了」):它的付费出口挂在已退役的报告体系。
 * 2026-08-28 换装批重写落位:顶栏与页脚上交页面门,本件只出正文。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Shell } from '@/components/shell'
import { BTN_GHOST, CARD_MD_CLS, DETAIL_SHELL_TOP, TEXT_NONE } from './constants'
import { backClsOf, showRelatedOf } from './functions'
import { useJobDetail } from './hooks'
import { JobBody } from './jobbody'
import { JobCrumbs } from './jobcrumbs'
import { JobRelated } from './jobrelated'
import type { JobIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染职位详情正文。
 *
 * @param props 本岗、分层态、页面维度与相似职位。
 * @returns 正文轨里的窄读列。
 */
export function Job({ job, plan, dims, related }: JobIn) {
  const d = useJobDetail({ job, plan, dims, related })
  return (
    <Shell top={DETAIL_SHELL_TOP}>
      <div className={cssOf(css.detail)}>
        <JobCrumbs home={d.t('detail.crumbHome')} prov={d.view.provFull} provHref={d.view.provHref}
          segs={d.view.segs} />
        <div className={`${CARD_MD_CLS} ${cssOf(css.card)}`}>
          <Button kind={BTN_GHOST} onClick={d.onBack} className={backClsOf(d.leaving)}>
            {d.t('detail.back')}
          </Button>
          <h1 className={cssOf(css.title)}>{job.title}</h1>
          {d.view.alias !== TEXT_NONE && <div className={cssOf(css.titleAlias)}>{d.view.alias}</div>}
          <JobBody job={job} lang={d.lang} plan={plan} />
        </div>
        {showRelatedOf({ status: job.status, related, fallbackHref: d.view.fallbackHref }) && (
          <JobRelated head={d.t('detail.related')}
            sameCoLabel={d.t('detail.sameCo')}
            sameOccLabel={d.t('detail.sameOcc')}
            related={related}
            fallbackHref={d.view.fallbackHref}
            fallbackText={d.view.fallbackText} />
        )}
      </div>
    </Shell>
  )
}
