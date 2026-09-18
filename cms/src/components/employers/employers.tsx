'use client'
/**
 * 雇主板(2026-08-16 Frank「这个雇主页面是不是应该参考 jobtables 页面整体创建。
 * 要加上筛选条件」)。站规 jobtable-is-the-standard:形态一律照职位板 —— 常用一行
 * (搜索/行业/省/开关)、桌面表格 / ≤640 卡片流、翻页。
 * 2026-09-13 雇主板批二(设计稿 docs/design/雇主板重构-20260829.md + 校正记录):板改读雇主池,
 * /employers/designated 与 /employers/hiring 两个入口 301 合到 /employers 一块板;口径下拉退役,
 * 指定 / LMIA 变成带排序的列(Frank 09-12「用一张表就行了,只是多加一个 LMIA 的列,带排序」)。
 * 🔴 口径:星级是机会参考 ≠ 资格认定;被指定 ≠ 在招 —— 卡底那句口径注是保留类文案,不许删。
 * 整页外框(顶栏 / 页脚 / 灰底纵向列)2026-08-27 起归页面门去拼(shell 桶的 Frame),
 * 本件只是正文那一段。
 * 2026-08-27 换装批整体重写:状态进 hooks、筛选区与列表区各自成件、样式进 module.css。
 * 2026-09-03 Frank「所有主页面都不应该有返回按钮」:雇主板是顶栏一级页,H1 行尾的返回撤掉。
 * 同日「所有的 table 右上角都应该有一个更新时间」:标题行尾挂 Updated(time 桶)。
 * 2026-09-05 /fe banner(Frank「雇主页现在没有 banner」):H1 进 Banner 图版(雇主档三张)。
 * 2026-09-13 Frank「这种应该像 jobs 页面一样放到 banner」「只需要一个时间即可」:计数进 banner 副题(照职位板),
 * 更新时间挂筛选行尾(职位板同位),表上方计数行与「抓取」日撤。
 * 2026-09-13 晚 /fe 雇主页:查证态命中但全非指定时,口径注下再挂一行「不在官方指定雇主清单内」(searchNoteOf);
 * 未命中改说「本站未收录」,不再把本站没收说成官方没有。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Banner, BANNER_IMGS } from '@/components/banner'
import { IconUsers } from '@/components/icons'
import { Shell } from '@/components/shell'
import { BANNER_MODULE, SHELL_BOTTOM_PX, SHELL_TOP_PX, TEXT_NONE } from './constants'
import { CompanyModal } from '@/components/advisor'
import { EmployerBoard } from './employerboard'
import { EmployerFilterBar } from './employerfilterbar'
import { noteTextOf, searchNoteOf } from './functions'
import { useEmployersPage } from './hooks'
import type { EmployersIn } from './types'
import css from './employers.module.css'

/**
 * 雇主板正文:图版(副题 = 计数)+ 一张白卡(筛选区 / 表与卡 / 口径注)。
 *
 * @param props SSR 首帧的第一页与初始筛选(见 EmployersIn 逐格注释)。
 * @returns 雇主板正文。
 */
export function Employers({ initial, initialFilters, updatedAt }: EmployersIn) {
  const p = useEmployersPage({ initial, initialFilters, updatedAt })
  const hit = searchNoteOf({ t: p.t, f: p.f, rows: p.data.rows })
  return (
    <div className={css.body}>
      <Shell top={SHELL_TOP_PX} bottom={SHELL_BOTTOM_PX}>
        <Banner module={BANNER_MODULE}
          icon={<IconUsers />}
          title={p.t('de.title')}
          sub={noteTextOf({ t: p.t, f: p.f, total: p.data.total })}
          images={BANNER_IMGS.employers} />
        <div className={css.card}>
          <EmployerFilterBar p={p} />
          <EmployerBoard p={p} />
          <div className={css.foot}>{p.t('de.note')}</div>
          {hit !== TEXT_NONE && <div className={css.foot}>{hit}</div>}
        </div>
      </Shell>
      {p.modal != null && (
        <CompanyModal slug={p.modal.slug} name={p.modal.name} lang={p.lang} onClose={p.onCloseModal} />
      )}
    </div>
  )
}
