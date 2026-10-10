'use client'
/**
 * 投递框(2026-10-09 A 批投递搬进弹框,docs/design/投递向导-照Azure-20261008.md 故事 1、4):
 * 通用 modal 桶的窗口形 —— 标题栏可拖、拉边改大小、尺寸与职位 / 公司 / 省提名弹框共用一份记忆;手机全屏。
 * 标题栏灰色小标「投递」+ 岗名;正文是原「我的求职」上方那一块投递区,四步原样搬进来。
 * 同日 Frank「这个地方英文,中文灰字 没有啊」:岗名下面出界面语译名行(英文界面不出)。
 *
 * @author Frank
 * @time 2026-10-09 01:40:00
 */
import { Modal, ModalHead } from '@/components/modal'
import { ApplySection } from './applysection'
import { APPLY_MODAL_H, APPLY_MODAL_PREF, APPLY_MODAL_W, KICKER_KEY } from './constants'
import { modalTitleOf } from './functions'
import { useApplyStart } from './hooks'
import type { ApplyModalIn } from './types'

/**
 * 投递框。
 *
 * @param props 要投的职位 id 与关框。
 * @returns 窗口形弹框。
 */
export function ApplyModal({ jobId, onClose }: ApplyModalIn) {
  const s = useApplyStart(jobId)
  const head = (
    <ModalHead kicker={s.t(KICKER_KEY)} title={modalTitleOf(s.start)} sub={s.titleSub} ctl={null} />
  )
  return (
    <Modal onClose={onClose}
      win={{ head, memo: APPLY_MODAL_PREF, w: APPLY_MODAL_W, h: APPLY_MODAL_H, jd: false }}>
      <ApplySection s={s} />
    </Modal>
  )
}
