'use client'
/**
 * button 族的返回钮变体(2026-07-18 Frank「返回按钮应该有统一的样式吧 全网站」)。
 * 2026-08-24 自 ui/BackButton.tsx 迁入;同日并进 button 域(按钮族一域多变体)。
 * 2026-09-03 Frank「所有的详情页面的返回按钮都在右上,样式和位置应该是固定统一的」:
 * 全站返回钮收成**这一件**(此前 4 套外观 / 3 种位置 / 5 处各写 makeGoBack)——
 * 形照职位详情页 .back(白底 #d1d5db 描边 8px 圆角灰字,不带箭头;2026-07-27 Frank
 * 「带箭头的按钮,把箭头都删掉,不允许使用箭头」),行为走 goBackOr(有历史浏览器返回,
 * 无处可回落 fallback;2026-07-28 实报新标签页 history.back 空操作),在途态灰底降透明。
 * 位置不在本件:由 Shell 的 back 槽统一钉在正文轨右上角(本件只管长什么样)。
 * 原「渲真 <a> 让内链被爬到」的形退役 —— 返回目标(列表页)顶栏导航本就链着,不靠它收录。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { useState } from 'react'

import { Button } from './button'
import { KIND_BACK } from './constants'
import { backClsOf, makeBack } from './functions'
import type { BackButtonIn } from './types'

/**
 * 返回钮(幽灵钮;点下去置在途态并走 goBackOr)。
 *
 * @param props 落点与文字。
 * @returns 返回钮。
 */
export function BackButton({ fallback, label }: BackButtonIn) {
  const [busy, setBusy] = useState(false)
  return (
    <Button kind={KIND_BACK} onClick={makeBack({ fallback, setBusy })} className={backClsOf(busy)}>
      {label}
    </Button>
  )
}
