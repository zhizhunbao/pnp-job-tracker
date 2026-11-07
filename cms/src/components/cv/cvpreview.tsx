'use client'
/**
 * 预览(叠在生成简历窗口上的窗口形弹框):「简历预览」分区卡(右上「英文」胶囊)里一张纸面,
 * 底部「返回修改」「保存为简历」。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Button } from '@/components/button'
import { Modal, ModalHead } from '@/components/modal'
import { Tag } from '@/components/tag'
import { cvLayoutOf } from '@/lib/cv'
import {
  BTN_SECONDARY, CHARS_SEP, CV_PREVIEW_H, CV_PREVIEW_PREF, CV_PREVIEW_W, ERR_NONE, TAG_GRAY, TEXT_NONE,
} from './constants'
import { CvCard } from './cvcard'
import { CvPaper } from './cvpaper'
import type { CvPartIn } from './types'
import css from './cv.module.css'

/**
 * 预览窗口。
 *
 * @param props 整机面板。
 * @returns 窗口形弹框。
 */
export function CvPreview({ p }: CvPartIn) {
  const head = <ModalHead kicker={p.t('cv.title')} title={p.t('cv.preview')} sub={TEXT_NONE} ctl={null} />
  const tag = <Tag variant={TAG_GRAY}>{p.t('cv.en')}</Tag>
  return (
    <Modal
      onClose={p.onPreviewClose}
      win={{ head, memo: CV_PREVIEW_PREF, w: CV_PREVIEW_W, h: CV_PREVIEW_H, jd: false }}
    >
      <div className={css.stack}>
        <CvCard head={p.t('cv.pv')} acts={tag}>
          <div className={css.paperWrap}>
            <CvPaper layout={cvLayoutOf(p.draft)} />
          </div>
        </CvCard>
        {p.err !== ERR_NONE && <div className={css.err}>{p.t(p.err, { c: p.chars.join(CHARS_SEP) })}</div>}
      </div>
      <div className={css.foot}>
        <Button kind={BTN_SECONDARY} onClick={p.onPreviewClose}>{p.t('cv.back')}</Button>
        <Button onClick={p.onSave} busy={p.saving}>{p.t('cv.save')}</Button>
      </div>
    </Modal>
  )
}
