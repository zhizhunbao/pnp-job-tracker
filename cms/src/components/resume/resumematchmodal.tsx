'use client'
/**
 * resume 域的结构:简历对照 JD 的弹框(G3,设计 docs/design/G3-简历对照JD-20260803.md)。
 * 三屏二选一 —— 未登录出登录墙、对照过了出结果、其余出输入表单;弹框壳走 modal 域的
 * 公共件(全站弹框格式布局一致,遮罩不自铺)。
 * 眉题删了(2026-08-03 Frank「不用标 AI 工具」):功能名自己会说话。
 * 简历文本默认只在内存与本次请求里;E11-08 起用户**主动勾选**才存进账户档案
 * (默认不勾 = 行为同以前)。
 * 2026-08-28 换装批自 ResumeMatchModal.tsx 整体重写成小写件形制:内联样式逐格迁
 * resume.module.css、三屏拆成域内小件、状态收进 hooks 的 useResumeMatch、
 * 手柄与派生进 functions.ts、死值进 constants.ts、契约进 types.ts。
 * 桶门导出的名字与 props 不动(消费者是职位详情页投递栏的 Jd.tsx)。
 * 对应 lib 域:lib/resume。
 *
 * @author Frank
 * @time 2026-08-28 17:53:00
 */
import { Modal } from '@/components/modal'
import { ModalTitle } from '@/components/title'
import { MODAL_SIZE } from './constants'
import { MatchForm } from './matchform'
import { MatchLoginWall } from './matchloginwall'
import { MatchResult } from './matchresult'
import { useResumeMatch } from './hooks'
import type { ResumeMatchIn } from './types'

/**
 * 简历对照弹框。
 *
 * @param props 这个岗的 id 与 JD、登录态与关闭回调(逐格注释见 ResumeMatchIn)。
 * @returns 弹框。
 */
export function ResumeMatchModal({ jobId, jd, loggedIn, onClose }: ResumeMatchIn) {
  const panel = useResumeMatch({ jobId, jd, loggedIn })
  return (
    <Modal onClose={onClose} size={MODAL_SIZE} pad>
      <ModalTitle title={panel.t('rm.title')} />
      {loggedIn === false && <MatchLoginWall t={panel.t} />}
      {loggedIn && panel.res != null && <MatchResult t={panel.t} res={panel.res} />}
      {loggedIn && panel.res == null && (
        <MatchForm t={panel.t}
          resume={panel.resume}
          busy={panel.busy}
          reading={panel.reading}
          err={panel.err}
          archAt={panel.archAt}
          save={panel.save}
          fileRef={panel.fileRef}
          onResumeChange={panel.onResumeChange}
          onPickFile={panel.onPickFile}
          onUpload={panel.onUpload}
          onSaveToggle={panel.onSaveToggle}
          onRun={panel.onRun} />
      )}
    </Modal>
  )
}
