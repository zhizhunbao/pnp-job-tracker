'use client'
/**
 * 域内小件:AIP 指定雇主清单卡(本省名单 + 本岗雇主高亮置顶 + 末尾展开开关;形照职业清单卡 StreamCard)。
 * 2026-10-01 Frank「这个弹框需要列表,然后高亮雇主」:AIP 弹框原先只有一行判定与按名字完全相等对出的命中行(o/a 经营名对不上就一行不出),
 * 改成列出本省全部 AIP 指定雇主、本岗雇主那一行高亮;高亮按数据层打标的口径(法定名或 o/a 经营名)。
 * 名单还没到(职位板后台在取)或不是大西洋省,不出卡。
 *
 * @author Frank
 * @time 2026-10-01 14:13:21
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { AipEmpRow } from './aipemprow'
import { BOX_GAP_NONE, PLAIN_BTN_KIND, PROV_KEY_HEAD } from './constants'
import { boxClsOf, foldLabelOf } from './functions'
import { useAipEmpCard } from './hooks'
import type { AipEmpCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染 AIP 指定雇主清单卡。
 *
 * @param props 取词函数、本岗与指定雇主名单。
 * @returns 清单卡;本省没有名单给 null。
 */
export function AipEmpCard({ t, job, employers }: AipEmpCardIn) {
  const p = useAipEmpCard({ job, employers })
  if (p.total === 0) {
    return null
  }
  const rows = []
  for (const r of p.rows) {
    rows.push(<AipEmpRow key={r.key} r={r} matchRef={p.matchRef} />)
  }
  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        {t('aipemp.title', { prov: t(PROV_KEY_HEAD + job.province) })}
        <span className={css.count}>{t('aipemp.count', { n: p.total })}</span>
      </div>
      <div className={boxClsOf({ clip: false, gap: BOX_GAP_NONE })}>{rows}</div>
      {p.hidden > 0 && (
        <Button kind={PLAIN_BTN_KIND} className={cssOf(css.foldMore)} onClick={p.onToggle}>
          {foldLabelOf({ t, open: p.open, hidden: p.hidden })}
        </Button>
      )}
    </div>
  )
}
