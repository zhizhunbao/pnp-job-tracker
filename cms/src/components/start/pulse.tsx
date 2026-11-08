'use client'
/**
 * start 域的结构:E13-03 把脉首页整块视图(路由仍是 /start —— URL 是 SEO 资产,
 * 不随组件改名动)。
 * 2026-09-04 重构(/fe 评估,设计稿 docs/design/把脉页重构-20260904.md):近 30 天剔掉 Frank 设备后
 * 只有十几次浏览零交互,20 屏长页先刷三张雇主表才到职业榜。Frank 拍板**按类型分段,段内按行业出表,
 * 不让用户筛**:首屏(轮播 + 四卡)→ 职业(全职业两榜 + 行业各一表)→ 雇主(在招且带担保信号,行业各一表)
 * → LMIA(技能类获批,行业各一表)→ 省份(2026-09-06 起 = 宏观统计含联邦:全国 + 十省按年表 + 招聘对比横表;分省概览 + 省内职业榜退役)
 * → 城市 → PR(2026-09-10 Frank「pr 拆成和省一个级别的」:每地区一张 PR 获批 / 其中省提名小表,自省份段拆出;
 * 2026-09-12 Frank「这两个换个位置吧」:城市提到 PR 前)→ 趋势(全国一条线 + 行业小图)
 * → 近期抽选表(Frank 走查要求保留)→ 一行政策动态链接 → 职位板入口。每张表全量,每页 10 行分页(Frank 同日撤 Top N)。
 * 撤掉:四榜、雇主表的筛选下拉与「问 AI 顾问」钮、抽选表与政策动态段、把脉页上的分布探索图。
 * 信条不变:**「难听,但没骗你」—— 数据保守,每个数字可溯源**;
 * 判决语一律「模板 + 库内数字填槽」,LLM 不参与下结论;派生列为 null 时该卡 / 该行整块不渲,绝不显示 0。
 * SSR 瘦身手法守住:职业大表(occ ~3400 行)不进 HTML,挂载后拉 /api/stats/market;
 * 担保雇主全量同理走 /api/employers/sponsors。
 * 2026-08-28 换装批自 Pulse.tsx 整体重写成小写件形制;壳件(Frame / 顶栏 / 页脚)由页面门拼装。
 * 2026-09-03 Frank「所有的 table 和可以更新数据的地方,右上角都应该有一个更新时间」:
 * ETL 心跳(stats.checkedAt)分发给每个有表的分区,各区标题行右槽一枚。
 * 2026-11-05 Frank「把脉页面 把所有的 更新时间,都放到 banner 右下角吧」:各区那枚全撤,心跳只交 Hero 挂 banner 右槽。
 * 2026-11-05 Frank「用户看到哪就加载哪部分」:SSR 只出首屏(stats 只剩四格),其余各段滚到视口附近才取数,
 * 没到前段渲色带 + 占位(色带要在,才盯得到它进没进附近)。
 * 2026-11-07 Frank「就业把脉 sidebar 先改一下吧」:两排页签的二级导航条换成 nav 桶左侧导航(宽屏左栏,« 可收起)
 * + 手机分区条拉抽屉;正文外层由 <main> 改普通块(全站外框 Frame 已有 main 地标,一页只许一个)。
 * 同日 Frank「是不是改成多个页面好一些」→「直接拆」:七个分区各一页(/start = 职业,其余 /start/<末段>),
 * 本件按页面门给的 sec 只渲那一段。同日 Frank「每个页面是不是只显示自己的不要向下拉」「banner 和 卡片固定」
 * 「下面是 table」「改成和 learn 那种」:banner + 四格数字卡每页都在,下面只出侧栏当前子项那一张表。
 * 同日 Frank「我切换的时候,其他项如果是展开就继续展开,切换的时候不要刷页面,只有中间的 table 在动」:
 * banner、数字卡、侧栏、手机分区条、抽屉搬进 PulseShell(住 /start/layout.tsx,切页不卸载),本件只剩这一页的分区。
 * 同日 Frank「下面这个删掉吧」:页底「全加拿大职位板 / 进职位板」横幅(CtaBand,S6 职位板入口)撤。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { BoardsSection } from './boardssection'
import { CitySection } from './citysection'
import { DrawsSection } from './drawssection'
import { NewsSection } from './newssection'
import { EmpSection } from './empsection'
import { PrSection } from './prsection'
import { ProvSection } from './provsection'
import { usePulse } from './hooks'
import { ID_BOARDS, ID_CITY, ID_DRAWS, ID_NEWS, ID_PR_BAND, ID_PROV, ID_SE } from './constants'
import type { PulseIn } from './types'

/**
 * 就业把脉这一页的分区(外框由 PulseShell 给)。
 *
 * @param props 这一页的分区。
 * @returns 这一页的分区。
 */
export function Pulse({ sec }: PulseIn) {
  const v = usePulse({ sec })
  return (
    <>
      {sec === ID_BOARDS && <BoardsSection t={v.t} lang={v.lang} secs={v.occSecs} nocProvs={v.nocProvs} />}
      {sec === ID_SE && (
        <EmpSection t={v.t}
          secs={v.empSecs}
          pilotSecs={v.pilotSecs}
          loading={v.empLoading} />
      )}
      {sec === ID_PROV && (
        <ProvSection t={v.t}
          indGeos={v.indGeos}
          indLoading={v.macroLoading}
          jobsLoading={v.market == null}
          jobsRows={v.jobsRows} />
      )}
      {sec === ID_CITY && <CitySection t={v.t} lang={v.lang} on={v.cityOn} />}
      {sec === ID_PR_BAND && <PrSection t={v.t} prGeos={v.prGeos} loading={v.macroLoading} />}
      {sec === ID_DRAWS && (
        <DrawsSection t={v.t}
          tEn={v.tEn}
          lang={v.lang}
          draws={v.draws} />
      )}
      {sec === ID_NEWS && <NewsSection t={v.t} lang={v.lang} news={v.news} />}
    </>
  )
}
