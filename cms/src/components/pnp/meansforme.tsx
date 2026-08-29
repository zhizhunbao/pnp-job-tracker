'use client'
/**
 * 「对我意味着什么」(E5-00 §3.5,与字段事实块同级)。
 * 依据链在弹框端用同一 match() 重算(lib/jobs 的纯函数,与服务端列一致);每条结论指回维度记录。
 * 措辞红线:只说「符合/不符合公开清单条件」「高于/低于抽选线」,永不说「你能/不能移民」。
 * 未登录/未建档:弹框内不再放建档引导(页头横幅 + 列表「建档案 →」列已覆盖;用户拍板:别到处都是)。
 * 匹配全放开(Frank 2026-07-21):匹配结论对所有已建档用户免费全出(本卡结论本就前端按 profile 现算)——
 * 原「免费限额外整块打码」退役;付费墙只剩表内 Pro 数据列(vs 中位/工资中位)。
 * 卡片化(E8-10 §3.5「逐条读判定 → 卡片」,双端统一;Frank 三拍:拆卡 / 值不换行不省略 /
 * 英文在前中文灰注):依据链同源 match() reasons(1:1 映射,不另起炉灶)。
 * 壳=页面统一卡规范(白底描边 r12,详情页同款;Frank「一个页面统一风格」)——老弹框灰壳退役。
 * 2026-08-28 换装批自 Pnp.tsx 整体重写成小写件形制。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { IconTarget } from '@/components/icons'
import { levelClsOf, levelTextOf, mmRowsOf } from './functions'
import { useMeansForMe } from './hooks'
import { MmRow } from './mmrow'
import type { MeansForMeIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染匹配明细卡。
 *
 * @param props 本岗、界面语言、身份与档案、两张维度清单与职业名字典。
 * @returns 明细卡;未登录/未建档时给 null。
 */
export function MeansForMe({ job, lang, plan, pnpOcc, eeOcc, nocDesc }: MeansForMeIn) {
  const p = useMeansForMe({ job, lang, plan, pnpOcc, eeOcc })
  if (plan.loggedIn === false || plan.profileOk === false) {
    return null
  }
  if (p.result == null || plan.profile == null) {
    return null
  }
  const rows = []
  const spec = { t: p.t, lang, job, profile: plan.profile, nocDesc, reasons: p.result.reasons }
  for (const r of mmRowsOf(spec)) {
    rows.push(<MmRow key={r.key} r={r} jobLabel={p.t('mm.col.job')} youLabel={p.t('mm.col.you')} />)
  }
  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <IconTarget /> {p.t('rm.title')}
        <span className={levelClsOf({ level: p.result.level })}>
          {levelTextOf({ t: p.t, level: p.result.level })}
        </span>
      </div>
      <div className={css.mt4}>{rows}</div>
    </div>
  )
}
