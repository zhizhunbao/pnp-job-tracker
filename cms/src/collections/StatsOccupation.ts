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
    // 范围(2026-07-31 Frank 拍板):与中位同口径 —— 各岗 ESDC low/high 取中位;DDL 见 docs/sql/e8-14b-occ-wage-range.sql
    { name: 'wageLowAnnual', type: 'number', admin: { description: 'ESDC 官方低位年薪(口径同中位:岗位加权取中位)' } },
    { name: 'wageHighAnnual', type: 'number', admin: { description: 'ESDC 官方高位年薪(口径同上)' } },
    { name: 'medianSalaryAnnual', type: 'number', admin: { description: '帖面中位(本站折算);样本量见 salaryN' } },
    { name: 'salaryN', type: 'number', admin: { description: '有帖面薪资的岗位数 = 帖面中位的样本量' } },
    { name: 'namedJobs', type: 'number' },
    { name: 'fetched', type: 'text' },
    // E13-02(把脉首页,v3 2026-08-06 晚修订):新增/环比/下架/净值/在架天数/脉象分——算法见
    // docs/implementation/E13-把脉首页/00_总设计与口径.md §3。closed30d/net30d 源=判死台账,排水期虚高,暂不上前端。
    { name: 'new30d', type: 'number', admin: { description: '近 30 天新增(datePosted∈(T-30d,T])' } },
    { name: 'new30dPrev', type: 'number', admin: { description: '前 30 天新增(datePosted∈(T-60d,T-30d]),仅作 mom30d 分母' } },
    { name: 'mom30d', type: 'number', admin: { description: '环比涨跌:new30d/new30dPrev−1;分母窗撞抓取爬坡期时整列为 null(COVERAGE_COMPLETE 闸门,8-31 起解禁)' } },
    { name: 'new14d', type: 'number', admin: { description: '近 14 天新增(datePosted∈(T-14d,T]);S1「近14天新发」主数字直读' } },
    { name: 'new14dPrev', type: 'number', admin: { description: '前 14 天新增(datePosted∈(T-28d,T-14d]),仅作 mom14d 分母' } },
    { name: 'mom14d', type: 'number', admin: { description: '环比涨跌(14 天窗,眼下唯一干净的环比):new14d/new14dPrev−1;new14dPrev<5 为 null——pulse_score 动量分量用它' } },
    { name: 'closed30d', type: 'number', admin: { description: '近 30 天下架(源=expired_ids.json 判死台账;判死日≠真实下架日,排水期虚高,暂不上前端)' } },
    { name: 'net30d', type: 'number', admin: { description: 'new30d − closed30d(随判死台账积累变准)' } },
    { name: 'avgDaysOpen', type: 'number', admin: { description: '平均在架天数,只认实测判死名单(closed_jobs.json);样本<5 为 null' } },
    { name: 'pulseScore', type: 'number', admin: { description: '复合脉象分:0.5·z(mom14d)+0.3·z(通道命中率)+0.2·z(薪资偏离),province 同组内 z-score' } },
  ],
}
