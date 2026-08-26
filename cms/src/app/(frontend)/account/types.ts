/**
 * 账户页(/account)那几个迁出组件体的函数的契约。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,ProfileForm 的 addTyped 与
 * AccountPage 的 onNickKey 随之迁进本目录的 functions.ts —— 原先靠闭包拿到的东西
 * 全部改成这里的显式入参,组件只负责把手上的值递进去。
 *
 * @author Frank
 * @time 2026-08-26 15:28:17
 */

/**
 * makeAddTyped 的入参(原 ProfileForm 体内 addTyped 闭包的三样东西)。
 */
export type AddTypedIn = {
  /**
   * 搜索框里当前敲进去的原字(未 trim;5 位数字按 NOC 码直加)。
   */
  q: string

  /**
   * 当前搜索命中的职业清单;不是码时取第一条加。
   * 只声明本函数真读的那一格(职业码),标题等格不关它的事。
   */
  hits: readonly { noc: string }[]

  /**
   * 把一个职业码加进已选清单(重复与空串由它自己挡)。
   */
  addNoc: (code: string) => void
}

/**
 * 「加输入框里这一个」的按钮手柄:不带参数,点了就按当前输入加一个职业。
 */
export type AddTypedFn = () => void

/**
 * makeNickKey 的入参(原 AccountPage 体内 onNickKey 闭包的两样东西)。
 */
export type NickKeyIn = {
  /**
   * 存昵称(Enter 触发);判空与忙态归它自己。
   */
  saveNick: () => void

  /**
   * 昵称编辑态 setter;给 null = 退出编辑(Esc 触发)。
   */
  setNick: (v: string | null) => void
}

/**
 * 昵称框的键盘手柄。只读事件的 key 一格 —— 按本域自己声明形状的规矩,
 * 不去借 React 的事件类型(实参是 React.KeyboardEvent,结构上兜得住)。
 */
export type NickKeyFn = (e: { key: string }) => void
