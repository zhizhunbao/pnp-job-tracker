'use client'
/**
 * 域内小件:抽选表「门槛」弹框 —— 标题 / 本期一行 / 1 2 3 人话门槛 / 官方页
 * (2026-09-13 Frank「用户只想知道门槛是什么。比如 1 2 3 这种」「先简化」「先出一版」;
 * 同日早些的四层版(限定职业 / 通道资格 / 资料库)撤)。清单随行带来,不取数;没写清单的行不出钮,
 * 万一带进来的是 null(列没上)出「本站未收录」。壳走 modal 桶,标题走 title 桶。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */
import { LinkButton } from '@/components/button'
import { Modal } from '@/components/modal'
import { Tag } from '@/components/tag'
import { ModalTitle } from '@/components/title'
import { NEW_TAB, RULES_MODAL_SIZE, TEXT_NONE } from './constants'
import { checklistTextOf, provLabelOf } from './functions'
import type { RulesModalIn } from './types'
import css from './start.module.css'

/**
 * 渲染门槛弹框。
 *
 * @param props 取词函数、界面语言、开着的这一期与关闭手柄。
 * @returns 弹框。
 */
export function RulesModal({ t, lang, row, onClose }: RulesModalIn) {
  const items = []
  if (row.checklist != null) {
    for (let i = 0; i < row.checklist.items.length; i += 1) {
      const item = row.checklist.items[i]
      if (item != null) {
        items.push(<li key={i} className={css.checkItem}>{checklistTextOf({ item, lang })}</li>)
      }
    }
  }
  return (
    <Modal onClose={onClose} size={RULES_MODAL_SIZE} tall>
      <ModalTitle title={row.main} />
      <p className={css.rulesSub}>{provLabelOf({ t, code: row.prog })}</p>
      <h4 className={css.rulesHead}>{t('pulse.rules.round')}</h4>
      <div className={css.drawMeta}>
        <Tag>{row.prog}</Tag>
        <span className={css.drawDate}>{row.date}</span>
        <span className={css.drawStatRight}>
          {t('home.dr.score')}<span className={css.drawVal}>{row.score}</span>
        </span>
        <span className={css.drawStat}>
          {t('home.dr.inv')}<span className={css.drawVal}>{row.invitations}</span>
        </span>
      </div>
      {row.drawNote !== TEXT_NONE && <p className={css.rulesQuote}>{row.drawNote}</p>}
      <h4 className={css.rulesHead}>{t('pulse.act.rules')}</h4>
      {items.length === 0 && <p className={css.rulesNote}>{t('pulse.rules.empty')}</p>}
      {items.length > 0 && <ol className={css.checkList}>{items}</ol>}
      {row.checklist != null && (
        <div className={css.rulesFoot}>
          <LinkButton href={row.checklist.url} target={NEW_TAB} className={css.rulesLink}>
            {t('pulse.act.link')}
          </LinkButton>
        </div>
      )}
    </Modal>
  )
}
