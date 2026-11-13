'use client'
/**
 * me 桶子桶 inbox 的结构:收件箱正文(效果图 docs/design/我的/我的框架-20261107.md 2.2):一张卡,宽屏左清单右阅读区,
 * 窄屏只出清单、点一封弹框看;回信走弹框。拉失败、没信各一句。
 * 2026-11-07 照 Outlook 网页版(Frank「和 outlook 一致就行」):卡高随窗口,两栏各自滚;清单顶上搜索框 + 「全部 / 未读 N」页签;
 * 宽屏没选中时阅读区一句「选一封邮件来看」;回信改在阅读区就地写(回信弹框撤)。
 * 2026-11-13 Frank「我的这个排版和 outlook 不一样啊」:清单与阅读区拆成两张卡(Outlook 是两块面板,中间留缝);
 * 清单按日期分组,每组一行组头(今天 / 昨天 / 本周 / 更早)。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { cssOf } from '@/components/css'
import { Search } from '@/components/search'
import { Tabs } from '@/components/tabs'
import { CARD_MD_CLS, FILTER_ALL, FILTER_ARIA_KEY, FILTER_TABS_ID, FILTER_UNREAD, GROUP_LABEL_KEY } from './constants'
import { groupsOf, unreadBadgeOf } from './functions'
import { InboxModal } from './inboxmodal'
import { InboxRead } from './inboxread'
import { InboxRow } from './inboxrow'
import type { InboxPartIn } from './types'
import css from './inbox.module.css'

/**
 * 收件箱正文。
 *
 * @param props 收件箱状态与取词。
 * @returns 卡 + 窄屏读信弹框。
 */
export function InboxBody({ p, t }: InboxPartIn) {
  if (p.failed) {
    return <section className={CARD_MD_CLS}><div className={cssOf(css.note)}>{t('mj.fail')}</div></section>
  }
  if (p.data == null) {
    return null
  }
  if (p.data.items.length === 0) {
    return <section className={CARD_MD_CLS}><div className={cssOf(css.note)}>{t('ib.empty')}</div></section>
  }
  const rows = []
  for (const g of groupsOf({ items: p.shown, now: p.now })) {
    rows.push(<div key={g.key} className={cssOf(css.ibGroup)}>{t(GROUP_LABEL_KEY[g.key])}</div>)
    for (const m of g.items) {
      const on = p.narrow === false && p.cur != null && p.cur.id === m.id
      rows.push(<InboxRow key={m.id} m={m} now={p.now} on={on} onClick={p.pickOf(m.id)} t={t} />)
    }
  }
  const filters = [
    { key: FILTER_ALL, label: t('ib.all') },
    { key: FILTER_UNREAD, label: t('ib.unreadTab'), badge: unreadBadgeOf(p.unreadN) },
  ]
  return (
    <>
      <section className={cssOf(css.ibCard)}>
        <div className={cssOf(css.ibList)}>
          <div className={cssOf(css.ibListHead)}>
            <Search value={p.q} onChange={p.onQ} placeholder={t('ib.search')} />
            <Tabs items={filters} value={p.filter} onChange={p.onFilter} ariaLabel={t(FILTER_ARIA_KEY)}
              idPrefix={FILTER_TABS_ID} />
          </div>
          <div className={cssOf(css.ibRows)}>
            {rows}
            {rows.length === 0 && <div className={cssOf(css.note)}>{t('ib.noHit')}</div>}
          </div>
        </div>
        {p.narrow === false && (
          <div className={cssOf(css.ibPane)}>
            {p.cur != null && <InboxRead p={p} m={p.cur} t={t} />}
            {p.cur == null && <div className={cssOf(css.ibPick)}>{t('ib.pick')}</div>}
          </div>
        )}
      </section>
      {p.narrow && p.cur != null && <InboxModal p={p} m={p.cur} t={t} />}
    </>
  )
}
