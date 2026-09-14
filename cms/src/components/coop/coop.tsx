'use client'
/**
 * 校内板正文(2026-09-13 Frank「在一级 title 上加呢」「那就不需要分 tab 了」「照着 jobs 的 table 来做,只是不需要那么多列」):
 * 图版(H1「校内板」+ 副题 = 学校 + 系统 + 在招数,照职位板)+ 一张白卡(右上 Updated + 桌面表格 / ≤640 卡片流)。
 * 表走通用表格件,七列(发布时间 / 职位 / 雇主 / 省 / 市 / 类型 / 操作;板上不给发布日,日期列是本站首次收录日),手机藏三列;卡形照雇主板的 JobCard。
 * 帖在 jobs 表里 status=campus(第三态),只有本页读它;点职位落职位详情页。
 * 整页外框(顶栏 / 页脚)归页面门去拼(shell 桶的 Frame),本件只是正文那一段。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */
import { Banner, BANNER_IMGS } from '@/components/banner'
import { IconTable } from '@/components/icons'
import { Shell } from '@/components/shell'
import { Table } from '@/components/table'
import { Updated } from '@/components/time'
import { BANNER_MODULE, PAGE_SIZE, SHELL_BOTTOM_PX, SHELL_TOP_PX } from './constants'
import { CoopCards } from './coopcards'
import { coopColsOf, coopRowKeyOf } from './functions'
import { useCoop } from './hooks'
import type { CoopCellRow, CoopIn } from './types'
import css from './coop.module.css'

/**
 * 校内板正文。
 *
 * @param props SSR 行与更新时刻(见 CoopIn 逐格注释)。
 * @returns 图版 + 白卡。
 */
export function Coop({ rows, updatedAt }: CoopIn) {
  const p = useCoop({ rows, updatedAt })
  return (
    <div className={css.body}>
      <Shell top={SHELL_TOP_PX} bottom={SHELL_BOTTOM_PX}>
        <Banner module={BANNER_MODULE}
          icon={<IconTable />}
          title={p.t('coop.title')}
          sub={p.sub}
          images={BANNER_IMGS.jobs} />
        <div className={css.card}>
          <div className={css.head}>
            <Updated iso={p.updatedAt} t={p.t} />
          </div>
          <div className={css.table}>
            <Table<CoopCellRow> rows={p.rows}
              cols={coopColsOf({ t: p.t })}
              rowKey={coopRowKeyOf}
              empty={p.empty}
              pageSize={PAGE_SIZE}
              bare />
          </div>
          <div className={css.cards}>
            <CoopCards rows={p.rows} empty={p.empty} />
          </div>
        </div>
      </Shell>
    </div>
  )
}
