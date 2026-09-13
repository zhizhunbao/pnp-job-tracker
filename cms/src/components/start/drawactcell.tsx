'use client'
/**
 * 域内哑单元格:抽选表「操作」格 —— 官方页(该期抽选的官方公布页)/ 门槛(开该省门槛弹框,
 * 2026-09-13 Frank「点门槛 应该弹框吧 不应该跳页面吧」)两个钮
 * (2026-09-13 Frank「列名应该叫操作,然后有两个按钮 一个是打开对应新闻的 link 按钮,一个是门槛按钮」;
 * 形照雇主表 EmpActCell)。门槛钮没去处的行(联邦 EE 类别抽选)不出 —— 落到空处比不出更糟。
 * 钮的类随行带来(actBtnCls),哑单元格不 import functions,免循环依赖。
 *
 * @author Frank
 * @time 2026-09-13 16:00:00
 */
import { Button, LinkButton } from '@/components/button'
import { MINI_BTN_KIND, NEW_TAB, TEXT_NONE } from './constants'
import type { DrawCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染抽选表的操作格。
 *
 * @param r 这一期的展示行。
 * @returns 一到两个钮。
 */
export function DrawActCell(r: DrawCellRow) {
  return (
    <span className={css.acts}>
      <LinkButton href={r.href} className={r.actBtnCls} target={NEW_TAB}>{r.actLinkText}</LinkButton>
      {r.rulesProv !== TEXT_NONE && (
        <Button kind={MINI_BTN_KIND} onClick={r.onRules}>{r.actRulesText}</Button>
      )}
    </span>
  )
}
