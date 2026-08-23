/**
 * 档案域的**服务端**门(patchProfile 是 payload 接缝,浏览器不该拿到)。
 * 门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

export { patchProfile } from './functions'
export type { ProfilePatch } from './types'
