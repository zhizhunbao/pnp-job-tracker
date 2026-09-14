'use client'
/**
 * 雇主板的一张手机卡(全站唯一卡片件 JobCard 的一次装配)。
 * 手机触控靶:卡内标题链只有 23px 高 —— 整张卡都可点(卡本身 ≥70px),点在标题上时
 * 交给 `<a>` 自己走,不重复导航。
 * 2026-09-13 雇主板批二:卡上四样 —— 名(落公司页)、注(界面语言别名,没有退行业)、所在地、在招话术;
 * 同日晚 /fe 雇主页砍中文别名(机翻硬错,见 namecell.tsx 头注):注只剩行业。
 * 同日晚 /fe 雇主页无在招不给链:既无公司页也无在招的雇主,标题纯文本、整卡不导航(落点不存在就不给假链)。
 * 胶囊两枚:星级与「指定雇主」(非指定不出);同日晚 /fe 雇主页星级退成排序键(见 functions.ts employerColsOf 头注),卡上只剩指定胶囊。
 * 2026-08-27 换装批自 Employers.tsx 的 JobCard 装配段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { JobCard } from '@/components/card'
import { Tag } from '@/components/tag'
import { TAG_DESIGNATED, TEXT_NONE } from './constants'
import type { CardTitle, EmployerCardIn } from './types'

/**
 * 雇主板的一张手机卡。
 *
 * @param props 这一行的展示行(卡上要的每一项都已经在洗行时算好)。
 * @returns 一张职位卡形态的雇主卡。
 */
export function EmployerCard({ r }: EmployerCardIn) {
  let title: CardTitle = { text: r.name }
  if (r.href !== TEXT_NONE) {
    title = { text: r.name, href: r.href, title: r.hrefTitle, onClick: r.onView }
  }
  const chips = <>{r.designatedChip !== TEXT_NONE && <Tag variant={TAG_DESIGNATED}>{r.designatedChip}</Tag>}</>
  if (r.industry === TEXT_NONE) {
    return (
      <JobCard onCardClick={r.onCard}
        title={title}
        location={r.where}
        salary={r.cardSalary}
        chips={chips} />
    )
  }
  return (
    <JobCard onCardClick={r.onCard}
      title={title}
      note={r.industry}
      location={r.where}
      salary={r.cardSalary}
      chips={chips} />
  )
}
