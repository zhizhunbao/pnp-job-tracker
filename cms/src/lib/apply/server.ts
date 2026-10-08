/**
 * 站内投递域的**服务端**门:HTTP 芯(要连库、发信、带 pdf-lib,浏览器不该拿到)。
 * 门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-10-07 01:30:00
 */

export {
  applyCoverRoute, applyDraftRoute, applyFileRoute, applyInboundRoute, applyLetterRoute, applySendRoute, applyStartRoute,
} from './routes'
