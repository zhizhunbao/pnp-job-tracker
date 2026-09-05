'use client'
/**
 * 榜单表:更新时间 + 口径注 + 按口径分叉的那一块列表(壳与标题由宿主渲)。
 * 🔴 RankingTable = 内容单一来源(E8-02):页面版与 /jobs 榜单弹窗共用,不许 fork。
 * 榜单只有两种口径 —— 公司榜(sponsor-likely)与职位榜(其余全部),两块各自成件,
 * 卡形、列组、排序键都不共用(它们本来就是两种东西)。
 * #198(Frank「删掉」周榜口径注):口径注为空则整行不渲(空键 = 已删)。
 * 2026-08-28 换装批自 Ranking.tsx 的 RankingTable 整体重写成小写件形制。
 * 2026-09-03 Frank「所有的 table 右上角都应该有一个更新时间」:榜头那一行自算的
 * updatedTextOf 换成 time 桶的 Updated(全站唯一形),值 = 页面门 SSR 取的 ETL 心跳。
 * 2026-09-05 Frank 拍板 banner 文字统一:横幅数字胶囊撤编,本榜岗位数落到 Updated 左侧同一行。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { Updated } from '@/components/time'
import { TEXT_NONE } from './constants'
import { isCompanyBoard, noteTextOf } from './functions'
import { RankCompanyBoard } from './rankcompanyboard'
import { RankJobBoard } from './rankjobboard'
import type { RankingTableIn } from './types'
import css from './rankings.module.css'

/**
 * 榜单表。
 *
 * @param props 榜 slug、本榜的行、更新时刻与取词函数。
 * @returns 更新时间、口径注与列表区。
 */
export function RankingTable({ slug, items, updatedAt, t }: RankingTableIn) {
  const note = noteTextOf({ t, slug })
  const company = isCompanyBoard(slug)
  return (
    <>
      <div className={css.top}>
        <span className={css.count}>{t('rank.bnRows', { n: items.length })}</span>
        <Updated iso={updatedAt} t={t} />
      </div>
      {note !== TEXT_NONE && <div className={css.note}>{note}</div>}
      {company && <RankCompanyBoard items={items} t={t} />}
      {company === false && <RankJobBoard items={items} t={t} />}
    </>
  )
}
