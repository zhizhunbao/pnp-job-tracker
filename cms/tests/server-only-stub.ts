/**
 * `server-only` 的测试替身(空模块)。真包只在 RSC 条件导出下无害,
 * vitest 的 jsdom 环境走它的 client 分支会直接 throw —— 测试里把包名 alias 到这里。
 * 毒丸的保护对象是 next build(client bundle 引到 db/pool.ts 当场红),测试不需要它。
 *
 * @author Frank
 * @time 2026-08-23 02:20:00
 */

export {}
