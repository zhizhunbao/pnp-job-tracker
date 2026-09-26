/**
 * 浏览器侧埋点初始化(Next 约定文件:每次整页加载、React 水合之前跑一次)。
 * 2026-09-26 /fe Frank「Umami 去噪」:地址带 `?notrack=1` 写 Umami 官方自排除键、`?notrack=0` 清掉 ——
 * 本人两台设备占近 30 天全站浏览 47%,各点一次即两套口径都不计;判定与读写在 lib/track 的 syncTrackSwitch。
 * 放这里而不放 layout 里的 Provider:它不是组件,也不属于语言或会话域,这是框架留给埋点初始化的位置。
 *
 * @author Frank
 * @time 2026-09-26 11:23:01
 */
import { syncTrackSwitch } from '@/lib/track'

syncTrackSwitch()
