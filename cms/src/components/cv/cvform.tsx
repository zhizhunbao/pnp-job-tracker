'use client'
/**
 * 添加 / 修改一条(叠在生成简历窗口上的窗口形弹框;字段照 Job Bank 各分区的表单):
 * 名称卡(工作经历多一个「导入职责」)、机构与地点卡、日期卡、描述卡(右上「还能写 N 字」),底部「取消」「保存」。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Modal, ModalHead } from '@/components/modal'
import { Tag } from '@/components/tag'
import { CV_LINE_MAX, CV_TEXT_MAX } from '@/lib/cv'
import {
  BTN_SECONDARY, CV_FORM_H, CV_FORM_PREF, CV_FORM_W, CV_LIST, DATES_NONE, ERR_NONE, INPUT_MD, KEY_TITLE, NEW_INDEX,
  TAG_GRAY, TEXT_NONE,
} from './constants'
import { CvCard } from './cvcard'
import { CvDates } from './cvdates'
import { CvDuties } from './cvduties'
import { CvField } from './cvfield'
import { CvOrg } from './cvorg'
import { formTitleOf, leftOf } from './functions'
import type { CvFormIn } from './types'
import css from './cv.module.css'

/**
 * 填一条的窗口。
 *
 * @param props 整机面板与正在填的一条。
 * @returns 窗口形弹框。
 */
export function CvForm({ p, edit }: CvFormIn) {
  const conf = CV_LIST[edit.list]
  const e = edit.v
  const title = formTitleOf({ t: p.t, isNew: edit.index === NEW_INDEX, s: p.t(conf.card) })
  const head = <ModalHead kicker={p.t('cv.title')} title={title} sub={TEXT_NONE} ctl={null} />
  const left = <Tag variant={TAG_GRAY}>{p.t('cv.left', { n: leftOf(e.desc) })}</Tag>
  return (
    <Modal onClose={p.onFormClose} win={{ head, memo: CV_FORM_PREF, w: CV_FORM_W, h: CV_FORM_H, jd: false }}>
      <div className={css.stack}>
        <CvCard head={p.t(conf.whatCard)} acts={null}>
          <CvField label={p.t(conf.title)} req>
            <div className={css.inline}>
              <Input
                value={e.title}
                onChange={p.entryFieldOf(KEY_TITLE)}
                maxLength={CV_LINE_MAX}
                size={INPUT_MD}
                ariaLabel={p.t(conf.title)}
              />
              {conf.duties && <Button kind={BTN_SECONDARY} sm onClick={p.onDutyToggle}>{p.t('cv.duty.open')}</Button>}
            </div>
          </CvField>
          {conf.duties && p.duty.open && <CvDuties p={p} />}
        </CvCard>
        {conf.org !== TEXT_NONE && <CvOrg p={p} conf={conf} e={e} />}
        {conf.dates !== DATES_NONE && <CvDates p={p} conf={conf} e={e} />}
        <CvCard head={p.t(conf.desc)} acts={left}>
          <textarea
            className={css.area}
            value={e.desc}
            onChange={p.onDescArea}
            maxLength={CV_TEXT_MAX}
            aria-label={p.t(conf.desc)}
          />
        </CvCard>
        {p.formErr !== ERR_NONE && <div className={css.err}>{p.t(p.formErr)}</div>}
      </div>
      <div className={css.foot}>
        <Button kind={BTN_SECONDARY} onClick={p.onFormClose}>{p.t('cv.cancel')}</Button>
        <Button onClick={p.onEntrySave}>{p.t('cv.ok')}</Button>
      </div>
    </Modal>
  )
}
