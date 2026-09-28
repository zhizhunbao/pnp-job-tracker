'use client'
/**
 * 顾问族弹框标题栏里的两颗窗口钮(排在关闭钮前面):重新翻译、打开落地页。
 * 2026-09-21 Frank「这个改成 箭头,点击直接跳到落地页」:有落地页的框(职位描述弹框 → 职位详情页、公司弹框 / 公司字段弹框
 * → 公司页)出箭头;同日「这个箭头长一点。并且打开新页面」:长箭头 MoveUpRight、新标签页打开(弹框里点出去的一律新标签,
 * 别把弹框关掉)。2026-09-23 Frank「这个带全屏的都去掉吧」:没落地页的框不再出全屏钮。
 * 2026-09-28 并壳时自 advisor 的浮层壳(FloatPanel 的窗口钮段)提出成件:壳并进 modal 桶的 Modal,
 * 钮一律 modal 桶的 ModalBtn,这里只剩「出哪两颗」。
 *
 * @author Frank
 * @time 2026-09-28 04:40:00
 */
import { IconMoveUpRight, IconRefresh } from '@/components/icons'
import { ModalBtn } from '@/components/modal'
import { TARGET_BLANK, TEXT_NONE } from './constants'
import type { WinActsIn } from './types'

/**
 * 渲染两颗窗口钮(各自没有就不出)。
 *
 * @param props 取词函数、重新翻译与落地页地址。
 * @returns 钮。
 */
export function WinActs({ t, onRefresh, pageHref }: WinActsIn) {
  return (
    <>
      {onRefresh != null && (
        <ModalBtn aria={t('act.retrans')} tip={t('act.retrans')} onClick={onRefresh}>
          <IconRefresh />
        </ModalBtn>
      )}
      {pageHref !== TEXT_NONE && (
        <ModalBtn aria={t('detail.openFull')} tip={t('detail.openFull')} href={pageHref} target={TARGET_BLANK}>
          <IconMoveUpRight />
        </ModalBtn>
      )}
    </>
  )
}
