import type { CollectionConfig } from 'payload'

// CIP 2021 专业表(2026-10-04 访客四题第 2 题「读的什么专业」)— ETL 写入:etl/statcan/cip 子域抓 StatCan CIP Canada 2021 结构表
// (2,119 个 class)+ 本地 qwen 译中韩名 + noc 的专业 → 本站大类对照(MAJOR_SERIES_BROADS)+ 热门名次(CIP_POPULAR)
// → processed/statcan/cip_programs.json →(DDL 跑完后接进 mart 汇装)data/mart/cip_programs.json → seed。一行 = 一个 class。
// ⚠️ 新表,生产库必须先手动跑 docs/sql/cip-programs-20261004.sql(含 payload_locked_documents_rels.cip_programs_id),再部署本改动。
// 🔴 2026-10-04 收口:本文件**暂未在 payload.config.ts 注册** —— 注册了的代码先于 DDL 上线(或本机 dev 直连生产)会让
// 所有 collection 的锁文档查询撞 42703;DDL 跑完再注册(import 一行 + collections 数组一项,见 DDL 文件头第 ② 步)。
// 2026-10-04 收口:生产 DDL 已跑,本文件已在 payload.config.ts 注册(collections 数组 QcNocStreams 之后),
// 已接汇装(data/mart/cip_programs.json 每轮产出)—— 上面两句是注册前的状态。
// 2026-10-05 加 titleEnShort / places 两格(专业题照掌上高考做:左栏大类 → 可展开的专业类 → 专业;Frank「可以,做吧」);
// 生产列已由 docs/sql/cip-programs-places-20261005.sql 手写加好(title_en_short varchar / places jsonb),别靠 DB_PUSH 推。
export const CipPrograms: CollectionConfig = {
  slug: 'cip-programs',
  admin: { useAsTitle: 'titleEn', defaultColumns: ['code', 'titleEn', 'titleZh', 'popular'], group: 'Data (ETL)' },
  fields: [
    { name: 'code', type: 'text', index: true, admin: { description: 'CIP 2021 class 码(52.0203)' } },
    { name: 'titleEn', type: 'text', admin: { description: '官方英文类名' } },
    { name: 'titleZh', type: 'text', admin: { description: '中文名(本地模型译;空 = 没译成)' } },
    { name: 'titleKo', type: 'text', admin: { description: '韩文名(同上)' } },
    { name: 'series', type: 'text', index: true, admin: { description: '两位 series 码(52)' } },
    { name: 'grouping', type: 'text', admin: { description: '两位 primary grouping 码(05)' } },
    { name: 'broads', type: 'json', admin: { description: '本站职业大类清单(etl/noc MAJOR_SERIES_BROADS 推)' } },
    { name: 'popular', type: 'number', admin: { description: '热门名次(1 起);不在热门清单 = 空' } },
    { name: 'titleEnShort', type: 'text', admin: { description: '英文显示名(热门与专业类手写、其余按规则清洗);空 = 照用 titleEn' } },
    {
      name: 'places', type: 'json',
      admin: { description: '选择器里挂在哪(大类 / 专业类 / 排序数 / 是否单列;etl/statcan/cip 算好);[] = 不进选择器' },
    },
  ],
}
