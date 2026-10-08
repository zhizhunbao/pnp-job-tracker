'use client'
/**
 * 一枚阶段胶囊:字 + 计数;选中黑底白字。
 *
 * @author Frank
 * @time 2026-10-08 16:00:00
 */
import { Button } from '@/components/button'
import { PLAIN_KIND } from './constants'
import { makePillClick, stagePillClsOf } from './functions'
import type { StagePillIn } from './types'
import css from './myjobs.module.css'

/**
 * 渲染一枚胶囊。
 *
 * @param props 这一枚与切档手柄。
 * @returns 一颗钮。
 */
export function StagePillButton({ pill, onPick }: StagePillIn) {
  return (
    <Button kind={PLAIN_KIND} className={stagePillClsOf(pill.on)} onClick={makePillClick({ key: pill.key, onPick })}>
      {pill.label}
      <b className={css.stageN}>{pill.count}</b>
    </Button>
  )
}
