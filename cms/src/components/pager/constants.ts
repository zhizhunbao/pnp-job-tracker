/**
 * pager 域的死值:两个翻页钮的无障碍名与页码分隔符。
 *
 * @author Frank
 * @time 2026-08-24 16:00:00
 */

/**
 * 上一页钮的无障碍名。
 * 纯图标钮(里面只有一个 svg)必须有名字,否则读屏只报一句「按钮」。
 * 给的是箭头字符本身而不是「上一页」三个字 —— 本域是全站通用件、不携词
 * (词归 lib/i18n),真要念出人话得由调用方传进来;眼下先保证有名字。
 */
export const PREV_ARIA = '‹'

/**
 * 下一页钮的无障碍名:右向单角引号,与 PREV_ARIA 的左向那个成对。
 * 同样是纯图标钮(里面只有一个 IconChevronRight),没有名字读屏只报一句「按钮」;
 * 取箭头字符而不是「下一页」三个字的判据见 PREV_ARIA —— 本域不携词。
 */
export const NEXT_ARIA = '›'

/**
 * 当前页与总页数之间的分隔,渲染成「1 / 5」。
 * 斜杠两边各留一个空格是排版决定:贴着写成 1/5 会被读成分数,
 * 而这两个数是「第几页」与「共几页」,不是一个比值。
 */
export const PAGE_SEP = ' / '

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形,
 * Button 只出统一的语义与可达性(disabled/aria)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 「显示更多」钮的底:白底描边(与职位板那一行同款)。
 */
export const MORE_BTN_KIND = 'secondary'

/**
 * 「显示更多」在途时的钮面占位。
 */
export const MORE_BUSY = '…'

/**
 * 不加类(「显示更多」钮平时不带附加类)。
 */
export const CLS_NONE = ''

/**
 * 清单「展开」一次加几个(2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」「展开 20, 再展开 20, 再开其余, 收起」):全站清单卡同一个数 —— 展开 20 → 再展开 20 →
 * 展开其余 N → 收起。
 */
export const FOLD_STEP = 20

/**
 * 清单默认露几行(2026-10-02 Frank「这种全部默认显示 20 个可以吗?如果小于 20 全部显示?」(拍板「全站所有清单」)):全站清单卡同一个数,不足这个数全露;本岗命中那行照旧置顶高亮。
 * 原各桶自定的首屏条数(案例其余路径 5、在招职位 8、在招地点 3、楼内回复 ≤3 全露、省提名清单只露本岗 1 行)随之撤。
 */
export const FOLD_FIRST = 20

/**
 * 「展开 N {量词} ▾」词条(收着、其余超过一步时)。
 */
export const K_FOLD_FIRST = 'fold.first'

/**
 * 「再展开 N {量词} ▾」词条(展开着、其余还超过一步时)。
 */
export const K_FOLD_NEXT = 'fold.next'

/**
 * 「展开其余 N {量词} ▾」词条(其余不到一步时;收着、展开着都用它)。
 */
export const K_FOLD_REST = 'fold.rest'

/**
 * 「收起 ▴」词条(展开着才出)。
 */
export const K_FOLD_UP = 'fold.up'

/**
 * 取数中钮面的词条(同全站加载行)。
 */
export const K_FOLD_BUSY = 'act.loadingText'

/**
 * 「展开」钮的档:收着 / 再展开 / 展开其余 / 不出钮。
 */
export const FOLD_MORE_FIRST = 'first'

/**
 * 同上:再展开。
 */
export const FOLD_MORE_NEXT = 'next'

/**
 * 同上:展开其余。
 */
export const FOLD_MORE_REST = 'rest'

/**
 * 同上:不出钮(都展开完了)。
 */
export const FOLD_MORE_NONE = ''

/**
 * 「展开」钮三档 → 词条。
 */
export const FOLD_KEYS: Record<string, string> = {
  /**
   * 收着、其余超过一步:「展开 N」。
   */
  first: 'fold.first',

  /**
   * 展开着、其余还超过一步:「再展开 N」。
   */
  next: 'fold.next',

  /**
   * 其余不到一步:「展开其余 N」。
   */
  rest: 'fold.rest',
}

/**
 * 按页取的清单接口上「跳过几行」的参数名(2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」:AIP 指定雇主卡与相似雇主卡两套取页机并进 usePagedFold,
 * 两个接口都认它)。
 */
export const P_PAGE_OFFSET = 'offset'

/**
 * 接口地址后面续查询参数的连接符(调用方给的地址已带问号与至少一个参数)。
 */
export const PAGE_QS_JOIN = '&'

/**
 * 查询参数名与值之间的等号。
 */
export const PAGE_QS_EQ = '='
