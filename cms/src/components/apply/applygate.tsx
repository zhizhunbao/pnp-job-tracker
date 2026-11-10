'use client'
/**
 * 投递框外壳之前的那一道(2026-11-09 Frank「点邮箱投递先在服务端查基础简历和额度,再决定开什么;不许先开空的投递框再盖弹框」):
 * 起始态没到只出一块居中的加载,不出投递框;没额度(这一岗也没生成过)直接出升级框,框里能点「不改写,直接投基础简历」;
 * 其余才开投递框。
 *
 * @author Frank
 * @time 2026-11-09 23:30:00
 */
import { Loading } from '@/components/loading'
import { UpgradeModal } from '@/components/pricing'
import { ApplyModal } from './applymodal'
import { LOAD_BUSY, ROLE_STATUS } from './constants'
import { useApplyGate } from './hooks'
import type { ApplyGateIn } from './types'
import css from './apply.module.css'

/**
 * 先查再开。
 *
 * @param props 要投的职位 id 与关框。
 * @returns 加载块、升级框或投递框。
 */
export function ApplyGate({ jobId, onClose }: ApplyGateIn) {
  const g = useApplyGate(jobId)
  if (g.s.load === LOAD_BUSY) {
    return (
      <div className={css.veil} role={ROLE_STATUS}>
        <div className={css.veilBox}><Loading text={g.s.t('act.loadingText')} /></div>
      </div>
    )
  }
  if (g.out) {
    return (
      <UpgradeModal t={g.s.t} onClose={onClose} reason={g.reason} back={g.back} onBase={g.onBase} baseOnly={g.member} />
    )
  }
  return <ApplyModal s={g.s} base={g.base} onClose={onClose} />
}
