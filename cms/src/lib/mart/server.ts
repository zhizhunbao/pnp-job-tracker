/**
 * 交接域的**服务端**门(全域都是服务端:直灌生产库)。门里只有转发。
 * 2026-08-26 形制批收窄:对外只有两个壳消费的两枚 HTTP 芯 ——
 * 文件布局函数(martPaths/martHash/…)没有域外消费者,不再出门。
 *
 * @author Frank
 * @time 2026-08-23 14:20:00
 */

export { martUploadRoute, seedRoute } from './routes'
