'use client'
/**
 * rankings 域的结构:/rankings/[slug] 榜单页正文(E5-02)。
 * 纯渲染 —— 计算在 ETL(etl/10_build_rankings.py),这一层一个数都不算;
 * 三语壳;岗位行链官方原帖,公司行链官网。
 * 页头 = Banner(#65 五模块统一浅色带,榜单 = 金),下面接榜单导航,再下面是榜单表。
 * 整页外框(灰底纵向三段列)、顶栏与页脚 2026-08-27 起归页面门去拼(shell 桶的 Frame,
 * Frank「组装只许在 (frontend) 页面门里」,样张 companies),本件只出 Shell 轨往下的视图。
 * 语言/文案全站一处(LangProvider),初值由服务端 cookie 定,所以正文自己接 useLang。
 * 2026-08-28 换装批自 Ranking.tsx 整体重写成小写件形制(内联样式逐格迁
 * rankings.module.css、派生与洗行进 functions.ts、死值进 constants.ts、契约进 types.ts)。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { BANNER_IMGS, Banner } from '@/components/banner'
import { IconChart } from '@/components/icons'
import { useLang } from '@/components/i18n'
import { Shell } from '@/components/shell'
import { BANNER_MODULE, SHELL_TOP } from './constants'
import { boardsOf, rankTitleOf, toRankTabRows } from './functions'
import { RankingTable } from './rankingtable'
import { RankTabs } from './ranktabs'
import type { RankingIn } from './types'

/**
 * 榜单页正文。
 *
 * @param props 榜 slug、本榜的行、当天有数据的榜与更新时刻(逐格注释见 RankingIn)。
 * @returns 正文(Shell 轨 + 页头 + 导航 + 榜单表)。
 */
export function Ranking({ slug, items, slugs = [], updatedAt }: RankingIn) {
  const [, , t] = useLang()
  const boards = boardsOf({ slug, slugs })
  return (
    <Shell top={SHELL_TOP}>
      <Banner module={BANNER_MODULE}
        icon={<IconChart />}
        title={rankTitleOf({ t, slug })}
        images={BANNER_IMGS.rank}
        sub={t('rank.bnSub')} />
      <RankTabs rows={toRankTabRows({ boards, slug, t })} />
      <RankingTable slug={slug} items={items} updatedAt={updatedAt} t={t} />
    </Shell>
  )
}
