'use client'
/**
 * 域内小件:对照结果那一屏。形态(Frank 八轮收敛):左右两栏表格(左 = 工作要求,
 * 右 = 简历现状,缺的红叉排前、命中绿勾在后)→ 尾行「覆盖 M/N」→ 打码区(行数 = 真实
 * 剩余条数,ProCard 悬浮)→ 重写建议 → 存档与剩余次数两句小注。
 * 2026-08-11(Frank「都改成一套」):自造裸 <table> 改用公共 Table
 * (bare = 弹框自己就是白底,不再套一层卡壳)。
 * 存了就说一句,而且一行一条 —— 不与剩余次数挤同一行。
 * 2026-08-28 换装批自 ResumeMatchModal.tsx 的结果分支提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:53:00
 */
import { LockedRows } from '@/components/card'
import { Table } from '@/components/table'
import { TEXT_NONE } from './constants'
import { goPricing, matchColsOf, matchRowKeyOf } from './functions'
import type { MatchResultIn, MatchRowFact } from './types'
import css from './resume.module.css'

/**
 * 渲染对照结果。
 *
 * @param props 取词函数与洗净的整份结果。
 * @returns 结果表 + 覆盖尾行 + 打码区 + 重写建议 + 两句小注。
 */
export function MatchResult({ t, res }: MatchResultIn) {
  return (
    <div className={css.pane}>
      <Table<MatchRowFact> rows={res.rows} rowKey={matchRowKeyOf} bare cols={matchColsOf({ t })} />
      <div className={css.cover}>{t('rm.cover', { hit: res.hitN, total: res.total })}</div>
      <LockedRows n={res.lockedN} text={t('rm.proText')} cta={t('pro.unlock')} onClick={goPricing} />
      {res.rewrite !== TEXT_NONE && <div className={css.rewrite}>{res.rewrite}</div>}
      {res.saved && <div className={css.savedNote}>{t('rm.arch.done')}</div>}
      {res.left != null && <div className={css.dimNote}>{t('rm.left', { n: res.left })}</div>}
    </div>
  )
}
