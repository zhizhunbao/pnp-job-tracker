'use client'
// E8-11 B1(Frank「以弹框为准,一个来源」):公司详情页=壳(面包屑/H1/JSON-LD 由 page.tsx)+ CompanyBody 同源骨架。
// 骨架与公司弹框同一组件同一份 CompanyDetail(改一处两边生效);排版随弹框换 JD 扁平——
// 原「一节一卡」多卡壳退役,整页一张白卡容器(#187「先只改弹框」的另一半在此收口)。
// 三条铁律(E8-09 §1)不变:一页一域、一条信息一个家、公司页全事实层免费。
import { LANGS } from '@/lib/i18n'
import { useLang } from '@/components/i18n'
import { CompanyBody } from '@/components/jobs'   // 公司身体与职位板弹框同源(拆分前住在 JobsTable 里)
import { provName } from '@/lib/location'
import { type CompanyDetail, type SimilarEmployer } from '@/lib/jobs/server'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Notice } from '@/components/notice'
import { Shell } from '@/components/shell'
import { goBackOr } from '@/components/button'

const aLink: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }

export default function Company({ company, similar = [], loggedIn }: { company: CompanyDetail; similar?: SimilarEmployer[]; loggedIn: boolean }) {
  const [lang, setLang, t] = useLang()   // 语言/文案:全站一处(LangProvider),初值由服务端 cookie 定
  const alias = lang === 'zh' ? company.aliasZh : lang === 'ko' ? company.aliasKo : ''   // #151 口径:界面语言译名作灰注,英文界面不出
  const provFull = company.province ? provName({ t, code: company.province, localeOnly: false }) : ''

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <Header lang={lang} setLang={setLang} t={t} loggedIn={loggedIn} />
      <Shell top={14}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* 面包屑:职位板 › 省 › 公司(「公司」无独立索引页,不做死链;省作可点筛选) */}
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, lineHeight: 1.7 }}>
            <a href="/" style={aLink}>{t('detail.crumbHome')}</a>
            {provFull ? <> › <a href={`/?prov=${encodeURIComponent(company.province)}`} style={aLink}>{provFull}</a></> : null}
            <> › <span style={{ color: '#374151' }}>{t('co.crumb')}</span></>
          </div>

          {/* #200(Frank「还分卡片,类似类别」):CompanyBody 各段改回卡片 → 详情页不再套外层白卡(禁卡套卡);
              H1 单独一张头卡,下面 CompanyBody 卡片自铺(与弹框同源) */}
          <div className="card" style={{ position: 'relative', padding: '14px 16px', marginBottom: 14 }}>
            {/* 返回(Frank 走查#18):右上角、浏览器返回(与详情页统一);2026-07-28 同走 goBackOr —— 公司页
                也是弹框里 target="_blank" 打开的,新标签页里裸 history.back() 是空操作 */}
            <button onClick={() => goBackOr('/?back=1')}
              style={{ position: 'absolute', top: 12, right: 12, border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 14px', fontSize: 12.5, color: '#374151', background: '#fff', whiteSpace: 'nowrap', cursor: 'pointer' }}>{t('detail.back')}</button>
            <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.35, color: '#111827', paddingRight: 84 }}>
              {company.name}{alias ? <span style={{ color: '#9ca3af', fontSize: 15, fontWeight: 400 }}>　{alias}</span> : null}
            </h1>
          </div>
          <CompanyBody company={company} similar={similar} t={t} lang={lang} />

          {!company.jobs.length ? <Notice kind="info">{t('co.notFound')}</Notice> : null}
          {/* 底部返回删(Frank 走查#18):返回统一到头卡右上角 */}
        </div>
      </Shell>
      <Footer t={t} />
    </div>
  )
}
