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
 * 2026-10-09 N6 批(Frank「职位名、公司名、地点同形,省市分开」「城市 和 省份 点击 跳 google 地图」「所有的点击操作都触发弹框」):
 * 地点格换 name 桶的 CityName + ProvName(英文在上、界面语译名灰字在下,市和省各一份,点了去 Google 地图),原「市, 省码」一行撤;
 * 名字与整卡不再整页跳公司页 / 职位板按名搜 —— 名字照表格雇主列(有公司页的蓝链普通左键开公司弹框、Ctrl 点去公司页;
 * 没有公司页的点了按雇主池键开框,上面 09-13 晚「标题纯文本、整卡不导航」那条由 09-19「招聘是 0 的公司也可以点击」覆盖),
 * 整卡点了开同一个框;原标题链落点 href 一格退役。名下的译名灰字暂缺:card 桶 JobCard 的标题只收文字、名下那行注已给行业,
 * 两行名放不进去(要 card 桶给标题开插槽,另批)。
 * 同日收口:card 桶 JobCard 开了 head 插槽,标题换 name 桶 Name —— 英文在上、界面语别名灰字在下(行业照旧是下面那行注);
 * 有公司页的蓝链普通左键开框、Ctrl 点去公司页,没有的只开框(池键);标题文本形 CardTitle 与悬停提示 hrefTitle 随之退役。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { JobCard } from '@/components/card'
import { cssOf } from '@/components/css'
import { CityName, Name, ProvName } from '@/components/name'
import { Tag } from '@/components/tag'
import { TAG_DESIGNATED, TEXT_NONE } from './constants'
import type { EmployerCardIn } from './types'
import css from './employers.module.css'

/**
 * 雇主板的一张手机卡。
 *
 * @param props 这一行的展示行(卡上要的每一项都已经在洗行时算好)。
 * @returns 一张职位卡形态的雇主卡。
 */
export function EmployerCard({ r }: EmployerCardIn) {
  const head = (
    <>
      {r.companyHref === TEXT_NONE && <Name en={r.name} sub={r.alias} onOpen={r.onPeek} />}
      {r.companyHref !== TEXT_NONE && <Name en={r.name} sub={r.alias} href={r.companyHref} onOpen={r.onPeek} />}
    </>
  )
  const chips = <>{r.designatedChip !== TEXT_NONE && <Tag variant={TAG_DESIGNATED}>{r.designatedChip}</Tag>}</>
  const where = (
    <span className={cssOf(css.cardPlace)}>
      {r.city !== TEXT_NONE && <CityName city={r.city} province={r.province} zh={r.cityZh} ko={r.cityKo} />}
      {r.province !== TEXT_NONE && <ProvName code={r.province} />}
    </span>
  )
  if (r.industry === TEXT_NONE) {
    return (
      <JobCard onCardClick={r.onCard}
        head={head}
        location={where}
        salary={r.cardSalary}
        chips={chips} />
    )
  }
  return (
    <JobCard onCardClick={r.onCard}
      head={head}
      note={r.industry}
      location={where}
      salary={r.cardSalary}
      chips={chips} />
  )
}
