'use client'
/**
 * start 域的结构:E13-03 把脉首页整块视图(路由仍是 /start —— URL 是 SEO 资产,
 * 不随组件改名动)——「开始规划 + 榜单 + 地区统计」三合一。
 * 规格 = docs/implementation/E13-把脉首页/00_总设计与口径.md §4 的 S1-S7,一区一事、
 * 全宽色带交替:S1 判决区(动态冷脸标题 + 三脉象卡)/ S2 劝退榜 / S3 真香榜 /
 * S4 省份照妖镜 / S5 抽选尺子(抽选表 + 冷解读 + 政策动态)/ S6 职位板入口 / S7 订阅与分享。
 * 信条:**「难听,但没骗你」—— 调性激进,数据保守,每个数字可溯源**。
 * 三条硬红线,改这一域前先读:
 *   ① 判决语一律「模板 + 库内数字填槽」(三语进 lib/i18n),LLM 不参与下结论;
 *   ② E13-02 的派生列(mom14d/avgDaysOpen/pulseScore)**可能还没落库** —— 值为 null 时
 *      该卡 / 该行 / 该榜**整块不渲染**,绝不显示 0 或 NaN,页面退化成「现有数据撑得住的版本」;
 *      变化量口径按契约 v3 一律用**近 14 天新发环比 mom14d**:30 天窗卡在抓取爬坡期(假涨)、
 *      下架 / 净流失卡在排水期(虚高),两者的数字与措辞都不上前端(同入 E13-04);
 *   ③ 每行可溯源:职业名点开落到按该 NOC 筛过的职位板,省卡下钻落 /stats/[prov]。
 * SSR 瘦身手法守住:职业大表(occ ~3400 行)不进 HTML,挂载后拉 /api/stats/market
 * (与旧版同一端点);橱窗三分表同理走 /api/employers/sponsors。
 * 2026-08-28 换装批自 Pulse.tsx 整体重写成小写件形制:排版拆成 30 件、状态收进 hooks.ts、
 * 内联 <style> 与 93 处内联样式迁 start.module.css、取数与派生下沉 functions.ts;
 * 同批壳件上交页面门(Frank「组装只许在 (frontend) 页面门里」,样张 companies)——
 * 整页外框走 shell 桶的 Frame,顶栏与页脚由 page.tsx 直接拼,本件只出导航条与正文。
 * 2026-09-03 Frank「所有的 table 和可以更新数据的地方,右上角都应该有一个更新时间」:
 * 门里早就取好的 ETL 心跳(stats.checkedAt)此前一处没消费,现分发给四个有表的分区
 * (担保雇主 / 职业榜 / 分省概览 / 抽选尺子),各区标题行右槽一枚。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { BoardsSection } from './boardssection'
import { CtaBand } from './ctaband'
import { DrawsSection } from './drawssection'
import { Hero } from './hero'
import { ProvOccSection } from './provoccsection'
import { ProvSection } from './provsection'
import { PulseNav } from './pulsenav'
import { SponsorSection } from './sponsorsection'
import { usePulse } from './hooks'
import type { PulseIn } from './types'
import css from './start.module.css'

/**
 * 把脉首页正文。
 *
 * @param props 页面门取好的那份 SSR 数据(逐格注释见 HomeStats)。
 * @returns 二级导航条 + 七个分区。
 */
export function Pulse({ stats }: PulseIn) {
  const v = usePulse({ stats })
  return (
    <>
      <PulseNav t={v.t} navSec={v.navSec} />
      <main className={css.main}>
        <Hero t={v.t} cards={v.numCards} />
        <SponsorSection t={v.t}
          lang={v.lang}
          updatedAt={stats.checkedAt}
          sponsor={v.sponsor}
          occOpts={stats.occOpts}
          catMids={stats.catMids}
          nocCat={v.nocCat} />
        <BoardsSection t={v.t} lang={v.lang} updatedAt={stats.checkedAt} boards={v.boards} nocProvs={v.nocProvs} />
        <ProvSection t={v.t}
          lang={v.lang}
          updatedAt={stats.checkedAt}
          loading={v.market == null}
          rows={v.provRows}
          provExtra={stats.provExtra}
          prov={v.prov}
          provPickOf={v.provPickOf} />
        <ProvOccSection t={v.t}
          lang={v.lang}
          prov={v.prov}
          onProvSelect={v.onProvSelect}
          provPickOf={v.provPickOf}
          provStat={v.provStat}
          provOcc={v.provOcc}
          nocProvs={v.nocProvs}
          market={v.market} />
        <DrawsSection t={v.t}
          tEn={v.tEn}
          lang={v.lang}
          updatedAt={stats.checkedAt}
          draws={stats.draws}
          news={stats.news}
          drawsN={v.drawsN}
          onDrawsN={v.onDrawsN}
          newsN={v.newsN}
          onNewsN={v.onNewsN} />
        <CtaBand t={v.t} />
      </main>
    </>
  )
}
