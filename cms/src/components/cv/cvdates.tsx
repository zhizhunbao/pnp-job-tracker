'use client'
/**
 * 填一条时的日期卡:起止(开始年、开始月、结束年、结束月,勾了「至今」就不出结束两格)或一个时间(年、月)。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import {
  DATE_KEYS, DATES_ONE, INPUT_CHECKBOX, INPUT_MD, KEY_FROM_M, KEY_FROM_Y, KEY_TO_M, KEY_TO_Y, MONTH_OPTS, YEAR_LEN,
} from './constants'
import { CvCard } from './cvcard'
import { CvField } from './cvfield'
import { makeMonthLabel } from './functions'
import type { CvDatesIn } from './types'
import css from './cv.module.css'

/**
 * 日期卡。
 *
 * @param props 整机面板、分区配置与正在填的一条。
 * @returns 卡。
 */
export function CvDates({ p, conf, e }: CvDatesIn) {
  const monthLabel = makeMonthLabel(p.t)
  const k = DATE_KEYS[conf.dates]
  const range = conf.dates !== DATES_ONE
  return (
    <CvCard head={p.t(k.card)} acts={null}>
      <div className={css.grid}>
        <CvField label={p.t(k.y)} req={false}>
          <Input
            value={e.fromY}
            onChange={p.entryFieldOf(KEY_FROM_Y)}
            maxLength={YEAR_LEN}
            size={INPUT_MD}
            ariaLabel={p.t(k.y)}
          />
        </CvField>
        <CvField label={p.t(k.m)} req={false}>
          <Select
            value={e.fromM}
            onChange={p.entryFieldOf(KEY_FROM_M)}
            opts={MONTH_OPTS}
            all={p.t('cv.f.month')}
            labelOf={monthLabel}
            size={INPUT_MD}
          />
        </CvField>
        {range && e.now === false && (
          <CvField label={p.t('cv.f.toY')} req={false}>
            <Input
              value={e.toY}
              onChange={p.entryFieldOf(KEY_TO_Y)}
              maxLength={YEAR_LEN}
              size={INPUT_MD}
              ariaLabel={p.t('cv.f.toY')}
            />
          </CvField>
        )}
        {range && e.now === false && (
          <CvField label={p.t('cv.f.toM')} req={false}>
            <Select
              value={e.toM}
              onChange={p.entryFieldOf(KEY_TO_M)}
              opts={MONTH_OPTS}
              all={p.t('cv.f.month')}
              labelOf={monthLabel}
              size={INPUT_MD}
            />
          </CvField>
        )}
      </div>
      {conf.now && (
        <label className={css.check}>
          <input type={INPUT_CHECKBOX} checked={e.now} onChange={p.onEntryNow} />
          <span>{p.t('cv.f.now')}</span>
        </label>
      )}
    </CvCard>
  )
}
