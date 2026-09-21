'use client'
/**
 * 基本信息卡「总部」行的值:库里有真总部(官网页面原句核对过的,官网没标的退 Wikidata)就成链,点开是出处那一页;
 * 退回 AI 简介的那一档与「—」只出字(值包一层 span:Row 通用件见「—」整行不出,这一行特意要出)。
 * 2026-09-20 真总部进库批自 companybasiccard.tsx 抽出成件。
 * 2026-09-21 Frank「这个点开应该是打开 google 地图吧」:有字就成链、点开是 Google 地图(去处由调用方 hqMapOf 算),
 * 上面「点开是出处那一页」「AI 简介那一档只出字」作废;「—」照旧只出字。
 *
 * @author Frank
 * @time 2026-09-20 02:00:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { CLS_SEP, LINK_CLS, TARGET_BLANK, TEXT_NONE } from './constants'
import type { CompanyHqIn } from './types'
import css from './companies.module.css'

/**
 * 「总部」行的值。
 *
 * @param props 总部一行字与点开的去处(逐格注释见 CompanyHqIn)。
 * @returns 地图链接(新标签),或一段字。
 */
export function CompanyHq({ text, href }: CompanyHqIn) {
  if (href === TEXT_NONE) {
    return <span>{text}</span>
  }
  return (
    <LinkButton href={href} target={TARGET_BLANK} className={cssOf(css.siteLink) + CLS_SEP + LINK_CLS}>
      {text}
    </LinkButton>
  )
}
