import type { CollectionConfig } from 'payload'

// 联邦 Express Entry 官方计分表(G9)— ETL(mart)写入,前端/人工只读。给决策引擎当事实表用,
// **不是** /jobs 的筛选维度(别接进 JobsTable dims)。
// 与 pnp_* 四表分工:occupations=在不在清单、score_factors=省提名能打几分、requirements=先要满足什么
//（含 province='FED' 的 CEC/FSW/FST 资格门槛,那 23 条走 pnp_requirements,不在本表）、本表=联邦这一格官方给几分。
//
// 🔴 两套分共一张窄表,靠 grid 分:
//   'CRS'   = 进池之后**排队**用的分(A/B/C/D 四段)
//   'FSW67' = **够不够格进池**用的 67/100 分选择因素
// 官方明确写明这是两套分 —— 消费端必须先按 grid 过滤再查表,不过滤就会把两套分加在一起。
// 🔴 points 可空:官方非数字格(「n/a」「Not eligible to apply」)一律留空 + 原文进 pointsText,
//    绝不折成 0 —— 官方说的是「这档根本不能申」,不是「这档 0 分」。
export const EePointsGrid: CollectionConfig = {
  slug: 'ee-points-grid',
  admin: {
    useAsTitle: 'criterion',
    defaultColumns: ['grid', 'section', 'factor', 'criterion', 'columnLabel', 'points'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'grid', type: 'text', index: true, admin: { description: "🔴 'CRS'(排名分,A/B/C/D 四段)/ 'FSW67'(67 分选择因素)—— 两套分的区分键,查表必先按它过滤,不过滤会把两套分加在一起" } },
    { name: 'section', type: 'text', index: true, admin: { description: 'CRS: A / B / C / D;FSW67 恒 FSW' } },
    { name: 'sectionLabel', type: 'text', admin: { description: '官方段名(Core/human capital factors …)' } },
    { name: 'kind', type: 'text', admin: { description: 'summary=各段封顶速览表 / detail=逐档明细表。⚠️ 两者不能相加(明细是速览的展开)' } },
    { name: 'tableNo', type: 'number', admin: { description: '官方页内第几张表(0 起)—— 同一 factor 出现在多张表时用它还原上下文。列名不叫 table:SQL 保留字' } },
    { name: 'heading', type: 'text', admin: { description: '该表最近的官方小标题(「First official language (maximum 24 points)」——各因素的封顶就写在这)' } },
    { name: 'factor', type: 'text', index: true, admin: { description: '该表第一列的表头(Age / Level of education / …)' } },
    { name: 'criterion', type: 'text', admin: { description: '档位:该行第一格(「CLB level 9 or higher」)' } },
    { name: 'columnLabel', type: 'text', admin: { description: '列表头(「Points with a spouse or common-law partner」/「Speaking」)。列名不叫 column:SQL 保留字' } },
    { name: 'points', type: 'number', admin: { description: '🔴 可空:官方非数字格一律留空,原文进 pointsText,绝不写 0' } },
    { name: 'pointsText', type: 'text', admin: { description: '官方原格文本(「n/a」「Not eligible to apply」「100」)' } },
    { name: 'seq', type: 'number', admin: { description: '官方页内原序 —— 报告按官方顺序摆' } },
    { name: 'url', type: 'text' },
    { name: 'fetched', type: 'text', admin: { description: '该页真正被取回那天(crawl 轮次日期,不是今天)' } },
  ],
}
