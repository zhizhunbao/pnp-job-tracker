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
  auth: true,
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
  ],
}
