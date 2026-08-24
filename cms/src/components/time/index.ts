/**
 * time 组件域的桶 —— 日期/时间的**显示**件(值的口径归 lib/time)。
 * 2026-08-24 立域(Frank「components 下面也需要一个 time 域」):收拢当场抓出
 * 五套各写各的灰小字日期(pnpFedDate / nwCmtDate / jtUpdated / SavedSearchList
 * 内联 / Table 三处内联,字号 11–12.5、灰三种)与两处散写的 suppressHydrationWarning。
 * 对应 lib 域:time。
 *
 * @author Frank
 * @time 2026-08-24 13:00:00
 */
export { DateAge } from './dateage'
export { TimeText } from './timetext'
export type { DateAgeIn, TimeGrain, TimeTextIn, TimeTone } from './types'
