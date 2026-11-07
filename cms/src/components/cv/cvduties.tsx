'use client'
/**
 * 「导入职责」那块(照 Job Bank Resume Builder 的 Import job duties):输入职位名找职业(官方职业名或示例职位名),
 * 搜到的职业一排胶囊点选,选中那个的职业码灰胶囊,下面官方职责一条一个勾选框;「导入 N 条」接到描述后面,用户再自己改。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Button } from '@/components/button'
import { Chip } from '@/components/chip'
import { Input } from '@/components/input'
import { Tag } from '@/components/tag'
import { BTN_SECONDARY, DUTY_Q_MIN, INPUT_CHECKBOX, INPUT_MD, ROLE_GROUP, TAG_GRAY } from './constants'
import { CvField } from './cvfield'
import type { CvDutiesIn } from './types'
import css from './cv.module.css'

/**
 * 导入职责那块。
 *
 * @param props 整机面板。
 * @returns 那块。
 */
export function CvDuties({ p }: CvDutiesIn) {
  const d = p.duty
  const hit = d.hits[d.pick]
  const enough = d.q.trim().length >= DUTY_Q_MIN
  const chips = []
  for (const [i, h] of d.hits.entries()) {
    chips.push(<Chip key={h.noc} active={i === d.pick} onClick={p.dutyPickOf(i)}>{h.title}</Chip>)
  }
  const boxes = []
  if (hit != null) {
    for (const [i, duty] of hit.duties.entries()) {
      boxes.push(
        <label key={i} className={css.check}>
          <input type={INPUT_CHECKBOX} checked={d.checked.includes(i)} onChange={p.dutyCheckOf(i)} />
          <span>{duty}</span>
        </label>,
      )
    }
  }
  return (
    <div className={css.dutyBox}>
      <CvField label={p.t('cv.duty.find')} req={false}>
        <Input
          value={d.q}
          onChange={p.onDutyQ}
          placeholder={p.t('cv.duty.ph')}
          size={INPUT_MD}
          ariaLabel={p.t('cv.duty.find')}
        />
      </CvField>
      {enough && d.done !== d.q && <div className={css.note}>{p.t('cv.duty.loading')}</div>}
      {enough && d.done === d.q && d.hits.length === 0 && <div className={css.note}>{p.t('cv.duty.none')}</div>}
      {chips.length > 0 && <div className={css.chips}>{chips}</div>}
      {hit != null && (
        <div className={css.nocLine}>
          <Tag variant={TAG_GRAY}>{p.t('cv.duty.noc', { c: hit.noc })}</Tag>
        </div>
      )}
      {boxes.length > 0 && <div role={ROLE_GROUP} aria-label={p.t('cv.duty.find')}>{boxes}</div>}
      <div className={css.dutyActs}>
        <Button sm onClick={p.onDutyImport} disabled={d.checked.length === 0}>
          {p.t('cv.duty.import', { n: d.checked.length })}
        </Button>
        <Button kind={BTN_SECONDARY} sm onClick={p.onDutyToggle}>{p.t('cv.duty.close')}</Button>
      </div>
    </div>
  )
}
