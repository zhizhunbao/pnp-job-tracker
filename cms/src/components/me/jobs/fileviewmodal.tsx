'use client'
/**
 * me 桶子桶 jobs 的结构:查看附件弹框(我的投递「简历」「求职信」两格点「查看」开它)。
 * 2026-11-11 Frank「要包含我投递出去的简历 和 介绍信 列,用户可以随时查看」:形照「我的简历」的预览框
 * (子桶 resume 的 ResumePreview)—— 全站窗口形弹框(可拖可拉、记住尺寸;手机全屏),正文是 pdf 桶的预览区;
 * 不是 PDF(Word 原件)浏览器画不了,出一句改下载。只看不改,没有操作排。
 *
 * @author Frank
 * @time 2026-11-11 15:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Modal, ModalHead } from '@/components/modal'
import { ResumeViewer } from '@/components/pdf'
import { FILE_KIND, FV_MODAL_H, FV_MODAL_PREF, FV_MODAL_W, TEXT_NONE } from './constants'
import type { FileViewModalIn } from './types'
import css from './jobs.module.css'

/**
 * 查看附件弹框。
 *
 * @param props 取词函数、开着的那一份与关框。
 * @returns 弹框。
 */
export function FileViewModal({ t, file, onClose }: FileViewModalIn) {
  const head = <ModalHead kicker={file.kicker} title={file.title} sub={TEXT_NONE} ctl={null} />
  return (
    <Modal onClose={onClose} win={{ head, memo: FV_MODAL_PREF, w: FV_MODAL_W, h: FV_MODAL_H, jd: false }}>
      <div className={cssOf(css.fv)}>
        {file.pdf && <ResumeViewer key={file.src} src={file.src} t={t} />}
        {file.pdf === false && <div className={cssOf(css.note)}>{t('rf.pvFail')}</div>}
        {file.pdf === false && <div><Button kind={FILE_KIND} sm href={file.src}>{t('rf.download')}</Button></div>}
      </div>
    </Modal>
  )
}
