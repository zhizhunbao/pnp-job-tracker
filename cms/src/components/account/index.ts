/**
 * account 页面域的桶 —— /account 个人中心的四块视图(档案表单、简历存档、
 * 收藏职位、订阅搜索)与它们共用的点选项表。2026-08-26 自 app/(frontend)/account/
 * 整体迁入(Frank「frontend 下面有几个页面就建几个桶,里面只有一个 page.tsx,
 * 然后全用 components 拼」)。2026-08-27 换装批把四件视图全部重写成小写件 +
 * hooks 状态机形制;同日 Frank 拍板把档案表单(ProfileForm 及子件、点选项表、
 * 归属函数)整体拆去 components/profile 域 —— 那批件答的是「移民档案」不是「账户页」,
 * 本桶只剩账户骨架 + 收藏/订阅/简历三节。
 * 2026-08-26 续:page.tsx 改造成「纯拼装门」,页面里的排版拆成 AccountShell /
 * AccountColumns / AccountNav / AccountOverview / AccountBuyPanel / AccountRedirect
 * 六件(闸 local/page-compose-only)。AccountNickname / AccountPlanLine 是域内小件不出桶。
 * 同日再收一刀(Frank「还是有一堆函数啊」,闸 local/page-no-logic):state/effect/handler
 * 收进 hooks 的 useAccountPage,门只拿面板;makeNickKey 与 Me/Sec 随之只剩域内消费,出桶名单裁掉。
 * 2026-08-28 骨架归一批:页面门换成全站标准骨架 Frame + Header + Shell + Footer
 * (2026-07-18 Frank「每个页面的宽度应该是一样的」+ 2026-07-31「窄读列放壳内」——
 * 860 读宽的 AccountColumns 现在住 1320 正文轨里)。**AccountShell 就此退役**:
 * 它管的整页三段列 2026-08-27 已经收成 shell 桶的 Frame,本页不再克隆一份;
 * 它身上唯一不可替代的渐变底曾暂存 AccountTint 候选层 —— 2026-08-28 Frank 拍板
 * 全站灰后同日删除,底色自此只有 Frame 的 var(--bg) 一处,
 * accountshell.tsx 与 types 的 AccountShellIn 同批删除。
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
export {
  RA_KEY_HEAD, SEC_BUY, SEC_FAVS, SEC_OVERVIEW, SEC_PROFILE, SEC_SAVED, SEC_SJOBS, SHELL_BOTTOM, SHELL_TOP,
} from './constants'
export { useAccountPage } from './hooks'
export { ResumeArchive } from './resumearchive'
export { SavedJobsList } from './savedjobslist'
export { SavedSearchList } from './savedsearchlist'
