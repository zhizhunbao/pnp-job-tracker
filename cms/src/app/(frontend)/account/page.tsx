'use client'
// 账户状态页(E3-02):仅已登录态(Pro 到期/档案/购买/登出;Stripe 回跳落点)。
// 登录入口全站只有一个 = /jobs 顶栏弹框(用户定):未登录访问本页 → 跳回 /jobs?login=1 自动弹框。
// E3-03:时长包购买入口(30/90 天)——前端只拿 Checkout URL 跳转,回跳 ?ok=1 提示(到期日由 webhook 拨)。
// 2026-08-26:页面改造成「纯拼装门」(闸 local/page-compose-only)——排版全部下沉进
// components/account/,这里只剩 state、事件处理器与大写组件的拼装。
import { resetAnswersMemory } from '@/lib/quiz'
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { useIsNarrow } from '@/components/modal'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { AccountBuyPanel, AccountColumns, AccountNav, AccountOverview, AccountRedirect, AccountShell, ProfileForm, ResumeArchive, SavedJobsList, SavedSearchList, makeNickKey, type Me, type Sec } from '@/components/account'

// 答题条件条(AnswersRow)2026-08-04 摘除:整条蓝条的存在意义就是把人送去 /plan/job(看结果 / 去答题),
// 而答题卡功能已摘入口、只保留路由。档案节现在直接是 ProfileForm + 简历存档。

export default function AccountPage() {
  const [sec, setSec] = useState<Sec>('overview')
  const narrow = useIsNarrow()
  const [lang, setLangSaved, t] = useLang()   // 语言/文案:全站一处(LangProvider),初值由服务端 cookie 定

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
    // 手上那份答案跟着会话一起丢掉(2026-08-16 缓存撤了之后答案住内存):不清的话
    // 同一浏览器换个号登录,上一个人的答案会被当成「他的」推到新账号名下
    resetAnswersMemory()
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
  // 昵称框的键盘出口:Enter 存、Esc 取消(行为随 2026-08-26「tsx 不许内嵌函数」
  // 迁进 ./functions 的 makeNickKey;摆在 saveNick 之后是因为工厂当场就要吃它)
  const onNickKey = makeNickKey({ saveNick, setNick })

  const buy = async (plan: '30' | '90') => {
    setBuying(true); setBuyErr('')
    try { (window as any).umami?.track('checkout', { plan }) } catch { /* E7-02:Checkout 发起事件 */ }
    try {
      const r = await fetch('/api/stripe/checkout', {
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
    <AccountShell>
      {/* 全站共享顶栏/页脚(2026-07-16 用户拍板统一 header/footer);账户在本页为当前态不再链自己 */}
      <Header lang={lang} setLang={setLangSaved} t={t} active="account" />

      {checked && me != null && (
        <AccountColumns narrow={narrow}
          nav={<AccountNav sec={sec} narrow={narrow} t={t} onPick={setSec} onLogout={logout} />}>
          {sec === 'overview' && (
            <AccountOverview me={me}
              pro={pro}
              payOk={payOk}
              nick={nick}
              nickBusy={nickBusy}
              t={t}
              onNickEdit={() => setNick(me.displayName || '')}
              onNickChange={setNick}
              onNickSave={saveNick}
              onNickKey={onNickKey} />
          )}
          {/* 移民档案(E5-00):匹配层输入;key 按 id 防换号残留 */}
          {sec === 'profile' && (<>
            <ProfileForm key={String(me.id)} t={t} userId={me.id} initial={me.profile ?? null} />
            {/* 简历存档(E11-08):能看能删是能存的前提,与「存」同批上线 */}
            <ResumeArchive key={'ra' + String(me.id)} t={t} userId={me.id} text={me.profile?.resumeText} savedAt={me.profile?.resumeSavedAt} />
          </>)}
          {/* 已保存筛选(E5-03):邮件提醒管理 */}
          {/* 我的收藏(#62A):同一收藏数据的纯列表视图,独立成节 */}
          {sec === 'favs' && <SavedJobsList t={t} variant="favs" />}
          {sec === 'sjobs' && <SavedJobsList t={t} userId={me.id} weeklyOptOut={!!(me as { weeklyOptOut?: boolean }).weeklyOptOut} />}
          {sec === 'saved' && <SavedSearchList t={t} />}
          {/* 时长包购买(E3-03):Pro 也可续买,到期日顺延 */}
          {sec === 'buy' && <AccountBuyPanel t={t} buying={buying} buyErr={buyErr} onBuy={buy} />}
        </AccountColumns>
      )}
      {/* 未登录:回首页弹登录框(不渲染独立登录页) */}
      {checked && me == null && <AccountRedirect />}
      <Footer t={t} />
    </AccountShell>
  )
}
