/**
 * 站内向导留痕(2026-09-04,设计 docs/design/顾问改向导-20260904.md §4):挂件每一轮落一行,
 * kind 分带路 / 问题 / 建议 —— 后两类是痛点盘点的原料,产品目的从「答」变成「收」。
 * 只由 guide 域服务端写(local API,绕过 access),前台永不读:REST/GraphQL 全关,admin 只给
 * 管理员看;update 开给管理员改 status(new / answered / built)。DDL 手写在 docs/sql/asks.sql,
 * 先跑生产再 push 本文件。
 * 🔴 不存指向人的东西:没有 IP、没有 user 关系;email 只在用户点「留个邮箱」主动填时写。
 * thread 沿 chat_logs 口径(首轮提问哈希,不指向人)。
 * kind / status 用 text 不用 select:select 在 postgres 生成 enum 类型,手写 DDL 多一种类型要维护
 * (chat_logs 的 err 同款取舍)。
 *
 * @author Frank
 * @time 2026-09-04 22:40:00
 */
import type { AccessArgs, CollectionConfig } from 'payload'

/**
 * 只放行管理员(读、改状态、删)。入参形状是 payload 定死的 Access 回调签名。
 *
 * @param args payload 的访问上下文。
 * @returns 是不是管理员。
 */
function adminOnly({ req }: AccessArgs): boolean {
  if (req.user == null) {
    return false
  }
  return req.user.role === 'admin'
}

/**
 * 一律拒绝(create 只走服务端 local API)。
 *
 * @returns 恒 false。
 */
function deny(): boolean {
  return false
}

/**
 * asks 表的 Payload 定义。
 */
export const Asks: CollectionConfig = {
  slug: 'asks',
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['createdAt', 'kind', 'lang', 'question', 'dest', 'status', 'email'],
    group: 'Ops',
  },
  access: { create: deny, read: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'thread', type: 'text', index: true, admin: { description: 'sha256(首轮提问)前 16 位:串起多轮,不指向人' } },
    { name: 'turn', type: 'number', admin: { description: '本串里的第几轮(由 history 里的 user 消息数推)' } },
    { name: 'lang', type: 'text', admin: { description: 'zh / en / ko' } },
    { name: 'path', type: 'text', admin: { description: '提问时所在页(带参)' } },
    { name: 'question', type: 'text', admin: { description: '用户原话(截断 2,000)' } },
    { name: 'kind', type: 'text', index: true, admin: { description: 'nav / question / suggestion' } },
    { name: 'dest', type: 'text', admin: { description: '目的地目录键;非 nav 为空' } },
    { name: 'params', type: 'json', admin: { description: '带去目的地的参数(省 / NOC / 市 …)。用 json 不用 array:array 会被拆成子表' } },
    { name: 'say', type: 'text', admin: { description: '向导那一句' } },
    { name: 'email', type: 'text', admin: { description: '用户主动留的邮箱;没留为空' } },
    { name: 'status', type: 'text', index: true, defaultValue: 'new', admin: { description: 'new / answered / built,后台手改' } },
    { name: 'ms', type: 'number', admin: { description: '端到端耗时' } },
    { name: 'err', type: 'text', admin: { description: 'llm / limit / net;成功为空' } },
  ],
}
