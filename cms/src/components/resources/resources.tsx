'use client'
/**
 * resources 域的结构:/resources 官方资源导航整块视图(E4-05)——
 * hao123 式导航:顶部搜索框 + 每条一卡的密集网格,按分类分区。
 * curated 常量(非 ETL);红线=宁缺毋滥,失效宁可不列。链接=可点卡片(整卡跳官方页)。
 * 语言/文案全站一处(LangProvider),初值由服务端 cookie 定,所以正文自己接状态机器。
 * 2026-08-28 换装批自 Resources.tsx 整体重写成小写件形制:内联样式逐格迁
 * resources.module.css、状态收进 hooks.ts、派生与手柄进 functions.ts、散值进 constants.ts;
 * 壳件(整页外框 / 顶栏 / 页脚)拼装归页面门(样张 companies),本件只出 Shell 轨往下的视图。
 *
 * @author Frank
 * @time 2026-08-28 12:39:03
 */
import { BANNER_IMGS, Banner } from '@/components/banner'
import { IconMap } from '@/components/icons'
import { Search } from '@/components/search'
import { Shell } from '@/components/shell'
import { SectionTabs } from '@/components/tabs'
import { BANNER_MODULE, LIB_URL_CASES, LIB_URL_OCC, LIB_URL_RESOURCES, SHELL_TOP } from './constants'
import { useResources } from './hooks'
import { ResCategory } from './rescategory'
import css from './resources.module.css'

/**
 * 官方资源导航整块视图:页头 → 搜索框 → 按分类分区的密集网格。
 *
 * @returns 正文(Shell 轨往下)。
 */
export function Resources() {
  const { t, lang, query, groups, onQueryChange } = useResources()
  const sections = []
  for (const group of groups) {
    sections.push(<ResCategory key={group.cat} t={t} lang={lang} group={group} />)
  }
  return (
    <Shell top={SHELL_TOP}>
      <Banner module={BANNER_MODULE}
        icon={<IconMap />}
        title={t('res.title')}
        sub={t('res.sub')}
        images={BANNER_IMGS.library} />
      <SectionTabs tabs={[
        { href: LIB_URL_OCC, label: t('dir.occ.title'), active: false },
        { href: LIB_URL_RESOURCES, label: t('res.entry'), active: true },
        { href: LIB_URL_CASES, label: t('dp.cases'), active: false },
      ]} />
      <div className={css.searchRow}>
        <Search value={query} onChange={onQueryChange} placeholder={t('res.search')} />
      </div>
      {groups.length === 0 && <p className={css.empty}>{t('res.empty')}</p>}
      {sections}
    </Shell>
  )
}
