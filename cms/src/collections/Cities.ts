import type { CollectionConfig } from 'payload'

// 城市维度 — ETL(mart)写入。来自岗位数据里出现的所有城市(去重)。
export const Cities: CollectionConfig = {
  slug: 'cities',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'province'], group: 'Data (ETL)' },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'province', type: 'text', index: true, admin: { description: '2位省码' } },
    // #151:通行中/韩译名(clean/04g;小镇无通行译名=留空,前端只显英文)
    { name: 'nameZh', type: 'text', admin: { description: '城市中文通行译名(显示用灰注)' } },
    { name: 'nameKo', type: 'text', admin: { description: '城市韩文通行译名(显示用灰注)' } },
  ],
}
