'use client'
/**
 * me 桶子桶 resume 的结构:预览框(Frank 10-06「不应该用 pdf.js 弹框预览吗」;11-07 照 Fluent / Azure 改:点表里的名称开它,
 * 行上的钮全挪进框里一排 —— 下载、设为默认(非默认才有)、替换文件、删除(先弹确认框);下面是 pdf 孙桶的预览区)。
 * 全站窗口形弹框(可拖可拉、记住尺寸;手机全屏)。Word 浏览器画不了,框里出一句改下载;报错行也在框里出一份
 * (替换失败时框还开着,卡上那行被挡住)。替换后按新的上传时刻换地址、整块重挂,重新画。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { Modal, ModalHead } from '@/components/modal'
import { PV_MODAL_H, PV_MODAL_PREF, PV_MODAL_W, TEXT_NONE } from './constants'
import { isPdf, previewSrcOf } from './functions'
import { ResumeViewer } from '@/components/pdf'
import { ResumePvActs } from './resumepvacts'
import type { ResumePreviewIn } from './types'
import css from './resume.module.css'

/**
 * 预览框。
 *
 * @param props 「我的简历」整机面板、开着的那一份与取词。
 * @returns 弹框。
 */
export function ResumePreview({ r, m, t }: ResumePreviewIn) {
  const head = <ModalHead kicker={t('rm.arch.title')} title={m.fileName} sub={TEXT_NONE} ctl={null} />
  const src = previewSrcOf(m)
  return (
    <Modal onClose={r.onPreviewClose} win={{ head, memo: PV_MODAL_PREF, w: PV_MODAL_W, h: PV_MODAL_H, jd: false }}>
      <div className={cssOf(css.pv)}>
        <ResumePvActs r={r} m={m} t={t} />
        {r.err !== TEXT_NONE && <div className={cssOf(css.err)}>{t(r.err)}</div>}
        {isPdf(m) && <ResumeViewer key={src} src={src} t={t} />}
        {isPdf(m) === false && <div className={cssOf(css.pvNone)}>{t('rf.pvFail')}</div>}
      </div>
    </Modal>
  )
}
