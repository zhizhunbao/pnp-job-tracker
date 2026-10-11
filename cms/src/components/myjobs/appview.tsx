'use client'
/**
 * 只读投递框(2026-10-10 批 3「点已投行『打开』」,docs/design/我的/我的求职-20261009.md 1.6 / 2.6;
 * 图 网页端-改之后-4-点打开 / 手机端-改之后-4-点打开):通用 modal 桶的窗口形(标题栏「投递」+ 岗名 + 译名行,可拖可拉,手机全屏)。
 * 四张分区卡:职位信息(职位 / 公司 / 地址 / 薪资 / 工时 / 雇佣期 / 发布日期 / 截止日期,单元格同我的投递清单)、
 * 雇主回复(收件箱里挂在这一条上的信;没有一行)、投递内容(英文姓名 / 回复邮箱 / 简历 / 求职信,右上绿胶囊「已发出 <时刻>」)、
 * 邮件预览(收件人 = 公司名 / 主题 / 正文)。只读,底下不摆「关闭」钮(右上角 × 就是)。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { LinkButton } from '@/components/button'
import { useLang } from '@/components/i18n'
import { Loading } from '@/components/loading'
import { Modal, ModalHead } from '@/components/modal'
import { Row } from '@/components/row'
import { Tag } from '@/components/tag'
import { AddrCell } from './addrcell'
import { AvMsgCard } from './avmsgcard'
import { CompanyCell } from './companycell'
import {
  ACT_COVER, ACT_RESUME, AV_MODAL_H, AV_MODAL_PREF, AV_MODAL_W, CARD_HEAD_CLS, CARD_MD_CLS, SENT_TAG, TARGET_BLANK,
  TEXT_NONE,
} from './constants'
import { fileHrefFor, viewRowOf } from './functions'
import { HoursCell } from './hourscell'
import { useAppView } from './hooks'
import { PayCell } from './paycell'
import { TermCell } from './termcell'
import { TitleCell } from './titlecell'
import type { AppViewIn } from './types'
import css from './myjobs.module.css'

/**
 * 只读投递框。
 *
 * @param props 投递行 id、取词函数与关框。
 * @returns 窗口形弹框。
 */
export function AppView({ appId, t, onClose }: AppViewIn) {
  const [lang] = useLang()
  const v = useAppView({ appId })
  let title = TEXT_NONE
  let sub = TEXT_NONE
  if (v.item != null) {
    title = v.item.title
    sub = viewRowOf({ item: v.item, t, lang }).titleSub
  }
  const head = <ModalHead kicker={t('ap.kicker')} title={title} sub={sub} ctl={null} />
  const win = { head, memo: AV_MODAL_PREF, w: AV_MODAL_W, h: AV_MODAL_H, jd: false }
  if (v.failed) {
    return <Modal onClose={onClose} win={win}><div className={css.note}>{t('mj.fail')}</div></Modal>
  }
  if (v.item == null || v.thread == null) {
    return <Modal onClose={onClose} win={win}><Loading text={t('rf.loading')} /></Modal>
  }
  const r = viewRowOf({ item: v.item, t, lang })
  const th = v.thread
  const msgs = []
  for (const m of th.messages) {
    msgs.push(<AvMsgCard key={m.id} m={m} t={t} />)
  }
  const resumeHref = fileHrefFor({ row: r, key: ACT_RESUME })
  const coverHref = fileHrefFor({ row: r, key: ACT_COVER })
  return (
    <Modal onClose={onClose} win={win}>
      <div className={CARD_MD_CLS}>
        <div className={CARD_HEAD_CLS}>{t('av.job')}</div>
        <Row k={t('mj.col.title')}>{TitleCell(r)}</Row>
        <Row k={t('mj.col.company')}>{CompanyCell(r)}</Row>
        <Row k={t('mj.col.addr')}>{AddrCell(r)}</Row>
        {r.salary !== TEXT_NONE && <Row k={t('mj.col.pay')}>{PayCell(r)}</Row>}
        <Row k={t('mj.col.hours')}>{HoursCell(r)}</Row>
        <Row k={t('mj.col.term')}>{TermCell(r)}</Row>
        <Row k={t('mj.col.posted')}>{r.posted}</Row>
        <Row k={t('mj.col.deadline')}>{r.deadline}</Row>
      </div>
      <div className={CARD_MD_CLS}>
        <div className={CARD_HEAD_CLS}>{t('av.replies')}</div>
        {msgs.length === 0 && <div className={css.avNone}>{t('av.noReply')}</div>}
        {msgs}
        {msgs.length > 0 && th.forwardTo !== TEXT_NONE && (
          <div className={css.avFwd}>{t('av.fwdTo', { e: th.forwardTo })}</div>
        )}
      </div>
      <div className={CARD_MD_CLS}>
        <div className={css.avHead}>
          <div className={CARD_HEAD_CLS}>{t('av.content')}</div>
          {th.sentAt !== TEXT_NONE && <Tag variant={SENT_TAG}>{t('av.sentAt', { d: th.sentAt })}</Tag>}
        </div>
        <Row k={t('ap.name')}>{th.senderName}</Row>
        <Row k={t('ap.replyTo')}>{th.replyTo}</Row>
        <Row k={t('ap.resume')}>
          {resumeHref !== TEXT_NONE && <LinkButton href={resumeHref} target={TARGET_BLANK}>{th.resumeFile}</LinkButton>}
          {resumeHref === TEXT_NONE && th.resumeFile}
        </Row>
        <Row k={t('ap.letter')}>
          {coverHref !== TEXT_NONE && <LinkButton href={coverHref} target={TARGET_BLANK}>{th.coverFile}</LinkButton>}
          {coverHref === TEXT_NONE && t('ap.noLetter')}
        </Row>
      </div>
      <div className={CARD_MD_CLS}>
        <div className={CARD_HEAD_CLS}>{t('ap.mailPv')}</div>
        <Row k={t('ap.to')}>{th.company}</Row>
        <Row k={t('ap.subject')}>{th.subject}</Row>
        <div className={css.avBody}>{th.body}</div>
      </div>
    </Modal>
  )
}
