'use client'
/**
 * apply 桶子桶 review 的分块:底部一行。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { isSenderName } from '@/lib/apply'
import { Notice } from '@/components/notice'
import { Tag } from '@/components/tag'
import { BTN_SECONDARY, NOTICE_ERR, TAG_INFO, TEXT_NONE } from './constants'
import type { ReviewFootIn } from './types'
import css from './review.module.css'

/**
 * 底部一行:收件信息、错误与发送钮。
 * 2026-11-09 Frank 定的投递动线:多一行「已自动保存,可在我的投递里继续」和小入口「改投基础简历」;
 * 要现填姓名而姓名还不合规时发送钮禁用(邮件主题里的姓名不能为空)。
 * 2026-11-10 Frank「这部分看着有点密」:标签灰字一列、值一列;正文放进浅底框;额度、自动保存与发送钮单独一行。
 * 2026-11-10 Frank「这个邮件正文 默认都显示出来吧」:正文不再折叠,宽屏排在收发信息右边,窄屏排在下面。
 * 2026-11-10 Frank「这部分是不是也用个卡片」:收发信息与发送钮收进一张分区卡,卡头「邮件」,和上面三张卡同形。
 * 2026-11-10 Frank「三样挤在一行」:左边只留额度与自动保存两句灰字;「改投基础简历」挪到右边、发送钮左侧,做成次要钮。
 * 同日 Frank「这个免费额度是不是在哪高亮显示一下」:剩余额度那一句改成胶囊(站规:小信号一律胶囊)。
 * 同日 Frank「邮件区不能一直占住半屏」:按钮行提出邮件卡单独成底栏,宽屏只有它贴框底;邮件卡留在正文里随三栏滚动
 * (Fluent 2 Dialog Scrolling:贴住不动的只有标题与带按钮的页脚)。出错提示跟着底栏,发送失败时不用滚就看得到。
 * 2026-11-11 Frank「放到最上面,合并一下内容」:邮件卡挪到三栏上面成一行(reviewmail.tsx),这里只剩按钮行。
 *
 * @param props 整机与收发信息。
 * @returns 一行。
 */
export function ReviewFoot({ p, x }: ReviewFootIn) {
  const nameBad = x.askName && isSenderName(x.name.trim()) === false
  return (
    <>
      <div className={cssOf(css.bar)}>
        {p.err !== TEXT_NONE && <Notice kind={NOTICE_ERR}>{x.t(p.err)}</Notice>}
        <div className={cssOf(css.footRow)}>
          <div className={cssOf(css.saved)}>
            <Tag variant={TAG_INFO}>{x.leftText}</Tag>
            <span>{x.t('ap.autoSaved')}</span>
          </div>
          <div className={cssOf(css.footActs)}>
            <Button kind={BTN_SECONDARY} onClick={x.onBase} disabled={p.stage !== TEXT_NONE}>{x.t('ap.toBase')}</Button>
            <Button onClick={p.onSend} busy={p.sending} disabled={p.stage !== TEXT_NONE || p.review == null || nameBad}>
              {x.t('tr.send')}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
