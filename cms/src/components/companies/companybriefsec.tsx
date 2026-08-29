'use client'
/**
 * K 调查简介的一节(小标题 + 正文 + 中文对照)。#158 起家的三节([WHAT]/[BASE]/[SIZE])
 * 后来长到五节;2026-07-21 Frank「公司弹框参考类别重新设计」:嵌套小盒退役 →
 * 每节一块带题(与分类弹框同规范),信息出处 URL 列表同日撤(「去掉 source 链接」)。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的 CO_SECS 循环体重写成件。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanyZhLine } from './companyzhline'
import { TEXT_NONE } from './constants'
import { secBodyClsOf, secClsOf, secHeadClsOf } from './functions'
import type { CompanyBriefSecIn } from './types'

/**
 * 简介的一节。
 *
 * @param props 小标题键、正文、译文、取词函数与扁平态(逐格注释见 CompanyBriefSecIn)。
 * @returns 一节。
 */
export function CompanyBriefSec({ labelKey, text, zh, t, flat }: CompanyBriefSecIn) {
  return (
    <div className={secClsOf({ flat })}>
      <div className={secHeadClsOf({ flat })}>{t(labelKey)}</div>
      <div className={secBodyClsOf({ flat })}>
        {text}
        {zh !== TEXT_NONE && <CompanyZhLine text={zh} />}
      </div>
    </div>
  )
}
