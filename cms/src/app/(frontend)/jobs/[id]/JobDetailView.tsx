'use client'
// E8-07 A 件 → E8-11 B2(Frank「以弹框为准,job 只留 job 相关」):职位详情页 = 壳 + JobBody 同源骨架。
// 内容 = 面包屑 + H1(职位名 + NOC 官方职业名译名对照)+ JobBody(与 JD 弹框同一组件)+ 返回。
// 砍(Frank 2026-07-22 三令):头部卡 meta(公司/城市/日期/chips)、与我的匹配、事实块、
//   省提名/EE 卡、相关职位 —— 一条信息一个家,移民信号在移民弹框,公司在公司弹框/页。
import { useEffect, useState } from 'react'

import { LANGS } from '../i18n'
import { useLang } from '../../LangProvider'
import { catName, JobBody, nocLocalTitle, provName, type JobRow, type NocDesc, type Plan } from '../JobsTable'
import { PathwaysCard } from './PathwaysCard'
import { SiteHeader } from '../../SiteHeader'
import { SiteFooter } from '../../SiteFooter'
import { PageShell } from '../../ui/primitives'
import { goBackOr } from '../../BackLink'
import { track } from '@/lib/track'

// dims 收窄:B2 后页面只用 nocDesc(职位名译名对照);其余维度(pnp/ee/新闻…)随移民卡砍一并不用
type Dims = { nocDesc: NocDesc[] }

const aLink: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }
const sec: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', padding: '12px 16px', marginBottom: 14 }

export default function JobDetailView({ job, plan, dims }: { job: JobRow; plan: Plan; dims: Dims }) {
  const [lang, setLang, t] = useLang()   // 语言/文案:全站一处(LangProvider),初值由服务端 cookie 定
  // 2026-07-25 Frank「点击要有动画,不然不知道点没点,跳页有延迟」:按下即置忙态(变灰+省略号),导航期间可感
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    // 漏斗第 1 步(主线 M2 收口 2026-08-02):这个页面一直没有第一方浏览埋点 ——
    // 于是库里只有第 3 步「锁区曝光」有数,分母是空的,M3 的两种分叉(锁的东西不值钱 / 根本没人看见)
    // 照样分不开。30 天数据里入口=出口就是本页,它才是漏斗真正的第一格(列表页弹框另计 kind=modal)。
    track('jd-open', { kind: 'page' })
  }, [])

  const provFull = provName(t, job.province || '')
  const nocRow = dims.nocDesc.find((d) => d.noc === job.noc) || null
  // 职位名翻译(Frank「job 名称也需要翻译」):雇主原始岗名多是英文且不规范,挂 NOC 官方职业名的
  // 界面语言译名作对照(#151 口径,与公司页在招职位同款);英文界面/无 NOC 译名=空,不渲。
  const nocZh = nocLocalTitle(nocRow, lang)
  // 面包屑职业分类路径段(省 › 大 › 中 › 小):同名相邻跳过,不铺重复
  const catSegs = (([
    job.broad && job.broad !== '未分类' ? { txt: t('broad.' + job.broad), href: `/?broad=${encodeURIComponent(job.broad)}` } : null,
    job.mid && job.mid !== '未分类' ? { txt: catName(t, job.mid), href: `/?broad=${encodeURIComponent(job.broad || '')}&mid=${encodeURIComponent(job.mid)}` } : null,
    job.fine && job.fine !== '未分类' ? { txt: catName(t, job.fine), href: `/?fine=${encodeURIComponent(job.fine)}` } : null,
  ].filter(Boolean)) as { txt: string; href: string }[])
    .filter((s, i, arr) => i === 0 || s.txt !== arr[i - 1].txt)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <SiteHeader lang={lang} setLang={setLang} t={t} loggedIn={plan.loggedIn} />
      <PageShell pad="14px 1.25rem 32px">
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* 面包屑(壳):职位板 › 省 › 大类 › 中类 › 小类;末段「本岗」由 H1 承担不重复 */}
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, lineHeight: 1.7 }}>
            <a href="/" style={aLink}>{t('detail.crumbHome')}</a>
            {job.province ? <> › <a href={`/?prov=${encodeURIComponent(job.province)}`} style={aLink}>{provFull}</a></> : null}
            {catSegs.map((s) => <span key={s.href}> › <a href={s.href} style={aLink}>{s.txt}</a></span>)}
          </div>

          {/* 整页一张白卡:H1(职位名 + 译名对照,SEO 壳)+ JobBody(与 JD 弹框同源) */}
          <div style={{ ...sec, position: 'relative' }}>
            {/* 返回(Frank 走查#18,2026-07-25):右上角文字钮,直接走浏览器返回——保留滚动位置与筛选状态,
                不重拉数据(比 ?back=1 快照更省);文案缩到「返回」。
                2026-07-28:改走 goBackOr —— 新标签页(站内「打开完整页」一律 _blank)无处可回时落职位板,
                不再点了没反应(见 BackLink.tsx 注释里的生产实测) */}
            <button className="jdBack" onClick={() => { setLeaving(true); goBackOr('/?back=1') }}
              style={{ position: 'absolute', top: 12, right: 12, border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 14px', fontSize: 12.5, color: '#374151', background: leaving ? '#f3f4f6' : '#fff', opacity: leaving ? 0.7 : 1, whiteSpace: 'nowrap', cursor: 'pointer', transition: 'transform .06s' }}>
              <style>{'.jdBack:active{transform:scale(.95)}'}</style>
              {/* 在途态只靠灰底+降透明(2026-08-06 Frank「前面为什么出现三个…」:文案前拼「… 」只添困惑,删) */}
              {t('detail.back')}</button>
            <h1 style={{ margin: '0 0 2px', fontSize: 22, lineHeight: 1.35, color: '#111827', paddingRight: 120 }}>{job.title}</h1>
            {nocZh && nocZh.toLowerCase() !== (job.title || '').toLowerCase() ? (
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>{nocZh}</div>
            ) : null}
            <JobBody job={job} lang={lang} plan={plan} />

            {/* C6 通道卡(2026-08-06,设计 §五;卡位=已摘的 OccReportCard,效果图定的是嵌在白卡内):
                该职业匹配的移民通道,按**系统抓的官方经验门槛**从低到高排(Frank 拍板「基于系统抓的
                数据排序」,不含个人档案);CTA 拉起对话挂件并预填路径问句。自包含+懒取,拿不到数整卡不渲。 */}
            {job.noc && job.noc !== '未分类' ? (
              <PathwaysCard noc={job.noc} teer={job.teer} t={t}
                prefill={t('jpw.prefill', { occ: nocZh || nocRow?.title || job.title, noc: job.noc })} />
            ) : null}
          </div>

          {/* 刀 1(入口下沉-20260731):报告入口,自包含组件,老结构不动;拿不到数/本省零在招=整卡不渲 */}
          {/* OccReportCard 已摘(2026-08-06 Frank「没什么用可以删了」):它的付费出口挂在已退役的报告体系,
              成了「有 aha 没去处」的孤儿。组件文件保留(照答题卡摘入口先例);卡位由 C6 通道卡接手(见上)。 */}

        </div>
      </PageShell>
      <SiteFooter t={t} />
    </div>
  )
}
