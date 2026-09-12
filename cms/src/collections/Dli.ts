import type { CollectionConfig } from 'payload'

// PGWP 可申 DLI 子集维度(E12-03,旗舰②学校数据·范围化)— ETL(mart)写入,IRCC 官方名单。
// 每行=一校一校区城(2026-09-12 粒度自「一所院校取首行主城」改校 × 城:U of T 记在
// Mississauga、UBC 逗号串没拆实撞;campuses 记该校源行总数);只收 PGWP=Yes 子集,不建全 DLI 目录(规划 §6)。
export const Dli: CollectionConfig = {
  slug: 'dli',
  admin: { useAsTitle: 'name', defaultColumns: ['province', 'name', 'city', 'isPublic'], group: 'Data (ETL)' },
  fields: [
    { name: 'province', type: 'text', index: true },
    { name: 'name', type: 'text', admin: { description: '院校名(官方原文)' } },
    { name: 'nameZh', type: 'text', admin: { description: '通行中文译名(etl/dli 人工核定表;表外空串,前端回退英文)' } },
    { name: 'dliNumber', type: 'text', admin: { description: 'DLI 编号(O 开头,IRCC 官方)' } },
    { name: 'city', type: 'text', admin: { description: '校区城(一城一行)' } },
    { name: 'campuses', type: 'number', admin: { description: '该校名单内源行总数(全校同值)' } },
    { name: 'isPublic', type: 'checkbox', admin: { description: '公立院校' } },
    { name: 'gradProgram', type: 'checkbox', admin: { description: '有免 PAL/TAL 的研究生学位项目(官方列标)' } },
    { name: 'url', type: 'text', admin: { description: '出处=IRCC DLI 名单页(着陆页)' } },
    { name: 'fetched', type: 'text' },
  ],
}
