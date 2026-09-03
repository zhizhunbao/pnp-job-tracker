'use client'
/**
 * 雇主板(2026-08-16 Frank「这个雇主页面是不是应该参考 jobtables 页面整体创建。
 * 要加上筛选条件」)。站规 jobtable-is-the-standard:形态一律照职位板 —— 常用一行
 * (搜索/口径/省/制度)+「更多筛选」折叠、桌面表格 / ≤640 卡片流、翻页。
 * /employers/designated 与 /employers/hiring 两个入口合并成本组件一套版式,口径作筛选项。
 * 🔴 口径:被指定 ≠ 在招;在招数是本站职位库口径 —— 卡底那句口径注是保留类文案,不许删。
 * 整页外框(顶栏 / 页脚 / 灰底纵向列)2026-08-27 起归页面门去拼(shell 桶的 Frame),
 * 本件只是正文那一段。
 * 2026-08-27 换装批整体重写:状态进 hooks、筛选区与列表区各自成件、样式进 module.css。
 * 2026-09-03 Frank「所有主页面都不应该有返回按钮」:雇主板是顶栏一级页,H1 行尾的返回撤掉。
 * 同日「所有的 table 右上角都应该有一个更新时间」:标题行尾(返回钮腾出的那个位置)挂
 * Updated(time 桶);不挂筛选行是因为那一行尾已被名录抓取日占着(两个 margin-left:auto
 * 会把抓取日推到行中间),两条事实各说各的,谁也不动谁。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Shell } from '@/components/shell'
import { Updated } from '@/components/time'
import { SHELL_BOTTOM_PX, SHELL_TOP_PX } from './constants'
import { EmployerBoard } from './employerboard'
import { EmployerFilterBar } from './employerfilterbar'
import { titleTextOf } from './functions'
import { useEmployersPage } from './hooks'
import type { EmployersIn } from './types'
import css from './employers.module.css'

/**
 * 雇主板正文:标题行 + 一张白卡(筛选区 / 表与卡 / 口径注)。
 *
 * @param props SSR 首帧的第一页与初始筛选(见 EmployersIn 逐格注释)。
 * @returns 雇主板正文。
 */
export function Employers({ initial, initialFilters, updatedAt }: EmployersIn) {
  const p = useEmployersPage({ initial, initialFilters, updatedAt })
  return (
    <div className={css.body}>
      <Shell top={SHELL_TOP_PX} bottom={SHELL_BOTTOM_PX}>
        <div className={css.head}>
          <h1 className={css.h1}>{titleTextOf({ t: p.t, f: p.f })}</h1>
          <Updated iso={updatedAt} t={p.t} />
        </div>
        <div className={css.card}>
          <EmployerFilterBar p={p} />
          <EmployerBoard p={p} />
          <div className={css.foot}>{p.t('de.note')}</div>
        </div>
      </Shell>
    </div>
  )
}
