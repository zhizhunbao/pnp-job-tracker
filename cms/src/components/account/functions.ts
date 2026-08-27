/**
 * 账户页(/account)从组件体里迁出来的函数。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」:逐项事件手柄用 makeXxx 工厂
 * (样张 select 的 optionLabelOf / makeSelectChange),闭包变量改 XxxIn 显式入参。
 * 同日续:页面「纯拼装门」改造批把 page.tsx 的内联样式迁进 account.module.css,
 * 窄屏/选中/档位三处分叉不写三目,改成这里的 clsOf 按布尔拼修饰类。
 *
 * @author Frank
 * @time 2026-08-26 15:28:17
 */
import { cssOf } from '@/components/css'
import { CARD_CLS, CLS_SEP, EMAIL_AT, NICK_BUSY_MARK, PLAN_30, PLAN_90, SEC_LABEL_CUT_RE, TEXT_NONE } from './constants'
import type {
  AddTypedFn,
  AddTypedIn,
  BuyBtnClsIn,
  BuyPickFn,
  BuyPickIn,
  BuyPlan,
  NarrowClsIn,
  NavBtnClsIn,
  NavLabelIn,
  NickKeyFn,
  NickKeyIn,
  NickSaveLabelIn,
  NickShownIn,
  SecPickFn,
  SecPickIn,
} from './types'
import css from './account.module.css'

/**
 * 造一枚「加输入框里这一个」的按钮手柄:输入框里敲的东西直接加 ——
 * 5 位码按码加,否则加命中的第一条。
 * (原先埋在 input 的 onKeyDown 箭头里 —— 换 field 域的 Search 后,键盘出口归
 *  组件域统一定,这条页面专属行为提成具名函数并给一个显式的钮。)
 *
 * @param x 当前输入、命中清单与加码函数。
 * @returns 点一下加一个职业的手柄。
 */
export function makeAddTyped(x: AddTypedIn): AddTypedFn {
  return function addTyped(): void {
    const v = x.q.trim()
    if (/^\d{5}$/.test(v)) {
      x.addNoc(v)
      return
    }
    if (x.hits[0] != null) {
      x.addNoc(x.hits[0].noc)
    }
  }
}

/**
 * 造一枚昵称框的键盘手柄:Enter 存、Esc 取消。
 *
 * @param x 存昵称与退出编辑两个动作。
 * @returns 挂到输入框 onKeyDown 上的手柄。
 */
export function makeNickKey(x: NickKeyIn): NickKeyFn {
  return function onNickKey(e: { key: string }): void {
    if (e.key === 'Enter') {
      x.saveNick()
    }
    if (e.key === 'Escape') {
      x.setNick(null)
    }
  }
}

/**
 * 两列容器的类名预算:基座 + 窄屏修饰(窄屏两列改上下叠)。
 *
 * @param x 是不是窄屏。
 * @returns 拼好的 className。
 */
export function columnsClsOf(x: NarrowClsIn): string {
  const cls = [cssOf(css.columns)]
  if (x.narrow) {
    cls.push(cssOf(css.columnsNarrow))
  }
  return cls.join(CLS_SEP)
}

/**
 * 左列 sidebar 卡的类名预算:全局白卡壳 + 本域密度 + 窄屏修饰(窄屏变顶部横排条)。
 *
 * @param x 是不是窄屏。
 * @returns 拼好的 className。
 */
export function sideClsOf(x: NarrowClsIn): string {
  const cls = [CARD_CLS, cssOf(css.side)]
  if (x.narrow) {
    cls.push(cssOf(css.sideNarrow))
  }
  return cls.join(CLS_SEP)
}

/**
 * 右列内容卡的类名预算:全局白卡壳 + 本域基座 + 窄屏修饰(窄屏吃满整宽)。
 *
 * @param x 是不是窄屏。
 * @returns 拼好的 className。
 */
export function mainClsOf(x: NarrowClsIn): string {
  const cls = [CARD_CLS, cssOf(css.main)]
  if (x.narrow) {
    cls.push(cssOf(css.mainNarrow))
  }
  return cls.join(CLS_SEP)
}

/**
 * 节导航钮的类名预算:基座 + 选中修饰(淡靛底 + 品牌蓝字 + 半粗)。
 *
 * @param x 这一枚是不是当前节。
 * @returns 拼好的 className。
 */
export function navBtnClsOf(x: NavBtnClsIn): string {
  const cls = [cssOf(css.navBtn)]
  if (x.active) {
    cls.push(cssOf(css.navBtnActive))
  }
  return cls.join(CLS_SEP)
}

/**
 * 侧栏标签该显示什么:节标题裁掉括号里的说明。侧栏标签复用各节标题键,
 * 而「升级 Pro(一次性时长包…)」整条进侧栏太长,会把 190px 的一列撑破。
 *
 * @param x 该节的标题原文。
 * @returns 裁过并去掉首尾空白的短标签;裁不出东西时给空串。
 */
export function navLabelOf(x: NavLabelIn): string {
  const head = x.label.split(SEC_LABEL_CUT_RE)[0]
  if (head == null) {
    return TEXT_NONE
  }
  return head.trim()
}

/**
 * 造一枚节钮的点击手柄:点了就切到它代表的那一节。
 *
 * @param x 这一枚代表哪一节、点了往哪报。
 * @returns 挂到钮上的 onClick 手柄。
 */
export function makeSecPick(x: SecPickIn): SecPickFn {
  return function pickSec(): void {
    x.onPick(x.sec)
  }
}

/**
 * 身份行显示的名字:昵称优先,昵称空(没设过或只有空白)就回退成邮箱的 @ 前缀。
 *
 * @param x 昵称与邮箱。
 * @returns 显示名;邮箱里连 @ 都没有时给空串。
 */
export function nickShownOf(x: NickShownIn): string {
  if (x.displayName != null) {
    const named = x.displayName.trim()
    if (named !== '') {
      return named
    }
  }
  const head = x.email.split(EMAIL_AT)[0]
  if (head == null) {
    return TEXT_NONE
  }
  return head
}

/**
 * 昵称保存钮的钮面文字:存的过程中换成省略号(占位不跳动),否则是「保存」。
 *
 * @param x 忙态与取词函数。
 * @returns 钮面文字。
 */
export function nickSaveLabelOf(x: NickSaveLabelIn): string {
  if (x.busy) {
    return NICK_BUSY_MARK
  }
  return x.t('acct.nickSave')
}

/**
 * 时长包购买钮的类名预算:基座 + 档位配色(查表,键完整性由 Record<BuyPlan, string>
 * 管着)+ 忙态压暗。
 *
 * @param x 档位与忙态。
 * @returns 拼好的 className。
 */
export function buyBtnClsOf(x: BuyBtnClsIn): string {
  const planCls: Record<BuyPlan, string> = {
    [PLAN_30]: cssOf(css.buyBtn30),
    [PLAN_90]: cssOf(css.buyBtn90),
  }
  const cls = [cssOf(css.buyBtn), planCls[x.plan]]
  if (x.busy) {
    cls.push(cssOf(css.buyBtnBusy))
  }
  return cls.join(CLS_SEP)
}

/**
 * 造一枚购买钮的点击手柄:点了就按它代表的档发起 Checkout。
 *
 * @param x 这一枚买哪一档、点了往哪报。
 * @returns 挂到钮上的 onClick 手柄。
 */
export function makeBuyPick(x: BuyPickIn): BuyPickFn {
  return function pickPlan(): void {
    x.onBuy(x.plan)
  }
}
