'use client'
/**
 * 域内小件:省提名弹框顶上的「本岗不满足的门槛」卡 —— 走不了省提名的岗,单独一张卡直接写原因(兼职、合同工、季节工、临时工、
 * 工资低于中位、职业不收;原因词与职位板格子、手机胶囊同一处取,pnpBlockOf)。形照「本岗能走的通道」卡(PnpChannelCard)。
 * 2026-09-30 起格子与胶囊改走 pnpBlockCellOf(工作性质四个与工资那个写「不符合」),这张卡照旧写具体原因。
 * 2026-09-29 Frank「有些职位不满足门槛 也要弹框 并说明」「直接精简 一些原因可以吗」「就直接说 兼职」「单独开一个 框 说不满足」。
 *
 * @author Frank
 * @time 2026-09-29 01:50:00
 */
import { TEXT_NONE } from './constants'
import { channelClsOf } from './functions'
import type { PnpBlockCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染「本岗不满足的门槛」卡。
 *
 * @param props 取词函数与原因词。
 * @returns 卡;走得了(原因词为空)给 null。
 */
export function PnpBlockCard({ t, text }: PnpBlockCardIn) {
  if (text === TEXT_NONE) {
    return null
  }
  return (
    <div className={css.card}>
      <div className={css.cardHead}>{t('pnpblock.title')}</div>
      <div className={channelClsOf()}>{text}</div>
    </div>
  )
}
