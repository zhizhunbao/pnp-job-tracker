'use client'
/**
 * 职位页移民相关卡(2026-10-02 Frank 问 Google 收录 →「可以」做职位页直出本站移民信号;看效果图后定:
 * 「职业名还用重写一遍吗」→ 不出职业行;「通道需要隐藏起来吗」→ 直接列;「低位工资要显示吗」→ 有低位门槛才出;
 * 「应该是英文黑字,中文灰字吧」;「这两个应该可以点击弹框吧」「应该包含 EE PNP AIP 吧」;「缺灰字啊」)。
 * 薪资一行 + EE / PNP / AIP 三行,三行的值与可点判据照职位板这三列(immRowsOf),点开职位板同一个弹框
 * (省提名 = pnp 桶 PnpModal,EE / AIP = advisor 桶 AdvisorModal,同 BoardModals 的分流)。
 * 事实由页面门服务端取好递进来,卡直出进 HTML,爬虫看得到。一行都没有整卡不出。
 *
 * @author Frank
 * @time 2026-10-02 15:30:00
 */
import { AdvisorModal } from '@/components/advisor'
import { PnpModal } from '@/components/pnp'
import { makeT } from '@/lib/i18n'
import { CARD_HEAD_CLS, CARD_MD_CLS, COL } from './constants'
import { immGroupOf, immRowsOf } from './functions'
import { useImmPopup } from './hooks'
import { JobImmRow } from './jobimmrow'
import type { JobImmCardIn } from './types'

/**
 * 渲染移民相关卡。
 *
 * @param props 本岗、服务端事实、界面语言、分层态、本岗职业描述与点公司名的去处(逐格注释见 JobImmCardIn)。
 * @returns 一张白卡;一行都没有不渲。
 */
export function JobImmCard({ job, imm, lang, plan, nocDesc, onOpenCompany }: JobImmCardIn) {
  const t = makeT(lang)
  const rows = immRowsOf({ job, imm, lang, plan })
  const pop = useImmPopup()
  if (rows.length === 0) {
    return null
  }
  const list = []
  for (const r of rows) {
    list.push(<JobImmRow key={r.key} row={r} open={pop.open} />)
  }
  const group = immGroupOf(pop.col)
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t('imm.head')}</div>
      <div>{list}</div>
      {pop.col === COL.pnp && (
        <PnpModal job={job} lang={lang} title={job.title} field={pop.col} nocDesc={nocDesc} onClose={pop.close} />
      )}
      {group != null && pop.col != null && (
        <AdvisorModal group={group} field={pop.col}
          job={job}
          title={job.title}
          lang={lang}
          plan={plan}
          news={imm.dims.news}
          eeOcc={imm.dims.eeCategories}
          nocDesc={nocDesc}
          fieldSources={imm.dims.fieldSources}
          onOpenCompany={onOpenCompany}
          onClose={pop.close} />
      )}
    </div>
  )
}
