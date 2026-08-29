'use client'
/**
 * 「我的匹配」三态闸的弹框层:已登录未建档 → 注册引导(E11-05②,原直跳 /account);
 * 未登录但手里有职业答案 → 登录框,登录成功直接落匹配视图(E9-04b:邮箱路径走 onDone,
 * Google 路径走 returnTo),不再回列表让用户再点一次(Frank「点我的匹配也一样」)。
 * 手里没有职业答案的那一档不在这里 —— 它直接去 /account 建档,不弹框。
 * 2026-08-28 换装批自 Jobs.tsx 的 upsell 分支提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { AuthModal } from '@/components/auth'
import { OnboardingWizard } from '@/components/profile'
import { AUTH_LOGIN, URL_BOARD_MATCH } from './constants'
import type { MatchGateIn } from './types'

/**
 * 渲染三态闸的弹框层。
 *
 * @param props 三态闸面板。
 * @returns 引导或登录框;都不开时什么都不渲。
 */
export function MatchGate({ g }: MatchGateIn) {
  return (
    <>
      {g.wizard && <OnboardingWizard t={g.t} initial={g.profile} onClose={g.onClose} />}
      {g.login && (
        <AuthModal t={g.t} mode={AUTH_LOGIN} onClose={g.onClose} onDone={g.onDone}
          returnTo={URL_BOARD_MATCH} />
      )}
    </>
  )
}
