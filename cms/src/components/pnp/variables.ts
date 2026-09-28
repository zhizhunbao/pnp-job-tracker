/**
 * pnp 域的可变状态。写成一个容器对象(不是几个 `export let`)——
 * 跨模块的 `export let` 是只读活绑定,别的文件里赋值当场编译错。
 * 2026-09-28 省提名弹框自立(Frank「pnp 弹框自己管自己」)时随懒取整表自 advisor 的 CACHE.pnpData 迁入。
 *
 * @author Frank
 * @time 2026-09-28 05:30:00
 */

import type { PnpData } from './types'

/**
 * 跨组件的会话级缓存(整页刷新即清)。
 */
export const CACHE = {
  /**
   * 省提名几张整表(2026-09-26 /fe 首页 Frank:首页不再内联,弹框打开才懒取 —— 见 usePnpData);
   * null = 这一页还没取过。取到一次整页复用,再开弹框当场就有,不再出加载行。
   */
  pnpData: null as PnpData | null,
}
