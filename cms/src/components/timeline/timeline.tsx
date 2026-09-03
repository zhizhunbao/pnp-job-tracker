'use client'
/**
 * timeline 域的结构:/timeline 政策时间线整块视图(C6-01)—— 三路事件(省抽选 /
 * 省通告 / 政策公告)混排一条时间轴,上面压一排抽选节奏块。
 * 省筛与类型筛纯客户端(本页事件不足百条,来回请求不值得)。
 * 🔴 诚实红线两条:省的分数带分制标注(≠ CRS);节奏卡只报历史统计,**不预测下一次**。
 * 页头 = Banner 图版(与 /news 共用移民动态模块的配色与图组);
 * 二级导航 = 统一 SectionTabs(公告 | 时间线,2026-07-19 Frank 批提案:与 /news 互为切换)。
 * 2026-08-28 换装批自 Timeline.tsx 整体重写成小写件形制:壳件(整页外框 / 顶栏 / 页脚)
 * 拼装归页面门(样张 companies),本件只出 Shell 轨往下的视图;排版拆成小件、
 * 状态收进 hooks.ts、内联样式逐格迁 timeline.module.css。
 * 2026-09-03 Frank「所有的 table 和可以更新数据的地方,右上角都应该有一个更新时间」:
 * 两个数据区各挂一枚 —— 节奏格在它的标题下单起一行,事件列表挂进筛选药丸行的右端。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { BANNER_IMGS, Banner } from '@/components/banner'
import { IconNews } from '@/components/icons'
import { Shell } from '@/components/shell'
import { SectionTabs } from '@/components/tabs'
import { Updated } from '@/components/time'
import { Title } from '@/components/title'
import { BANNER_MODULE, EVENTS_ANCHOR_ID, SHELL_TOP, TABS_TONE, URL_NEWS, URL_TIMELINE } from './constants'
import { CadenceGrid } from './cadencegrid'
import { EventList } from './eventlist'
import { FilterChips } from './filterchips'
import { provsOf, shownOf } from './functions'
import { useTimeline } from './hooks'
import type { TimelineIn } from './types'
import css from './timeline.module.css'

/**
 * 时间线整块视图:页头 + 二级导航 → 抽选节奏卡 → 筛选药丸 → 混排时间轴。
 *
 * @param props 三路数据与更新时刻(逐格注释见 TimelineIn)。
 * @returns 正文(Shell 轨往下)。
 */
export function Timeline({ events, cadence, eeCadence, updatedAt }: TimelineIn) {
  const p = useTimeline()
  const shown = shownOf({ events, prov: p.prov, kind: p.kind, stream: p.stream })
  return (
    <Shell top={SHELL_TOP}>
      <Banner module={BANNER_MODULE}
        icon={<IconNews />}
        title={p.t('tl.title')}
        sub={p.t('tl.sub')}
        images={BANNER_IMGS.news} />
      <SectionTabs tone={TABS_TONE}
        tabs={[
          { href: URL_NEWS, label: p.t('tl.tabNews') },
          { href: URL_TIMELINE, label: p.t('tl.title'), active: true },
        ]} />
      <Title>{p.t('tl.cadence')}</Title>
      <Updated iso={updatedAt} t={p.t} />
      <CadenceGrid t={p.t} cadence={cadence} eeCadence={eeCadence} drillOf={p.drillOf} />
      <div id={EVENTS_ANCHOR_ID} className={css.anchor}><Title>{p.t('tl.events')}</Title></div>
      <FilterChips t={p.t}
        provs={provsOf({ events })}
        updatedAt={updatedAt}
        prov={p.prov}
        kind={p.kind}
        stream={p.stream}
        provPickOf={p.provPickOf}
        onKindAll={p.onKindAll}
        onKindDraw={p.onKindDraw}
        onKindPolicy={p.onKindPolicy}
        onStreamClear={p.onStreamClear} />
      <EventList t={p.t} events={shown} />
    </Shell>
  )
}
