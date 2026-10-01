/**
 * streams 页面域的桶 —— /streams「通道与门槛」(资讯第三个页签,一块视图)。2026-09-30 通道与门槛批 2 立
 * (设计 docs/design/通道与门槛-20260930.md)。门槛卡本身住 pnp 桶(PnpProvStreams,与职位弹框同一个卡件、同一份懒取整表),
 * 本桶只出页面外壳:页头、二级导航、省份胶囊。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
export { STREAMS_META } from './constants'
export { Streams } from './streams'
