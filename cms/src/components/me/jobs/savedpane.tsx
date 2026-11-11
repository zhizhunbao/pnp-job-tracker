'use client'
/**
 * me 桶子桶 jobs 的「我的收藏」页签(2026-10-06 Frank「也重新改一下」;2026-10-10 批 2 Frank「单独一个我的收藏没意义」
 * 「收藏之后,下一步就是准备投递了」并进「我的求职」):收藏的岗一张表(手机一岗一条),能投的「投递」、投过的「打开」;
 * 空态一行「还没有收藏」(10-09 Frank「去职位板 删掉吧」)。2026-10-13 Frank「每个 table 都有分页吧」:分页壳。
 * 2026-11-07 效果图:分区白卡换成页签,条数挂到页签上;「删除」钮撤。
 * 同日 Frank「先做 5 条必备」:删除收进行末「⋯」,先弹确认框。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { useLang } from '@/components/i18n'
import { AskDelModal } from './askdelmodal'
import { KIND_SAVED, STAGE_ALL } from './constants'
import { listRowsOf, savedColsOf, skipFile } from './functions'
import { useAskDel, useLazyCompanies, useLazyTitles } from './hooks'
import { PagedJobList } from './pagedjoblist'
import type { ListPaneIn } from './types'
import css from './jobs.module.css'

/**
 * 「我的收藏」页签。
 *
 * @param props 取词函数、收藏清单整机与开投递框。
 * @returns 表(或失败一句);还没拉到不渲。
 */
export function SavedPane({ t, l, openApp }: ListPaneIn) {
  const [lang] = useLang()
  const titles = useLazyTitles({ items: l.items, lang })
  const cos = useLazyCompanies({ items: l.items, lang })
  const a = useAskDel()
  if (l.failed) {
    return <div className={cssOf(css.note)}>{t('mj.fail')}</div>
  }
  if (l.items == null) {
    return null
  }
  const rows = listRowsOf({
    kind: KIND_SAVED,
    ask: a.onAsk,
    remove: l.remove,
    filter: STAGE_ALL,
    items: l.items,
    t,
    lang,
    titles,
    cos,
    openApp,
    view: skipFile,
  })
  return (
    <>
      <PagedJobList rows={rows} cols={savedColsOf({ t })} t={t}
        empty={<div className={cssOf(css.note)}>{t('sj.empty')}</div>} />
      <AskDelModal t={t} a={a} />
    </>
  )
}
