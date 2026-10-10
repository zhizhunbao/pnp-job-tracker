/**
 * profile 域(移民档案)的函数:点选项归属(区间机器 + 三张表的包装)、职业搜索
 * 兜底、逐枚 chip 的 make* 手柄工厂、档案 seed 与保存。2026-08-27 Frank 拍板自
 * account 域拆出;clbActive 族保持标量签名(jobs/OnboardingWizard 经桶在借)。
 * 2026-09-23 账户页撤移民档案节、档案表单删文件:只有表单在用的职业搜索兜底
 * (makeAddTyped / toNocOpts / makeLoadNocOpts / nocHitsOf / nocTitleOf / makeNocAdd / makeNocAdder)
 * 与保存钮面 profileSaveLabelOf 随之删除;makeSaveProfile 与 profileSeedOf 首访向导还在用,留着。
 * 2026-10-03 付费闭环批 A1:尾段接访客向导的手柄(步序、题面、下一步 / 跳过、四道题的上报口、注册后交接、
 * 预选职业查名);浏览记录与草稿的存取不在这里,归 lib/guest(本文件逼近 1000 行闸,也本该归那边)。
 * 2026-10-04 访客四题改版:那段访客向导手柄(连同查名的行构造器 toNocName)整段迁去 gate 桶,本文件回到 1000 行闸线下;
 * isPopularNoc 是热门表主人给的判定,留在这里(plan、gate 经桶借);makeNocPick / makeNocDrop / obMarkSeen 随之出桶给 gate 借。
 * 同日收口:makeOptPick 也出桶给 gate 借(gate 删掉自家逐字同义的 makeOptTap)。
 * 同日 A2:访客第 3 题改用 quiz 桶选职业控件(大号档),gate 不再借 makeNocPick / makeNocDrop(两枚收回桶内);
 * 已选标签改由选职业控件借 OnboardingTags,它的胶囊不再是热门表 —— 标签「这一屏胶囊里有就不回显」的判定收成 isChipNoc。
 * 2026-10-05 访客第 3 题改成与第 2 题同一副左右两栏(Frank「也改成左右 两部分吗?」「改啊」):选职业控件的已选一行改用 tag 桶
 * TagRow 自己摆、不再借 OnboardingTags,只为它开的两样撤 —— isChipNoc(OnboardingTags 回到只按热门表判,直接用 isPopularNoc)
 * 与 obNocLabelOf 的「候选名先于热门表」(callerFirst)。OnboardingTags 照旧给首访向导的职业步用。
 * 2026-10-09「我的档案」批:首访引导向导退役(Frank 拍板只留访客向导,登录用户改在「我的档案」看 / 改答案):只为它活着的函数整批删 ——
 * 区间归属(bandValueOf / clbActive 族)、各步 chip 手柄、档案 seed 与保存(makeSaveProfile)、步序 / 题面 / 钮面、简历预填一路、
 * 走完落地(makeOnboardingFinish)与「弹过了」的记法 obMarkSeen(gate、quiz 两处写入同批撤)。剩三枚:makeOptPick(gate 借)、
 * obBarStyleOf(OnboardingHead 的进度条,投递流借)、isPopularNoc(plan 借)。被删函数身上的决策记录摘进桶门 index.ts 文件头。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { OB_PERCENT_MAX, OB_PERCENT_SIGN, POPULAR_NOCS } from './constants'
import type { ObBarIn, OptPickIn, OptValue } from './types'

/**
 * 造一枚单选 chip 的点击手柄:点了把这档的值报出去(区间档点 null 值档 = 清空该字段;
 * 访客向导的专业 / 所在省报串值,同一个手柄)。
 * 2026-10-04 收口:gate 桶的目标大卡(报档位数)、专业胶囊与省格子(报码)经桶借这一枚,不在 gate 另抄。
 *
 * @param x 这枚代表的值与上报口。
 * @returns 点选手柄。
 */
export function makeOptPick<V extends OptValue>(x: OptPickIn<V>): () => void {
  return function pickOpt(): void {
    x.onPick(x.value)
  }
}

/**
 * 进度条填充的宽度:走到第几步占总步数的比例(第一步就见得到一格,所以步数加一)。
 * 只有宽度一格是运行时算出来的,其余长相都在样式表里。
 *
 * @param x 走到第几步与总共几步。
 * @returns 只有宽度一格的运行时样式。
 */
export function obBarStyleOf(x: ObBarIn): React.CSSProperties {
  const pct = Math.round(((x.step + 1) / x.total) * OB_PERCENT_MAX)
  return { width: pct + OB_PERCENT_SIGN }
}

/**
 * 这个码在不在热门表里(在就有大白话名,不必查)。热门表的主人给的判定,plan 桶经桶借用(不再各写一份)。
 *
 * @param code 职业码。
 * @returns 在 = true。
 */
export function isPopularNoc(code: string): boolean {
  for (const p of POPULAR_NOCS) {
    if (p.noc === code) {
      return true
    }
  }
  return false
}
