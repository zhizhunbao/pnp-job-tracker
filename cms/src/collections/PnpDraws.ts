import type { CollectionConfig } from 'payload'

// 省 PNP 抽选事实维度(E6-04)— ETL(mart)写入。每行=一省一次抽选(kind=draw)或改制通告(kind=notice)。
// ⚠️ 各省分制互不相通且都非 CRS(BC=SIRS/AB=WEOI/MB=MPNP EOI,scale 标注)——纯事实展示层,不进评分/匹配。
export const PnpDraws: CollectionConfig = {
  slug: 'pnp-draws',
  admin: { useAsTitle: 'stream', defaultColumns: ['province', 'drawDate', 'stream', 'score', 'invitations'], group: 'Data (ETL)' },
  fields: [
    { name: 'province', type: 'text', index: true },
    { name: 'kind', type: 'text', admin: { description: 'draw=抽选 / notice=改制通告' } },
    { name: 'drawDate', type: 'text', admin: { description: '抽选日期(ISO)' } },
    { name: 'stream', type: 'text', admin: { description: '流/通道名(官方原文)' } },
    { name: 'score', type: 'number', admin: { description: '最低邀请分 — 省自评分制,非 CRS!展示必须带 scale' } },
    { name: 'scale', type: 'text', admin: { description: '分制名(SIRS/WEOI/MPNP EOI)' } },
    { name: 'invitations', type: 'number' },
    { name: 'note', type: 'text', admin: { description: '选择参数/期号/通告原文' } },
    { name: 'label', type: 'text', admin: { description: '省项目名(BC PNP Skills Immigration/AAIP/…)' } },
    { name: 'url', type: 'text' },
    { name: 'fetched', type: 'text' },
  ],
}
