'use client'
/**
 * 职位描述弹框:C1 走查拍板(2026-07-07)后它只剩 JD 快看;E8-11 B2 起正文抽为 JobBody
 * (与 `/jobs/[id]` 页面同源),本件只剩浮层壳。
 * #112(2026-07-20 Frank):标题栏「AI 顾问」钮摘除 —— 点钮会关本框跳顾问弹框,
 * 描述/整理版一去不回。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位(浮层机器与埋点迁 hooks,页眉成件)。
 * 2026-09-14 Frank「这个翻译呢」「这个翻译也不对啊」×2:标题下那行一律是**标题译名**(懒翻,进程内缓存),不再放 NOC 小类名 ——
 * 「Data Engineer → 数据科学家」是分类名,用户读成翻译就是错;分类名在「职业分类」弹框里另有位置。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { JobBody } from '@/components/jobs/jobbody'
import { makeT } from '@/lib/i18n'
import { JD_PANEL_H, JD_PANEL_W, JD_PREF, TEXT_NONE } from './constants'
import { ActHead } from './acthead'
import { FloatPanel } from './floatpanel'
import { firstTextOf } from './functions'
import { useActModal, useFloatPanel, useTitleTrans } from './hooks'
import type { ActModalIn } from './types'

/**
 * 渲染职位描述弹框。
 *
 * @param props 这一岗、界面语言、分层态、描述表与关闭回调。
 * @returns 浮层。
 */
export function ActModal({ job, lang, plan, onClose }: ActModalIn) {
  const t = makeT(lang)
  const a = useActModal()
  const panel = useFloatPanel({ prefKey: JD_PREF, defW: JD_PANEL_W, defH: JD_PANEL_H })
  const sub = useTitleTrans({ title: job.title, lang, cached: TEXT_NONE })
  const head = (
    <ActHead t={t} title={firstTextOf({ list: [job.title] })}
      sub={sub}
      freeLeft={a.freeLeft} />
  )
  return (
    <FloatPanel panel={panel} head={head} onClose={onClose} t={t} tight jdBody actsStopDrag>
      <JobBody job={job} lang={lang} plan={plan} inModal onFreeLeft={a.onFreeLeft} jdText={TEXT_NONE} />
    </FloatPanel>
  )
}
