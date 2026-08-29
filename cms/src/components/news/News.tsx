'use client'
/**
 * news 域的结构:/news 移民动态列表整块视图(E12-06 v3 门户形态,Frank 2026-07-18
 * 拍板「1 上 2 用」)。
 * ① 主 banner = TOP5 重要新闻轮播(importance 驱动,5s 自动 + 圆点/箭头;摘要用中文
 *    速读,EN/KO 退英文摘要);
 * ② 二级信息(标题/口径/省 chips)下沉正文区,banner 只讲新闻本身;
 * ③ 博客式条目:图 + 标签 + 徽标 + 日期 + 标题 + 摘要 + 评论数 + 阅读全文。
 * 缩略图 og 图优先,缺图用省色块默认图(程序生成,一省一固定色,联邦 = IRCC 红)。
 * 正文轨 = Shell 1320(Frank 2026-07-18 宽度统一拍板),原 1100 单轨退役;
 * 页头 = Banner 图版(2026-07-31 banner 统一:上距全站 1rem、补 news 图组);
 * 二级导航 = 统一 SectionTabs(公告|时间线),右槽链接退役(2026-07-19 Frank 批提案)。
 * 2026-08-27 换装批自 News.tsx 整体重写成小写件形制:壳件(整页外框/顶栏/页脚)拼装
 * 归页面门(样张 account),本件只出 Shell 轨往下的视图;排版拆成小件、状态收进
 * hooks.ts、样式迁 news.module.css。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { BANNER_IMGS, Banner } from '@/components/banner'
import { IconNews } from '@/components/icons'
import { Shell } from '@/components/shell'
import { SectionTabs } from '@/components/tabs'
import { BANNER_MODULE, SHELL_TOP_LIST, TABS_TONE, TEXT_NONE, URL_NEWS, URL_TIMELINE } from './constants'
import { dayGroupsOf, presentRegionsOf, shownItemsOf } from './functions'
import { FeaturedGrid } from './featuredgrid'
import { useNewsFilter } from './hooks'
import { NewsChips } from './newschips'
import { NewsDayGroupRows } from './newsdaygrouprows'
import type { NewsIn } from './types'
import css from './news.module.css'

/**
 * 动态列表整块视图:页头 + 二级导航 + 筛选 → 头条网格(1 大 + 4 小)→ 按日分组的
 * 单列时间线。
 *
 * @param props 列表条目、头条与评论计数表(逐格注释见 NewsIn)。
 * @returns 正文(Shell 轨往下)。
 */
export function News({ items, hero, cmtCounts }: NewsIn) {
  const f = useNewsFilter()
  const shown = shownItemsOf({ items, hero, region: f.region })
  const groups = []
  for (const g of dayGroupsOf({ items: shown })) {
    groups.push(<NewsDayGroupRows key={g.day} t={f.t} lang={f.lang} group={g} cmtCounts={cmtCounts} />)
  }
  return (
    <Shell top={SHELL_TOP_LIST}>
      <Banner module={BANNER_MODULE} icon={<IconNews />} title={f.t('news.title')} images={BANNER_IMGS.news} />
      <SectionTabs tone={TABS_TONE}
        tabs={[
          { href: URL_NEWS, label: f.t('tl.tabNews'), active: true },
          { href: URL_TIMELINE, label: f.t('tl.title') },
        ]} />
      <NewsChips t={f.t}
        regions={presentRegionsOf({ items })}
        region={f.region}
        onAll={f.onAll}
        pickOf={f.pickOf} />
      {f.region === TEXT_NONE && <FeaturedGrid t={f.t} lang={f.lang} slides={hero} />}
      {shown.length === 0 && <div className={css.empty}>{f.t('news.empty')}</div>}
      {groups}
    </Shell>
  )
}
