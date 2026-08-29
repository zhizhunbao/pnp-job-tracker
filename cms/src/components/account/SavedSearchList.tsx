'use client'
/**
 * 已保存筛选管理(E5-03):列表 + 删除。数据走 Payload REST(access 已限本人);
 * 一行 = 订阅名 + 最近提醒时刻(TimeText;没发过不渲)+ 删除钮(淡红底 ——
 * 真删除,与收藏行的弱灰移除 × 不同档)。删除以服务端为准:DELETE 后重拉清单,
 * 不做本地乐观移除。状态机器住 hooks 的 useSavedSearches。
 * 2026-08-27 换装批自 SavedSearchList.tsx(PascalCase 迁移存量)整体重写。
 *
 * @author Frank
 * @time 2026-08-27 22:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconMail } from '@/components/icons'
import { TimeText } from '@/components/time'
import { PLAIN_BTN_KIND } from './constants'
import { makeSearchDel } from './functions'
import { useSavedSearches } from './hooks'
import type { SavedSearchListIn } from './types'
import css from './account.module.css'

/**
 * 已存筛选节。
 *
 * @param props 取词函数(见 SavedSearchListIn 逐格注释)。
 * @returns 已存筛选整块。
 */
export function SavedSearchList({ t }: SavedSearchListIn) {
  const p = useSavedSearches()
  let body = null
  if (p.items != null) {
    if (p.items.length === 0) {
      body = <div className={css.ssEmpty}>{t('ss.none')}</div>
    } else {
      const rows = []
      for (const x of p.items) {
        rows.push(
          <div key={x.id} className={css.ssRow}>
            <span className={css.ssName}><IconMail /> {x.name}</span>
            {x.lastNotifiedAt != null && <TimeText iso={x.lastNotifiedAt} />}
            <Button kind={PLAIN_BTN_KIND}
              onClick={makeSearchDel({ id: x.id, refresh: p.refresh })}
              className={cssOf(css.ssDel)}>
              {t('ss.del')}
            </Button>
          </div>,
        )
      }
      body = <div className={css.ssList}>{rows}</div>
    }
  }
  return (
    <div>
      <div className={css.secTitle}><IconMail /> {t('ss.title')}</div>
      <div className={css.secHint}>{t('ss.note')}</div>
      {body}
    </div>
  )
}
