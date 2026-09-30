import type { CollectionConfig } from 'payload'

// 省 PNP 抽选事实维度(E6-04)— ETL(mart)写入。每行=一省一次抽选(kind=draw)或改制通告(kind=notice)。
// ⚠️ 各省分制互不相通且都非 CRS(BC=SIRS/AB=WEOI/MB=MPNP EOI,scale 标注)——纯事实展示层,不进评分/匹配。
export const PnpDraws: CollectionConfig = {
  slug: 'pnp-draws',
  admin: { useAsTitle: 'stream', defaultColumns: ['province', 'drawDate', 'stream', 'score', 'invitations'], group: 'Data (ETL)' },
  fields: [
    { name: 'province', type: 'text', index: true },
    { name: 'kind', type: 'text', admin: { description: 'draw=抽选 / notice=改制通告' } },
    { name: 'drawDate', type: 'text', admin: { description: '抽选日期(ISO)' } },
    { name: 'stream', type: 'text', admin: { description: '流/通道名(官方原文)' } },
    // #280:中文灰注(本地 qwen 批译,etl/pnp/translate_draw_streams.py → data/processed/draw_stream_zh.json)。
    // ⚠️ 新列,生产库必须先手动跑 docs/sql/pnp-draws-stream-zh.sql,再部署本改动 + 灌 seed(顺序错了 42703)
    { name: 'streamZh', type: 'text', admin: { description: '流名中文灰注(zh 界面用,en/ko 不读)' } },
    // 2026-09-13:抽选类别门槛清单(人工核定表 data/processed/draw_checklists.json,mart 拼 {url, items} JSON 串)。
    // ⚠️ 新列,生产库必须先手动跑 docs/sql/pnp-draws-checklist-20260913.sql,再部署本改动 + 灌 seed。
    { name: 'checklist', type: 'text', admin: { description: '门槛清单 JSON 串 {url, items:[{zh,en,ko}]}(把脉页门槛弹框 1 2 3;NULL=未收录)' } },
    // 2026-09-27 Frank「照改,加这一列」:同一组同一天几行各是哪一项选取(etl/pnp 按官方原句判的短码;认不出空串)。
    // ⚠️ 新列,生产库已按 docs/sql/pnp-draws-selection-20260928.sql 加好(2026-09-28 执行),部署本改动后清 seed_state 再灌。
    { name: 'selection', type: 'text', admin: { description: '选取项短码 occ / top:N / franco / grad / wage:H:Y / points / path:a+b' } },
    // 2026-09-29 抽选卡重排(Frank「按你建议」「如果改一个地方,是不是所有省份都得改一遍」):这一轮属于哪个项目、人数数的是什么、
    // 官方只写上限时的上限(etl/pnp 落盘门逐行判好,消费端只认这三格,不再按省名写死)。
    // ⚠️ 新列,生产库必须先手动跑 docs/sql/pnp-draws-program-unit-20260929.sql,再部署本改动 + 清 seed_state 再灌。
    { name: 'program', type: 'text', admin: { description: '项目 PNP / AIP / PNP+AIP(同池)/ PSTQ / EE;认不出空串' } },
    { name: 'unit', type: 'text', admin: { description: '人数口径 invitation 邀请 / selection 入选的人 / application 入选的申请' } },
    { name: 'invitationsBelow', type: 'number', admin: { description: '官方人数只写上限时的上限(AB「Less than 10」、BC「<5」);确数行为空' } },
    { name: 'score', type: 'number', admin: { description: '最低邀请分 — 省自评分制,非 CRS!展示必须带 scale' } },
    { name: 'scale', type: 'text', admin: { description: '分制名(SIRS/WEOI/MPNP EOI)' } },
    { name: 'invitations', type: 'number' },
    { name: 'note', type: 'text', admin: { description: '选择参数/期号/通告原文' } },
    { name: 'label', type: 'text', admin: { description: '省项目名(BC PNP Skills Immigration/AAIP/…)' } },
    { name: 'url', type: 'text' },
    { name: 'fetched', type: 'text' },
  ],
}
