'use client'
/**
 * 域内小件:抽选表「门槛」弹框 —— 三层(2026-09-13 Frank「你这个门槛 不是所有的门槛吧。只是这一个类别的门槛吧」):
 * ① 本期:日期 / 分数线 / 邀请数 + 官方附注;② 限定职业:对照表点名的清单职业(BC 定向类别 / AB 科技专线 /
 * 联邦类别,没有就不出这段);③ 通道资格:这一类别对到的门槛通道 / 联邦项目条文(对照表 data/processed/
 * draw_rule_streams.json;没对照退回全省并把段名改成「全省门槛」,对过但没抓出「本站未收录」);
 * ④ 脚上「资料库」链接落资源页该省卡(全量与联邦通道在那边)。2026-09-13 Frank「按那个 抽选 table 来 补数据」。
 * 壳走 modal 桶,标题走 title 桶,行形照资源页 ResRuleCard;本期一行照手机抽选卡的 meta 行。加载中占位。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */
import { LinkButton } from '@/components/button'
import { Modal } from '@/components/modal'
import { Tag } from '@/components/tag'
import { ModalTitle } from '@/components/title'
import { NEW_TAB, RULES_MODAL_SIZE, TEXT_NONE } from './constants'
import { occsOfDraw, rulesHeadOf, rulesMoreHrefOf, rulesOfDraw, rulesTitleOf } from './functions'
import type { RulesModalIn } from './types'
import css from './start.module.css'

/**
 * 渲染门槛弹框。
 *
 * @param props 取词函数、开着的这一期、该省门槛行与关闭手柄。
 * @returns 弹框。
 */
export function RulesModal({ t, row, rows, onClose }: RulesModalIn) {
  const items = []
  const occs = []
  let shown = 0
  if (rows != null) {
    for (const o of occsOfDraw({ lines: rows.occupations, ruleMap: row.ruleMap })) {
      occs.push(
        <li key={o.noc} className={css.rulesOccRow}>
          <span className={css.rulesLabel}>{o.name}</span>
          <span className={css.rulesStream}>{o.noc}</span>
        </li>,
      )
    }
    for (const r of rulesOfDraw({ lines: rows.rows, ruleMap: row.ruleMap })) {
      shown += 1
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
      <ModalTitle title={row.main} />
      <p className={css.rulesSub}>{rulesTitleOf({ t, prov: row.rulesProv })}</p>
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
      {occs.length > 0 && <h4 className={css.rulesHead}>{t('pulse.rules.occ')}</h4>}
      {occs.length > 0 && <ul className={css.rulesList}>{occs}</ul>}
      <h4 className={css.rulesHead}>{rulesHeadOf({ t, ruleMap: row.ruleMap })}</h4>
      {rows == null && <p className={css.rulesNote}>{t('pulse.rules.loading')}</p>}
      {rows != null && shown === 0 && <p className={css.rulesNote}>{t('pulse.rules.empty')}</p>}
      {shown > 0 && <ul className={css.rulesList}>{items}</ul>}
      <div className={css.rulesFoot}>
        <LinkButton href={rulesMoreHrefOf(row.rulesProv)} target={NEW_TAB} className={css.rulesLink}>
          {t('pulse.rules.more')}
        </LinkButton>
      </div>
    </Modal>
  )
}
