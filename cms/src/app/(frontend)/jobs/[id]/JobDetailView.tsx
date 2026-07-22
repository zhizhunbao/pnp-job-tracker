'use client'
// E8-07 A 件 → E8-11 B2(Frank「以弹框为准,job 只留 job 相关」):职位详情页 = 壳 + JobBody 同源骨架。
// 内容 = 面包屑 + H1(职位名 + NOC 官方职业名译名对照)+ JobBody(与 JD 弹框同一组件)+ 返回。
// 砍(Frank 2026-07-22 三令):头部卡 meta(公司/城市/日期/chips)、与我的匹配、事实块、
//   省提名/EE 卡、相关职位 —— 一条信息一个家,移民信号在移民弹框,公司在公司弹框/页。
import { useEffect, useState } from 'react'

import { makeT, LANG_KEY, LANGS, type Lang } from '../i18n'
import { catName, JobBody, nocLocalTitle, provName, type JobRow, type NocDesc, type Plan } from '../JobsTable'
import { SiteHeader } from '../../SiteHeader'
import { SiteFooter } from '../../SiteFooter'
import { PageShell } from '../../ui/primitives'

// dims 收窄:B2 后页面只用 nocDesc(职位名译名对照);其余维度(pnp/ee/新闻…)随移民卡砍一并不用
type Dims = { nocDesc: NocDesc[] }

const aLink: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }
const sec: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', padding: '12px 16px', marginBottom: 14 }

export default function JobDetailView({ job, plan, dims }: { job: JobRow; plan: Plan; dims: Dims }) {
  // 语言:与全站同一 localStorage 键;SSR 首帧 zh,水合后纠正(二级页惯例)
  const [lang, setLangState] = useState<Lang>('zh')
  useEffect(() => {
    try { const s = localStorage.getItem(LANG_KEY); if (s && LANGS.some((l) => l.code === s)) setLangState(s as Lang) } catch { /* ignore */ }
  }, [])
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } }
  const t = makeT(lang)

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
          <div style={sec}>
            <h1 style={{ margin: '0 0 2px', fontSize: 22, lineHeight: 1.35, color: '#111827' }}>{job.title}</h1>
            {nocZh && nocZh.toLowerCase() !== (job.title || '').toLowerCase() ? (
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>{nocZh}</div>
            ) : null}
            <JobBody job={job} lang={lang} plan={plan} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', padding: '6px 0 2px' }}>
            <a href="/" style={{ display: 'inline-block', border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 20px', fontSize: 13, color: '#374151', textDecoration: 'none', background: '#fff' }}>← {t('detail.back')}</a>
          </div>
        </div>
      </PageShell>
      <SiteFooter t={t} />
    </div>
  )
}
