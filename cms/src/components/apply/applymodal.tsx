'use client'
/**
 * 投递框(2026-10-09 A 批投递搬进弹框,docs/design/我的/我的求职-20261009.md 故事 1、4):
 * 通用 modal 桶的窗口形 —— 标题栏可拖、拉边改大小、尺寸与职位 / 公司 / 省提名弹框共用一份记忆;手机全屏。
 * 标题栏灰色小标「投递」+ 岗名;正文是原「我的求职」上方那一块投递区,四步原样搬进来。
 * 同日 Frank「这个地方英文,中文灰字 没有啊」:岗名下面出界面语译名行(英文界面不出)。
 * 2026-11-10 Frank「选择屏用小窗口」:只有三屏对照用记忆尺寸的大窗;选择屏、基础简历屏、上传简历、已投递与各种一行提示
 * 都用小窗(宽 APPLY_FIT_W、高随内容、居中,不读不写尺寸记忆)。两种窗是同一个 Modal(同一位置),切屏时框不重挂。
 *
 * @author Frank
 * @time 2026-10-09 01:40:00
 */
import { Modal, ModalHead } from '@/components/modal'
import { ApplySection } from './applysection'
import { APPLY_FIT_W, APPLY_MODAL_H, APPLY_MODAL_PREF_V2, APPLY_MODAL_W, KICKER_KEY } from './constants'
import { modalTitleOf } from './functions'
import { useApplyScreen } from './hooks'
import type { ApplyModalIn } from './types'

/**
 * 投递框。2026-11-09:取数挪到外壳之前的 ApplyGate(先查额度再定开什么),本件只收取好的面板。
 *
 * @param props 取数面板、是不是直接落在基础简历投递屏与关框。
 * @returns 窗口形弹框。
 */
export function ApplyModal({ s, base, onClose }: ApplyModalIn) {
  const head = (
    <ModalHead kicker={s.t(KICKER_KEY)} title={modalTitleOf(s.start)} sub={s.titleSub} ctl={null} />
  )
  const sc = useApplyScreen({ start: s.start, base })
  if (sc.small) {
    return (
      <Modal onClose={onClose}
        win={{ head, memo: APPLY_MODAL_PREF_V2, w: APPLY_MODAL_W, h: APPLY_MODAL_H, jd: false, fitW: APPLY_FIT_W }}>
        <ApplySection s={s} base={base} onBig={sc.onBig} />
      </Modal>
    )
  }
  return (
    <Modal onClose={onClose}
      win={{ head, memo: APPLY_MODAL_PREF_V2, w: APPLY_MODAL_W, h: APPLY_MODAL_H, jd: false }}>
      <ApplySection s={s} base={base} onBig={sc.onBig} />
    </Modal>
  )
}
