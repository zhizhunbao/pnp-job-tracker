/**
 * 对话域的桶 —— **浏览器也能跑的那半**。
 *
 * 门里只有转发,一个函数都没有(宪法「两个门的域怎么摆」)。
 *
 * 🔴 **这个门只转发类型**。`consult` 本身走 `./server`:它虽然不 import `payload`
 * (连接池由调用方 `db` 注进来),但它落在 `../agent/server` 上,而那道门按约定是服务端半边。
 * 类型走这里,页面与客户端组件要形状时不必碰服务端那条链。
 *
 * @author Frank
 * @time 2026-08-21 01:05:00
 */

export type {
  Availability, ConsultIn, ConsultOut, Fact, GateHit, Profile, RunIn, RunOut, Turn,
} from './types'
