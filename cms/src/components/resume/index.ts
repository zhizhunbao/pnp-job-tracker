/**
 * resume 域的桶 —— 简历对照 JD(G3):左右两栏摆「工作要求 vs 简历现状」,
 * 缺的红叉排前、命中绿勾在后。入口挂在职位详情页的投递栏上,但它答的是
 * 「这份简历配不配得上这个岗」,与职位板怎么排无关,所以自己成域。
 * 2026-08-28 自 components/jobs 拆域迁入(ResumeMatchModal.tsx 一件原样搬);
 * 同日换装批整体重写成小写件形制 —— 三屏拆成 MatchLoginWall / MatchResult /
 * MatchForm 三件、单元格 MatchResCell 一件,状态收进 hooks 的 useResumeMatch,
 * 内联样式逐格迁 resume.module.css。四件都是域内小件不出桶:对外只露弹框本身
 * (名字与 props 冻结,消费者是职位详情页的 Jd.tsx)。
 * 对应 lib 域:lib/resume。
 *
 * @author Frank
 * @time 2026-08-28 16:26:43
 */
export { ResumeMatchModal } from './resumematchmodal'
