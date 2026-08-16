import type { CollectionConfig } from 'payload'

// RCIP/FCIP 社区名额状态(旧账立项 2026-08-15)— ETL 写入,源=各社区官方站(build_pilot_quota.py 周更)。
// 一行 = 一社区(noc 空,社区级名额状态)或 社区 × NOC 满额行;每个值锚定官网原句(quote+url)。
// 🔴 空 = 官网没写,不是 0/false(宁缺勿猜;RCIP 没有 EOI 池,先到先得+逐职业限额才是判据)。
export const PilotQuota: CollectionConfig = {
  slug: 'pilot-quota',
  admin: {
    useAsTitle: 'community',
    defaultColumns: ['community', 'province', 'type', 'noc', 'status', 'perIntake', 'remaining'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'community', type: 'text', required: true, index: true },
    { name: 'province', type: 'text', index: true },
    { name: 'type', type: 'text', admin: { description: 'RCIP | FCIP | RCIP+FCIP(pilot-communities 按社区名关联)' } },
    { name: 'noc', type: 'text', admin: { description: '空=社区级行;5 位码=该职业满额行' } },
    { name: 'status', type: 'text', admin: { description: '职业行:full=官网明文满额/不再收' } },
    { name: 'firstCome', type: 'checkbox', admin: { description: '先到先得;未勾=官网没写(数据只有 true/null,没有 false)' } },
    { name: 'firstComeQuote', type: 'text' },
    { name: 'firstComeUrl', type: 'text' },
    { name: 'perIntake', type: 'number', admin: { description: '每轮最多发几个推荐;空=官网没写' } },
    { name: 'perIntakeQuote', type: 'text' },
    { name: 'perIntakeUrl', type: 'text' },
    { name: 'remaining', type: 'number', admin: { description: '官网自报剩余名额;空=官网没写' } },
    { name: 'remainingQuote', type: 'text' },
    { name: 'remainingUrl', type: 'text' },
    { name: 'quote', type: 'text', admin: { description: '职业行的锚定原句' } },
    { name: 'url', type: 'text' },
    { name: 'asOf', type: 'text' },
  ],
}
