import type { CollectionConfig } from 'payload'

// RCIP/FCIP 试点社区名单(E6-11)— ETL 写入,源=IRCC rural-franco-pilots 官方名单页。
// cities = 已举证的 Job Bank 城市名(顿号连接);空 = 区域型社区界线未举证,不参与岗位打标(宁漏勿错)。
// 口径:试点是**社区推荐制**且雇主须先被社区指定 —— jobs.pilot 命中只是「岗在试点社区」的粗筛信号。
export const PilotCommunities: CollectionConfig = {
  slug: 'pilot-communities',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'province', 'type', 'cities'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'province', type: 'text', index: true },
    { name: 'type', type: 'text', admin: { description: 'RCIP | FCIP' } },
    { name: 'cities', type: 'text', admin: { description: '命中的 Job Bank 城市名(顿号连接);空=界线未举证不打标' } },
    { name: 'url', type: 'text', admin: { description: '社区官方站(IRCC 名单页给出);判定层 evidence' } },
    { name: 'fetched', type: 'text' },
  ],
}
