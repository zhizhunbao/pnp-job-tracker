'use client'
// E8-07 A 件 → E8-11 B2(Frank「以弹框为准,job 只留 job 相关」):职位详情页 = 壳 + JobBody 同源骨架。
// 内容 = 面包屑 + H1(职位名 + NOC 官方职业名译名对照)+ JobBody(与 JD 弹框同一组件)+ 返回。
// 砍(Frank 2026-07-22 三令):头部卡 meta(公司/城市/日期/chips)、与我的匹配、事实块、
//   省提名/EE 卡、相关职位 —— 一条信息一个家,移民信号在移民弹框,公司在公司弹框/页。
import { useEffect, useMemo, useState } from 'react'

import { LANGS } from '@/lib/i18n'
import { useLang } from '../../LangProvider'
import { JobBody } from '../Jd'                    // 正文身体:整页与弹框渲的是同一棵树
import { JobMiniRow } from '../Company'
import type { JobRow, NocDesc, Plan } from '../types'
import { catName, nocLocalTitle, registerCatLabels } from '@/lib/noc'
import { provName } from '@/lib/location'
import { Header } from '../../Header'
import { Footer } from '../../Footer'
import { CARD_MD, Shell } from '../../ui'
import { goBackOr } from '../../BackLink'
import { track } from '@/lib/track'
import type { RelatedJob } from '@/lib/jobsSql'

// dims 收窄:B2 后页面只用 nocDesc(职位名译名对照);其余维度(pnp/ee/新闻…)随移民卡砍一并不用
type CatLabel = {
  broad?: string; mid?: string; fine?: string
  broadEn?: string; broadKo?: string; midEn?: string; midKo?: string; fineEn?: string; fineKo?: string
}
type Dims = { nocDesc: NocDesc[]; nocCategories: CatLabel[] }

const aLink: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }
const sec: React.CSSProperties = CARD_MD   // 白卡壳全站一份(ui/primitives),这里只留个本地别名

export default function Job({ job, plan, dims, related }: {
  job: JobRow; plan: Plan; dims: Dims
  related: { sameCompany: RelatedJob[]; sameOcc: RelatedJob[]; fallbackLevel: 'fine' | 'mid' | 'broad' | null }
}) {
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
  // 列表页会注册整张分类维表；详情页直入也必须注册本岗这一行，否则英/韩界面会回退中文分类名。
  useMemo(() => registerCatLabels(dims.nocCategories), [dims.nocCategories])
  // 面包屑职业分类路径段(省 › 大 › 中 › 小):同名相邻跳过,不铺重复
  const catSegs = (([
    job.broad && job.broad !== '未分类' ? { txt: catName(t, job.broad), href: `/?broad=${encodeURIComponent(job.broad)}` } : null,
    job.mid && job.mid !== '未分类' ? { txt: catName(t, job.mid), href: `/?broad=${encodeURIComponent(job.broad || '')}&mid=${encodeURIComponent(job.mid)}` } : null,
    job.fine && job.fine !== '未分类' ? { txt: catName(t, job.fine), href: `/?fine=${encodeURIComponent(job.fine)}` } : null,
  ].filter(Boolean)) as { txt: string; href: string }[])
    .filter((s, i, arr) => i === 0 || s.txt !== arr[i - 1].txt)

  // 相似职位的兜底去处:筛选参数与面包屑同一套(?prov / ?fine|mid|broad),按级给键,不新造口径。
  // 文案定长,不把职业名插进句子:NOC 官方职业名可以长到
  // 「Machine operators and related workers in pulp and paper production and wood processing…」,
  // 塞进句子手机上折三行。范围交给链接目标,措辞与上面的分组小标题「同省同职业」同一套词。
  // 按哪一级筛由服务端定(fetchRelatedJobs 探过「本省该级确实还有在招岗」)—— 探不到就退到只按省,
  // 决不把人从死页面送进空列表。省名用 t('prov.XX') 三语单名,不用面包屑那种「Ontario(安大略省)」组合。
  const provPlain = t('prov.' + (job.province || '').toUpperCase())
  const provWord = provPlain.startsWith('prov.') ? provFull : provPlain
  const fbCatValue = related.fallbackLevel ? ({ fine: job.fine, mid: job.mid, broad: job.broad }[related.fallbackLevel] || '') : ''
  const fallbackHref = !job.province ? ''
    : fbCatValue ? `/?prov=${encodeURIComponent(job.province)}&${related.fallbackLevel}=${encodeURIComponent(fbCatValue)}`
    : `/?prov=${encodeURIComponent(job.province)}`
  const fallbackText = fbCatValue ? t('detail.relatedNoneOcc') : t('detail.relatedNoneProv', { p: provWord })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      {/* active:职位详情仍属「职位」一档 —— 不传的话顶栏这一项不高亮(08-17 首页那处已修,这处是同类漏网) */}
      <Header lang={lang} setLang={setLang} t={t} loggedIn={plan.loggedIn} active="jobs" />
      <Shell pad="14px 1.25rem 32px">
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

            {/* 2026-08-10 Frank 两拍,详情页的移民入口全撤,本页回到「只讲这份 job」:
                ① C6 通道卡 PathwaysCard(「这么多信息放到 job 详情基本是多余的,根本没人点」)——
                   Umami 近 30 天 pw-seen 148 次曝光,pw-cta 连事件表前 50 都没进(≤6 次);
                ② #287 批D 判定卡入口 TvEntryCard(「放到 job 详情比较突兀」「根本就没人点」)——
                   同期 tv-entry 全渠道合计仅 7 次,同窗口 jd-open 318 次。
                两者的组件、/api/pathways、判定弹框都保留(照 OccReportCard/答题卡的「只摘入口」先例),
                判定入口仍在职位板行内与公司弹框挂着,只是不再落在详情页。 */}
          </div>

          {/* 相似职位(2026-08-11 Frank「下架了应该下面列出其他相似职位」):只在 closed 岗渲染(在招岗
              服务端就不查,related 恒空)—— 下架页原本是死路,横幅说完「已下架」就没有下一步。
              分组小标题代替逐行标注(同一组三行都写「同省同职业」是重复文案);行内两段:岗名蓝链一行,
              公司与城市灰字第二行,不折行超长省略——手机 375 也是一行一条。 */}
          {job.status === 'closed' && (related.sameCompany.length || related.sameOcc.length || fallbackHref) ? (
            <div style={sec}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{t('detail.related')}</div>
              {/* 行形态不自造:与公司弹框「在招职位」同一个 JobMiniRow(左岗名右薪资城市)。
                  分组小标题代替逐行标注(同一组三行都写「同省同职业」是重复文案);
                  同公司组的灰字小注留空——组标题已经说了同公司,再贴一遍公司名既重复又在 375 上被截断。 */}
              {([[t('detail.sameCo'), related.sameCompany, false], [t('detail.sameOcc'), related.sameOcc, true]] as [string, RelatedJob[], boolean][])
                .filter(([, rows]) => rows.length)
                .map(([label, rows, withCo]) => (
                  <div key={label} onClick={() => track('rel-job', { from: 'closed' })}>
                    <div style={{ fontSize: 11.5, color: '#9ca3af', margin: '6px 0 2px' }}>{label}</div>
                    {rows.map((r) => (
                      <JobMiniRow key={r.id} id={r.id} title={r.title} sub={withCo ? r.company : ''}
                        salaryText={r.salaryText} city={r.city} />
                    ))}
                  </div>
                ))}
              {/* 兜底(2026-08-11 Frank 追加):同公司与同职业都零在招时,卡里原本什么都不剩 ——
                  下架页又成死路。给一条筛好的职位板链接,让他至少还有下一步可点。 */}
              {!related.sameCompany.length && !related.sameOcc.length && fallbackHref ? (
                <a href={fallbackHref} onClick={() => track('rel-job', { from: 'closed-none' })}
                  style={{ ...aLink, fontSize: 13, display: 'inline-block', padding: '4px 0' }}>{fallbackText}</a>
              ) : null}
            </div>
          ) : null}

          {/* 刀 1(入口下沉-20260731):报告入口,自包含组件,老结构不动;拿不到数/本省零在招=整卡不渲 */}
          {/* OccReportCard 已摘(2026-08-06 Frank「没什么用可以删了」):它的付费出口挂在已退役的报告体系,
              成了「有 aha 没去处」的孤儿。组件文件保留(照答题卡摘入口先例);卡位由 C6 通道卡接手(见上)。 */}

        </div>
      </Shell>
      <Footer t={t} />
    </div>
  )
}
