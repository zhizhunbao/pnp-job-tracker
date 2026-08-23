/**
 * NOC 显示域的全部可变状态:分类译名登记表。
 * 2026-08-03 起**名字住维度表**:分类换成 NOC 官方层级(89 个中类 + 162 个小类)之后,
 * 再靠 i18n 里人肉维护 cat.* 就是等着英文界面冒中文(#247 那类事故)——
 * noc_categories 每行自带 mid_en/mid_ko/fine_en/fine_ko,页面拿到 dims 时登记一次。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

import type { NocCache } from './types'

/**
 * NOC 显示域全部的可变状态,就这一格。
 */
export const CACHE: NocCache = {
  /**
   * 分类值 → 英/韩名(开机是空的,页面拿到 dims 时登记)。
   */
  labels: {},
}
