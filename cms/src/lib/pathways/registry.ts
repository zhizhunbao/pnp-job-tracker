/**
 * 通道注册表 —— 全站唯一的通道清单(设计:docs/design/通道策略分文件-20260815.md)。
 * 一条通道一个文件(Frank 2026-08-15「每个通道一个策略文件吧?不要混在一起吧」):问一句
 * 「NL 国际毕业生这条路我们是怎么判的」,打开 nl-intl-grad.ts 就能答全 —— 此前要开六个文件。
 *
 * 🔴 **顺序即注册表原序**:pathVerdict 在同档内按它保持稳定次序(「编个次序出来等于替用户拿主意」),
 * 挪动这里的顺序会改变同档通道的先后,不是纯排版。
 *
 * 本文件与 14 份策略文件同属**通道数据特区**(domain-file-names 闸对本目录放行内容命名 ——
 * 与 db/sql.ts 同一性质:文件名就是内容说明)。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

import { AB_OPPORTUNITY } from './ab-opportunity'
import { AIP } from './aip'
import { BC_BUILD } from './bc-build'
import { BC_SW } from './bc-sw'
import { FCIP_PATHWAY } from './fcip'
import { FED_EE } from './fed-ee'
import { MB_SWM } from './mb-swm'
import { NB_SW } from './nb-sw'
import { NL_INTL_GRAD } from './nl-intl-grad'
import { NS_SW } from './ns-sw'
import { ON_WORKFORCE } from './on-workforce'
import { PE_SW } from './pe-sw'
import { RCIP } from './rcip'
import { SK_OFFER } from './sk-offer'
import type { PathwayStrategy } from './types'

/**
 * 14 条通道,顺序 = 判定层的注册表原序(见文件头注释,别随手改)。
 */
export const PATHWAYS: PathwayStrategy[] = [
  FED_EE,
  ON_WORKFORCE,
  NB_SW,
  NS_SW,
  SK_OFFER,
  AIP,
  RCIP,
  FCIP_PATHWAY,
  MB_SWM,
  AB_OPPORTUNITY,
  BC_SW,
  BC_BUILD,
  NL_INTL_GRAD,
  PE_SW,
]
