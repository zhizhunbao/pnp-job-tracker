'use client'
/**
 * 域内小件:雇主段的伞 —— 行业各一表,
 * 后接三试点指定雇主表(AIP / RCIP / FCIP 在招的,不分档不分行业;Frank「不要和一般的走 pnp 的雇主放到一起」;
 * 三试点表在招只算该试点的岗,连锁雇主挂记号不拆表,2026-09-06)。
 * 2026-09-05 Frank 拍板:「在招担保雇主」就叫「雇主」;LMIA 段并回没工签档;
 * 「我看不了别人装逼」—— 每家一列把脉,规则是模板 + 库内事实,不上 LLM。
 * 身份胶囊(没工签 / PGWP 两档,2026-09-05「雇主需要按身份筛」)2026-09-12 Frank
 * 「有工签 和 没工签 用一张表就行了,只是多加一个 lima 的列」合并退役,LMIA 列常驻带排序。
 * 空段(一个行业都凑不出一行)整块不渲,绝不出空壳。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { ID_SE, TABLE_IND, TABLE_PILOT } from './constants'
import { subIdOf } from './functions'
import { Band } from './band'
import { EmpBoardSec } from './empboardsec'
import { Sec } from './sec'
import type { EmpSectionIn } from './types'

/**
 * 渲染雇主段。
 *
 * @param props 更新时刻、行业分表与试点分表。
 * @returns 一条色带;没有分表则 null。
 */
export function EmpSection({ t, updatedAt, secs, pilotSecs }: EmpSectionIn) {
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
          anchor={subIdOf({ band: ID_SE, key: sec.key })}
          sec={sec}
          tableKind={TABLE_IND}
          gap={i !== 0}
          updatedAt={updatedAt} />,
      )
    }
  }
  for (const sec of pilotSecs) {
    items.push(
      <EmpBoardSec key={sec.key}
        t={t}
        anchor={subIdOf({ band: ID_SE, key: sec.key })}
        sec={sec}
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
