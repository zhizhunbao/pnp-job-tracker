/**
 * pte lib 域的桶 —— **浏览器也能跑的那半**:并集与 URL 取键这两只纯函数,以及形状。
 * 要连库的那半(取音频 / 练过档 / 两个 HTTP 芯)在 `./server`。
 * 对应组件域:components/pte(页面视图与题单/单题取数住那边;本域只装要经 HTTP 的两样)。
 *
 * @author Frank
 * @time 2026-09-03 16:00:00
 */
export { qidOfUrl, unionOf } from './functions'
export type { DoneKeys, PteAudio, PteDoneDoc } from './types'
