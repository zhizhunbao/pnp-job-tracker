// 用户(E3-01):Payload 自带 auth,公开注册;role/proUntil 由字段级 access 锁死(webhook 走 overrideAccess)。
// 时长包语义(D8 修订):没有订阅状态机,proUntil 一个到期日就是全部真相(isPro 见 lib/entitlement.ts)。
import type { Access, CollectionConfig, FieldAccess, PayloadRequest } from 'payload'

const isAdmin = (req: PayloadRequest) => req.user?.role === 'admin'
const isAdminReq = ({ req }: { req: PayloadRequest }) => isAdmin(req)
const adminOnlyField: FieldAccess = ({ req }) => isAdmin(req)
const selfOrAdmin: Access = ({ req }) => {
  if (!req.user) return false
  if (isAdmin(req)) return true
  return { id: { equals: req.user.id } }
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  // E3-07 忘记密码自助重置:Payload 内置 forgot/reset 端点,这里只定制邮件(链接指前端,默认指 /admin 不可用)。
  // token 有效期用默认 1 小时;防枚举由端点语义保证(存在与否都 200),前端文案配合。
  auth: {
    forgotPassword: {
      generateEmailSubject: () => '重置密码 / Reset password — PNP Job Tracker',
      generateEmailHTML: (args?: { token?: string }) => {
        const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')
        const url = `${site}/jobs?reset=${args?.token || ''}`
        return `<div style="font-family:system-ui,sans-serif;color:#1f2937;font-size:14px">
          <p>🍁 <strong>PNP Job Tracker</strong></p>
          <p>点击下方链接设置新密码(1 小时内有效):<br/>Click the link below to set a new password (valid for 1 hour):</p>
          <p><a href="${url}" style="color:#2563eb">${url}</a></p>
          <p style="color:#9ca3af;font-size:12px">如果这不是你本人的操作,请忽略本邮件,密码不会被更改。<br/>If you didn't request this, ignore this email — your password will not change.</p></div>`
      },
    },
  },
  access: {
    create: () => true,        // 公开注册(role/proUntil 有字段级锁,冒填直接被忽略)
    read: selfOrAdmin,
    update: selfOrAdmin,       // 普通用户实际只能改 email/password(敏感字段见字段级 access)
    delete: isAdminReq,
    admin: isAdminReq,         // Payload 后台仅 role=admin 可进
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      options: ['user', 'admin'],
      defaultValue: 'user',    // 不加 required:生成类型会逼所有 payload.create 显式传 role(tests/seedUser 编译爆过)
      saveToJWT: true,         // 进 token,服务端 gate 不用回表
      access: { create: adminOnlyField, update: adminOnlyField },
    },
    {
      name: 'proUntil',        // Pro 到期日:唯一付费真相(Stripe webhook overrideAccess 拨动)
      type: 'date',
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: { description: 'Pro 到期日(时长包,webhook 写入;手动改=人工赠送)' },
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      access: { create: adminOnlyField, update: adminOnlyField },
    },
    {
      name: 'stripeSessions',  // 已拨动过 proUntil 的 Checkout session id(webhook 重放幂等去重)
      type: 'json',
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: { hidden: true },
    },
    {
      name: 'lastAlertAt',     // 匹配版提醒游标(E5-03):alerts run 发信后回写,防重复通知
      type: 'date',
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: { hidden: true },
    },
    {
      name: 'lastWeeklyAt',    // 免费周报游标(E9-02b):滚动 7 天,发信成功才回写
      type: 'date',
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: { hidden: true },
    },
    {
      name: 'weeklyOptOut',    // 周报退订(E9-02b):本人可改(账户页开关 + 邮件一键退订链接都拨它)
      type: 'checkbox',
      defaultValue: false,
      admin: { description: '退订每周收藏摘要邮件' },
    },
    {
      // 移民档案(E5-00):用户自填,匹配层的输入。无字段级锁 —— 本人可改(update 已限 selfOrAdmin)。
      // nocCodes/targetProvinces 用 json 存 string[](表单自建,不走 admin 数组 UI)。
      name: 'profile',
      type: 'group',
      fields: [
        { name: 'nocCodes', type: 'json', admin: { description: '经验/学历对应 NOC 码(string[])' } },
        { name: 'clb', type: 'number', admin: { description: '语言 CLB 等级(自报)' } },
        { name: 'crs', type: 'number', admin: { description: 'EE CRS 分(自报,可空)' } },
        { name: 'targetProvinces', type: 'json', admin: { description: '目标省(省码 string[])' } },
        { name: 'pgwpMonthsLeft', type: 'number', admin: { description: 'PGWP 剩余月数' } },
        { name: 'profileUpdatedAt', type: 'date' },
      ],
    },
  ],
}
