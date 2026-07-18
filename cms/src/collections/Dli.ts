import type { CollectionConfig } from 'payload'

// PGWP 可申 DLI 子集维度(E12-03,旗舰②学校数据·范围化)— ETL(mart)写入,IRCC 官方名单。
// 每行=一所院校(DLI# 去重,campuses 记校区数);只收 PGWP=Yes 子集,不建全 DLI 目录(规划 §6)。
export const Dli: CollectionConfig = {
  slug: 'dli',
  admin: { useAsTitle: 'name', defaultColumns: ['province', 'name', 'city', 'isPublic'], group: 'Data (ETL)' },
  fields: [
    { name: 'province', type: 'text', index: true },
    { name: 'name', type: 'text', admin: { description: '院校名(官方原文)' } },
    { name: 'dliNumber', type: 'text', admin: { description: 'DLI 编号(O 开头,IRCC 官方)' } },
    { name: 'city', type: 'text', admin: { description: '主校区城市(首行)' } },
    { name: 'campuses', type: 'number', admin: { description: '名单内校区行数' } },
    { name: 'isPublic', type: 'checkbox', admin: { description: '公立院校' } },
    { name: 'gradProgram', type: 'checkbox', admin: { description: '有免 PAL/TAL 的研究生学位项目(官方列标)' } },
    { name: 'url', type: 'text', admin: { description: '出处=IRCC DLI 名单页(着陆页)' } },
    { name: 'fetched', type: 'text' },
  ],
}
