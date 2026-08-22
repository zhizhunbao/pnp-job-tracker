/**
 * 模板填充 —— 唯一的一个函数:把 `{slot}` 槽位换成参数值。
 * 为什么单独成叶:prompts.ts 只许装**字**(Frank 2026-08-22 实拍 plan/prompts 里写函数),
 * 于是各域的提示词/算术说明收成带槽位的模板串,填充这件事是行为、且 jobs 与 plan 两个域都要 ——
 * 两个消费者才算公共(宪法判据),住进共享叶子。与 i18n 的 t() 分工:那边是给人看的三语文案,
 * 这边是给模型/复述层的单语模板,两套槽位机制不合并(受众与生命周期都不同)。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

/**
 * `fill` 的入参。
 */
export type FillIn = {
  /**
   * 带 `{slot}` 槽位的模板串。
   */
  tpl: string

  /**
   * 槽位 → 值。数字原样 String;没提供的槽位原样留着(可被上层发现,不静默吞)。
   */
  params: Record<string, string | number>
}

/**
 * 槽位正则:`{名字}`。
 */
const SLOT_RE = /\{(\w+)\}/g

/**
 * 填模板:每个 `{slot}` 换成 params 里的同名值;缺的槽位原样保留。
 *
 * @param input 模板与参数。
 * @returns 填好的串。
 */
export function fill(input: FillIn): string {
  return input.tpl.replace(SLOT_RE, function slotOf(whole: string, name: string): string {
    const v = input.params[name]
    if (v == null) {
      return whole
    }
    return String(v)
  })
}
