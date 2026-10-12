'use client'
/**
 * streams 域的结构:/steps「申请步骤」整块视图(资讯第四个页签;2026-10-03 资讯页签四分,Frank「申请步骤应该是另一个选项卡吧」
 * → 提案「可以,做吧」)。形照同桶的 Streams:页头 Banner 与二级导航同 /news、/timeline、/streams(四页互为切换);下面一行省份胶囊,
 * 再下面这一省的现行通道每条一张申请步骤卡(卡与职位弹框「申请步骤」同一个组件,住 pnp 桶)。壳件(整页外框 / 顶栏 / 页脚)拼装归页面门。
 * 2026-10-04 Frank 勾「卡上加钮 + 页签带省份」:「通道」页签的地址带上当前省(provHrefOf);每张步骤卡标题行多一颗「申请门槛 →」。
 * 2026-10-11 申请步骤分区筛选批 1(Frank「可以,开始做第一批」;设计 docs/design/资讯/申请步骤-分区筛选-20261011.md):省份胶囊行换成
 * 三张分区卡 —— 省份(多一枚「全部省份」,进页默认它)/ 身份 / 教育经历;状态机器换成 useSteps(整份筛选跟着地址走)。
 * 全部省份时九省各挂一份步骤正文(group,卡前出省名组头,一条不剩的省整组不出)。工作经历卡归下一小批(要先在数据层给通道算职业)。
 * 2026-10-12 Frank「要不这个只作为咨询列出所有通道」「去掉其他筛选,只保留省份切换」:身份 / 教育经历两张卡撤,本页只剩省份卡,
 * 步骤正文一律不筛(STEPS_NO_FILTER);筛选挪「我的」模块的「我的通道」。
 *
 * @author Frank
 * @time 2026-10-03 23:44:58
 */
import { BANNER_IMGS, Banner } from '@/components/banner'
import { IconNews } from '@/components/icons'
import { PnpProvSteps } from '@/components/pnp'
import { Shell } from '@/components/shell'
import { SectionTabs } from '@/components/tabs'
import {
  BANNER_MODULE, PROV_ALL, SHELL_TOP, STEPS_NO_FILTER, STREAM_PROVS, TABS_TONE, TEXT_NONE, URL_NEWS, URL_STEPS,
  URL_STREAMS, URL_TIMELINE,
} from './constants'
import { provHrefOf, streamsProvOf } from './functions'
import { useSteps } from './hooks'
import { StepsProvCard } from './stepsprovcard'

/**
 * 「申请步骤」整块视图:页头 + 二级导航 → 省份卡 → 步骤卡(一省或九省分组)。
 *
 * @returns 正文(Shell 轨往下)。
 */
export function Steps() {
  const p = useSteps()
  const provs = []
  if (p.prov === PROV_ALL) {
    for (const code of STREAM_PROVS) {
      provs.push(<PnpProvSteps key={code} lang={p.lang} province={code} filter={STEPS_NO_FILTER} group />)
    }
  } else if (p.prov !== TEXT_NONE) {
    provs.push(<PnpProvSteps key={p.prov} lang={p.lang} province={p.prov} filter={STEPS_NO_FILTER} group={false} />)
  }
  return (
    <Shell top={SHELL_TOP}>
      <Banner module={BANNER_MODULE}
        icon={<IconNews />}
        title={p.t('steps.title')}
        sub={p.t('steps.bnSub')}
        images={BANNER_IMGS.news} />
      <SectionTabs tone={TABS_TONE}
        tabs={[
          { href: URL_NEWS, label: p.t('tl.tabNews') },
          { href: URL_TIMELINE, label: p.t('tl.tabDraws') },
          { href: provHrefOf({ base: URL_STREAMS, prov: streamsProvOf(p.prov) }), label: p.t('tl.tabStreams') },
          { href: URL_STEPS, label: p.t('tl.tabSteps'), active: true },
        ]} />
      {p.prov !== TEXT_NONE && <StepsProvCard p={p} />}
      {provs}
    </Shell>
  )
}
