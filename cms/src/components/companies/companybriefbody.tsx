'use client'
/**
 * K 调查简介的内容体:存量散文(整段没有节标记)整段渲一块,五节格式逐节渲 ——
 * 缺项不占卡(宁可留空,不拿空标题充数)。#199:DB 有精确地址时「所在地」节让位。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的 bodyNode 闭包重写成件。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanyBriefSec } from './companybriefsec'
import { CompanyZhLine } from './companyzhline'
import { CLS_SEP, CO_SEC_BASE, CO_SEC_HAS_RE, CO_SEC_MARKS, TEXT_NONE } from './constants'
import { briefSecsOf, hasSecOf, secBodyClsOf, secKeyOf, secTextOf, secZhOf } from './functions'
import type { CompanyBriefBodyIn } from './types'
import css from './companies.module.css'
import { cssOf } from '@/components/css'

/**
 * 简介内容体。
 *
 * @param props 正文、译文、取词函数、扁平态与让位开关(逐格注释见 CompanyBriefBodyIn)。
 * @returns 内容体(散文一块,或逐节)。
 */
export function CompanyBriefBody({ brief, trans, t, flat, skipBase }: CompanyBriefBodyIn) {
  if (CO_SEC_HAS_RE.test(brief) === false) {
    let zh = TEXT_NONE
    if (trans != null && trans.trim() !== brief.trim()) {
      zh = trans.trim()
    }
    return (
      <div className={secBodyClsOf({ flat }) + CLS_SEP + cssOf(css.desc)}>
        {brief}
        {zh !== TEXT_NONE && <CompanyZhLine text={zh} prose />}
      </div>
    )
  }
  const secs = briefSecsOf({ text: brief })
  let tSecs: Record<string, string> = {}
  if (trans != null) {
    tSecs = briefSecsOf({ text: trans })
  }
  const rows = []
  for (const mark of CO_SEC_MARKS) {
    const text = secTextOf({ secs, mark })
    const skipped = skipBase && mark === CO_SEC_BASE
    if (hasSecOf({ secs, mark }) && skipped === false) {
      rows.push(
        <CompanyBriefSec key={mark}
          labelKey={secKeyOf({ mark })}
          text={text}
          zh={secZhOf({ tSecs, mark, en: text })}
          t={t}
          flat={flat} />,
      )
    }
  }
  return <>{rows}</>
}
