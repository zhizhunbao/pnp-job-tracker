'use client'
/**
 * me 桶子桶 inbox 的结构:收件箱阅读区(照效果图:主题、发件人一行、来信与我的回信按先后排,最下面一颗「回复」;
 * 对得上投递的多一颗「打开这次投递」)。宽屏住右边一栏,窄屏装进弹框。
 * 2026-11-07 照 Outlook 网页版(Frank「和 outlook 一致就行」):顶上一排命令(回复、打开这次投递);大字主题,
 * 对得上投递的下面一行「关于你投的 <职位>」;来信与回信各一张卡片(InboxMsg);会话底部「回复」点了原地展开写信框(InboxCompose)。
 * 2026-11-12 Frank「这有两个回复也修一下」:顶上命令栏的「回复」撤掉,只留会话底部那一颗(点了原地展开写信框);
 * 命令栏只剩「打开这次投递」,对不上投递的信不出命令栏。
 * 2026-11-13 Frank「先修收件箱问题」:窄屏弹框里也出大字主题 —— 弹框标题栏是固定一行,长主题被截成「Re: Application for Kitchen Help…」,
 * 完整主题只能放正文里(弹框标题改写发件人,见 InboxModal);`inModal` 一格随之撤。
 * 同日 Frank「我的这个排版和 outlook 不一样啊」:「回复」从会话底部挪到来信卡头右上角(Outlook 的位置,时刻在它下面),
 * 底部那一颗撤,仍只有一颗「回复」;点了照旧在会话底部展开写信框。
 * 同日 Frank「这个算不算废话」:来信卡头第二行的「<地址> 发给 我」撤,发件人有名字时才在第二行出地址。
 * 同日 Frank「这个呢」:我的回信卡头第二行「发给 <地址>」也撤(这一串只有一个对方,就是上面那位发件人)。
 * 同日 Frank「是不是像 outlook 一样 放到最下面呢?」:「回复」从来信卡头右上角撤回会话最下面(补了多封往来后看,
 * 读完整串再回更顺;Outlook 信的最下面也有一颗)。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconBriefcase } from '@/components/icons'
import { PLAIN_BTN_KIND, TEXT_NONE } from './constants'
import { fromLineOf, minuteOf, senderOf, subjectOf } from './functions'
import { InboxCompose } from './inboxcompose'
import { InboxMsg } from './inboxmsg'
import type { InboxReadIn } from './types'
import css from './inbox.module.css'

/**
 * 阅读区。
 *
 * @param props 收件箱状态、那一封、取词与装在弹框里否。
 * @returns 命令栏(对得上投递才有)+ 一封信的往来 + 回信区。
 */
export function InboxRead({ p, m, t }: InboxReadIn) {
  const mine = []
  for (const r of m.replies) {
    mine.push(
      <InboxMsg key={r.id} who={t('ib.me')} avatarName={t('ib.me')} toLine={TEXT_NONE}
        at={minuteOf(r.at)} text={r.text} />,
    )
  }
  return (
    <div className={cssOf(css.ibRead)}>
      {m.appId != null && (
        <div className={cssOf(css.ibCmd)}>
          <Button kind={PLAIN_BTN_KIND} onClick={p.onOpenApp} className={cssOf(css.ibCmdBtn)}>
            <IconBriefcase />{t('ib.openApp')}
          </Button>
        </div>
      )}
      <div className={cssOf(css.ibConv)}>
        <h2 className={cssOf(css.ibReadTitle)}>{subjectOf({ m, t })}</h2>
        {m.jobTitle !== TEXT_NONE && <div className={cssOf(css.ibAbout)}>{t('ib.about', { job: m.jobTitle })}</div>}
        <InboxMsg who={senderOf(m)} avatarName={senderOf(m)} toLine={fromLineOf(m)}
          at={minuteOf(m.at)} text={m.text} />
        {mine}
        <InboxCompose p={p} m={m} t={t} />
      </div>
    </div>
  )
}
