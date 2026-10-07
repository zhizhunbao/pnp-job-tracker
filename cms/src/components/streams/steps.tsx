'use client'
/**
 * streams 域的结构:/steps「申请步骤」整块视图(资讯第四个页签;2026-10-03 资讯页签四分,Frank「申请步骤应该是另一个选项卡吧」
 * → 提案「可以,做吧」)。形照同桶的 Streams:页头 Banner 与二级导航同 /news、/timeline、/streams(四页互为切换);下面一行省份胶囊,
 * 再下面这一省的现行通道每条一张申请步骤卡(卡与职位弹框「申请步骤」同一个组件,住 pnp 桶)。壳件(整页外框 / 顶栏 / 页脚)拼装归页面门。
 * 2026-10-04 Frank 勾「卡上加钮 + 页签带省份」:「通道」页签的地址带上当前省(provHrefOf);每张步骤卡标题行多一颗「申请门槛 →」。
 *
 * @author Frank
 * @time 2026-10-03 23:44:58
 */
import { BANNER_IMGS, Banner } from '@/components/banner'
import { IconNews } from '@/components/icons'
import { PnpProvSteps } from '@/components/pnp'
import { Shell } from '@/components/shell'
import { SectionTabs } from '@/components/tabs'
import { BANNER_MODULE, SHELL_TOP, TABS_TONE, URL_NEWS, URL_STEPS, URL_STREAMS, URL_TIMELINE } from './constants'
import { provHrefOf } from './functions'
import { useStreams } from './hooks'
import { ProvChips } from './provchips'

/**
 * 「申请步骤」整块视图:页头 + 二级导航 → 省份胶囊 → 这一省的步骤卡。
 *
 * @returns 正文(Shell 轨往下)。
 */
export function Steps() {
  const p = useStreams()
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
          { href: provHrefOf({ base: URL_STREAMS, prov: p.prov }), label: p.t('tl.tabStreams') },
          { href: URL_STEPS, label: p.t('tl.tabSteps'), active: true },
        ]} />
      <ProvChips t={p.t} prov={p.prov} provPickOf={p.provPickOf} />
      <PnpProvSteps lang={p.lang} province={p.prov} />
    </Shell>
  )
}
