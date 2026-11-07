'use client'
/**
 * 填个人简介或技能(叠在生成简历窗口上的窗口形弹框):一个多行框,占位提示照 Job Bank 的写法建议
 * (简介 3 到 5 句、技能 5 到 7 条一行一条);底部「取消」「保存」。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Button } from '@/components/button'
import { Modal, ModalHead } from '@/components/modal'
import { Tag } from '@/components/tag'
import { CV_TEXT_MAX } from '@/lib/cv'
import { BTN_SECONDARY, CV_FORM_H, CV_FORM_PREF, CV_FORM_W, TAG_GRAY, TEXT_CONF, TEXT_NONE } from './constants'
import { CvCard } from './cvcard'
import { leftOf } from './functions'
import type { CvPartIn } from './types'
import css from './cv.module.css'

/**
 * 填段落的窗口。
 *
 * @param props 整机面板(段落表单开着时才挂)。
 * @returns 窗口形弹框;没开给空。
 */
export function CvTextForm({ p }: CvPartIn) {
  const x = p.text
  if (x == null) {
    return null
  }
  const k = TEXT_CONF[x.key]
  const name = p.t(k.head)
  const head = <ModalHead kicker={p.t('cv.title')} title={name} sub={TEXT_NONE} ctl={null} />
  const left = <Tag variant={TAG_GRAY}>{p.t('cv.left', { n: leftOf(x.v) })}</Tag>
  return (
    <Modal onClose={p.onFormClose} win={{ head, memo: CV_FORM_PREF, w: CV_FORM_W, h: CV_FORM_H, jd: false }}>
      <CvCard head={name} acts={left}>
        <textarea
          className={css.area}
          value={x.v}
          onChange={p.onTextArea}
          maxLength={CV_TEXT_MAX}
          aria-label={name}
          placeholder={p.t(k.ph)}
        />
      </CvCard>
      <div className={css.foot}>
        <Button kind={BTN_SECONDARY} onClick={p.onFormClose}>{p.t('cv.cancel')}</Button>
        <Button onClick={p.onTextSave}>{p.t('cv.ok')}</Button>
      </div>
    </Modal>
  )
}
