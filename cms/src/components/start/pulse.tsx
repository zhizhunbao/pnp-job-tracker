'use client'
/**
 * start 域的结构:E13-03 把脉首页整块视图(路由仍是 /start —— URL 是 SEO 资产,
 * 不随组件改名动)。
 * 2026-09-04 重构(/fe 评估,设计稿 docs/design/把脉页重构-20260904.md):近 30 天剔掉 Frank 设备后
 * 只有十几次浏览零交互,20 屏长页先刷三张雇主表才到职业榜。Frank 拍板**按类型分段,段内按行业出表,
 * 不让用户筛**:首屏(轮播 + 四卡)→ 职业(全职业两榜 + 行业各一表)→ 雇主(在招且带担保信号,行业各一表)
 * → LMIA(技能类获批,行业各一表)→ 省份(分省概览 + 省内职业榜)→ 城市 → 趋势(全国一条线 + 行业小图)
 * → 近期抽选表(Frank 走查要求保留)→ 一行政策动态链接 → 职位板入口。每张表全量,每页 10 行分页(Frank 同日撤 Top N)。
 * 撤掉:四榜、雇主表的筛选下拉与「问 AI 顾问」钮、抽选表与政策动态段、把脉页上的分布探索图。
 * 信条不变:**「难听,但没骗你」—— 数据保守,每个数字可溯源**;
 * 判决语一律「模板 + 库内数字填槽」,LLM 不参与下结论;派生列为 null 时该卡 / 该行整块不渲,绝不显示 0。
 * SSR 瘦身手法守住:职业大表(occ ~3400 行)不进 HTML,挂载后拉 /api/stats/market;
 * 担保雇主全量同理走 /api/employers/sponsors。
 * 2026-08-28 换装批自 Pulse.tsx 整体重写成小写件形制;壳件(Frame / 顶栏 / 页脚)由页面门拼装。
 * 2026-09-03 Frank「所有的 table 和可以更新数据的地方,右上角都应该有一个更新时间」:
 * ETL 心跳(stats.checkedAt)分发给每个有表的分区,各区标题行右槽一枚。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { BoardsSection } from './boardssection'
import { CitySection } from './citysection'
import { CtaBand } from './ctaband'
import { DrawsLink } from './drawslink'
import { DrawsSection } from './drawssection'
import { EmpSection } from './empsection'
import { Hero } from './hero'
import { ProvOccSection } from './provoccsection'
import { ProvSection } from './provsection'
import { PulseNav } from './pulsenav'
import { TrendSection } from './trendsection'
import { usePulse } from './hooks'
import type { PulseIn } from './types'
import css from './start.module.css'

/**
 * 把脉首页正文。
 *
 * @param props 页面门取好的那份 SSR 数据(逐格注释见 HomeStats)。
 * @returns 二级导航条 + 八个分区。
 */
export function Pulse({ stats }: PulseIn) {
  const v = usePulse({ stats })
  return (
    <>
      <PulseNav t={v.t} navSec={v.navSec} />
      <main className={css.main}>
        <Hero t={v.t} cards={v.numCards} />
        <BoardsSection t={v.t} lang={v.lang} updatedAt={stats.checkedAt} secs={v.occSecs} nocProvs={v.nocProvs} />
        <EmpSection t={v.t}
          updatedAt={stats.checkedAt}
          secs={v.empSecs}
          pilotSecs={v.pilotSecs}
          kind={v.empKind}
          kindPickOf={v.kindPickOf} />
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
          updatedAt={stats.checkedAt} />
        <CitySection t={v.t} lang={v.lang} updatedAt={stats.checkedAt} rows={v.cityRows} />
        <TrendSection t={v.t} updatedAt={stats.checkedAt} trend={v.trend} />
        <DrawsSection t={v.t}
          tEn={v.tEn}
          lang={v.lang}
          updatedAt={stats.checkedAt}
          draws={stats.draws} />
        <DrawsLink t={v.t} />
        <CtaBand t={v.t} />
      </main>
    </>
  )
}
