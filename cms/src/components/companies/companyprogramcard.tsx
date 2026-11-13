'use client'
/**
 * 指定雇主卡:一个项目一张(AIP / RCIP / FCIP ……),卡名就是项目码;里面是这个项目下的指定地点与官方名单上登记的名字。
 * 2026-11-13 Frank「做成单独的卡 LMIA AIP RCIP FCIP 都是单独的卡。这样比较清晰」「没有信息就不显示这个卡」:
 * 三个项目同一个形,做成一件、由数据决定出几张 —— 服务端按项目分好(lib/jobs 的 designatedCardsOf),名单以后多一个项目
 * 就多一张卡,这里不用改。地点与登记名都没有的不渲。登记名多的先出 10 个(全站清单同一个数 FOLD_FIRST),其余走 pager 桶的展开 / 收起(同在招职位卡)。
 *
 * @author Frank
 * @time 2026-11-13 19:30:00
 */
import { cssOf } from '@/components/css'
import { FOLD_FIRST, FoldLine, useFold } from '@/components/pager'
import { CARD_HEAD_CLS, CARD_MD_CLS, K_JOBS_UNIT, TEXT_NONE } from './constants'
import { namesShownOf } from './functions'
import type { CompanyProgramCardIn } from './types'
import css from './companies.module.css'

/**
 * 一个项目的指定雇主卡。
 *
 * @param props 这个项目的卡与取词函数(逐格注释见 CompanyProgramCardIn)。
 * @returns 一张卡;地点与登记名都没有时不渲。
 */
export function CompanyProgramCard({ card, t }: CompanyProgramCardIn) {
  const fold = useFold({ hidden: Math.max(0, card.names.length - FOLD_FIRST) })
  if (card.places.length === 0 && card.names.length === 0) {
    return null
  }
  const rows = []
  for (const n of namesShownOf({ names: card.names, n: FOLD_FIRST + fold.extra })) {
    rows.push(
      <div key={n.name + n.where} className={cssOf(css.progLine)}>
        {n.name}
        {n.where !== TEXT_NONE && <span className={cssOf(css.progWhere)}>{n.where}</span>}
      </div>,
    )
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{card.program}</div>
      <div>
        {card.places.length > 0 && (
          <>
            <div className={cssOf(css.nocsHead)}>{t('co.places')}</div>
            <div className={cssOf(css.progLine)}>{card.places.join(t('de.sep'))}</div>
          </>
        )}
        {rows.length > 0 && <div className={cssOf(css.nocsHead)}>{t('co.listNames')}</div>}
        {rows}
        <FoldLine t={t}
          unit={t(K_JOBS_UNIT)}
          hidden={Math.max(0, card.names.length - FOLD_FIRST)}
          extra={fold.extra}
          busy={false}
          onMore={fold.onMore}
          onFold={fold.onFold} />
      </div>
    </div>
  )
}
