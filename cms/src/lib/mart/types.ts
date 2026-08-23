/**
 * 交接域的形状 —— 本域自己声明。
 *
 * @author Frank
 * @time 2026-08-23 14:20:00
 */

/**
 * mart 文件里一格的值:JSON 放得下的任意形(jsonb 列真会是对象/数组)。
 * 本域是 raw JSON → DB 的边界,值的真形状就是 JSON(2026-08-21 禁 unknown 后照实声明)。
 */
export type MartValue = string | number | boolean | null | MartValue[] | { [k: string]: MartValue }

/**
 * mart 文件里的一行。
 */
export type MartRow = Record<string, MartValue>

/**
 * `seedTokenOk` 的入参。
 */
export type TokenGateIn = {
  /**
   * 请求(读 x-seed-token 头)。
   */
  req: Request

  /**
   * 查询参数里的 token 值(/seed 额外认;upload 传 null)。
   */
  queryToken: string | null
}

/**
 * `martPaths` 的返回:该表本轮的有序文件清单(分片按 0..N-1;单文件一条;没上传空表)。
 */
export type MartPathsOut = string[]
