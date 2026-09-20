'use client'
/**
 * city 域的结构:最新职位表的职位格 —— 职位名是真链接(进职位详情页),下面灰字挂公司名。
 * 2026-09-20 站内链接批三:城市页此前零出站链接。
 *
 * @author Frank
 * @time 2026-09-20 16:00:00
 */
import { LinkButton } from '@/components/button'
import { TEXT_NONE, URL_JOB_HEAD } from './constants'
import type { CityJobIn } from './types'
import css from './city.module.css'

/**
 * 职位格。
 *
 * @param r 一行。
 * @returns 职位名链接 + 公司名灰注。
 */
export function JobLinkCell(r: CityJobIn) {
  return (
    <div>
      <LinkButton href={URL_JOB_HEAD + String(r.id)} className={css.rowLink}>{r.title}</LinkButton>
      {r.company !== TEXT_NONE && <div className={css.note}>{r.company}</div>}
    </div>
  )
}
