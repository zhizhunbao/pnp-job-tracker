/**
 * account 页面域的桶 —— /account 个人中心的四块视图(档案表单、简历存档、
 * 收藏职位、订阅搜索)与它们共用的点选项表。2026-08-26 自 app/(frontend)/account/
 * 整体迁入(Frank「frontend 下面有几个页面就建几个桶,里面只有一个 page.tsx,
 * 然后全用 components 拼」)。profileOptions 的点选项表另有 jobs/quiz/plan 三个域在借。
 * 对应 lib 域:lib/profile。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
export { ProfileForm } from './ProfileForm'
export type { ProfileValue } from './ProfileForm'
export { ResumeArchive } from './ResumeArchive'
export { SavedJobsList } from './SavedJobsList'
export { SavedSearchList } from './SavedSearchList'
export { makeNickKey } from './functions'
export { CLB_OPTS, CRS_OPTS, PGWP_OPTS, POPULAR_NOCS, clbActive, crsActive, pgwpActive } from './profileOptions'
export type { Opt } from './profileOptions'
