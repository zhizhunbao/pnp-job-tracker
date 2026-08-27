/**
 * 答题控件页(/quiz)从组件体里迁出来的函数。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」:逐项事件手柄用 makeXxx 工厂
 * (样张 select 的 optionLabelOf / makeSelectChange),闭包变量改 XxxIn 显式入参。
 * 眼下只有一个函数两个类型,契约就近声明在本文件,不另开 types.ts。
 *
 * @author Frank
 * @time 2026-08-26 15:28:17
 */

/**
 * makeSearch 的入参(原 OccPicker 体内 onSearch 闭包的两个 setter)。
 */
export type SearchIn = {
  /**
   * 搜索词 setter。
   */
  setQ: (v: string) => void

  /**
   * 候选清单 setter。这里只拿来清空,故入参窄成空数组 ——
   * 本函数不读候选的任何一格,不必替它声明形状。
   */
  setCands: (empty: []) => void
}

/**
 * 搜索框的改值手柄。
 */
export type SearchFn = (v: string) => void

/**
 * 造一枚搜索框的改值手柄:清空即连候选一起清
 * (原先这句写在自搭清除钮的 onClick 里,2026-08-24 换 field 域的 Search 后收进这一处)。
 *
 * @param x 搜索词与候选清单两个 setter。
 * @returns 挂到 Search onChange 上的手柄。
 */
export function makeSearch(x: SearchIn): SearchFn {
  return function onSearch(v: string): void {
    x.setQ(v)
    if (v === '') {
      x.setCands([])
    }
  }
}
