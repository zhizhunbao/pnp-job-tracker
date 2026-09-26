/**
 * advisor 域的可变状态。写成一个容器对象(不是几个 `export let`)——
 * 跨模块的 `export let` 是只读活绑定,别的文件里赋值当场编译错。
 * 2026-08-28 拆域批随 JdAdvisorSection 自 components/jobs/Jd.tsx 迁入。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */

import type { AdvisorPnpData } from './types'

/**
 * 跨组件的会话级缓存(整页刷新即清)。
 */
export const CACHE = {
  /**
   * 省提名清单与抽选两张整表(2026-09-26 /fe 首页 Frank:首页不再内联,弹框打开才懒取 —— 见 usePnpData);
   * null = 这一页还没取过。取到一次整页复用,再开弹框当场就有,不再出加载行。
   */
  pnpData: null as AdvisorPnpData | null,

  /**
   * 同岗内嵌初判(2026-07-19 Frank:「像公司顾问一样自动生成,不要再点一下」)——
   * 打开职位描述即自动流式生成,同岗会话内缓存,反复开关不重复烧额度。
   * ⚠️ 写入用的键与读取用的键**对不上**(读 `档:岗位号`,写 `岗位号`),迁入时逐字保留了
   * 这个行为:缓存实际上从来没命中过,每次开都重新生成。修它会改变额度消耗,
   * 不在本批范围 —— 记在换装批的行为疑点台账里,单独一批治。
   */
  jdAdvisor: new Map<string, string>(),
}
