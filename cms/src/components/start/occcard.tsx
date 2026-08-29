'use client'
/**
 * 域内小件:职业榜的手机卡 —— 左列身份(职业名 / 可提名省份)、右列数字(新发环比),
 * 与职位板同一张 JobCard。
 * 薪资偏离只留桌面表:375 上两个百分数并排谁是谁得猜 —— 宁可少一个数,不给会读错的数。
 * 胶囊排(Frank 2026-08-08「手机端改成胶囊」「teer 也需要」):NOC / TEER 中性灰,
 * 别抢通道档的色;雷区榜通道档胶囊同日撤(全员同值),死路省改红胶囊「NB 无通道」;
 * 紧缺榜的胶囊 =「MB 紧缺」+「联邦紧缺」(与桌面「紧缺」列同源);
 * 有通道省两行删(常量),紧缺省文字行也删(信息已在胶囊里)。
 * 2026-08-28 换装批自 Pulse.tsx 的 JobCard 调用重写成本件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { JobCard } from '@/components/card'
import { TEXT_NONE } from './constants'
import { HotCell } from './hotcell'
import { PnpCell } from './pnpcell'
import type { OccCardIn } from './types'
import css from './start.module.css'

/**
 * 渲染职业榜的一张手机卡。
 *
 * @param props 这一行的展示行与两个胶囊开关。
 * @returns 职位卡。
 */
export function OccCard({ row, showProvs, deadCol }: OccCardIn) {
  let note
  if (row.note !== TEXT_NONE) {
    note = row.note
  }
  let company
  if (row.openLabel !== TEXT_NONE) {
    company = { text: row.openLabel }
  }
  let salary = null
  if (row.momText !== TEXT_NONE) {
    salary = <span className={row.momCls}>{row.momText}</span>
  }
  let location = null
  if (deadCol === false && showProvs === false && row.pnpText !== TEXT_NONE) {
    location = <span className={css.cardLoc}>{PnpCell(row)}</span>
  }
  return (
    <JobCard href={row.href}
      title={{ text: row.main, href: row.href }}
      note={note}
      company={company}
      salary={salary}
      location={location}
      chips={<>
        <span className={css.chipGray}>{row.nocChip}</span>
        {row.teerChip !== TEXT_NONE && <span className={css.chipGray}>{row.teerChip}</span>}
        {deadCol === false && showProvs && HotCell(row)}
        {deadCol && row.deadText !== TEXT_NONE && <span className={css.chipDanger}>{row.deadText}</span>}
        {showProvs === false && row.rateChip !== TEXT_NONE && <span className={css.chipGray}>{row.rateChip}</span>}
      </>} />
  )
}
