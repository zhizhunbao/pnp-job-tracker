'use client'
/**
 * 相似职位卡(2026-08-11 Frank「下架了应该下面列出其他相似职位,用户不至于一看下架就走」):
 * 只在 closed 岗渲染 —— 下架页原本是死路,横幅说完「已下架」就没有下一步。
 * 分组小标题代替逐行标注;同公司与同职业都零在招时出一条筛好的职位板兜底链(2026-08-11 追加),
 * 让他至少还有下一步可点。
 * 2026-08-28 换装批自 Job.tsx 提出成文件。
 * 2026-09-03 Frank「所有的 table 和可以更新数据的地方,右上角都应该有一个更新时间」:
 * 卡标题行右端挂 time 桶的 Updated(心跳由页面门 SSR 取好递进来)。
 * 2026-09-21 改判:在招岗也渲染,职位描述弹框里也接这张卡(Frank「之前不是,下面还要加一个相似职位吗」「参考一下公司弹框」);
 * 埋点来源格由宿主递(下架页 / 在招页 / 弹框分开记);两组之间加一条分隔线(Frank「同公司 和 同省同职业是不是中间要有一个横线」)。
 * 2026-09-22 Frank「不应该只显示 6 个吧」「要显示职位数量吧」:两组各带总数与收起首屏条数(同公司 3、同省同职业 6),
 * 展开态在 RelatedGroup 里。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { Updated } from '@/components/time'
import { CARD_MD_CLS, REL_CO_FIRST_N, REL_OCC_FIRST_N } from './constants'
import { showFallbackOf, trackRelated } from './functions'
import { RelatedGroup } from './relatedgroup'
import type { JobRelatedIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染相似职位卡。
 *
 * @param props 卡标题、取词函数、更新时刻、两组小标题、相似职位、兜底链、两个埋点来源格与界面语言。
 * @returns 一张白卡。
 */
export function JobRelated({
  head, t, updatedAt, sameCoLabel, sameOccLabel, related, fallbackHref, fallbackText, from, fromNone, lang, onOpenJob,
}: JobRelatedIn) {
  return (
    <div className={CARD_MD_CLS}>
      <div className={cssOf(css.relHead)}>
        {head}
        <Updated iso={updatedAt} t={t} />
      </div>
      {related.sameCompany.length > 0 && (
        <div onClick={trackRelated(from)}>
          <RelatedGroup label={sameCoLabel} total={related.sameCompanyTotal} rows={related.sameCompany}
            firstN={REL_CO_FIRST_N} t={t} lang={lang} onOpenJob={onOpenJob} />
        </div>
      )}
      {related.sameCompany.length > 0 && related.sameOcc.length > 0 && <div className={cssOf(css.relSep)} />}
      {related.sameOcc.length > 0 && (
        <div onClick={trackRelated(from)}>
          <RelatedGroup label={sameOccLabel} total={related.sameOccTotal} rows={related.sameOcc}
            firstN={REL_OCC_FIRST_N} t={t} lang={lang} onOpenJob={onOpenJob} />
        </div>
      )}
      {showFallbackOf({ related, fallbackHref }) && (
        <LinkButton href={fallbackHref} onClick={trackRelated(fromNone)}
          className={cssOf(css.relFallback)}>
          {fallbackText}
        </LinkButton>
      )}
    </div>
  )
}
