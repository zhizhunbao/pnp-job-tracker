'use client'
/**
 * 域内小件:整表换血条。#83(Frank「点我的匹配先跳医疗再跳科技」):整表换血(第 0 页在拉)
 * 期间旧行原样挂着零提示,视觉像跳两次 —— 换血中表格/卡片半透明 + 顶部这一条「更新中」,
 * 数据回来再恢复。
 * 2026-09-23 Frank「可以放到操作列,表头的后面吗?类似于雇主页 table」:改成常驻的零高定位锚,
 * 提示叠在表壳右上角,换血时版面不再上下跳(形照雇主板 EmployerLoading)。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 * 2026-09-26 /fe 首页 Frank「首屏整表替换」:首屏本省闸没放开时也挂这条提示(同一副样子,加挂 .homeTip,
 * 闸真开着才看得见)—— 全国过渡态藏起来的那一两秒,进度照样看得见,不是一块白板。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { loadTipClsOf, loadTipOnOf } from './functions'
import type { BoardLoadingIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染换血条。
 *
 * @param props 「更新中」文案、换血中没与首屏本省闸。
 * @returns 零高的定位锚;换血中(或首屏本省闸没放开)叠一个转圈 + 一句话。
 */
export function BoardLoading({ text, on, gate }: BoardLoadingIn) {
  return (
    <div className={cssOf(css.loading)}>
      {loadTipOnOf({ on, gate }) && (
        <span className={loadTipClsOf(on)}>
          <span className={cssOf(css.spin)} />
          {text}
        </span>
      )}
    </div>
  )
}
