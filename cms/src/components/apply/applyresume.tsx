'use client'
/**
 * 第 1 步:简历 + 英文姓名(与简历一致)。
 * 2026-10-07 二改(Frank「我的简历 我的 cover letter 是不是要跟着已投职位走」→ 按岗选简历):不再整张照搬「我的简历」卡片
 * (那样只能附默认那份),改成本人几份简历点选一份(默认那份先选中),旁边就地「添加简历」(传到「我的简历」同一个接口)。
 * 2026-10-10 投递框三步(docs/design/我的/我的求职-20261009.md 2.4):一张分区卡 —— 卡头右侧「按职位改写」「上传新简历」,
 * 下面左列简历单选、右列(手机在下面)选中那份的首页预览;英文姓名一行撤(档案里没有才在「确认」页问,Frank「这两个有必要吗」)。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { Button } from '@/components/button'
import { ApplyCard } from './applycard'
import { ApplyFileInput } from './applyfileinput'
import { ApplyPick } from './applypick'
import { ApplyShow } from './applyshow'
import {
  ADD_KEY, BTN_SECONDARY, DEFAULT_KEY, ERR_KEY_RESUME, MIME_PDF, RADIO_NAME, RESUME_ACCEPT, REWRITE_KEY, SOON_KEY,
  TEXT_NONE,
} from './constants'
import { uploadedTextOf } from './functions'
import type { ApplyStepIn } from './types'
import css from './apply.module.css'

/**
 * 第 1 步。
 *
 * @param props 整机面板。
 * @returns 简历分区卡。
 */
export function ApplyResume({ p }: ApplyStepIn) {
  const rows = []
  for (const r of p.resumes) {
    let tag = TEXT_NONE
    if (r.isDefault) {
      tag = p.t(DEFAULT_KEY)
    }
    rows.push(
      <ApplyPick key={r.id}
        group={RADIO_NAME}
        label={r.fileName}
        sub={uploadedTextOf({ t: p.t, at: r.uploadedAt })}
        tag={tag}
        checked={r.id === p.resumeId}
        onPick={p.pickOf(r.id)} />,
    )
  }
  const acts = (
    <>
      <Button kind={BTN_SECONDARY} sm onClick={p.onResumeRewrite}>{p.t(REWRITE_KEY)}</Button>
      <Button kind={BTN_SECONDARY} sm onClick={p.onAdd} busy={p.uploading}>{p.t(ADD_KEY)}</Button>
      <ApplyFileInput onMount={p.onInputMount} onPick={p.onFile} accept={RESUME_ACCEPT} />
    </>
  )
  return (
    <ApplyCard p={p} acts={acts}>
      {p.soon && <div className={css.note}>{p.t(SOON_KEY)}</div>}
      <div className={css.split}>
        <div className={css.picks}>
          {rows}
          {rows.length === 0 && <div className={css.note}>{p.t(ERR_KEY_RESUME)}</div>}
        </div>
        {p.resumeSrc !== TEXT_NONE && p.resumeMime === MIME_PDF && (
          <ApplyShow key={p.resumeSrc} src={p.resumeSrc} t={p.t} />
        )}
        {p.resumeSrc !== TEXT_NONE && p.resumeMime !== MIME_PDF && <div className={css.note}>{p.t('ap.noPv')}</div>}
      </div>
    </ApplyCard>
  )
}
