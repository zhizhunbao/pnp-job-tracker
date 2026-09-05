'use client'
/**
 * 域内小件:雇主段的伞 —— 行业各一表(子标题行带身份胶囊:没工签 / PGWP,切一处全段跟着切;分表已按当前档算好),
 * 后接三试点指定雇主表(AIP / RCIP / FCIP 在招的,不分档不分行业;Frank「不要和一般的走 pnp 的雇主放到一起」)。
 * 2026-09-05 Frank 拍板:「在招担保雇主」就叫「雇主」;LMIA 段并回没工签档;
 * 「我看不了别人装逼」—— 每家一列把脉,规则是模板 + 库内事实,不上 LLM。
 * 空段(一个行业都凑不出一行)整块不渲,绝不出空壳。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { ID_SE, TABLE_PILOT } from './constants'
import { Band } from './band'
import { EmpBoardSec } from './empboardsec'
import { Sec } from './sec'
import type { EmpSectionIn } from './types'

/**
 * 渲染雇主段。
 *
 * @param props 更新时刻、行业分表、当前身份档与切档工厂。
 * @returns 一条色带;没有分表则 null。
 */
export function EmpSection({ t, updatedAt, secs, pilotSecs, kind, kindPickOf }: EmpSectionIn) {
  if (secs.length === 0 && pilotSecs.length === 0) {
    return null
  }
  const items = []
  for (let i = 0; i < secs.length; i += 1) {
    const sec = secs[i]
    if (sec != null) {
      items.push(
        <EmpBoardSec key={sec.key}
          t={t}
          sec={sec}
          kind={kind}
          kindPickOf={kindPickOf}
          chips
          tableKind={kind}
          gap={i !== 0}
          updatedAt={updatedAt} />,
      )
    }
  }
  for (const sec of pilotSecs) {
    items.push(
      <EmpBoardSec key={sec.key}
        t={t}
        sec={sec}
        kind={kind}
        kindPickOf={kindPickOf}
        chips={false}
        tableKind={TABLE_PILOT}
        gap
        updatedAt={updatedAt} />,
    )
  }
  return (
    <Band id={ID_SE}>
      <Sec title={t('pulse.nav.se')}>{items}</Sec>
    </Band>
  )
}
