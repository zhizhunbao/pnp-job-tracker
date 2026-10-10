'use client'
/**
 * 职位榜的手机卡。2026-08-11(Frank「都改成一套」):榜单职位卡原本自己拼了一张
 * (Card + CardKV 的键值网格)—— 同一个岗在职位板和榜单上长两个样。改吃 card 域的
 * JobCard(全站唯一那张职位卡,2026-08-02 拍板)。
 * 槽位映射:#排名 → action(标题行右上),移民价值分 → footer(带标签,裸数字没上下文
 * = #200 教训)。各插槽的值在洗展示行时算好,缺席 = 那一格不渲。
 * 2026-08-28 换装批自 Ranking.tsx 的 RankJobCard 整体重写成小写件形制。
 * 2026-10-09 N 批(Frank「职位名、公司名、地点同形,省市分开」「城市 和 省份 点击 跳 google 地图」):
 * 地点行由「市, 省」一格拆成两个名字件(name 桶 CityName / ProvName,英文在上、界面语译名灰字在下,点了新标签开地图);
 * 职位名照旧直链官方原帖(榜单行没有职位号,开不了职位框;外站链接照旧新开标签页)。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { JobCard } from '@/components/card'
import { CityName, ProvName } from '@/components/name'
import { TEXT_NONE } from './constants'
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
  let location = null
  if (r.city !== TEXT_NONE || r.province !== TEXT_NONE) {
    location = (
      <span className={css.cardWhere}>
        {r.city !== TEXT_NONE && <CityName city={r.city} province={r.province} zh={TEXT_NONE} ko={TEXT_NONE} />}
        {r.province !== TEXT_NONE && <ProvName code={r.province} />}
      </span>
    )
  }
  return (
    <JobCard title={p.title}
      action={<span className={css.cardAct}>{r.rankMark}</span>}
      company={p.company}
      salary={p.salary}
      location={location}
      date={p.date}
      footer={p.footer} />
  )
}
