'use client'
/**
 * 域内视图:城市详情页(2026-09-12 批三首件,Frank「不用出效果图 你觉得应该出什么」拍板方向:
 * 对比表管筛出候选,详情页管在候选里下结论)。骨架照职位详情页规:Shell 套壳 + 右上返回 +
 * H1 双行城市名 + 白卡三块 —— 概览(在招/薪/人口/失业率/专属通道)、行业分布(组 × 在招/时薪/年薪)、
 * DLI 院校名单;标题行右侧看岗位钮落职位板按城市筛。查无城走 Notice 不 404(收录 URL 保留可访问)。
 * 2026-10-09 N 批(Frank「名字一律英文在上、译名灰字在下」「省市 分开」「城市 和 省份 点击 跳 google 地图」):
 * H1 照公司页形 —— 英文城市名在上、界面语译名灰字在下(英文界面只出一行;H1 不可点);原灰注里拼着的省码拆出来,
 * 省份另起概览第一行,走 name 桶 ProvName(英文省名在上、界面语省名灰字在下,点了新标签开 Google 地图)。
 *
 * @author Frank
 * @time 2026-09-12 02:40:00
 */
import { BackButton, LinkButton } from '@/components/button'
import { useLang } from '@/components/i18n'
import { ProvName } from '@/components/name'
import { Notice } from '@/components/notice'
import { Shell } from '@/components/shell'
import { Table } from '@/components/table'
import { Updated } from '@/components/time'
import { DLI_PAGE_SIZE, SHELL_TOP, TEXT_NONE, URL_BACK } from './constants'
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
          {title.note !== TEXT_NONE && <div className={css.note}>{title.note}</div>}
        </div>
        <LinkButton href={cityJobsHrefOf(city.city)} className={css.jobsBtn}>{t('pulse.act.jobs')}</LinkButton>
      </div>
      <div className={css.card}>
        <div className={css.secHead}>
          <h2 className={css.secTitle}>{t('city.facts')}</h2>
          <Updated iso={updatedAt} t={t} />
        </div>
        <div className={css.facts}>
          <div className={css.factRow}>
            <span className={css.factLabel}>{t('col.province')}</span>
            <span className={css.factValue}><ProvName code={city.province} /></span>
          </div>
          {factItems}
        </div>
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
