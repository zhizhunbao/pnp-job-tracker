'use client'
// 简历对照 JD(G3,设计 docs/design/G3-简历对照JD-20260803.md)。
// 形态(Frank 八轮收敛):左右两栏表格(左=工作要求,右=简历现状,缺的红✗排前、命中绿✓)→
// 尾行「覆盖 M/N」→ 打码区(行数=真实剩余数,ProCard 悬浮)→ 说明小注。
// 简历文本默认只在内存与本次请求里;E11-08 起用户**主动勾选**才存进账户档案(默认不勾=行为同以前)。
import { useEffect, useRef, useState } from 'react'

import { Modal, ModalTitle } from './Modal'
import { useLang } from '../LangProvider'
import { LockedRows, UI } from '../ui/primitives'
import { DataTable } from '../ui/DataTable'
import { track } from '@/lib/track'

type Row = { req: string; hit: boolean; note: string }
type Res = { visible: Row[]; lockedN: number; hitN: number; total: number; rewrite?: string; left: number | null; saved?: boolean }

export function ResumeMatchModal({ jobId, jd, loggedIn, onClose }: {
  jobId: string | number; jd: string; loggedIn: boolean; onClose: () => void
}) {
  const [lang, , t] = useLang()
  const [resume, setResume] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<Res | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [reading, setReading] = useState(false)
  // 存档(E11-08):save 勾选默认关(红线);archAt=预填来源的存档时刻;touched=用户已自己贴/传过,别拿存档盖掉他的输入
  const [save, setSave] = useState(false)
  const [archAt, setArchAt] = useState('')
  const touched = useRef(false)

  // 打开即预填:已登录且用户还没自己输入 → 拉一次档案里的存档文本。失败静默(拉不到就是今天的老样子)
  useEffect(() => {
    if (!loggedIn) return
    let dead = false
    fetch('/api/users/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const p = d?.user?.profile
        const txt = String(p?.resumeText || '').trim()
        if (dead || !txt || touched.current) return
        setResume(txt); setArchAt(String(p?.resumeSavedAt || ''))
      })
      .catch(() => { /* 静默:存档只是便利,不挡功能 */ })
    return () => { dead = true }
  }, [loggedIn])

  // 文件上传(2026-08-03 Frank 把上传从 G3 二期提上来):md/txt 是文本,浏览器直读;
  // pdf/docx 走 /api/resume-extract(复用 E11-07 解析器,内存即弃)。文本回填粘贴框,能看能改。
  const pickFile = async (f: File | null) => {
    if (!f) return
    touched.current = true; setArchAt('')
    setErr(''); setReading(true)
    try {
      const ext = (f.name.toLowerCase().split('.').pop() || '')
      if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
        setResume((await f.text()).trim())
      } else {
        const fd = new FormData(); fd.append('file', f)
        const r = await fetch('/api/resume-extract', { method: 'POST', credentials: 'include', body: fd })
        const d = await r.json().catch(() => null)
        if (!r.ok || !d?.text) {
          setErr(t(d?.error === 'size' ? 'rm.fileSize' : d?.error === 'scan' ? 'rm.fileScan' : 'rm.fileErr'))
        } else setResume(d.text)
      }
    } catch { setErr(t('rm.fileErr')) }
    setReading(false)
    if (fileRef.current) fileRef.current.value = ''   // 同一文件可重选
  }

  const run = async () => {
    setBusy(true); setErr('')
    track('jd-match-run', {})
    try {
      const r = await fetch('/api/resume-match', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, jd, resume, lang, save }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d || d.error) {
        // 每个错误码说自己的实话(2026-08-03 Frank 实撞:noJd 被笼统报成「稍后再试」,重试也没用)。
        // tooLong/busy 是端点迁移时 route 新发的两个码(见 api/resume-match/route.ts 的 mapped):
        // tooLong=重试没用,得删内容;busy=重试有用。漏了它俩就又变回笼统的「稍后再试」。
        const key = ({
          tooShort: 'rm.tooShort', limit: 'rm.limit', noJd: 'rm.noJd', auth: 'rm.login',
          tooLong: 'rm.tooLong', busy: 'rm.busy',
        } as Record<string, string>)[d?.error] || 'rm.err'
        setErr(t(key))
      } else setRes(d)
    } catch { setErr(t('rm.err')) }
    setBusy(false)
  }

  return (
    <Modal onClose={onClose} size="md" pad>
      {/* 眉题删了(2026-08-03 Frank「不用标 AI 工具」):功能名自己会说话 */}
      <ModalTitle color="#4338ca" title={t('rm.title')} />
      {!loggedIn ? (
        // 登录墙:匿名不给(同时喂注册漏斗)。文案一句话 + 直达登录
        <div style={{ margin: '16px 0 4px', fontSize: 13.5, color: UI.text2 }}>
          <a href="/?login=1" style={{ color: UI.primary, textDecoration: 'none' }}>{t('rm.login')}</a>
        </div>
      ) : res ? (
        <div style={{ marginTop: 12 }}>
          {/* 2026-08-11(Frank「都改成一套」):自造裸 <table> → 公共 DataTable(bare=弹框自己就是白底) */}
          <DataTable<{ req: string; hit: boolean; note: string }> rows={res.visible} rowKey={(_r, i) => String(i)} bare
            cols={[
              { key: 'req', label: t('rm.colReq'), width: '42%', render: (r) => r.req },
              { key: 'res', label: t('rm.colRes'), render: (r) => <span style={{ color: r.hit ? UI.ok : UI.danger }}>{(r.hit ? '✓ ' : '✗ ') + r.note}</span> },
            ]} />
          <div style={{ fontSize: 13, color: UI.text2, padding: '8px 0 2px' }}>{t('rm.cover', { hit: res.hitN, total: res.total })}</div>
          <LockedRows n={res.lockedN} text={t('rm.proText')} cta={t('pro.unlock')}
            onClick={() => { window.location.href = '/pricing?from=match' }} />
          {res.rewrite ? (
            <div style={{ marginTop: 12, fontSize: 13.5, color: '#111827', whiteSpace: 'pre-wrap', background: UI.bg, border: `1px solid ${UI.border}`, borderRadius: 10, padding: '10px 12px' }}>{res.rewrite}</div>
          ) : null}
          {/* 存了就说一句(一行一条,不与剩余次数挤同一行) */}
          {res.saved ? <div style={{ fontSize: 12, color: UI.ok, marginTop: 8 }}>{t('rm.arch.done')}</div> : null}
          {res.left != null ? <div style={{ fontSize: 12, color: UI.text3, marginTop: 8 }}>{t('rm.left', { n: res.left })}</div> : null}
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <textarea value={resume} onChange={(e) => { touched.current = true; setArchAt(''); setResume(e.target.value) }} placeholder={t('rm.paste')} rows={9}
            style={{ width: '100%', border: `1px solid ${UI.border}`, borderRadius: 8, padding: 10, fontSize: 13, color: '#111827', resize: 'vertical', boxSizing: 'border-box' }} />
          {/* 预填来自存档:灰字小注说清「这不是你刚贴的」+ 存档日期;用户一动手就撤掉(已不是存档那份) */}
          {archAt ? <div style={{ fontSize: 12, color: UI.text3, marginTop: 6 }}>{t('rm.arch.used', { d: archAt.slice(0, 10) })}</div> : null}
          {err ? <div style={{ fontSize: 12.5, color: UI.danger, marginTop: 6 }}>{err}</div> : null}
          <input ref={fileRef} type="file" accept=".pdf,.docx,.md,.markdown,.txt" style={{ display: 'none' }}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          {/* 存档勾选**单占一行**:375 上「上传+对照+这句」三件挤一行必折(实测文案宽度已超剩余槽) */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12.5, color: UI.text2, cursor: 'pointer' }}>
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} style={{ flexShrink: 0 }} />
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('rm.arch.save')}</span>
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <button onClick={() => fileRef.current?.click()} disabled={reading || busy}
              style={{ background: '#fff', color: UI.text2, border: `1px solid ${UI.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: reading ? 'default' : 'pointer', opacity: reading ? 0.6 : 1 }}>
              {reading ? '… ' : ''}{t('rm.upload')}
            </button>
            <button onClick={run} disabled={busy || reading}
              style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: 8, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? '… ' : ''}{t('rm.run')}
            </button>
          </div>
          <div style={{ fontSize: 12, color: UI.text3, marginTop: 8 }}>{t('rm.note')}</div>
        </div>
      )}
    </Modal>
  )
}
