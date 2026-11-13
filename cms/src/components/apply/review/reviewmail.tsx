'use client'
/**
 * apply 桶子桶 review 的分块:「邮件」卡的内容(收件人、主题、要现填时的英文姓名、邮件正文)。
 * 2026-11-11 Frank「这个下面占了很大位置,但是内容很少,是不是放到最上面,合并一下内容。然后把空间留给三面的内容」:
 * 原先在三栏下面的「邮件」卡(reviewfoot.tsx)挪到三栏上面,底部只留按钮行。
 * 同日 Frank「这个需要格式」:收进一张矮卡 —— 左半收件人与主题(标签一列对齐),右半邮件正文(浅底框;同日「这个格式不对」:段间留一行空,和发出去的信一样)。
 * 同日 Frank「这部分要不也改成卡片的,一共四个卡片如何」:不再单占顶上一行,和简历、求职信、职位描述并排成第四张卡
 * (卡壳用 ReviewPane,这里只出内容:收发信息在上、正文在下)。
 * 同日 Frank「应该是用户可以编辑吧」:本人改过正文的显示改过的那一份(卡头「修改」开右侧栏),没改过显示默认正文。
 *
 * @author Frank
 * @time 2026-11-11 22:30:00
 */
import { cssOf } from '@/components/css'
import { mailSubjectOf, mailTextOf } from '@/lib/apply'
import { PARA_SEP, TEXT_NONE } from './constants'
import type { ReviewFootIn } from './types'
import css from './review.module.css'

/**
 * 邮件卡的内容。
 *
 * @param props 整机与收发信息。
 * @returns 收发信息与正文。
 */
export function ReviewMail({ p, x }: ReviewFootIn) {
  const parts = { title: x.title, city: x.city, province: x.province, name: x.name, subject: x.subject }
  const mailText = mailTextOf({ title: x.title, city: x.city, province: x.province, name: x.name, cover: true })
  let shown = mailText
  if (p.mail !== TEXT_NONE) {
    shown = p.mail
  }
  const paras = []
  for (const [i, para] of shown.split(PARA_SEP).entries()) {
    paras.push(<p key={i}>{para}</p>)
  }
  return (
    <div className={cssOf(css.mailStack)}>
      <dl className={cssOf(css.mailGrid)}>
        <dt>{x.t('tr.to')}</dt>
        <dd>{x.to}</dd>
        <dt>{x.t('tr.subject')}</dt>
        <dd>{mailSubjectOf(parts)}</dd>
        {x.askName && <dt>{x.t('ap.name')}</dt>}
        {x.askName && (
          <dd>
            <input className={cssOf(css.nameInput)}
              value={x.name}
              onChange={x.onName}
              aria-label={x.t('ap.name')}
              placeholder={x.t('ap.name')} />
          </dd>
        )}
      </dl>
      <dl className={cssOf(css.mailGrid)}>
        <dt>{x.t('tr.mailBody')}</dt>
        <dd className={cssOf(css.mailBody)}>{paras}</dd>
      </dl>
    </div>
  )
}
