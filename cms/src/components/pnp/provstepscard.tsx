'use client'
/**
 * 域内小件:资讯页「通道与门槛」一条通道的「申请步骤」卡(2026-10-02 申请步骤批 2,Frank「弹框要和页面保持一致」):与省提名弹框同一张卡
 * (PnpStepsCard),「进池与抽选」一步挂这条通道的抽选表;每张卡的抽选表开合自己管(useDrawFold)。
 *
 * @author Frank
 * @time 2026-10-02 23:40:00
 */
import { useDrawFold } from './hooks'
import { PnpStepsCard } from './pnpstepscard'
import type { ProvStepsCardIn } from './types'

/**
 * 渲染一条通道的步骤卡。
 *
 * @param props 洗好的步骤卡、抽选表与取词函数。
 * @returns 步骤卡。
 */
export function ProvStepsCard({ spec, draws, t }: ProvStepsCardIn) {
  const fold = useDrawFold()
  return <PnpStepsCard spec={spec} t={t} draws={draws} open={fold.open} toggleOf={fold.toggleOf} />
}
