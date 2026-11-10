'use client'
/**
 * apply 桶子桶 review 的分块:底部一行。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { isSenderName, mailSubjectOf, mailTextOf } from '@/lib/apply'
import { Notice } from '@/components/notice'
import { BTN_GHOST, CLS_CARD_MD, CLS_MCARD_HEAD, NOTICE_ERR, ONE_SPACE, TEXT_NONE } from './constants'
import type { ReviewFootIn } from './types'
import css from './review.module.css'

/**
 * 底部一行:收件信息、错误与发送钮。
 * 2026-11-09 Frank 定的投递动线:多一行「已自动保存,可在我的投递里继续」和小入口「改投基础简历」;
 * 要现填姓名而姓名还不合规时发送钮禁用(邮件主题里的姓名不能为空)。
 * 2026-11-10 Frank「这部分看着有点密」:标签灰字一列、值一列;正文放进浅底框;额度、自动保存与发送钮单独一行。
 * 2026-11-10 Frank「这个邮件正文 默认都显示出来吧」:正文不再折叠,宽屏排在收发信息右边,窄屏排在下面。
 * 2026-11-10 Frank「这部分是不是也用个卡片」:收发信息与发送钮收进一张分区卡,卡头「邮件」,和上面三张卡同形。
 *
 * @param props 整机与收发信息。
 * @returns 一行。
 */
export function ReviewFoot({ p, x }: ReviewFootIn) {
  const parts = { title: x.title, city: x.city, province: x.province, name: x.name }
  const mailText = mailTextOf({ title: x.title, city: x.city, province: x.province, name: x.name, cover: true })
  const nameBad = x.askName && isSenderName(x.name.trim()) === false
  return (
    <div className={cssOf(css.foot)}>
      {p.err !== TEXT_NONE && <Notice kind={NOTICE_ERR}>{x.t(p.err)}</Notice>}
      <section className={CLS_CARD_MD + ONE_SPACE + cssOf(css.footCard)}>
        <div className={CLS_MCARD_HEAD}>{x.t('tr.mailHead')}</div>
        <div className={cssOf(css.mailCols)}>
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
          <div className={cssOf(css.mailMore)}>
            <div className={cssOf(css.mailName)}>{x.t('tr.mailBody')}</div>
            <div className={cssOf(css.mailBody)}>{mailText}</div>
          </div>
        </div>
        <div className={cssOf(css.footRow)}>
          <div className={cssOf(css.saved)}>
            <span>{x.leftText}</span>
            <span>{x.t('ap.autoSaved')}</span>
            <Button kind={BTN_GHOST} sm onClick={x.onBase} disabled={p.stage !== TEXT_NONE}>{x.t('ap.toBase')}</Button>
          </div>
          <Button onClick={p.onSend} busy={p.sending} disabled={p.stage !== TEXT_NONE || p.review == null || nameBad}>
            {x.t('tr.send')}
          </Button>
        </div>
      </section>
    </div>
  )
}
