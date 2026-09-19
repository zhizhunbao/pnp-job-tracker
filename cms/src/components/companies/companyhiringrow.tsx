'use client'
/**
 * 基本信息卡「在招地」行(2026-09-19 Frank「省 市 去掉,改成 总部 和 在招地 两个」「别最多给 50 条啊」
 * 「你可以加一个 展开和收起的功能不就完事了」):这家公司在招岗的全部城市,岗多的在前;
 * 收着列前几座,后面一枚「展开其余 N 个 / 收起」钮(钮面与在招职位卡同一对词条)。
 * 同日「城市都用 英文名」「都在 安省没必要每个都列一个 ON」:市名一律英文;同省的城归一组、一组一行,
 * 省名在组头只出一次(灰字)。一座城一个不折行的小块,分隔记号夹在小块之间 —— 窄屏只在城与城之间换行
 * (375px 实拍「汉 / 密尔顿」从中间折断;分隔记号包进小块则英文整行顶出屏幕)。
 *
 * @author Frank
 * @time 2026-09-19 21:30:00
 */
import { useState } from 'react'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Row } from '@/components/row'
import { HIRING_TOP_N, PLAIN_BTN_KIND, TEXT_NONE } from './constants'
import { hiringGroupsOf, jobsToggleLabelOf, makeToggle } from './functions'
import type { CompanyHiringRowIn } from './types'
import css from './companies.module.css'

/**
 * 「在招地」一行(可展开)。
 *
 * @param props 取词函数与全部在招城市(逐格注释见 CompanyHiringRowIn)。
 * @returns 一行;没有带市的在招岗时不渲。
 */
export function CompanyHiringRow({ t, places }: CompanyHiringRowIn) {
  const [all, setAll] = useState(false)
  if (places.length === 0) {
    return null
  }
  const groups = hiringGroupsOf({ t, places, all })
  const lines = []
  for (const g of groups) {
    const parts = []
    for (const name of g.names) {
      if (parts.length > 0) {
        parts.push(t('sep'))
      }
      parts.push(<span key={name} className={css.hiringPlace}>{name}</span>)
    }
    lines.push(
      <div key={g.prov}>
        {g.prov !== TEXT_NONE && <span className={css.hiringProv}>{g.prov}</span>}
        {parts}
        {lines.length === groups.length - 1 && places.length > HIRING_TOP_N && (
          <Button kind={PLAIN_BTN_KIND}
            onClick={makeToggle({ on: all, set: setAll })}
            className={cssOf(css.hiringBtn)}>
            {jobsToggleLabelOf({ t, all, hidden: places.length - HIRING_TOP_N })}
          </Button>
        )}
      </div>,
    )
  }
  return <Row k={t('co.hiring')}>{lines}</Row>
}
