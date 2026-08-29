'use client'
/**
 * 相似职位卡(2026-08-11 Frank「下架了应该下面列出其他相似职位,用户不至于一看下架就走」):
 * 只在 closed 岗渲染 —— 下架页原本是死路,横幅说完「已下架」就没有下一步。
 * 分组小标题代替逐行标注;同公司与同职业都零在招时出一条筛好的职位板兜底链(2026-08-11 追加),
 * 让他至少还有下一步可点。
 * 2026-08-28 换装批自 Job.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { CARD_MD_CLS, TRACK_FROM_CLOSED, TRACK_FROM_CLOSED_NONE } from './constants'
import { showFallbackOf, trackRelated } from './functions'
import { RelatedGroup } from './relatedgroup'
import type { JobRelatedIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染相似职位卡。
 *
 * @param props 卡标题、两组小标题、相似职位与兜底链。
 * @returns 一张白卡。
 */
export function JobRelated({ head, sameCoLabel, sameOccLabel, related, fallbackHref, fallbackText }: JobRelatedIn) {
  return (
    <div className={CARD_MD_CLS}>
      <div className={cssOf(css.relHead)}>{head}</div>
      {related.sameCompany.length > 0 && (
        <div onClick={trackRelated(TRACK_FROM_CLOSED)}>
          <RelatedGroup label={sameCoLabel} rows={related.sameCompany} withCompany={false} />
        </div>
      )}
      {related.sameOcc.length > 0 && (
        <div onClick={trackRelated(TRACK_FROM_CLOSED)}>
          <RelatedGroup label={sameOccLabel} rows={related.sameOcc} withCompany />
        </div>
      )}
      {showFallbackOf({ related, fallbackHref }) && (
        <LinkButton href={fallbackHref} onClick={trackRelated(TRACK_FROM_CLOSED_NONE)}
          className={cssOf(css.relFallback)}>
          {fallbackText}
        </LinkButton>
      )}
    </div>
  )
}
