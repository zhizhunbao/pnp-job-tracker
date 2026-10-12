'use client'
/**
 * 域内小件:资讯页「申请步骤」全部省份一起看时,每省卡前那一行组头 —— 省英文名黑字 + 界面语言译名灰字(英文界面只一行)+ 条数灰字。
 * 2026-10-11 申请步骤分区筛选批 1(Frank「省份 可能 不需要选」「比如我是 安省毕业 我可能需要去其他省」)。
 *
 * @author Frank
 * @time 2026-10-11 23:30:00
 */
import type { ProvGroupHeadIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一省的组头。
 *
 * @param props 英文省名、译名(英文界面为空串)与条数文案。
 * @returns 组头。
 */
export function ProvGroupHead({ name, sub, count }: ProvGroupHeadIn) {
  return (
    <div className={css.provGroup}>
      <span className={css.provGroupName}>{name}</span>
      {sub !== '' && <span className={css.provGroupSub}>{sub}</span>}
      <span className={css.provGroupCount}>{count}</span>
    </div>
  )
}
