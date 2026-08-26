/**
 * advisor 域的全部可变状态 —— 只有这一个容器。
 * 进程内缓存,dev 下随热重载清空;键版本在 constants.CACHE_VER,提示词一改就 bump,
 * 陈旧条目永不再服务(#126 生产复验教训)。
 *
 * @author Frank
 * @time 2026-08-23 16:00:00
 */

/**
 * 域内唯一的状态容器。
 */
export const CACHE: {
  /**
   * 初判缓存:缓存键(CACHE_VER:field:keyId:lang[:p<uid>])→ 闸后全文。
   * 对话不缓存(每轮唯一);试用计费在闸层,缓存命中也计次。
   */
  readsBy: Map<string, string>
} = {
  /**
   * 起点是空表:进程启动/热重载后第一问必然 miss,由生成路径回填。
   */
  readsBy: new Map<string, string>(),
}
