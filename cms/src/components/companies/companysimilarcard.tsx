'use client'
/**
 * 相似雇主卡(同省同行业按担保档取;公司弹框里是白赚的一格 —— 同一次取数带回来的)。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位。
 * 2026-09-21 口径改成同省同公司分类(见 lib/db 的 SIMILAR_EMPLOYERS);同日 Frank「给相似雇主卡加个点击埋点」:
 * 行区外层挂 trackSimilar,点任何一家都记一次。
 * 2026-09-22 Frank「这个相似雇主也是默认显示 6 个」(随相关职位卡同规):取数放宽到 24,收起时先出 6 家,
 * 「展开其余 N 个 ▾ / 收起 ▴」来回切(照在招职位卡的 .showAll 形)。
 * 同日 Frank「同类这个词删掉」:卡头「同类」灰注撤(词条 co.similarSub 三语与 .simSub 类一并删)。
 * 2026-09-23 Frank「也应该显示 () 数量吧」:卡头带总数,照在招职位卡头「在招职位 (N)」的形。
 * 2026-10-02 Frank「相似雇主 3000 多?为什么只能展开 14 个」「全站统一 都改成 展开 20 和 收起。全部统一」:卡头写的是同类总数,
 * 取数却封顶 20 家 —— 改服务器分页(useSimilarCard,照 AIP 指定雇主卡):首屏照旧几家,卡底两只钮换成 pager 桶 FoldLine
 * (展开 20 家 → 再展开 20 家 → 展开其余 N 家 → 收起),一页 20 家往后接直到总数;上面「展开其余 N 个 ▾ / 收起 ▴」自造开关撤。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { FoldLine } from '@/components/pager'
import { CompanySimilarRow } from './companysimilarrow'
import { CARD_HEAD_CLS, CARD_MD_CLS, K_SIM_UNIT, PAREN_CLOSE, PAREN_OPEN } from './constants'
import { trackSimilar } from './functions'
import { useSimilarCard } from './hooks'
import type { CompanySimilarCardIn } from './types'

/**
 * 相似雇主卡。
 *
 * @param props 相似雇主、取词函数与新开页(逐格注释见 CompanySimilarCardIn)。
 * @returns 一张卡;一家都没有时整卡不渲。
 */
export function CompanySimilarCard({ similar, t, lang, onOpenCompany, newTab, showTrans }: CompanySimilarCardIn) {
  const p = useSimilarCard({ similar })
  if (similar.length === 0) {
    return null
  }
  const rows = []
  for (const employer of p.rows) {
    rows.push(
      <CompanySimilarRow key={employer.slug} employer={employer} t={t} lang={lang} onOpenCompany={onOpenCompany}
        newTab={newTab}
        showTrans={showTrans} />,
    )
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>
        {t('co.similar')} {PAREN_OPEN}{p.total}{PAREN_CLOSE}
      </div>
      <div onClick={trackSimilar}>{rows}</div>
      <FoldLine t={t}
        unit={t(K_SIM_UNIT)}
        hidden={p.hidden}
        extra={p.extra}
        busy={p.busy}
        onMore={p.onMore}
        onFold={p.onFold} />
    </div>
  )
}
