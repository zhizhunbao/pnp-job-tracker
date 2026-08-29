/**
 * profile 域(移民档案)的桶 —— 档案表单(ProfileForm 及其子件)与档案六格的
 * 点选项表、区间归属函数。2026-08-27 Frank 拍板自 account 域拆出:这批件答的
 * 问题是「移民档案怎么问怎么填」,不是「账户页」;消费者 = account 页的档案节 +
 * jobs 的 OnboardingWizard(同一套题,wizard 换装时来借排档行)+ quiz/plan/chat
 * 借热门职业表。2026-08-28 拆域批自 components/jobs 迁入 OnboardingWizard.tsx(首访引导
 * 与它的记忆键 OB_SEEN_KEY,原样搬,形制照旧是旧形,归换装批收拾)—— 同一套档案题,
 * 本来就该和档案表单同域。搬进来这一件原先引的是 account 桶,落户后改点兄弟文件
 * (constants / functions / types)—— 引自家桶就是自环,import/no-cycle 当场报错。
 * 对应 lib 侧数据形状:lib/jobs 的 ProfileJson / normalizeProfile。
 * 2026-08-28 换装批把上面那笔账还了:向导按形制重写并拆成十二件(题面各步一件、
 * 状态机器进 hooks、内联样式进 profile.module.css),记忆键落 constants 抽屉;
 * **对外露的两个名字 OnboardingWizard 与 OB_SEEN_KEY 冻结**(职位板、投递流、
 * 问卷三处消费者一个字没改),键的值同样不许动 —— 改了老用户会被重弹一次。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
export { CLB_OPTS, CRS_OPTS, OB_SEEN_KEY, PGWP_OPTS, POPULAR_NOCS } from './constants'
export { clbActive, crsActive, pgwpActive } from './functions'
export { OnboardingWizard } from './onboardingwizard'
export { ProfileForm } from './profileform'
export type { Opt, ProfileValue } from './types'
