'use client'
/**
 * 域内小件:省提名判定卡(结论药丸 + 两条「凭什么」)。
 * 拆多卡(2026-07-25 用户「乱,拆成多个卡片」):原单卡四块堆叠(判定+抽选+公告+清单)挤成一团;
 * 改 判定/本省最近抽选/本省最新公告/每条通道清单 各一张卡 —— 同 E8-12 省弹框「每块一卡」先例。
 * 结论与话术在 pnpVerdictOf 里算(判定口径写在那儿),这里只渲。
 * 2026-08-28 换装批自 Pnp.tsx 的 PnpListSection 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { TEXT_NONE } from './constants'
import type { PnpVerdictCardIn } from './types'
import { VerdictPill } from './verdictpill'
import css from './pnp.module.css'

/**
 * 渲染省提名判定卡。
 *
 * @param props 取词函数与判定内容。
 * @returns 判定卡。
 */
export function PnpVerdictCard({ t, verdict }: PnpVerdictCardIn) {
  return (
    <div className={css.card}>
      <div className={css.cardHead}>{t('col.pnp')}</div>
      <div><VerdictPill tone={verdict.tone}>{verdict.text}</VerdictPill></div>
      {verdict.why !== TEXT_NONE && <div className={css.why}>{verdict.why}</div>}
      {verdict.qcWhy !== TEXT_NONE && <div className={css.why}>{verdict.qcWhy}</div>}
    </div>
  )
}
