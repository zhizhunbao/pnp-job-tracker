import type { CollectionConfig } from 'payload'

// 全国通道对照表(2026-09-28 立项,docs/design/通道表-20260928.md)— ETL 写入:etl/pathways 域每轮拿人工核定的对照表对一遍 raw/pnp,
// 对上了才写产物,mart 直通(只多算 quotaKey)→ data/mart/pathways.json → seed。一行 = 一条本站认的移民通道。
// 两套名字:plain*(我们的直白名,三语界面主文案)与 officialName / drawStreams / reqStreams / quotaScope / occLabels(官方各页写法,原样照抄,
// 程序拿它们去对抽选 / 门槛 / 配额 / 清单四张表)。批一只建表,前端还读 components/pnp 与 lib/jobs 的旧对照(批二再切过来)。
// ⚠️ 新表,生产库必须先手动跑 docs/sql/pathways-20260928.sql(含 payload_locked_documents_rels.pathways_id),再部署本改动。
// 2026-09-30 通道补全批一(docs/design/通道补全-20260930.md 第八节):加五列 jobLinked / tags / teers / nocs / employers,
// 生产已跑 docs/sql/pathways-conditions-20260930.sql(Frank 批「执行」);弹框读它们归批二。
export const Pathways: CollectionConfig = {
  slug: 'pathways',
  admin: { useAsTitle: 'key', defaultColumns: ['key', 'province', 'plainZh', 'officialName', 'status'], group: 'Data (ETL)' },
  fields: [
    { name: 'key', type: 'text', index: true, admin: { description: '我们的编号(直白、稳定、不随官网改名):bc-skilled-worker' } },
    { name: 'seq', type: 'number', admin: { description: '表内顺序(一组抽选覆盖几条通道时按它拼名字)' } },
    { name: 'province', type: 'text', index: true, admin: { description: '省码;联邦项目写 FED' } },
    { name: 'program', type: 'text', admin: { description: 'PNP / AIP' } },
    { name: 'plainZh', type: 'text', admin: { description: '我们的中文名(= 职位板 PNP 格那个)' } },
    { name: 'plainEn', type: 'text', admin: { description: '我们的英文名(09-28「界面显示直白名,官方原名放灰字」;英文界面换它在批二)' } },
    { name: 'plainKo', type: 'text', admin: { description: '我们的韩文名' } },
    { name: 'officialName', type: 'text', admin: { description: '官方英文原名(照抄这条通道自己那一页)' } },
    { name: 'boardLabel', type: 'text', admin: { description: '岗位上挂的通道名(= jobs.pnp_stream 取值);省默认通道为空' } },
    { name: 'isDefault', type: 'checkbox', admin: { description: '省默认通道:本省可提名但没挂具名通道的岗落它' } },
    { name: 'drawStreams', type: 'json', admin: { description: '官方用来邀请它的抽选组 string[](pnp_draws.stream 原值)' } },
    { name: 'reqStreams', type: 'json', admin: { description: '门槛表里的流 string[](pnp_requirements.stream 原值;门槛卡没接的省为空)' } },
    { name: 'quotaScope', type: 'text', admin: { description: '配额表里这条通道那一行的官方写法(pnp_ops_stats.scope 原值;没有通道级配额为空)' } },
    { name: 'quotaKey', type: 'text', admin: { description: '配额行 join 键(mart 用 pnp_ops_stats.stream_key 同一个归一算出;不展示)' } },
    { name: 'occLabels', type: 'json', admin: { description: '职业清单 label string[](pnp_occupations.label 原值;具名清单通道才有)' } },
    { name: 'status', type: 'text', admin: { description: 'open / paused / closed' } },
    { name: 'url', type: 'text', admin: { description: '出处页' } },
    { name: 'quote', type: 'textarea', admin: { description: '出处页官方原句(英文,照抄)' } },
    { name: 'checked', type: 'text', admin: { description: '人工核对日(ISO)' } },
    { name: 'jobLinked', type: 'checkbox', defaultValue: true, admin: { description: '跟这个岗有关系:要本省 offer 或本省工作经验(通道卡上段);不看工作为否(下段「不要 offer 的通道」)' } },
    { name: 'tags', type: 'json', admin: { description: '条件标签键 string[](ee / localGrad / pgwp / noPgwp …;词表在 etl/pathways 的 TAG_KEYS,三语文案在 i18n)' } },
    { name: 'teers', type: 'json', admin: { description: '本岗 TEER 在内才列通道卡上段 number[];空 = 不限' } },
    { name: 'nocs', type: 'json', admin: { description: '本岗职业码在内才列通道卡上段 string[];空 = 不限' } },
    { name: 'employers', type: 'json', admin: { description: '雇主名(归一后小写)命中才列通道卡上段 string[];空 = 不限' } },
  ],
}
