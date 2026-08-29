'use client'
/**
 * 收藏清单里的一行(E9-01):职位名 + 公司行(带「查看」回职位板搜)+ 控件组
 * (看板状态下拉 + 移除 ×)。#53:下拉与 × 包成不换行小组,窄屏换行时一起走
 * (× 单飞到卡片左下角会与行脱节)。favs 视图(#62A)不出状态下拉。
 * 快照缺职位名时显示占位横杠,同时不出「查看」链接(没名搜不出东西)。
 * 2026-08-27 换装批自 SavedJobsList.tsx 的行渲染段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 22:00:00
 */
import { Button, LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { DEL_MARK, PLAIN_BTN_KIND, SJ_SEP, SJ_STATUS_TABS, TITLE_NONE_MARK } from './constants'
import { jobSearchHrefOf, makeJobRemove, makeJobStatusChange } from './functions'
import type { SavedJobRowIn } from './types'
import css from './account.module.css'

/**
 * 收藏清单的一行。
 *
 * @param props 这一行、视图档与清单落格(见 SavedJobRowIn 逐格注释)。
 * @returns 一行(职位块 + 控件组)。
 */
export function SavedJobRow({ row, favs, items, setItems, t }: SavedJobRowIn) {
  let title = row.title
  if (title === '') {
    title = TITLE_NONE_MARK
  }
  const options = []
  for (const s of SJ_STATUS_TABS) {
    options.push(
      <option key={s.st} value={s.st}>{t(s.key)}</option>,
    )
  }
  return (
    <div className={css.jobRow}>
      <div className={css.jobMain}>
        <div className={css.jobTitle}>{title}</div>
        <div className={css.jobSub}>
          {row.company}
          {row.title !== '' && (
            <>
              {SJ_SEP}
              <LinkButton href={jobSearchHrefOf({ title: row.title })} className={cssOf(css.jobView)}>
                {t('sj.view')}
              </LinkButton>
            </>
          )}
        </div>
      </div>
      <div className={css.jobCtl}>
        {favs === false && (
          <select value={row.status}
            onChange={makeJobStatusChange({ id: row.id, items, setItems })}
            className={css.jobStatusSel}>
            {options}
          </select>
        )}
        <Button kind={PLAIN_BTN_KIND}
          onClick={makeJobRemove({ id: row.id, items, setItems })}
          title={t('sj.del')}
          ariaLabel={t('sj.del')}
          className={cssOf(css.rowDel)}>
          {DEL_MARK}
        </Button>
      </div>
    </div>
  )
}
