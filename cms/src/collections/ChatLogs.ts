import type { Access, CollectionConfig } from 'payload'

// 对话留痕(D1,2026-08-05;设计 docs/design/对话Case-Harness方案-20260805.md §1.1)。
// 在此之前对话内容**一个字都没存** —— route 只 console.log 了「noc=… facts=N in=123ch」(连原文都没有,
// 只有字数),Umami 那边只有事件计数。于是「用户实际最常问什么」「哪类问题最容易 guard 降级」无法回答,
// 而复现率仪表盘的数据源正是这张表。
//
// 只由 `/api/chat` 服务端写(local API,绕过 access),前台永不读:
//   access 四把全关 —— 里面是用户自述的职业/身份/省份,REST/GraphQL 一律不开;admin 只给管理员看。
//
// 🔴 不存任何指向人的东西:没有 IP、没有 user 关系、没有邮箱。`thread` 是**首轮提问文本**的哈希,
//   只为把一串追问串起来;两个人问同一句话会撞进同一个 thread —— 有意的取舍(设计 §7①)。
const adminOnly: Access = ({ req }) => req.user?.role === 'admin'

export const ChatLogs: CollectionConfig = {
  slug: 'chat-logs',
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['createdAt', 'lang', 'question', 'noc', 'degraded', 'err'],
    group: 'Ops',
  },
  access: { create: () => false, read: adminOnly, update: () => false, delete: adminOnly },
  fields: [
    { name: 'thread', type: 'text', index: true, admin: { description: 'sha256(首轮提问)前 16 位:串起多轮,不指向人' } },
    { name: 'turn', type: 'number', admin: { description: '本串里的第几轮(由 history 里的 user 消息数推)' } },
    { name: 'lang', type: 'text', index: true, admin: { description: 'zh / en / ko' } },
    { name: 'question', type: 'text', admin: { description: '用户原话(截断 2,000)' } },
    { name: 'answer', type: 'text', admin: { description: '最终答复(截断 8,000);失败时为空' } },
    { name: 'noc', type: 'text', index: true, admin: { description: '抽出来的 NOC —— 最常用的 group by,从 slots 提到列上' } },
    { name: 'slots', type: 'json', admin: { description: '整份槽位:看抽槽对不对' } },
    { name: 'facts', type: 'json', admin: { description: '整份事实(含 cited):复现率靠它回算,D3 给 Fact 加 code 后可回填' } },
    { name: 'tools', type: 'json', admin: { description: '本轮实际打了哪些 lookup(去重保序)。用 json 不用 array:array 会被拆成子表' } },
    { name: 'degraded', type: 'checkbox', defaultValue: false, admin: { description: '出口校验两次没过 → 降级成事实清单' } },
    { name: 'err', type: 'text', index: true, admin: { description: 'tooShort / noOcc / llm / guard;成功为空' } },
    { name: 'ms', type: 'number', admin: { description: '端到端耗时' } },
  ],
}
