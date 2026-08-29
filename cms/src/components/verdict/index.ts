/**
 * verdict 域的桶 —— 一键三合一判定区(联邦 EE / 省提名 / 雇主担保三条线一次给结论)
 * 与它底下的申请人条件格子。两件本来就是一对:条件格子是判定区的输入面,
 * 判定区是条件格子的结论面;消费者除了职位板还有 /plan/pr 决策页,所以自己成域。
 * 2026-08-28 自 components/jobs 拆域迁入(TripleVerdictModal.tsx、ConditionGrid.tsx
 * 两件原样搬);同日换装批整体重写成小写件形制:排版拆成 13 个小件一件一文件、
 * 状态收进 hooks.ts、内联样式与两处 <style> 注入整体迁 verdict.module.css、
 * 裸 <button>/<a> 改经 button 族。桶门三件的名字与 props 形状不动 ——
 * 消费者 plan 桶三件刚换装完,jobs 旧件等波 B。
 * 域内小件(卡片/瓦片/条件格分块)不出桶。
 * 对应 lib 域:lib/ruling、lib/pathways。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
export { ConditionGrid } from './conditiongrid'
export { TripleVerdictPanel } from './tripleverdictpanel'
export { TvEntryCard } from './tventrycard'
