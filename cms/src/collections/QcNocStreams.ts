import type { CollectionConfig } from 'payload'

// 魁省职业 → 通道对照表(2026-09-30 魁省门槛弹框,docs/design/魁省门槛弹框-20260929.md)— ETL 写入:etl/pnp/qc 读魁省官方「按 NOC 查通道」
// 工具的数据表 + 受监管职业清单(两份交叉核对)→ mart 汇装(配上门槛流名、按 TEER 挂 PEQ)→ data/mart/qc_noc_streams.json → seed。
// 一行 = 一个 NOC(516 行);channels 按卡片顺序列出能走的通道(PSTQ 1 → 2 → 3 → PEQ),职位板格子取第一个,弹框每个通道一张门槛卡。
// ⚠️ 新表,生产库必须先手动跑 docs/sql/qc-noc-streams-20260930.sql(含 payload_locked_documents_rels.qc_noc_streams_id),再部署本改动。
export const QcNocStreams: CollectionConfig = {
  slug: 'qc-noc-streams',
  admin: { useAsTitle: 'noc', defaultColumns: ['noc', 'name'], group: 'Data (ETL)' },
  fields: [
    { name: 'noc', type: 'text', index: true, admin: { description: 'NOC 2021 五位码' } },
    { name: 'name', type: 'text', admin: { description: '职业名(官方对照表英文原名)' } },
    { name: 'channels', type: 'json', admin: { description: '能走的通道 [{key, program, stream, title, code, kind, label, scope, regulated}](卡片顺序)' } },
  ],
}
