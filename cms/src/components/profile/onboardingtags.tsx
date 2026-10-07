'use client'
/**
 * 向导里已选职业的回显标签(职业步专有):一枚标签 = 人话职业名 + × 摘除钮。
 * 热门 chips 与简历候选都能选出码,回显在一处才数得清自己选了几个。没选就整块不渲。
 * 长相与档案表单的标签同一套类(.tagPill / .tagDel),只有行距是向导自己的。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内的回显段提出成件。
 * 2026-10-03 付费闭环批 A1:访客向导共用,入参收窄成职业步真读的几格(NocStepPanel);长名可换行(见 .obTagRow)。
 * 同日本地测试:热门胶囊里有的码,胶囊本身已高亮,标签不再重复回显(「厨师」高亮又挂标签,显示了两次);只回显热门表外的码。
 * 2026-10-04 访客四题改版:访客向导迁 gate 桶,本件出桶给它的职业题借(已选标签的形只此一份,不在 gate 另起)。
 * 同日收口:颜色改走 tag 桶的 pick 已选档(照效果图浅主色);整行不带外距 —— 与上一块隔多远归摆放它的那一方
 * (首访向导见 .obRowTight + .obTagRow,gate 见 .jobs 的 gap)。
 * 2026-10-04 A2:访客第 3 题改用 quiz 桶选职业控件(大号档),本件改由它借来当已选标签;它的胶囊按专业换了一批、
 * 还能切成搜索结果,于是多收一格 shown(这一屏胶囊里摆着的码)—— 给了就按它判回不回显,没给照旧按热门表(首访向导)。
 * 2026-10-04 收口:× 摘除钮挂可访问名「移除 {职业名}」(原来读屏只念「×」,不知道摘的是哪一枚);
 * 点按区放大在 profile.module.css 的 .tagDel.tagDel::after(看得见的大小不变)。
 * 同日收口:给了 shown 的调用方(quiz 选职业控件)标签名先取它递进来的候选名,和刚点的胶囊同名(见 obNocLabelOf 的 callerFirst)。
 * 2026-10-05 × 摘除钮改由 tag 桶 Tag 的 del 格出(带删钮的标签收进通用桶,访客第 2 题的已选专业同一枚):本件只给读屏名与摘除手柄,
 * 钮、× 字符与 .tagDel 两块样式(含点按区)原样搬去 tag 桶;渲染出来的结构与类一字不变。上面两处「profile.module.css 的 .tagDel」
 * 现指 tag.module.css 的同名类。
 * 2026-10-05 访客第 3 题改成与第 2 题同一副左右两栏(Frank「也改成左右 两部分吗?」「改啊」):quiz 选职业控件的已选一行改用 tag 桶
 * TagRow 自己摆,不再借本件 —— 上面 A2 那格 shown 与收口那条「候选名先取」(obNocLabelOf 的 callerFirst)随之撤,本件回到只给首访向导
 * 职业步用:热门表里的码由胶囊回显、不挂标签,其余照挂。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { TAG_V_PICK } from './constants'
import { isPopularNoc, makeNocDrop, obNocLabelOf } from './functions'
import { Tag } from '@/components/tag'
import type { NocStepIn } from './types'
import css from './profile.module.css'

/**
 * 已选职业的标签一行。
 *
 * @param props 职业步真读的几格与取词函数(见 NocStepIn 逐格注释)。
 * @returns 标签一行;没有热门表外的已选码 = null。
 */
export function OnboardingTags({ p, t }: NocStepIn) {
  const tags = []
  for (const code of p.nocs) {
    if (isPopularNoc(code)) {
      continue
    }
    const label = obNocLabelOf({ code, candidates: p.resume.candidates, t })
    const drop = makeNocDrop({ code, nocs: p.nocs, setNocs: p.setNocs })
    tags.push(
      <Tag key={code} variant={TAG_V_PICK} del={{ aria: t('ob.tagDel', { name: label }), onClick: drop }}>
        {label}
      </Tag>,
    )
  }
  if (tags.length === 0) {
    return null
  }
  return <div className={css.obTagRow}>{tags}</div>
}
