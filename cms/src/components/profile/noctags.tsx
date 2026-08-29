'use client'
/**
 * 已选职业的标签串:一枚标签 = 人话职业名(nocTitleOf 藏码)+ × 摘除钮
 * (经 Button,ghost 底 + .tagDel 加倍类)。没选任何职业时整块不渲。
 * 2026-08-27 换装批自 ProfileForm.tsx 的内联标签段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 22:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { DEL_MARK, PLAIN_BTN_KIND } from './constants'
import { makeNocDrop, nocTitleOf } from './functions'
import type { NocTagsIn } from './types'
import css from './profile.module.css'

/**
 * 已选职业的标签一行。
 *
 * @param props 已选清单、落格、选项全集与取词函数(见 NocTagsIn 逐格注释)。
 * @returns 标签一行;没选 = null。
 */
export function NocTags({ nocs, setNocs, opts, t }: NocTagsIn) {
  if (nocs.length === 0) {
    return null
  }
  const tags = []
  for (const c of nocs) {
    tags.push(
      <span key={c} className={css.tagPill}>
        {nocTitleOf({ code: c, opts, t })}
        <Button kind={PLAIN_BTN_KIND} onClick={makeNocDrop({ code: c, nocs, setNocs })} className={cssOf(css.tagDel)}>
          {DEL_MARK}
        </Button>
      </span>,
    )
  }
  return <div className={css.tagRow}>{tags}</div>
}
