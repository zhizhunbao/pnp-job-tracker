'use client'
// 简历对照 JD(G3,设计 docs/design/G3-简历对照JD-20260803.md)。
// 形态(Frank 八轮收敛):左右两栏表格(左=工作要求,右=简历现状,缺的红✗排前、命中绿✓)→
// 尾行「覆盖 M/N」→ 打码区(行数=真实剩余数,ProCard 悬浮)→ 说明小注。
// 简历文本只在内存与本次请求里,不落库不进 localStorage。
import { useRef, useState } from 'react'

import { Modal, ModalTitle } from './Modal'
import { useLang } from '../LangProvider'
import { LockedRows, UI } from '../ui/primitives'
import { track } from '@/lib/track'

type Row = { req: string; hit: boolean; note: string }
type Res = { visible: Row[]; lockedN: number; hitN: number; total: number; rewrite?: string; left: number | null }

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

  // 文件上传(2026-08-03 Frank 把上传从 G3 二期提上来):md/txt 是文本,浏览器直读;
  // pdf/docx 走 /api/resume-extract(复用 E11-07 解析器,内存即弃)。文本回填粘贴框,能看能改。
  const pickFile = async (f: File | null) => {
    if (!f) return
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
        body: JSON.stringify({ jobId, jd, resume, lang }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d || d.error) {
        setErr(d?.error === 'tooShort' ? t('rm.tooShort') : d?.error === 'limit' ? t('rm.limit') : t('rm.err'))
      } else setRes(d)
    } catch { setErr(t('rm.err')) }
    setBusy(false)
  }

  const cell: React.CSSProperties = { padding: '8px 8px 8px 0', borderBottom: `1px solid ${UI.hairline}`, verticalAlign: 'top', fontSize: 13.5 }
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
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '42%', textAlign: 'left', color: UI.text3, fontWeight: 500, fontSize: 12.5, padding: '4px 0', borderBottom: `1px solid ${UI.border}` }}>{t('rm.colReq')}</th>
                <th style={{ textAlign: 'left', color: UI.text3, fontWeight: 500, fontSize: 12.5, padding: '4px 0', borderBottom: `1px solid ${UI.border}` }}>{t('rm.colRes')}</th>
              </tr>
            </thead>
            <tbody>
              {res.visible.map((r, i) => (
                <tr key={i}>
                  <td style={cell}>{r.req}</td>
                  <td style={{ ...cell, color: r.hit ? UI.ok : UI.danger }}>{(r.hit ? '✓ ' : '✗ ') + r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 13, color: UI.text2, padding: '8px 0 2px' }}>{t('rm.cover', { hit: res.hitN, total: res.total })}</div>
          <LockedRows n={res.lockedN} text={t('rm.proText')} cta={t('pro.unlock')}
            onClick={() => { window.location.href = '/pricing?from=match' }} />
          {res.rewrite ? (
            <div style={{ marginTop: 12, fontSize: 13.5, color: '#111827', whiteSpace: 'pre-wrap', background: UI.bg, border: `1px solid ${UI.border}`, borderRadius: 10, padding: '10px 12px' }}>{res.rewrite}</div>
          ) : null}
          {res.left != null ? <div style={{ fontSize: 12, color: UI.text3, marginTop: 8 }}>{t('rm.left', { n: res.left })}</div> : null}
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <textarea value={resume} onChange={(e) => setResume(e.target.value)} placeholder={t('rm.paste')} rows={9}
            style={{ width: '100%', border: `1px solid ${UI.border}`, borderRadius: 8, padding: 10, fontSize: 13, color: '#111827', resize: 'vertical', boxSizing: 'border-box' }} />
          {err ? <div style={{ fontSize: 12.5, color: UI.danger, marginTop: 6 }}>{err}</div> : null}
          <input ref={fileRef} type="file" accept=".pdf,.docx,.md,.markdown,.txt" style={{ display: 'none' }}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
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
