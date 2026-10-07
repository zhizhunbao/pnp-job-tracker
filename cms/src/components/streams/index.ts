/**
 * streams 页面域的桶 —— /streams「通道与门槛」(资讯第三个页签,一块视图)。2026-09-30 通道与门槛批 2 立
 * (设计 docs/design/通道与门槛-20260930.md)。门槛卡本身住 pnp 桶(PnpProvStreams,与职位弹框同一个卡件、同一份懒取整表),
 * 本桶只出页面外壳:页头、二级导航、省份胶囊。
 * 2026-10-03 资讯页签四分(Frank「申请步骤应该是另一个选项卡吧」):多出 /steps「申请步骤」一块视图(Steps + STEPS_META),
 * 步骤卡同样住 pnp 桶(PnpProvSteps);两页共用本桶的省份胶囊与状态机器。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
export { STEPS_META, STREAMS_META } from './constants'
export { Steps } from './steps'
export { Streams } from './streams'
