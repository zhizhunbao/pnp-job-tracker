'use client'
/**
 * 基本信息卡「在招地」行(2026-09-19 Frank「省 市 去掉,改成 总部 和 在招地 两个」「别最多给 50 条啊」
 * 「你可以加一个 展开和收起的功能不就完事了」):这家公司在招岗的全部城市,岗多的在前;
 * 收着列前几座,后面一枚「展开其余 N 个 / 收起」钮(钮面与在招职位卡同一对词条)。
 *
 * @author Frank
 * @time 2026-09-19 21:30:00
 */
import { useState } from 'react'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Row } from '@/components/row'
import { HIRING_TOP_N, PLAIN_BTN_KIND } from './constants'
import { hiringNamesOf, jobsToggleLabelOf, makeToggle } from './functions'
import type { CompanyHiringRowIn } from './types'
import css from './companies.module.css'

/**
 * 「在招地」一行(可展开)。
 *
 * @param props 取词函数、界面语言与全部在招城市(逐格注释见 CompanyHiringRowIn)。
 * @returns 一行;没有带市的在招岗时不渲。
 */
export function CompanyHiringRow({ t, lang, places }: CompanyHiringRowIn) {
  const [all, setAll] = useState(false)
  if (places.length === 0) {
    return null
  }
  const parts = []
  for (const name of hiringNamesOf({ lang, places, all })) {
    if (parts.length > 0) {
      parts.push(t('sep'))
    }
    parts.push(<span key={name} className={css.hiringPlace}>{name}</span>)
  }
  return (
    <Row k={t('co.hiring')}>
      {parts}
      {places.length > HIRING_TOP_N && (
        <Button kind={PLAIN_BTN_KIND}
          onClick={makeToggle({ on: all, set: setAll })}
          className={cssOf(css.hiringBtn)}>
          {jobsToggleLabelOf({ t, all, hidden: places.length - HIRING_TOP_N })}
        </Button>
      )}
    </Row>
  )
}
