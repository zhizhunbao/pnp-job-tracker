'use client'
/**
 * 域内小件:分省概览的一张省卡(手机形态;桌面走可排序表格)。整卡可点 = 切省
 * —— 表格行不可点(E8-08 站规「可点才有态」),切省统一走 S4b 的 chips,
 * 手机卡片这一条保留点卡切省。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件;裸 <button> 改经 button 族(kind ghost
 * + 本域加倍类,样板 companies 的 backBtn)。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Button } from '@/components/button'
import { PLAIN_BTN_KIND, TEXT_NONE } from './constants'
import { provCardClsOf } from './functions'
import { KvRow } from './kvrow'
import { NamedCell } from './namedcell'
import { PrCell } from './prcell'
import type { ProvCardIn } from './types'
import css from './start.module.css'

/**
 * 渲染一张省卡。
 *
 * @param props 这一行的展示行、是不是当前省、点击手柄与取词函数。
 * @returns 整卡钮。
 */
export function ProvCard({ row, on, onPick, t }: ProvCardIn) {
  return (
    <Button kind={PLAIN_BTN_KIND} className={provCardClsOf({ on })} onClick={onPick}>
      <div className={css.provCardHead}>
        <span className={css.provCardName}>{row.name}</span>
        <span className={css.provCardCode}>{row.code}</span>
        {row.tierCardCls !== TEXT_NONE && <span className={row.tierCardCls}>{row.tierText}</span>}
      </div>
      <div className={css.provCardBody}>
        <KvRow k={t('stats.openJobs')} v={<strong>{row.openText}</strong>} />
        <KvRow k={t('stats.named')} v={NamedCell(row)} />
        <KvRow k={t('stats.cardWork')} v={row.workText} />
        <KvRow k={t('stats.cardStudy')} v={row.studyText} />
        <KvRow k={t('stats.cardPr')} v={PrCell(row)} />
      </div>
    </Button>
  )
}
