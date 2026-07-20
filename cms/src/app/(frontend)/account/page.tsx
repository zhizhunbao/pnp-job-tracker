'use client'
// 账户状态页(E3-02):仅已登录态(Pro 到期/档案/购买/登出;Stripe 回跳落点)。
// 登录入口全站只有一个 = /jobs 顶栏弹框(用户定):未登录访问本页 → 跳回 /jobs?login=1 自动弹框。
// E3-03:时长包购买入口(30/90 天)——前端只拿 Checkout URL 跳转,回跳 ?ok=1 提示(到期日由 webhook 拨)。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, type Lang } from '../jobs/i18n'
import { useIsNarrow } from '../jobs/Modal'
import { IconCheckCircle, IconStar, IconUser } from '../Icons'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { ProfileForm, type ProfileValue } from './ProfileForm'
import { SavedSearchList } from './SavedSearchList'
import { SavedJobsList } from './SavedJobsList'
import { Avatar } from '../Avatar'
import { Button } from '../ui/primitives'

type Me = { id: string | number; email: string; role?: string; proUntil?: string | null; profile?: ProfileValue | null; displayName?: string | null; avatar?: string | null; locale?: string | null } | null

function RedirectToLogin() {
  useEffect(() => { window.location.replace('/?login=1') }, [])
  return null
}

const card: React.CSSProperties = { padding: '1.6rem 1.9rem', border: '1px solid #eef0f3', borderRadius: 16, background: '#fff', boxShadow: '0 8px 30px rgba(17,24,39,.06)' }
const btn: React.CSSProperties = { width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 9, cursor: 'pointer', marginTop: 14 }

type Sec = 'overview' | 'profile' | 'favs' | 'sjobs' | 'saved' | 'buy'

export default function AccountPage() {
  const [sec, setSec] = useState<Sec>('overview')
  const narrow = useIsNarrow()
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)

  const [me, setMe] = useState<Me>(null)
  const [checked, setChecked] = useState(false)
  const [payOk, setPayOk] = useState(false)
  const [buying, setBuying] = useState(false)
  const [buyErr, setBuyErr] = useState('')
  useEffect(() => { setPayOk(new URLSearchParams(window.location.search).get('ok') === '1') }, [])
  // E11-02:账户下拉深链 ?sec=(profile/favs/sjobs/saved/buy/overview)→ 初始落到对应节
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('sec')
    if (s && ['overview', 'profile', 'favs', 'sjobs', 'saved', 'buy'].includes(s)) setSec(s as Sec)
  }, [])

  const refresh = () => fetch('/api/users/me', { credentials: 'include' })
    .then((r) => r.json()).then((d) => setMe(d?.user ?? null))
    .catch(() => setMe(null)).finally(() => setChecked(true))
  useEffect(() => { refresh() }, [])

  const logout = async () => {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
    await refresh()
  }

  // 昵称就地编辑(E11-01):null=不在编辑;字符串=编辑值。保存走 Payload PATCH /api/users/:id(本人可改)
  const [nick, setNick] = useState<string | null>(null)
  const [nickBusy, setNickBusy] = useState(false)
  const saveNick = async () => {
    if (nick == null || !me) return
    setNickBusy(true)
    try {
      await fetch(`/api/users/${me.id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: nick.trim() }),
      })
      await refresh(); setNick(null)
    } catch { /* 留在编辑态,可重试 */ } finally { setNickBusy(false) }
  }

  const buy = async (plan: '30' | '90') => {
    setBuying(true); setBuyErr('')
    try { (window as any).umami?.track('checkout', { plan }) } catch { /* E7-02:Checkout 发起事件 */ }
    try {
      const r = await fetch('/api/billing/checkout', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d?.url) { setBuyErr(t('acct.payErr')); return }
      window.location.href = d.url   // 跳 Stripe Checkout,成功回跳 /account?ok=1
    } catch { setBuyErr(t('acct.payErr')) } finally { setBuying(false) }
  }

  const pro = !!me?.proUntil && new Date(me.proUntil) > new Date()

  return (
    <div style={{ background: 'linear-gradient(160deg,#f8fafc 0%,#eef2ff 55%,#f8fafc 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      {/* 全站共享顶栏/页脚(2026-07-16 用户拍板统一 header/footer);账户在本页为当前态不再链自己 */}
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="account" />

      {!checked ? null : me ? (
        // sidebar + 内容区(2026-07-16 用户拍板「我的账户需要一个 sidebar」;此前的四卡分离演进):
        // 左=节导航(概览/移民档案/邮件提醒/升级 Pro)+ 退出登录,右=选中节的卡;窄屏 sidebar 变顶部横排
        <div style={{ maxWidth: 860, width: '100%', margin: '2.5rem auto', display: 'flex', flexDirection: narrow ? 'column' : 'row', gap: 16, alignItems: 'flex-start', boxSizing: 'border-box', padding: '0 1rem', flex: '1 0 auto' }}>
          <aside style={{ ...card, padding: '0.7rem', width: narrow ? '100%' : 190, flexShrink: 0, display: 'flex', flexDirection: narrow ? 'row' : 'column', gap: 2, flexWrap: 'wrap', boxSizing: 'border-box' }}>
            {/* sidebar 标签复用各节标题键,裁掉括号说明(「升级 Pro(一次性时长包…)」进侧栏太长) */}
            {([['overview', t('acct.title')], ['profile', t('prof.title')], ['favs', t('fav.title')], ['sjobs', t('sj.title')], ['saved', t('ss.title')], ['buy', t('acct.buyTitle')]] as [Sec, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setSec(k)}
                style={{ textAlign: 'left', padding: '8px 12px', fontSize: 13.5, border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: sec === k ? '#eef2ff' : 'transparent', color: sec === k ? '#1d4ed8' : '#374151', fontWeight: sec === k ? 600 : 400 }}>
                {label.split(/[((]/)[0].trim()}
              </button>
            ))}
            {!narrow && <div style={{ borderTop: '1px solid #f3f4f6', margin: '6px 0' }} />}
            {/* 组件统一 P2(#113):退出登录=ghost 灰(危险性弱操作,B映射) */}
            <Button kind="ghost" onClick={logout} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 13.5, fontWeight: 400, color: '#9ca3af', whiteSpace: 'nowrap' }}>{t('acct.logout')}</Button>
          </aside>
          <main style={{ ...card, flex: 1, minWidth: 0, width: narrow ? '100%' : undefined, boxSizing: 'border-box' }}>
            {sec === 'overview' && (<>
              <h1 style={{ fontSize: 18, margin: '0 0 14px' }}>{t('acct.title')}</h1>
              {payOk && <div style={{ background: '#ecfdf5', color: '#047857', fontSize: 13, padding: '8px 10px', borderRadius: 6, marginBottom: 12 }}><IconCheckCircle /> {t('acct.payOk')}</div>}
              {/* 身份头(E11-01):头像 + 昵称(可改,空回退邮箱前缀)+ 邮箱 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <Avatar src={me.avatar} name={me.displayName || me.email} email={me.email} size={52} />
                <div style={{ minWidth: 0 }}>
                  {nick == null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{me.displayName?.trim() || me.email.split('@')[0]}</span>
                      <button onClick={() => setNick(me.displayName || '')} title={t('acct.nick')} aria-label={t('acct.nick')} style={{ border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, fontSize: 13 }}>✎</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder={t('acct.nickPh')} maxLength={40} autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveNick(); if (e.key === 'Escape') setNick(null) }}
                        style={{ padding: '5px 8px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6, width: 160 }} />
                      <Button sm onClick={saveNick} disabled={nickBusy}>{nickBusy ? '…' : t('acct.nickSave')}</Button>
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.email}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, lineHeight: 2 }}>
                <div>{pro
                  ? <span style={{ color: '#b45309', fontWeight: 600 }}><IconStar /> {t('acct.plan.pro', { d: (me.proUntil || '').slice(0, 10) })}</span>
                  : <span style={{ color: '#6b7280' }}>{t('acct.plan.free')}</span>}
                </div>
              </div>
            </>)}
            {/* 移民档案(E5-00):匹配层输入;key 按 id 防换号残留 */}
            {sec === 'profile' && <ProfileForm key={String(me.id)} t={t} userId={me.id} initial={me.profile ?? null} />}
            {/* 已保存筛选(E5-03):邮件提醒管理 */}
            {/* 我的收藏(#62A):同一收藏数据的纯列表视图,独立成节 */}
            {sec === 'favs' && <SavedJobsList t={t} variant="favs" />}
            {sec === 'sjobs' && <SavedJobsList t={t} userId={me.id} weeklyOptOut={!!(me as { weeklyOptOut?: boolean }).weeklyOptOut} />}
            {sec === 'saved' && <SavedSearchList t={t} />}
            {/* 时长包购买(E3-03):Pro 也可续买,到期日顺延 */}
            {sec === 'buy' && (<>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>{t('acct.buyTitle')}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => buy('30')} disabled={buying} style={{ ...btn, background: '#2563eb', color: '#fff', opacity: buying ? 0.6 : 1 }}>{t('acct.buy30')}</button>
                <button onClick={() => buy('90')} disabled={buying} style={{ ...btn, background: '#1d4ed8', color: '#fff', opacity: buying ? 0.6 : 1 }}>{t('acct.buy90')}</button>
              </div>
              {buyErr && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{buyErr}</div>}
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>{t('acct.buyNote')}</div>
            </>)}
          </main>
        </div>
      ) : (
        // 未登录:回首页弹登录框(不渲染独立登录页)
        <RedirectToLogin />
      )}
      <SiteFooter t={t} />
    </div>
  )
}
