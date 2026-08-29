'use client'
/**
 * 域内小件:橱窗里的一张表 —— 子标题 + 对话导流钮 + 表身。
 * 三张表的题(没工签 / 有工签 / 去海洋省)是伞标题下的子标题(2026-08-08 二次拍板
 * 「二级导航和下面对不上」)。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { KEY_SE_GRP_HEAD } from './constants'
import { sponsorGapClsOf } from './functions'
import { AskChatBtn } from './askchatbtn'
import { Sec } from './sec'
import { SponsorBoard } from './sponsorboard'
import type { SponsorTableIn } from './types'

/**
 * 渲染橱窗里的一张表。
 *
 * @param props 取词函数、界面语言、人群档、这张表、是否留间距与三张字典。
 * @returns 子标题 + 表身。
 */
export function SponsorTable({ t, lang, kind, group, gap, occOpts, catMids, nocCat }: SponsorTableIn) {
  return (
    <div className={sponsorGapClsOf({ gap })}>
      <Sec title={t(KEY_SE_GRP_HEAD + kind)} right={<AskChatBtn kind={kind} t={t} />} sub>
        <SponsorBoard rows={group.top}
          kind={kind}
          t={t}
          lang={lang}
          total={group.total}
          occOpts={occOpts}
          catMids={catMids}
          nocCat={nocCat} />
      </Sec>
    </div>
  )
}
