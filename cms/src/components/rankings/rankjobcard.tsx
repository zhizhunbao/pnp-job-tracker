'use client'
/**
 * 职位榜的手机卡。2026-08-11(Frank「都改成一套」):榜单职位卡原本自己拼了一张
 * (Card + CardKV 的键值网格)—— 同一个岗在职位板和榜单上长两个样。改吃 card 域的
 * JobCard(全站唯一那张职位卡,2026-08-02 拍板)。
 * 槽位映射:#排名 → action(标题行右上),移民价值分 → footer(带标签,裸数字没上下文
 * = #200 教训)。各插槽的值在洗展示行时算好,缺席 = 那一格不渲。
 * 2026-08-28 换装批自 Ranking.tsx 的 RankJobCard 整体重写成小写件形制。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { JobCard } from '@/components/card'
import { toRankJobCard } from './functions'
import type { RankJobCardIn } from './types'
import css from './rankings.module.css'

/**
 * 职位榜手机卡。
 *
 * @param props 这一行的展示行。
 * @returns 一张职位卡。
 */
export function RankJobCard({ r }: RankJobCardIn) {
  const p = toRankJobCard(r)
  return (
    <JobCard title={p.title}
      action={<span className={css.cardAct}>{r.rankMark}</span>}
      company={p.company}
      salary={p.salary}
      location={p.location}
      date={p.date}
      footer={p.footer} />
  )
}
