import type { CollectionConfig } from 'payload'

// E8-14 统计主图「横轴=职业」的数据源。粒度 = 职业 × 省;province='all' 为全国行。
// 现有 stats 表是 省×大类×中类,出不了具体职业 —— 这张补上。ETL 算好,前端零计算透传。
export const StatsOccupation: CollectionConfig = {
  slug: 'stats-occupation',
  admin: { useAsTitle: 'titleZh', defaultColumns: ['noc', 'province', 'titleZh', 'openJobs'], group: 'Data (ETL)' },
  fields: [
    { name: 'noc', type: 'text', index: true },
    { name: 'province', type: 'text', index: true, admin: { description: "'all' = 全国行" } },
    { name: 'titleZh', type: 'text' },
    { name: 'titleZhShort', type: 'text', admin: { description: '窄位短名(≤7 字,04g 生成);空=回退完整译名' } },
    { name: 'titleEn', type: 'text', admin: { description: 'NOC 官方名(英文)——**唯一官方名**,中文是本站译名' } },
    { name: 'teer', type: 'number' }, { name: 'broad', type: 'text' },
    { name: 'mid', type: 'text' }, { name: 'fine', type: 'text' },   // 大→中→小三级筛选用
    { name: 'openJobs', type: 'number' }, { name: 'new7d', type: 'number' },
    // 两个薪资口径并存(2026-07-28):官方=权威基线,帖面=当下行情,salaryN=帖面中位的样本量
    { name: 'medianWageAnnual', type: 'number', admin: { description: 'ESDC 官方中位年薪(权威基线)' } },
    { name: 'medianSalaryAnnual', type: 'number', admin: { description: '帖面中位(本站折算);样本量见 salaryN' } },
    { name: 'salaryN', type: 'number', admin: { description: '有帖面薪资的岗位数 = 帖面中位的样本量' } },
    { name: 'namedJobs', type: 'number' },
    { name: 'fetched', type: 'text' },
  ],
}
