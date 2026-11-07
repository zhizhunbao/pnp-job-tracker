'use client'
/**
 * 填一条时的机构卡:机构名(教育经历必填),有地点的分区加城市、省份或国家。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Input } from '@/components/input'
import { CV_LINE_MAX } from '@/lib/cv'
import { INPUT_MD, KEY_CITY, KEY_ORG, KEY_REGION } from './constants'
import { CvCard } from './cvcard'
import { CvField } from './cvfield'
import type { CvDatesIn } from './types'
import css from './cv.module.css'

/**
 * 机构卡。
 *
 * @param props 整机面板、分区配置与正在填的一条。
 * @returns 卡。
 */
export function CvOrg({ p, conf, e }: CvDatesIn) {
  return (
    <CvCard head={p.t(conf.orgCard)} acts={null}>
      <div className={css.grid}>
        <CvField label={p.t(conf.org)} req={conf.orgReq}>
          <Input
            value={e.org}
            onChange={p.entryFieldOf(KEY_ORG)}
            maxLength={CV_LINE_MAX}
            size={INPUT_MD}
            ariaLabel={p.t(conf.org)}
          />
        </CvField>
        {conf.place && (
          <CvField label={p.t('cv.f.city')} req={false}>
            <Input
              value={e.city}
              onChange={p.entryFieldOf(KEY_CITY)}
              maxLength={CV_LINE_MAX}
              size={INPUT_MD}
              ariaLabel={p.t('cv.f.city')}
            />
          </CvField>
        )}
        {conf.place && (
          <CvField label={p.t('cv.f.region')} req={false}>
            <Input
              value={e.region}
              onChange={p.entryFieldOf(KEY_REGION)}
              maxLength={CV_LINE_MAX}
              size={INPUT_MD}
              ariaLabel={p.t('cv.f.region')}
            />
          </CvField>
        )}
      </div>
    </CvCard>
  )
}
