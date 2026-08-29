'use client'
/**
 * pricing 域的锁行(打码块的脚注):锁 + 灰注 + 文字链 CTA。全站所有打码位共用同一形态,
 * 不许各处自造。灰注与 CTA 文案都随场景走 —— 未登录 429 场景的出路是「登录 / 注册」
 * 不是「升级 Pro」,行为还是同一个组件。
 * 它只有 LockedText 一个消费者,所以不上桶门(宪法:只有一个消费者的东西不该导出)。
 * 2026-08-28 换装批自 Lock.tsx 拆出成文件(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { IconLock } from '@/components/icons'
import { LK_FOOT_CLS } from './constants'
import { lockMsgOf } from './functions'
import type { LockFootIn } from './types'
import { UpgradeCta } from './upgradecta'

/**
 * 锁行。
 *
 * @param props 取词函数、登录态、灰注与 CTA 文案(逐格注释见 LockFootIn)。
 * @returns 锁行。
 */
export function LockFoot({ t, loggedIn, msg, ctaLabel }: LockFootIn) {
  return (
    <div className={LK_FOOT_CLS}>
      <IconLock />
      {lockMsgOf({ t, msg })}
      <UpgradeCta t={t} loggedIn={loggedIn} link label={ctaLabel} />
    </div>
  )
}
