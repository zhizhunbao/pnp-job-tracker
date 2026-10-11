'use client'
/**
 * 投递框一步一张分区卡(2026-10-10 投递框三步,docs/design/我的求职-三段-20261009.md 2.4):卡头左边步名、右边本步的钮
 * (「按职位改写」「上传新简历」这类),下面一排三个页签 简历 / 求职信 / 确认(tabs 桶通用选项卡),再下面是本步正文。
 * 原步数行「第 N 步 · 共 3 步」(profile 桶 OnboardingHead)随之撤。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */
import { Tabs } from '@/components/tabs'
import { CARD_HEAD_CLS, CARD_MD_CLS, KICKER_KEY, STEP_TABS, TEXT_NONE } from './constants'
import type { ApplyCardIn } from './types'
import css from './apply.module.css'

/**
 * 一步一张分区卡。
 *
 * @param props 整机面板、卡头右侧的钮与正文(步名按当前步取)。
 * @returns 白卡分区。
 */
export function ApplyCard({ p, acts, children }: ApplyCardIn) {
  const items = []
  let title = TEXT_NONE
  for (const it of STEP_TABS) {
    items.push({ key: it.key, label: p.t(it.label) })
    if (it.key === p.step) {
      title = it.label
    }
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={css.cardHead}>
        <div className={CARD_HEAD_CLS}>{p.t(title)}</div>
        {acts != null && <span className={css.h2Acts}>{acts}</span>}
      </div>
      <Tabs items={items} value={p.step} onChange={p.onTab} ariaLabel={p.t(KICKER_KEY)} />
      <div className={css.cardBody}>{children}</div>
    </div>
  )
}
