/**
 * gate 组件域的桶 —— 访客门:未登录访客进站(或点开职位、点投递 / 收藏)时要答的四道题 + 注册这一屏(GateWizard),
 * 外加全站骨架挂一次的草稿补交件兼进站向导(GateSync)。
 * 与 profile 的边界:profile = 登录用户的建档向导 / 档案编辑(OnboardingWizard);gate = 注册前的访客门。
 * 访客门借 profile 桶的热门职业表、已选职业标签件与「首访引导弹过了」的记法(热门表与那枚记忆键的主人在 profile)。
 * 对应 lib 域:lib/guest(浏览记录、草稿存取、起弹判定、交接)—— 数据与判定在那边,本桶只出界面与手柄。
 * 2026-10-04 访客四题改版(方向二「图标卡格」)自 profile 桶拆出立域(原件 2026-10-03 付费闭环批 A1 立)。
 * 同日收口判边界(依赖只能指向活得更久的那个):gate → profile 这条边成立 —— 借的是 profile 的档案题件(热门职业表与判定、
 * 职业选 / 摘、已选标签、单选手柄),答「档案怎么问怎么填」,是题库,比访客门这条漏斗活得久(门两天改了三版:
 * 第 3 个职位才弹 → 进站即弹 → 图标卡格);唯一挂在首访向导身上的是 obMarkSeen(OB_SEEN_KEY 的主人),首访向导删的那天,
 * 本桶两处调用(functions 的 makeGateDone、hooks 的 useGateSync)跟着删,不反向把题库件搬进门里。
 * 同日 A2:专业题改成「热门具体专业 + 搜索」(取 majors 域 /api/majors,存 CIP class 码);职业题改用 quiz 桶选职业控件
 * (按专业取热门、带搜索,已选标签由它借 profile 的 OnboardingTags)—— gate 不再直接借 profile 的热门职业表、已选标签件与
 * 选 / 摘手柄,gate → quiz 一条新边(选职业控件是全站共用的题件,比访客门活得久)。注册完人在职位板上按答案换地址栏筛。
 * 同日收口审查:obMarkSeen 的第二处调用随补交那一跑从 hooks 的 useGateSync 下沉到 functions 的 runGateSync
 * (上面「两处调用」现在都在 functions:makeGateDone、runGateSync)。
 * 2026-10-05 专业题的选择器拆出立 components/majors 桶(「从 CIP 全表里挑专业」:浏览、搜索、已选回显与它的取数),
 * gate → majors 一条新边(选择器不认识访客门,比这条漏斗活得久);本桶留答案落格、流程、草稿与注册后回职位板。
 * 同日专业改多选(至多 3 个)。
 * 同日职业题改成与专业题同一副左右两栏(Frank「也改成左右 两部分吗?」「改啊」;摆法在 quiz 桶选职业控件的大号档里):
 * 上面 A2 那句「已选标签由它借 profile 的 OnboardingTags」作废 —— 控件自己用 tag 桶已选一行摆,不再经 profile。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
export { GateEdit } from './gateedit'
export { GateSync } from './gatesync'
export { GateWizard } from './gatewizard'
export type { GateEditSeed } from './types'
