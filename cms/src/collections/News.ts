import type { CollectionConfig } from 'payload'

// 官方移民新闻(E12-06)— ETL(mart)写入,近 60 条滚动(全量历史留 raw)。
// 只收官方源(IRCC+7 省);转载姿势=©+非官方声明+原文链+日期四件套(展示层)。
// bodyZh/summaryZh:AI 翻译/速读已生成随行入库,v3 拍板前端暂不渲(留列,开关式恢复)。
export const News: CollectionConfig = {
  slug: 'news',
  admin: { useAsTitle: 'title', defaultColumns: ['region', 'date', 'title'], group: 'Data (ETL)' },
  fields: [
    { name: 'region', type: 'text', index: true, admin: { description: 'federal / BC / AB / SK / MB / ON / QC / NS' } },
    { name: 'title', type: 'text', admin: { description: '官方原标题' } },
    { name: 'date', type: 'text', admin: { description: '官方发布日期(ISO)' } },
    { name: 'slug', type: 'text', index: true, unique: true, admin: { description: 'date+标题 slug(/news/[slug])' } },
    { name: 'url', type: 'text', admin: { description: '官方原文链接(详情页导流)' } },
    { name: 'ogImage', type: 'text', admin: { description: 'og:image 直链(hotlink,onerror 隐藏,不落盘)' } },
    { name: 'excerpt', type: 'text', admin: { description: '清洗后摘要(mart 剥样板前缀/标题复读,P1c)' } },
    { name: 'importance', type: 'number', admin: { description: 'AI 重要度 1-5(P1d,对找工/移民读者的实际影响;徽标用,非资格判定)' } },
    { name: 'importanceNote', type: 'text', admin: { description: 'AI 重要度一句理由(中文)' } },
    { name: 'bodyEn', type: 'textarea', admin: { description: '官方英文原文全文(详情页主体,v3)' } },
    { name: 'bodyZh', type: 'textarea', admin: { description: 'AI 段对段中文翻译(编号协议对齐,中文界面对照开关)' } },
    { name: 'summaryZh', type: 'textarea', admin: { description: 'AI 中文速读(banner 轮播摘要)' } },
    { name: 'bodyKo', type: 'textarea', admin: { description: 'AI 段对段韩语翻译(韩语界面对照开关)' } },
    { name: 'summaryKo', type: 'textarea', admin: { description: 'AI 韩语速读(韩语界面 banner 摘要)' } },
    { name: 'citation', type: 'text', admin: { description: '来源列表页(数据集级出处)' } },
    { name: 'fetched', type: 'text' },
  ],
}
