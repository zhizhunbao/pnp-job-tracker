/**
 * 通道域的**服务端**门:RCIP/FCIP 社区名额状态取数 —— 签名收 `Db`,浏览器跑不了。
 * 门里只有转发(闸 door-forward-only);连接池由调用方注进来(拍板③:db 只在边缘)。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

export { fetchPilotQuota } from './functions'
