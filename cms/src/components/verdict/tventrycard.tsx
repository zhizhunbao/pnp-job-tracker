'use client'
/**
 * verdict 域的结构:一键三合一判定区的入口卡(#287 批D,设计
 * docs/design/一键三合一判定-20260809.md §5;版式 = se287 拍板稿)。
 * 四处共用一件:详情页出标题档、弹框出卡头档,两档都是**标题 + 主按钮零解释句**。
 * 2026-08-10 判定区并入 /plan/pr 主页面,不再在页面上自动套第二层弹窗 ——
 * 这张卡按下去就是跳过去,不是就地开弹窗。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 提出成件:内联样式逐格迁 verdict.module.css、
 * 两档差异收成 constants + functions 的取类函数、裸 <button> 改经 button 族。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { Button } from '@/components/button'
import { PLAIN_BTN_KIND } from './constants'
import { entryBtnClsOf, entryCardClsOf, entryTitleClsOf, entryTitleKeyOf } from './functions'
import type { TvEntryCardIn } from './types'

/**
 * 渲染判定区入口卡。
 *
 * @param props 取词函数、版式档与打开手柄(逐格注释见 TvEntryCardIn)。
 * @returns 标题 + 主按钮的一张卡。
 */
export function TvEntryCard({ t, lg = false, onOpen }: TvEntryCardIn) {
  return (
    <div className={entryCardClsOf({ lg })}>
      <div className={entryTitleClsOf({ lg })}>{t(entryTitleKeyOf({ lg }))}</div>
      <Button kind={PLAIN_BTN_KIND} className={entryBtnClsOf({ lg })} onClick={onOpen}>
        {t('tv.cta')}
      </Button>
    </div>
  )
}
