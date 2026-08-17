'use client'
// 简历存档(E11-08 §2「账户页能看能删」):档案节里的一块——存档时间 + 字符数 + 就地展开只读 + 清除。
// 数据来自父页已拉到的 /api/users/me(不再自己拉);清除走 Payload PATCH /api/users/:id(照 ProfileForm 的写法)。
// 形态照 SavedJobsList:标题 13.5/600 + 灰字小注 + 右侧灰色文字钮;清除要二次确认(简历是用户资产,删了不可逆)。
import { useState } from 'react'
import type { TFn } from '../jobs/i18n'
import { UI } from '../ui'

const linkBtn: React.CSSProperties = {
  border: 'none', background: 'none', padding: '4px 2px', fontSize: 12.5,
  cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 32,
}

export function ResumeArchive({ t, userId, text, savedAt }: {
  t: TFn; userId: string | number; text?: string | null; savedAt?: string | null
}) {
  const [cur, setCur] = useState((text || '').trim())
  const [at, setAt] = useState(savedAt || '')
  const [open, setOpen] = useState(false)
  const [sure, setSure] = useState(false)   // 二次确认:清除钮就地变「确认清除 / 取消」,不上弹框

  const clear = async () => {
    setCur(''); setAt(''); setOpen(false); setSure(false)   // 先本地移除(照 SavedJobsList),再发请求
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: { resumeText: null, resumeSavedAt: null } }),
    }).catch(() => { /* 本地已移除;失败下次刷新自会显出来 */ })
  }

  return (
    <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${UI.hairline}` }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>{t('rm.arch.title')}</div>
      {!cur ? (
        <div style={{ fontSize: 12.5, color: UI.text3, marginTop: 6 }}>{t('rm.arch.empty')}</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <span style={{ flex: 1, minWidth: 150, fontSize: 12.5, color: UI.text2 }}>
              {t('rm.arch.meta', { d: at.slice(0, 10), n: cur.length })}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <button onClick={() => setOpen(!open)} style={{ ...linkBtn, color: UI.primary }}>{t(open ? 'rm.arch.hide' : 'rm.arch.view')}</button>
              {sure ? (
                <>
                  <button onClick={clear} style={{ ...linkBtn, color: UI.danger, fontWeight: 600 }}>{t('rm.arch.sure')}</button>
                  <button onClick={() => setSure(false)} style={{ ...linkBtn, color: UI.text3 }}>{t('rm.arch.cancel')}</button>
                </>
              ) : (
                <button onClick={() => setSure(true)} style={{ ...linkBtn, color: UI.text3 }}>{t('rm.arch.clear')}</button>
              )}
            </div>
          </div>
          {open && (
            <div style={{ marginTop: 8, maxHeight: 260, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontSize: 12.5, lineHeight: 1.7, color: '#374151', background: UI.bg, border: `1px solid ${UI.border}`, borderRadius: 8, padding: '8px 10px' }}>
              {cur}
            </div>
          )}
        </>
      )}
    </div>
  )
}
