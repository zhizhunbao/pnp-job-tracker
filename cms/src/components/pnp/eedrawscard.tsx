'use client'
/**
 * 域内小件:EE 最近抽选卡(一个类别一段)。
 * 2026-07-25 Frank「拆成三个卡片吧」:原单卡(判定+抽选+清单堆叠)对齐 PNP 弹框「每块一卡」——
 * 判定卡 / 最近抽选卡 / 类别清单卡;块无数据整卡不出(无空壳)。
 * 2026-08-28 换装批自 Pnp.tsx 的 EeCategorySection 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { histAtOf } from './functions'
import { EeCatDraw } from './eecatdraw'
import type { EeDrawsCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染 EE 最近抽选卡。
 *
 * @param props 取词函数、有抽选的类别、类别名开关、历史表与展开态(逐格注释见 EeDrawsCardIn)。
 * @returns 抽选卡。
 */
export function EeDrawsCard({ t, cats, showName, histOf, openCat, toggleOf }: EeDrawsCardIn) {
  const blocks = []
  for (const c of cats) {
    blocks.push(<EeCatDraw key={c.key}
      t={t}
      cat={c}
      showName={showName}
      hist={histAtOf(histOf, c.key)}
      open={openCat === c.key}
      onToggle={toggleOf(c.key)} />)
  }
  return (
    <div className={css.card}>
      <div className={css.cardHead}>{t('eelist.drawsTitle')}</div>
      {blocks}
    </div>
  )
}
