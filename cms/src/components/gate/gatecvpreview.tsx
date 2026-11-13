'use client'
/**
 * gate 域的结构:生成出来的简历的预览框(2026-11-12 Frank「最后用 sonnet 生成简历」;查看用弹框):全站窗口形弹框,
 * 正文是 pdf 桶那台画页的(铺满、连排、不翻页);底下一行「设为我的简历」「重新生成」「下载」,旁边灰字说明会替换已上传的那一份
 * (Frank 11-11 定每人只留一份:点了「设为我的简历」才替换,不点什么都不动)。
 *
 * @author Frank
 * @time 2026-11-12 18:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Modal, ModalHead } from '@/components/modal'
import { ResumeViewer } from '@/components/pdf'
import {
  FORM_PRIMARY_KIND, FORM_SECONDARY_KIND, K_CV_AGAIN, K_CV_DL, K_CV_PV_TITLE, K_CV_REPLACE, K_CV_SET, K_CV_TITLE,
  TEXT_NONE,
} from './constants'
import { CV_PV_H, CV_PV_PREF, CV_PV_W } from './cv'
import type { GateCvPreviewIn } from './types'
import css from './gate.module.css'

/**
 * 简历预览框。
 *
 * @param props 生成整机、生成出来的那一份与取词。
 * @returns 弹框。
 */
export function GateCvPreview({ c, doc, t }: GateCvPreviewIn) {
  const head = <ModalHead kicker={t(K_CV_TITLE)} title={t(K_CV_PV_TITLE)} sub={TEXT_NONE} ctl={null} />
  return (
    <Modal onClose={c.onDocClose} win={{ head, memo: CV_PV_PREF, w: CV_PV_W, h: CV_PV_H, jd: false }}>
      <div className={cssOf(css.cvPv)}>
        <div className={cssOf(css.cvPvView)}>
          <ResumeViewer key={doc.url} src={doc.url} t={t} />
        </div>
        <div className={cssOf(css.cvPvFoot)}>
          <Button kind={FORM_PRIMARY_KIND} onClick={c.onSet} busy={c.saving}>{t(K_CV_SET)}</Button>
          <Button kind={FORM_SECONDARY_KIND} onClick={c.onGen} busy={c.busy}>{t(K_CV_AGAIN)}</Button>
          <Button kind={FORM_SECONDARY_KIND} onClick={c.onDownload}>{t(K_CV_DL)}</Button>
          <span className={cssOf(css.fillHint)}>{t(K_CV_REPLACE)}</span>
        </div>
      </div>
    </Modal>
  )
}
