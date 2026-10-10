'use client'
/**
 * 一封求职信的卡片(2026-10-08):职位名、公司、「已投递」或「草稿」胶囊、写于日期;发出去的「打开」PDF,草稿「继续」去投递区。
 * 形同简历卡(同一套 rf* 类)。
 * 2026-10-09 N6 批(Frank「职位名、公司名、地点同形」「点击默认弹框」):职位名、公司名换 name 桶的现成件(JobName / CompanyName)——
 * 英文在上、界面语译名灰字在下;职位名点了叠开职位框(职位删了照旧黑字)。求职信清单不带公司 slug 与公司 / 职位名译名,
 * 公司名暂为黑字一行、职位名不带灰字(数据口补上再接)。
 *
 * @author Frank
 * @time 2026-10-08 10:00:00
 */
import { Button } from '@/components/button'
import { CompanyName, JobName, Name } from '@/components/name'
import { Tag } from '@/components/tag'
import { ymd } from '@/lib/time'
import { LETTER_DRAFT_TAG, LETTER_SENT_TAG, RF_ACT_KIND, RF_ADD_KIND, TARGET_BLANK, TEXT_NONE } from './constants'
import { isLetterDraft, letterContinueHrefOf, letterFileHrefOf } from './functions'
import type { LetterCardIn } from './types'
import css from './account.module.css'

/**
 * 渲染一张求职信卡。
 *
 * @param props 这一封与取词函数。
 * @returns 卡片。
 */
export function LetterCard({ m, t }: LetterCardIn) {
  const draft = isLetterDraft(m)
  const cont = letterContinueHrefOf(m)
  return (
    <div className={css.rfCard}>
      <div className={css.rfInfo}>
        <div className={css.rfName}>
          {m.jobId != null && <JobName id={m.jobId} title={m.title} sub={TEXT_NONE} />}
          {m.jobId == null && <Name en={m.title} sub={TEXT_NONE} />}
        </div>
        <div className={css.rfMeta}>
          <CompanyName name={m.company} slug={TEXT_NONE} zh={TEXT_NONE} ko={TEXT_NONE} />
        </div>
        <div className={css.rfTagLine}>
          {draft && <Tag variant={LETTER_DRAFT_TAG}>{t('mj.draft')}</Tag>}
          {draft === false && <Tag variant={LETTER_SENT_TAG}>{t('ap.applied')}</Tag>}
        </div>
        <div className={css.rfMeta}>{t('rl.wrote', { d: ymd(m.wroteAt) })}</div>
        <div className={css.rfActs}>
          {draft && cont !== TEXT_NONE && <Button kind={RF_ADD_KIND} sm href={cont}>{t('mj.cont')}</Button>}
          {draft === false && (
            <Button kind={RF_ACT_KIND} sm href={letterFileHrefOf(m)} target={TARGET_BLANK}>{t('mj.open')}</Button>
          )}
        </div>
      </div>
    </div>
  )
}
