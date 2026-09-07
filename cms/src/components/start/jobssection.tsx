'use client'
/**
 * 域内小件:省份段末尾的「招聘对比」横表 —— Job Bank 日更的招聘量按省横比
 * (Frank 2026-09-06「招聘的数量没法按年份,可以按省份对比」;「紧缺清单岗不需要这一列」)。
 * 桌面可排序表,手机一省一卡;数据来自挂载后拉的 /api/stats/market(省 × 大类汇总行)。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { Table } from '@/components/table'
import { ID_PROV_JOBS, PH_PROV } from './constants'
import { boardGapClsOf, jobsColsOf, jobsRowKeyOf } from './functions'
import { JobsCard } from './jobscard'
import { Placeholder } from './placeholder'
import { Sec } from './sec'
import type { JobsRow, JobsSectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染招聘对比。
 *
 * @param props 取词函数、加载态、行与块间距开关(更新时间只在段标题出一枚)。
 * @returns 带锚点的块;数据到了而一行都没有时给 null。
 */
export function JobsSection({ t, loading, rows, gap }: JobsSectionIn) {
  if (loading === false && rows.length === 0) {
    return null
  }
  const cards = []
  for (const r of rows) {
    cards.push(<JobsCard key={r.key} row={r} t={t} />)
  }
  return (
    <div id={ID_PROV_JOBS} className={css.subAnchor}>
      <div className={boardGapClsOf({ gap })}>
      <Sec title={t('pulse.s4j')} sub>
        {loading && <Placeholder size={PH_PROV} />}
        {rows.length > 0 && (
          <div className={css.table}>
            <Table<JobsRow> rows={rows} cols={jobsColsOf({ t })} rowKey={jobsRowKeyOf} />
          </div>
        )}
        {rows.length > 0 && (
          <div className={css.cards}>
            <div className={css.provCards}>{cards}</div>
          </div>
        )}
      </Sec>
      </div>
    </div>
  )
}
