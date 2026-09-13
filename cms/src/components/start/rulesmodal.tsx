'use client'
/**
 * 域内小件:抽选表「门槛」弹框 —— 该省门槛条文一行一条(分流灰小字 / 人话标签 / 官方原句灰注 / 官方页链接),
 * 脚上一条「资料库」链接落资源页该省门槛卡(全量与联邦通道在那边)。
 * 2026-09-13 Frank「点门槛 应该弹框吧 不应该跳页面吧」;壳走 modal 桶,标题走 title 桶,行形照资源页 ResRuleCard。
 * 加载中占位、拉不到出空态(不静默)。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */
import { LinkButton } from '@/components/button'
import { Modal } from '@/components/modal'
import { ModalTitle } from '@/components/title'
import { NEW_TAB, RULES_MODAL_SIZE, TEXT_NONE } from './constants'
import { rulesMoreHrefOf, rulesTitleOf } from './functions'
import type { RulesModalIn } from './types'
import css from './start.module.css'

/**
 * 渲染门槛弹框。
 *
 * @param props 取词函数、省码、门槛行与关闭手柄。
 * @returns 弹框。
 */
export function RulesModal({ t, prov, rows, onClose }: RulesModalIn) {
  const items = []
  if (rows != null) {
    for (const r of rows) {
      items.push(
        <li key={r.seq} className={css.rulesRow}>
          {r.stream !== TEXT_NONE && <span className={css.rulesStream}>{r.stream}</span>}
          <span className={css.rulesLabel}>{r.label}</span>
          <span className={css.rulesQuote}>{r.quote}</span>
          <LinkButton href={r.url} target={NEW_TAB} className={css.rulesLink}>{t('pulse.act.link')}</LinkButton>
        </li>,
      )
    }
  }
  return (
    <Modal onClose={onClose} size={RULES_MODAL_SIZE} tall>
      <ModalTitle title={rulesTitleOf({ t, prov })} />
      {rows == null && <p className={css.rulesNote}>{t('pulse.rules.loading')}</p>}
      {rows != null && rows.length === 0 && <p className={css.rulesNote}>{t('pulse.rules.empty')}</p>}
      {items.length > 0 && <ul className={css.rulesList}>{items}</ul>}
      <div className={css.rulesFoot}>
        <LinkButton href={rulesMoreHrefOf(prov)} target={NEW_TAB} className={css.rulesLink}>
          {t('pulse.rules.more')}
        </LinkButton>
      </div>
    </Modal>
  )
}
