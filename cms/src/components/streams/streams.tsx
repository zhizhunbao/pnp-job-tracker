'use client'
/**
 * streams 域的结构:/streams「通道与门槛」整块视图(资讯第三个页签;2026-09-30 通道与门槛批 2,Frank「各省门槛 我觉得
 * 应该放到资讯下面」「盘点各种通道,各种门槛」「对啊。门槛要说清楚」;设计 docs/design/通道与门槛-20260930.md)。
 * 页头 Banner 与二级导航同 /news、/timeline(三页互为切换);下面一行省份胶囊,再下面这一省的现行通道每条一张门槛卡
 * (卡与职位弹框「本岗通道的门槛」同一个组件,住 pnp 桶)。壳件(整页外框 / 顶栏 / 页脚)拼装归页面门。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
import { BANNER_IMGS, Banner } from '@/components/banner'
import { IconNews } from '@/components/icons'
import { PnpProvStreams } from '@/components/pnp'
import { Shell } from '@/components/shell'
import { SectionTabs } from '@/components/tabs'
import { BANNER_MODULE, SHELL_TOP, TABS_TONE, URL_NEWS, URL_STREAMS, URL_TIMELINE } from './constants'
import { useStreams } from './hooks'
import { ProvChips } from './provchips'

/**
 * 「通道与门槛」整块视图:页头 + 二级导航 → 省份胶囊 → 这一省的门槛卡。
 *
 * @returns 正文(Shell 轨往下)。
 */
export function Streams() {
  const p = useStreams()
  return (
    <Shell top={SHELL_TOP}>
      <Banner module={BANNER_MODULE}
        icon={<IconNews />}
        title={p.t('streams.title')}
        sub={p.t('streams.bnSub')}
        images={BANNER_IMGS.news} />
      <SectionTabs tone={TABS_TONE}
        tabs={[
          { href: URL_NEWS, label: p.t('tl.tabNews') },
          { href: URL_TIMELINE, label: p.t('tl.title') },
          { href: URL_STREAMS, label: p.t('tl.tabStreams'), active: true },
        ]} />
      <ProvChips t={p.t} prov={p.prov} provPickOf={p.provPickOf} />
      <PnpProvStreams lang={p.lang} province={p.prov} />
    </Shell>
  )
}
