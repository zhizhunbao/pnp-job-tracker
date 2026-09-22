'use client'
/**
 * 基本信息卡「总部」行的值:库里有真总部(官网页面原句核对过的,官网没标的退 Wikidata)就成链,点开是出处那一页;
 * 退回 AI 简介的那一档与「—」只出字(值包一层 span:Row 通用件见「—」整行不出,这一行特意要出)。
 * 2026-09-20 真总部进库批自 companybasiccard.tsx 抽出成件。
 * 2026-09-21 Frank「这个点开应该是打开 google 地图吧」:有字就成链、点开是 Google 地图(去处由调用方 hqMapOf 算),
 * 上面「点开是出处那一页」「AI 简介那一档只出字」作废;「—」照旧只出字。
 * 同日 Frank「这两个现在显示格式不一样」(总部行没图标、官网链字号,地址行带地图图标、不断词):「总部」「地址」两行共用这一件
 * (CompanyHq 改名 CompanyPlace),一律地图图标 + 地址链字号(不在街号中间断行)。
 * 2026-09-22 Frank「总部是美国不需要显示吗」→「显,但注明是母公司」:总部是母公司的照显;同日再拍
 * 「这个还是不要显示母公司了」—— 行尾「母公司」灰注当天撤,值照显不带注(hq_parent 只留库里做来路记录)。
 *
 * @author Frank
 * @time 2026-09-20 02:00:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconMap } from '@/components/icons'
import { CLS_SEP, LINK_CLS, TARGET_BLANK, TEXT_NONE } from './constants'
import type { CompanyPlaceIn } from './types'
import css from './companies.module.css'

/**
 * 「总部」「地址」行的值。
 *
 * @param props 一行地点字与点开的去处(逐格注释见 CompanyPlaceIn)。
 * @returns 带地图图标的地图链接(新标签),或一段字。
 */
export function CompanyPlace({ text, href }: CompanyPlaceIn) {
  if (href === TEXT_NONE) {
    return <span>{text}</span>
  }
  return (
    <LinkButton href={href} target={TARGET_BLANK} className={cssOf(css.link12) + CLS_SEP + LINK_CLS}>
      <IconMap /> {text}
    </LinkButton>
  )
}
