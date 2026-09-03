'use client'
/**
 * funnel 域的结构:/funnel 转化漏斗内部看板的正文(主线 M2 / E7-05)。
 * **内部页**:数据由服务端门鉴权后洗好传进来,这里零业务逻辑。
 * 文案只有中文 —— 这页只给 Frank 看,不是产品页面,翻三语是浪费。
 * 2026-08-27 换装批自 Funnel.tsx 整体重写成小写件形制(内联样式与那块 <style> 标签
 * 逐格迁 funnel.module.css、散值进 constants、列组与洗行进 functions、闭包函数退役);
 * 同批壳件(整页外框 / 顶栏 / 页脚)拼装归页面门(Frank「组装只许在 (frontend) 页面门里」,
 * 样张 account/companies),本件只出 Shell 轨往下的视图。
 * 2026-09-03 Frank「所有主页面都不应该有返回按钮」:标题行尾的返回撤掉;同日
 * 「所有的 table 右上角都应该有一个更新时间」:同一个位置改挂 Updated(time 桶)。
 * 这页的文案是硬编码中文(只给 Frank 看),但更新时间那一句是全站通用词,取词照全站走
 * useLang —— 全站唯一的更新时间形只收 t,不为一页 fork 第二个实现。
 *
 * @author Frank
 * @time 2026-08-27 03:00:00
 */
import { useLang } from '@/components/i18n'
import { Shell } from '@/components/shell'
import { Table } from '@/components/table'
import { Updated } from '@/components/time'
import {
  EMPTY_TEXT, ENTRY_HEAD_TEXT, PRICING_HEAD_TEXT, RATE_NOTE_TEXT, SUBTITLE_TEXT, TITLE_TEXT,
} from './constants'
import { funnelColsOf, funnelRowKeyOf } from './functions'
import { FunnelPayRow } from './funnelpayrow'
import { FunnelPropLine } from './funnelpropline'
import type { FunnelCellRow, FunnelIn } from './types'
import css from './funnel.module.css'

/**
 * 漏斗看板正文。
 *
 * @param props 服务端门洗好的整块看板数据与数据更新时刻(逐格注释见 FunnelIn)。
 * @returns 正文(Shell 轨 + 一张白卡:标题行、漏斗表、两条分组行、脚注与空态)。
 */
export function Funnel({ board, updatedAt }: FunnelIn) {
  const [, , t] = useLang()
  return (
    <Shell>
      <div className={css.card}>
        <div className={css.head}>
          <div>
            <h1 className={css.h1}>{TITLE_TEXT}</h1>
            <div className={css.sub}>{SUBTITLE_TEXT}</div>
          </div>
          <Updated iso={updatedAt} t={t} />
        </div>
        <div className={css.tableBox}>
          <Table<FunnelCellRow> cols={funnelColsOf()}
            rows={board.rows}
            rowKey={funnelRowKeyOf}
            bare
            foot={<FunnelPayRow pay={board.pay} />} />
        </div>
        {board.byEntry.length > 0 && <FunnelPropLine head={ENTRY_HEAD_TEXT} items={board.byEntry} />}
        {board.byPricing.length > 0 && <FunnelPropLine head={PRICING_HEAD_TEXT} items={board.byPricing} tight />}
        <div className={css.note}>{RATE_NOTE_TEXT}</div>
        {board.empty && <div className={css.empty}>{EMPTY_TEXT}</div>}
      </div>
    </Shell>
  )
}
