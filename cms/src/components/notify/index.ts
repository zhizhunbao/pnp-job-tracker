/**
 * notify 桶 —— 顶栏通知铃铛(2026-10-11 批 5「提示统一 + 顶栏铃铛」,照 Azure 门户的 Notifications;
 * 2026-11-07「我的」整页重做时整桶重写,docs/design/我的/我的框架-20261107.md 1.7 / 2.6;先写在 me 桶子桶里,
 * 因 me → jobs → header → me 成环,整桶替回原位 notify)。
 * 对应 lib 域:lib/notify(/api/notify、/api/notify/seen)。只有顶栏(header 桶)挂 Bell;面板、每一条、种类图标是桶内件不出桶。
 *
 * @author Frank
 * @time 2026-11-07 17:00:00
 */
export { Bell } from './bell'
