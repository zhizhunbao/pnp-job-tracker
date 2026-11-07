'use client'
/**
 * 改联系方式(叠在生成简历窗口上的窗口形弹框):英文姓名(必填)、邮箱、电话、城市、省份或国家;底部「取消」「保存」。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Modal, ModalHead } from '@/components/modal'
import { CV_LINE_MAX } from '@/lib/cv'
import {
  BTN_SECONDARY, CV_FORM_H, CV_FORM_PREF, CV_FORM_W, ERR_NONE, INPUT_MD, KEY_CITY, KEY_EMAIL, KEY_NAME, KEY_PHONE,
  KEY_REGION, TEXT_NONE,
} from './constants'
import { CvCard } from './cvcard'
import { CvField } from './cvfield'
import type { CvPartIn } from './types'
import css from './cv.module.css'

/**
 * 改联系方式的窗口。
 *
 * @param props 整机面板(联系方式表单开着时才挂)。
 * @returns 窗口形弹框;没开给空。
 */
export function CvContactForm({ p }: CvPartIn) {
  const c = p.contact
  if (c == null) {
    return null
  }
  const head = <ModalHead kicker={p.t('cv.title')} title={p.t('cv.form.contact')} sub={TEXT_NONE} ctl={null} />
  return (
    <Modal onClose={p.onFormClose} win={{ head, memo: CV_FORM_PREF, w: CV_FORM_W, h: CV_FORM_H, jd: false }}>
      <div className={css.stack}>
        <CvCard head={p.t('cv.sec.contact')} acts={null}>
          <div className={css.grid}>
            <CvField label={p.t('cv.f.name')} req>
              <Input
                value={c.name}
                onChange={p.contactFieldOf(KEY_NAME)}
                maxLength={CV_LINE_MAX}
                size={INPUT_MD}
                ariaLabel={p.t('cv.f.name')}
              />
            </CvField>
            <CvField label={p.t('cv.f.email')} req={false}>
              <Input
                value={c.email}
                onChange={p.contactFieldOf(KEY_EMAIL)}
                maxLength={CV_LINE_MAX}
                size={INPUT_MD}
                ariaLabel={p.t('cv.f.email')}
              />
            </CvField>
            <CvField label={p.t('cv.f.phone')} req={false}>
              <Input
                value={c.phone}
                onChange={p.contactFieldOf(KEY_PHONE)}
                maxLength={CV_LINE_MAX}
                size={INPUT_MD}
                ariaLabel={p.t('cv.f.phone')}
              />
            </CvField>
            <CvField label={p.t('cv.f.city')} req={false}>
              <Input
                value={c.city}
                onChange={p.contactFieldOf(KEY_CITY)}
                maxLength={CV_LINE_MAX}
                size={INPUT_MD}
                ariaLabel={p.t('cv.f.city')}
              />
            </CvField>
            <CvField label={p.t('cv.f.region')} req={false}>
              <Input
                value={c.region}
                onChange={p.contactFieldOf(KEY_REGION)}
                maxLength={CV_LINE_MAX}
                size={INPUT_MD}
                ariaLabel={p.t('cv.f.region')}
              />
            </CvField>
          </div>
        </CvCard>
        {p.formErr !== ERR_NONE && <div className={css.err}>{p.t(p.formErr)}</div>}
      </div>
      <div className={css.foot}>
        <Button kind={BTN_SECONDARY} onClick={p.onFormClose}>{p.t('cv.cancel')}</Button>
        <Button onClick={p.onContactSave}>{p.t('cv.ok')}</Button>
      </div>
    </Modal>
  )
}
