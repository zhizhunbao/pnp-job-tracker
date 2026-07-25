// #129(2026-07-25 Frank「把所有功能都加上埋点,基于用户行为数据判断增强哪部分」):
// 功能级 umami 自定义事件统一入口。umami 未注入(本地/屏蔽)= 静默 no-op;
// 事件名扁平 kebab(umami 事件面板按名聚合),data 只放低基数枚举值,不放个人数据(隐私页承诺)。
export const track = (event: string, data?: Record<string, string | number>) => {
  try { (window as unknown as { umami?: { track: (e: string, d?: object) => void } }).umami?.track(event, data) } catch { /* umami absent */ }
}
