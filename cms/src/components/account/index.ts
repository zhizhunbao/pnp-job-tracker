/**
 * account 页面域的桶 —— /account 个人中心的四块视图(档案表单、简历存档、
 * 收藏职位、订阅搜索)与它们共用的点选项表。2026-08-26 自 app/(frontend)/account/
 * 整体迁入(Frank「frontend 下面有几个页面就建几个桶,里面只有一个 page.tsx,
 * 然后全用 components 拼」)。profileOptions 的点选项表另有 jobs/quiz/plan 三个域在借。
 * 2026-08-26 续:page.tsx 改造成「纯拼装门」,页面里的排版拆成 AccountShell /
 * AccountColumns / AccountNav / AccountOverview / AccountBuyPanel / AccountRedirect
 * 六件(闸 local/page-compose-only)。AccountNickname / AccountPlanLine 是域内小件不出桶。
 * 同日再收一刀(Frank「还是有一堆函数啊」,闸 local/page-no-logic):state/effect/handler
 * 收进 hooks 的 useAccountPage,门只拿面板;makeNickKey 与 Me/Sec 随之只剩域内消费,出桶名单裁掉。
 * 对应 lib 域:lib/profile。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
export { AccountBuyPanel } from './accountbuypanel'
export { AccountColumns } from './accountcolumns'
export { AccountNav } from './accountnav'
export { AccountOverview } from './accountoverview'
export { AccountRedirect } from './accountredirect'
export { AccountShell } from './accountshell'
export { useAccountPage } from './hooks'
export { ProfileForm } from './ProfileForm'
export type { ProfileValue } from './ProfileForm'
export { ResumeArchive } from './ResumeArchive'
export { SavedJobsList } from './SavedJobsList'
export { SavedSearchList } from './SavedSearchList'
export { CLB_OPTS, CRS_OPTS, PGWP_OPTS, POPULAR_NOCS, clbActive, crsActive, pgwpActive } from './profileOptions'
export type { Opt } from './profileOptions'
