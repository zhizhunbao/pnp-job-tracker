/**
 * table 组件域的桶 —— 公共简单表(组件统一 P2 头件,2026-07-19 Frank
 * 「所有页面都用同一个 table 组件」;2026-08-11 五张裸 table 并成这一套)。
 * 对应 lib 域:无(通用件);jobs 主表是独立重器不并入,只对齐视觉 token。
 *
 * 组件域样张(2026-08-24 Frank 拍板「组件即域,域自带 css/常量/函数」):
 * 结构 table.tsx / 样式 table.module.css(自 main.css 第 8 段迁入,值逐格相等)/
 * 门槛数 constants / 纯排序与类拼 functions;域自包含,可整体搬迁。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */
export type { Col, TableIn } from './types'
export { Table } from './table'
