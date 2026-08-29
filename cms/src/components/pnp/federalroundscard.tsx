'use client'
/**
 * E6-10 · 联邦抽选近况(Frank「现在都是在抽 cec 和法语吧」)。
 * 类别卡只讲**本岗那一类**;联邦轮次还有 CEC、法语、省提名、通用 —— 不铺出来,用户拿着 EE 标
 * 会误判现在的行情。数据源同一个 build_ee_draws.py:pnp_draws 的 province=FED 行(label=类别键,零新表)。
 * 红线:法语按**语言能力**判定、不按职业,只在这里作通道说明与分数线参考,**绝不挂到岗位上**。
 * 弹框只给最近 N 轮 + 可展开(#123 教训:别把全量塞进弹框)。
 * 2026-08-28 换装批自 Pnp.tsx 提出成文件(裸 <button> 改经 button 族,状态收进 hooks)。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BOX_GAP_TOP, FED_SHOW, PLAIN_BTN_KIND } from './constants'
import { boxClsOf, fedBucketsOf, fedMoreLabelOf, fedRowsOf } from './functions'
import { FedMix } from './fedmix'
import { FedRow } from './fedrow'
import { useFederalRounds } from './hooks'
import type { FederalRoundsCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染联邦抽选近况卡。
 *
 * @param props 取词函数与全部抽选行。
 * @returns 近况卡;一轮都没有时给 null。
 */
export function FederalRoundsCard({ t, draws }: FederalRoundsCardIn) {
  const p = useFederalRounds({ draws })
  if (p.rounds.length === 0) {
    return null
  }
  const rows = []
  for (const r of fedRowsOf({ t, rounds: p.rounds, open: p.open })) {
    rows.push(<FedRow key={r.key} r={r} />)
  }
  return (
    <div className={css.card}>
      <div className={css.cardHead}>{t('eefed.title')}</div>
      <FedMix head={t('eefed.mixHead', { n: p.rounds.length })} buckets={fedBucketsOf({ t, rounds: p.rounds })} />
      <div className={boxClsOf({ clip: true, gap: BOX_GAP_TOP })}>{rows}</div>
      {p.rounds.length > FED_SHOW && (
        <Button kind={PLAIN_BTN_KIND} className={cssOf(css.moreBtn)} onClick={p.onToggle}>
          {fedMoreLabelOf({ t, open: p.open, total: p.rounds.length })}
        </Button>
      )}
      <div className={css.fedNote}>{t('eefed.french')}</div>
    </div>
  )
}
