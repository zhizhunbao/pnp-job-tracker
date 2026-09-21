'use client'
/**
 * 职位描述弹框正文下面的两张卡(2026-09-21 Frank「参考一下公司弹框」「是不是把公司信息放到一个框里,单独放到下面」
 * 「之前不是,下面还要加一个相似职位吗」):公司信息卡 + 相关职位卡,照公司弹框的卡组形。
 * 弹框走客户端取数:公司按岗位号取(与公司弹框同一个接口),相关职位按岗位号取(与 `/jobs/[id]` 页面同一个取数函数);
 * 没取到的卡不出。弹框里的相关职位卡不出兜底链、不出更新时间(拿不到服务端心跳)。
 * 公司信息卡点文件不走 companies 桶:advisor 的职位描述弹框点本件,companies 的桶反过来要 advisor 的弹框,走桶就成环。
 *
 * @author Frank
 * @time 2026-09-21 17:30:00
 */
import { CompanyInfoCard } from '@/components/companies/companyinfocard'
import { makeT } from '@/lib/i18n'
import { TEXT_NONE, TRACK_FROM_MODAL } from './constants'
import { showRelatedOf } from './functions'
import { useRelatedOf } from './hooks'
import { JobRelated } from './jobrelated'
import type { JobModalCardsIn } from './types'

/**
 * 渲染职位描述弹框正文下面的两张卡。
 *
 * @param props 这一岗、界面语言与点相关职位 / 点公司名两个回调(逐格注释见 JobModalCardsIn)。
 * @returns 公司信息卡 + 相关职位卡(各自没取到时不出)。
 */
export function JobModalCards({ job, lang, onOpenJob, onOpenCompany }: JobModalCardsIn) {
  const t = makeT(lang)
  const related = useRelatedOf({ id: Number(job.id) })
  return (
    <>
      <CompanyInfoCard jobId={Number(job.id)} lang={lang} onOpenCompany={onOpenCompany} />
      {related != null && showRelatedOf({ related, fallbackHref: TEXT_NONE }) && (
        <JobRelated head={t('detail.related')}
          t={t}
          updatedAt={TEXT_NONE}
          sameCoLabel={t('detail.sameCo')}
          sameOccLabel={t('detail.sameOcc')}
          related={related}
          fallbackHref={TEXT_NONE}
          fallbackText={TEXT_NONE}
          from={TRACK_FROM_MODAL}
          fromNone={TRACK_FROM_MODAL}
          lang={lang}
          onOpenJob={onOpenJob} />
      )}
    </>
  )
}
