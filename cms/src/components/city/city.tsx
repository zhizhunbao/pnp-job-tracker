'use client'
/**
 * 域内视图:城市详情页(2026-09-12 批三首件,Frank「不用出效果图 你觉得应该出什么」拍板方向:
 * 对比表管筛出候选,详情页管在候选里下结论)。骨架照职位详情页规:Shell 套壳 + 右上返回 +
 * H1 双行城市名 + 白卡三块 —— 概览(在招/薪/人口/失业率/专属通道)、行业分布(组 × 在招/时薪/年薪)、
 * DLI 院校名单;标题行右侧看岗位钮落职位板按城市筛。查无城走 Notice 不 404(收录 URL 保留可访问)。
 *
 * @author Frank
 * @time 2026-09-12 02:40:00
 */
import { BackButton, LinkButton } from '@/components/button'
import { useLang } from '@/components/i18n'
import { Notice } from '@/components/notice'
import { Shell } from '@/components/shell'
import { Table } from '@/components/table'
import { Updated } from '@/components/time'
import { DLI_PAGE_SIZE, SHELL_TOP, URL_BACK } from './constants'
import {
  cityJobsHrefOf, cityTitleOf, factRowsOf, groupColsOf, groupRowKeyOf, groupRowsOf, schoolColsOf, schoolRowKeyOf,
  schoolRowsOf,
} from './functions'
import type { CityIn, GroupRow, SchoolRow } from './types'
import css from './city.module.css'

/**
 * 渲染城市详情页正文。
 *
 * @param props 城市基面、DLI 名单、试点通道、查无城标记与更新时刻。
 * @returns 整页正文。
 */
export function City({ city, schools, pilotTypes, missing, updatedAt }: CityIn) {
  const [lang, , t] = useLang()
  const title = cityTitleOf({ city, lang })
  if (missing) {
    return (
      <Shell top={SHELL_TOP} back={<BackButton fallback={URL_BACK} label={t('detail.back')} />}>
        <h1 className={css.title}>{title.main}</h1>
        <Notice>{t('city.none')}</Notice>
      </Shell>
    )
  }
  const facts = factRowsOf({ t, city, pilotTypes })
  const groups = groupRowsOf({ t, groups: city.groups })
  const schoolRows = schoolRowsOf({ t, schools, lang })
  const factItems = []
  for (const f of facts) {
    factItems.push(
      <div key={f.key} className={css.factRow}>
        <span className={css.factLabel}>{f.label}</span>
        <span className={css.factValue}>{f.value}</span>
      </div>,
    )
  }
  return (
    <Shell top={SHELL_TOP} back={<BackButton fallback={URL_BACK} label={t('detail.back')} />}>
      <div className={css.head}>
        <div>
          <h1 className={css.title}>{title.main}</h1>
          <div className={css.note}>{title.note}</div>
        </div>
        <LinkButton href={cityJobsHrefOf(city.city)} className={css.jobsBtn}>{t('pulse.act.jobs')}</LinkButton>
      </div>
      <div className={css.card}>
        <div className={css.secHead}>
          <h2 className={css.secTitle}>{t('city.facts')}</h2>
          <Updated iso={updatedAt} t={t} />
        </div>
        <div className={css.facts}>{factItems}</div>
      </div>
      {groups.length > 0 && (
        <div className={css.card}>
          <div className={css.secHead}>
            <h2 className={css.secTitle}>{t('city.byInd')}</h2>
            <Updated iso={updatedAt} t={t} />
          </div>
          <Table<GroupRow> rows={groups} cols={groupColsOf({ t })} rowKey={groupRowKeyOf} />
        </div>
      )}
      {schoolRows.length > 0 && (
        <div className={css.card}>
          <div className={css.secHead}>
            <h2 className={css.secTitle}>{t('pulse.city.dliN')}</h2>
            <Updated iso={updatedAt} t={t} />
          </div>
          <Table<SchoolRow> rows={schoolRows}
            cols={schoolColsOf({ t })}
            rowKey={schoolRowKeyOf}
            pageSize={DLI_PAGE_SIZE} />
        </div>
      )}
    </Shell>
  )
}
