/**
 * jsonld 域的形状。
 *
 * @author Frank
 * @time 2026-08-29 07:30:00
 */

/**
 * JsonLd 的 props。
 */
export type JsonLdIn = {
  /**
   * 拼好的 JSON-LD 整串(各域的 *JsonOf / *JsonLd 函数产出;本件只裹壳不碰内容)。
   */
  json: string
}
