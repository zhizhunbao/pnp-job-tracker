'use client'
/**
 * city 域的结构:主要雇主表的雇主格 —— 雇主名是真链接(进公司页)。
 * 2026-09-20 站内链接批三:城市页此前零出站链接。
 *
 * @author Frank
 * @time 2026-09-20 16:00:00
 */
import { LinkButton } from '@/components/button'
import { URL_COMPANY_HEAD } from './constants'
import type { CityEmployerIn } from './types'
import css from './city.module.css'

/**
 * 雇主格。
 *
 * @param r 一行。
 * @returns 雇主名链接。
 */
export function EmpLinkCell(r: CityEmployerIn) {
  return <LinkButton href={URL_COMPANY_HEAD + r.slug} className={css.rowLink}>{r.name}</LinkButton>
}
