'use client'
/**
 * 生成简历(2026-11-07 Frank「直接加生成简历的功能啊」「可以，开写」;设计稿 docs/design/我的/我的简历-20261007.md 1.4~1.6 / 2.4~2.6):
 * 窗口形弹框(通用 modal 桶,手机全屏),内容与分区照 Job Bank Resume Builder,界面全用站内通用桶。
 * 上面再叠的四种:填一条、改联系方式、填简介 / 技能、预览;删除先弹确认框。存成简历 = 服务端排英文 PDF 存进「我的简历」。
 * 「我的简历」页与投递第 1 步两处挂。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Loading } from '@/components/loading'
import { ConfirmModal, Modal, ModalHead } from '@/components/modal'
import { CV_MODAL_H, CV_MODAL_PREF, CV_MODAL_W, TEXT_NONE } from './constants'
import { CvBody } from './cvbody'
import { CvContactForm } from './cvcontactform'
import { CvForm } from './cvform'
import { CvPreview } from './cvpreview'
import { CvTextForm } from './cvtextform'
import { useCvBuilder } from './hooks'
import type { CvBuilderIn } from './types'

/**
 * 生成简历窗口。
 *
 * @param props 关窗口与存成了的回调。
 * @returns 窗口与叠在上面的几层。
 */
export function CvBuilder({ onClose, onSaved }: CvBuilderIn) {
  const p = useCvBuilder({ onClose, onSaved })
  const head = <ModalHead kicker={p.t('cv.kicker')} title={p.t('cv.title')} sub={TEXT_NONE} ctl={null} />
  return (
    <>
      <Modal onClose={p.onClose} win={{ head, memo: CV_MODAL_PREF, w: CV_MODAL_W, h: CV_MODAL_H, jd: false }}>
        {p.loaded === false && <Loading text={p.t('rf.loading')} />}
        {p.loaded && <CvBody p={p} />}
      </Modal>
      {p.entry != null && <CvForm p={p} edit={p.entry} />}
      <CvContactForm p={p} />
      <CvTextForm p={p} />
      {p.preview && <CvPreview p={p} />}
      {p.ask != null && (
        <ConfirmModal title={p.t('rf.delAsk')} body={TEXT_NONE} okText={p.t('cv.del')} cancelText={p.t('cv.cancel')}
          onOk={p.onDelOk} onCancel={p.onDelCancel} />
      )}
    </>
  )
}
