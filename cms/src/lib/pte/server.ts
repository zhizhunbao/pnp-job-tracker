/**
 * pte lib 域的服务端门:取数与 HTTP 芯(要连库,浏览器不该拿到)。门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-09-03 16:00:00
 */

export { loadPteAudio, loadPteDict, loadPteDone, savePteDone } from './functions'
export { pteAudioRoute, pteDictRoute, pteDoneGetRoute, pteDonePutRoute } from './routes'
