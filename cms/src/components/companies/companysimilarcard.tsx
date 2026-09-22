'use client'
/**
 * 相似雇主卡(同省同行业按担保档取;公司弹框里是白赚的一格 —— 同一次取数带回来的)。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位。
 * 2026-09-21 口径改成同省同公司分类(见 lib/db 的 SIMILAR_EMPLOYERS);同日 Frank「给相似雇主卡加个点击埋点」:
 * 行区外层挂 trackSimilar,点任何一家都记一次。
 * 2026-09-22 Frank「这个相似雇主也是默认显示 6 个」(随相关职位卡同规):取数放宽到 24,收起时先出 6 家,
 * 「展开其余 N 个 ▾ / 收起 ▴」来回切(照在招职位卡的 .showAll 形)。
 * 同日 Frank「同类这个词删掉」:卡头「同类」灰注撤(词条 co.similarSub 三语与 .simSub 类一并删)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { useState } from 'react'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { CompanySimilarRow } from './companysimilarrow'
import { CARD_HEAD_CLS, CARD_MD_CLS, PLAIN_BTN_KIND, SIM_FIRST_N } from './constants'
import { makeToggle, simShownOf, trackSimilar } from './functions'
import type { CompanySimilarCardIn } from './types'
import css from './companies.module.css'

/**
 * 相似雇主卡。
 *
 * @param props 相似雇主、取词函数与新开页(逐格注释见 CompanySimilarCardIn)。
 * @returns 一张卡;一家都没有时整卡不渲。
 */
export function CompanySimilarCard({ similar, t, lang, onOpenCompany, newTab, showTrans }: CompanySimilarCardIn) {
  const [open, setOpen] = useState(false)
  if (similar.length === 0) {
    return null
  }
  const shown = simShownOf({ similar, open })
  const hidden = similar.length - shown.length
  const rows = []
  for (const employer of shown) {
    rows.push(
      <CompanySimilarRow key={employer.slug} employer={employer} t={t} lang={lang} onOpenCompany={onOpenCompany}
        newTab={newTab}
        showTrans={showTrans} />,
    )
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>
        {t('co.similar')}
      </div>
      <div onClick={trackSimilar}>{rows}</div>
      {hidden > 0 && (
        <Button kind={PLAIN_BTN_KIND} onClick={makeToggle({ on: open, set: setOpen })} className={cssOf(css.showAll)}>
          {t('act.showAll', { n: hidden })}
        </Button>
      )}
      {open && similar.length > SIM_FIRST_N && (
        <Button kind={PLAIN_BTN_KIND} onClick={makeToggle({ on: open, set: setOpen })} className={cssOf(css.showAll)}>
          {t('act.collapse')}
        </Button>
      )}
    </div>
  )
}
