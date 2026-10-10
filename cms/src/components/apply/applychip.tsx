'use client'
/**
 * 发出前逐项检查(2026-10-08 Frank「再投递之前 有让用户一项一项检查吗」):收件人、简历、求职信、署名一行一项,
 * 每行一个勾、灰字项名、值,简历与求职信带「打开看」;四项全勾才放行。手动投递第 3 步与「今日待投」共用这一个(queue 桶从本桶取)。
 * 同日 Frank「看着不乱吗」改两层:上层勾 + 灰字项名 + 右端「打开看」,下层值占满整行(手机上文件名不再断在词中间、链接不折行)。
 *
 * @author Frank
 * @time 2026-10-08 21:00:00
 */
import { breakPartsOf } from './functions'
import type { ApplyChipIn } from './types'

/**
 * 附件胶囊里的文件名:切成「下划线后可折」的几段(每段后接 wbr),长文件名不断在词中间。
 *
 * @param props 文件名。
 * @returns 几段。
 */
export function ApplyChip({ name }: ApplyChipIn) {
  const out = []
  for (const [i, part] of breakPartsOf(name).entries()) {
    out.push(<span key={i}>{part}<wbr /></span>)
  }
  return <>{out}</>
}
