'use client'
/**
 * occupations 域的结构:/occupations 紧缺职业清单正文(B4-01)——
 * 183 行按 省 → 通道 分组一页展示,通道表带抓取日(既有 fetched 列)。
 * 🔴 口径红线:清单命中 = 粗筛信号,非资格认定(页顶那句 dir.occ.note 是保留类文案,不许删)。
 * 语言 / 文案:全站一处(LangProvider),初值由服务端 cookie 定,所以正文自己接 useLang。
 * 2026-08-28 换装批自 Occupations.tsx 整体重写成小写件形制:内联样式逐格迁
 * occupations.module.css、分组与派生进 functions.ts、散值进 constants.ts、契约进 types.ts,
 * 省小节 / 通道表 / 单元格各自成件;壳件(整页外框 / 顶栏 / 页脚)拼装归页面门(样张 companies),
 * 本件只出 Shell 轨往下的视图。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */
import { BANNER_IMGS, Banner } from '@/components/banner'
import { IconClipboard } from '@/components/icons'
import { useLang } from '@/components/i18n'
import { Shell } from '@/components/shell'
import { BANNER_MODULE, SHELL_TOP } from './constants'
import { toProvGroups } from './functions'
import { ProvNav } from './provnav'
import { ProvSection } from './provsection'
import type { OccupationsIn } from './types'
import css from './occupations.module.css'

/**
 * 紧缺职业清单页正文。
 *
 * @param props 官方清单的全部行与更新时刻(逐格注释见 OccupationsIn)。
 * @returns 正文(Shell 轨 + 页头横幅 + 口径注 + 省导航 + 逐省小节)。
 */
export function Occupations({ rows, updatedAt }: OccupationsIn) {
  const [, , t] = useLang()
  const provs = toProvGroups({ rows })
  const sections = []
  for (const p of provs) {
    sections.push(<ProvSection key={p.prov} prov={p} t={t} />)
  }
  return (
    <Shell top={SHELL_TOP}>
      <Banner module={BANNER_MODULE}
        icon={<IconClipboard />}
        title={t('dir.occ.title')}
        sub={t('dir.occ.sub')}
        images={BANNER_IMGS.jobs} />
      <div className={css.note}>{t('dir.occ.note')}</div>
      <ProvNav provs={provs} updatedAt={updatedAt} t={t} />
      {sections}
    </Shell>
  )
}
