'use client'
/**
 * 域内小件:登录墙那一行 —— 匿名不给对照(同时喂注册漏斗)。
 * 文案一句话 + 直达登录,不解释为什么要登录(解释类文案默认删)。
 * 2026-08-28 换装批自 ResumeMatchModal.tsx 的未登录分支提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:53:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { URL_LOGIN } from './constants'
import type { MatchLoginWallIn } from './types'
import css from './resume.module.css'

/**
 * 渲染登录墙。
 *
 * @param props 取词函数。
 * @returns 一行去登录的引导。
 */
export function MatchLoginWall({ t }: MatchLoginWallIn) {
  return (
    <div className={css.loginNote}>
      <LinkButton href={URL_LOGIN} className={cssOf(css.loginLink)}>{t('rm.login')}</LinkButton>
    </div>
  )
}
