'use client'
/**
 * 域内小件:对照前的输入那一屏 —— 粘贴框 + 存档小注 + 错误行 + 存档勾选 + 上传/对照两个钮
 * + 免费额度小注。文件选择框自己不出面(由上传钮点它)。
 * 预填来自存档时,灰字小注说清「这不是你刚贴的」并带上存档日期;用户一动手就撤掉小注
 * (框里的已经不是存档那份)。存档勾选默认不勾是 E11-08 的隐私红线:不勾 = 简历只在内存
 * 与本次请求里,行为同以前。
 * 2026-08-28 换装批自 ResumeMatchModal.tsx 的输入分支提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:53:00
 */
import { ymd } from '@/lib/time'
import { Button } from '@/components/button'
import { FILE_ACCEPT, INPUT_CHECKBOX, INPUT_FILE, PASTE_ROWS, PLAIN_BTN_KIND, TEXT_NONE } from './constants'
import { busyMarkOf, runClsOf, uploadClsOf } from './functions'
import type { MatchFormIn } from './types'
import css from './resume.module.css'

/**
 * 渲染输入表单。
 *
 * @param props 取词函数、四格状态、文件选择框 ref 与五只手柄。
 * @returns 输入这一屏。
 */
export function MatchForm({
  t,
  resume,
  busy,
  reading,
  err,
  archAt,
  save,
  fileRef,
  onResumeChange,
  onPickFile,
  onUpload,
  onSaveToggle,
  onRun,
}: MatchFormIn) {
  return (
    <div className={css.pane}>
      <textarea value={resume}
        onChange={onResumeChange}
        placeholder={t('rm.paste')}
        rows={PASTE_ROWS}
        className={css.paste} />
      {archAt !== TEXT_NONE && <div className={css.archNote}>{t('rm.arch.used', { d: ymd(archAt) })}</div>}
      {err !== TEXT_NONE && <div className={css.errNote}>{err}</div>}
      <input ref={fileRef}
        type={INPUT_FILE}
        accept={FILE_ACCEPT}
        className={css.fileInput}
        onChange={onPickFile} />
      <label className={css.saveLabel}>
        <input type={INPUT_CHECKBOX} checked={save} onChange={onSaveToggle} className={css.saveBox} />
        <span className={css.saveText}>{t('rm.arch.save')}</span>
      </label>
      <div className={css.actions}>
        <Button kind={PLAIN_BTN_KIND}
          className={uploadClsOf({ reading })}
          disabled={reading || busy}
          onClick={onUpload}>
          {busyMarkOf({ on: reading })}{t('rm.upload')}
        </Button>
        <Button kind={PLAIN_BTN_KIND}
          className={runClsOf({ busy })}
          disabled={busy || reading}
          onClick={onRun}>
          {busyMarkOf({ on: busy })}{t('rm.run')}
        </Button>
      </div>
      <div className={css.dimNote}>{t('rm.note')}</div>
    </div>
  )
}
