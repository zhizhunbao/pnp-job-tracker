'use client'
/**
 * 生成简历窗口的正文:九张分区卡(次序照 Job Bank 传统模板:联系方式、个人简介、工作经历、教育经历、技能、
 * 证书执照、志愿经历、奖项荣誉、自定义分区),错误行,底部「预览」「保存为简历」。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Button } from '@/components/button'
import {
  BTN_SECONDARY, CHARS_SEP, CV_LIST, ERR_NONE, KEY_SKILLS, KEY_SUMMARY, SEC_SKILLS, SEC_SUMMARY,
} from './constants'
import { CvContactCard } from './cvcontactcard'
import { CvListCard } from './cvlistcard'
import { CvTextCard } from './cvtextcard'
import type { CvPartIn } from './types'
import css from './cv.module.css'

/**
 * 窗口正文。
 *
 * @param props 整机面板。
 * @returns 分区卡、错误行与底部钮。
 */
export function CvBody({ p }: CvPartIn) {
  return (
    <>
      <div className={css.stack}>
        <CvContactCard p={p} />
        <CvTextCard p={p} k={KEY_SUMMARY} head={SEC_SUMMARY} />
        <CvListCard p={p} conf={CV_LIST.work} />
        <CvListCard p={p} conf={CV_LIST.edu} />
        <CvTextCard p={p} k={KEY_SKILLS} head={SEC_SKILLS} />
        <CvListCard p={p} conf={CV_LIST.creds} />
        <CvListCard p={p} conf={CV_LIST.volunteer} />
        <CvListCard p={p} conf={CV_LIST.awards} />
        <CvListCard p={p} conf={CV_LIST.extra} />
        {p.err !== ERR_NONE && <div className={css.err}>{p.t(p.err, { c: p.chars.join(CHARS_SEP) })}</div>}
      </div>
      <div className={css.foot}>
        <Button kind={BTN_SECONDARY} onClick={p.onImport} busy={p.importing}>{p.t('cv.import')}</Button>
        <Button kind={BTN_SECONDARY} onClick={p.onPreview}>{p.t('cv.preview')}</Button>
        <Button onClick={p.onSave} busy={p.saving}>{p.t('cv.save')}</Button>
      </div>
    </>
  )
}
