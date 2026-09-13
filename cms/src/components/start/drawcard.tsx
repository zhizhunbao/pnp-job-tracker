'use client'
/**
 * 域内小件:抽选表手机形态的一条(通道名 + 译名灰注 + 省标签 / 日期 / 分数线 / 邀请数 + 操作钮行
 * ;冷解读 2026-09-12 Frank「这个解读 解读了个寂寞」 撤;操作钮 2026-09-13 Frank「列名应该叫操作,然后有两个按钮」加,
 * 与桌面表同两枚:官方页 / 门槛,门槛钮没去处的行不出)。末条不出分隔线 —— 白卡自己有描边。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Button, LinkButton } from '@/components/button'
import { Tag } from '@/components/tag'
import { MINI_BTN_KIND, NEW_TAB, TEXT_NONE } from './constants'
import { drawRowClsOf } from './functions'
import type { DrawCardIn } from './types'
import css from './start.module.css'

/**
 * 渲染抽选表的一张手机卡。
 *
 * @param props 这一期的展示行、是不是最后一条与取词函数。
 * @returns 一条。
 */
export function DrawCard({ row, last, t }: DrawCardIn) {
  return (
    <div className={drawRowClsOf({ last })}>
      <div className={css.drawTitle}>{row.main}</div>
      {row.note !== TEXT_NONE && <div className={css.drawNote}>{row.note}</div>}
      <div className={css.drawMeta}>
        <Tag>{row.prog}</Tag>
        <span className={css.drawDate}>{row.date}</span>
        <span className={css.drawStatRight}>
          {t('home.dr.score')}<span className={css.drawVal}>{row.score}</span>
        </span>
        <span className={css.drawStat}>
          {t('home.dr.inv')}<span className={css.drawVal}>{row.invitations}</span>
        </span>
      </div>
      <div className={css.drawActs}>
        <span className={css.acts}>
          <LinkButton href={row.href} className={row.actBtnCls} target={NEW_TAB}>{row.actLinkText}</LinkButton>
          {row.rulesProv !== TEXT_NONE && (
            <Button kind={MINI_BTN_KIND} onClick={row.onRules}>{row.actRulesText}</Button>
          )}
        </span>
      </div>
    </div>
  )
}
