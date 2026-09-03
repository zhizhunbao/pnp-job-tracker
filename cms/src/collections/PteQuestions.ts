import type { CollectionConfig } from 'payload'

// PTE Core 机经题(2026-09-03 Frank「上」:pte 研究域升产品域,设计稿 docs/design/PTE刷题-20260903.md)
// — ETL(etl/pte pte-mart 步)写入。一题一行按源不合并(qid = 源:题型:源内 id;跨源对题留批三);
// 题面来自 ynwac 公开 bundle 与 duoink 题页正文,猩际只有信号无题面不出行。
// 「最近考了」四格随行(seen / seenN / votes / freq,来自 processed/pte/recent.json,考生回忆非官方)。
// 🔴 votes / freq / seen / answer / audio* 空 = 该源没有,不是 0/空串(seed 端 cellOf 保 null)。
export const PteQuestions: CollectionConfig = {
  slug: 'pte-questions',
  admin: { useAsTitle: 'title', defaultColumns: ['type', 'source', 'num', 'title', 'seen', 'predicted'], group: 'Data (ETL)' },
  fields: [
    { name: 'qid', type: 'text', required: true, index: true, admin: { description: '源:题型:源内 id' } },
    { name: 'source', type: 'text', required: true, index: true, admin: { description: 'ynwac | duoink' } },
    { name: 'type', type: 'text', required: true, index: true, admin: { description: '标准题型码' } },
    { name: 'num', type: 'text', admin: { description: '站内题号(duoink sn / ynwac id),页面显示 #N' } },
    { name: 'title', type: 'text', admin: { description: '索引标题(题面首句截断)' } },
    { name: 'text', type: 'textarea', admin: { description: '题面全文' } },
    { name: 'answer', type: 'textarea', admin: { description: 'ASQ 答案;其余空' } },
    { name: 'audioUrl', type: 'text', admin: { description: '公开音频直链;空 = 无(TTS 批三合成)' } },
    { name: 'audioFile', type: 'text', admin: { description: '本地文件(data/raw/pte 相对路径);空 = 未落盘' } },
    { name: 'imageUrl', type: 'text', admin: { description: '题图;四型基本空,留给 DI' } },
    { name: 'predicted', type: 'checkbox', admin: { description: '押题(源方 hot / frequent / important 任一)' } },
    { name: 'seen', type: 'text', index: true, admin: { description: '最近考过日 YYYY-MM-DD;空 = 该源无记录' } },
    { name: 'seenN', type: 'number', admin: { description: '持有的带日期回忆条数' } },
    { name: 'votes', type: 'number', admin: { description: 'ynwac 考过票数;空 = 非 ynwac' } },
    { name: 'freq', type: 'number', admin: { description: 'duoink Core 热度 0-3;空 = 非 duoink' } },
    { name: 'fetched', type: 'text', admin: { description: '出表日期' } },
  ],
}
