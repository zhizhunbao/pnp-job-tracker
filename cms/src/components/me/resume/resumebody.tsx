'use client'
/**
 * me 桶子桶 resume 的结构:「我的简历」正文(效果图 docs/design/我的/我的框架-20261107.md 2.3 / 1.4):一张分区卡,
 * 顶上页签「简历 n / 20」「求职信 n」,下面各自一张表(手机是一条条);卡里最下一行报错。
 * 卡外挂隐藏文件框、预览框、删除确认框(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」)、
 * 生成简历窗口(cv 桶;存成了重拉清单)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { CvBuilder } from '@/components/cv'
import { ConfirmModal } from '@/components/modal'
import { TabPanel, Tabs } from '@/components/tabs'
import { CARD_MD_CLS, TAB_ID_PREFIX, TAB_LETTER, TAB_RESUME, TEXT_NONE } from './constants'
import { tabItemsOf } from './functions'
import { LetterList } from './letterlist'
import { ResumeInput } from './resumeinput'
import { ResumeList } from './resumelist'
import { ResumePreview } from './resumepreview'
import type { ResumePartIn } from './types'
import css from './resume.module.css'

/**
 * 「我的简历」正文。
 *
 * @param props 「我的简历」整机面板与取词。
 * @returns 卡 + 弹框。
 */
export function ResumeBody({ r, t }: ResumePartIn) {
  return (
    <>
      <section className={CARD_MD_CLS}>
        <Tabs items={tabItemsOf({ r, t })} value={r.tab} onChange={r.onTab} ariaLabel={t('rm.arch.title')}
          idPrefix={TAB_ID_PREFIX} />
        <TabPanel tabKey={TAB_RESUME} active={r.tab === TAB_RESUME} idPrefix={TAB_ID_PREFIX}>
          <ResumeList r={r} t={t} />
        </TabPanel>
        <TabPanel tabKey={TAB_LETTER} active={r.tab === TAB_LETTER} idPrefix={TAB_ID_PREFIX}>
          <LetterList r={r} t={t} />
        </TabPanel>
        {r.err !== TEXT_NONE && <div className={cssOf(css.err)}>{t(r.err)}</div>}
      </section>
      <ResumeInput onMount={r.onInputMount} onPick={r.onPick} />
      {r.preview != null && <ResumePreview r={r} m={r.preview} t={t} />}
      {r.ask.ask != null && (
        <ConfirmModal title={t('rf.delAsk')} body={r.ask.ask.name} okText={t('rf.delete')} cancelText={t('rf.cancel')}
          onOk={r.ask.onOk} onCancel={r.ask.onCancel} />
      )}
      {r.cv.open && <CvBuilder onClose={r.cv.onClose} onSaved={r.cv.onSaved} />}
    </>
  )
}
