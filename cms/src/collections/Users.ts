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
    // 注册时间(createdAt)Payload 一直有存,只是列表默认不显示(Frank 2026-07-28:「这个怎么没有注册时间」)——
    // 显式列进来,顺序按「谁、什么时候注册、付费状态」;默认排序改最新注册在前,看增长不用每次点表头。
    defaultColumns: ['email', 'createdAt', 'role', 'proUntil', 'stripeCustomerId'],
  },
  defaultSort: '-createdAt',
  // E3-07 忘记密码自助重置:Payload 内置 forgot/reset 端点,这里只定制邮件(链接指前端,默认指 /admin 不可用)。
  // token 有效期用默认 1 小时;防枚举由端点语义保证(存在与否都 200),前端文案配合。
  auth: {
    forgotPassword: {
      generateEmailSubject: () => '重置密码 / Reset password — Offer2PR',
      generateEmailHTML: (args?: { token?: string }) => {
        const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')
        const url = `${site}/?reset=${args?.token || ''}`
        return `<div style="font-family:system-ui,sans-serif;color:#1f2937;font-size:14px">
          <p>🍁 <strong>Offer2PR</strong></p>
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
      // 问卷答案档(2026-08-15 答案入库绑账号):{ basic: Answers, score: ScoreAnswers, updatedAt: ISO }。
      // 列由 docs/sql/account-answers.sql 手写添加(不走 DB_PUSH);写入走 /api/quiz/answers,
      // 服务端补 updatedAt;客户端合并规则(新者胜)在 lib/quiz/answers.ts。
      name: 'answers',
      type: 'json',
      admin: { readOnly: true, description: '问卷答案档(隐私):登录态自动同步,浏览器与库新者胜' },
    },
    // 身份最小集(E11-01):均本人可改(无字段级锁),role/proUntil/stripe* 仍锁死。
    { name: 'displayName', type: 'text', admin: { description: '昵称(空则前端回退邮箱前缀)' } },
    { name: 'avatar', type: 'text', admin: { description: '头像 URL(v1 仅存 OAuth 带回的 URL,不做上传;无则前端画首字母块)' } },
    { name: 'loginProvider', type: 'text', defaultValue: 'email', admin: { description: '注册来路:email(默认)/google/wechat' } },
    { name: 'locale', type: 'text', admin: { description: '界面/邮件语言 zh/en/ko(现仅 localStorage,落库备邮件用)' } },
    {
      // 移民档案(E5-00):用户自填,匹配层的输入。无字段级锁 —— 本人可改(update 已限 selfOrAdmin)。
      // nocCodes/targetProvinces 用 json 存 string[](表单自建,不走 admin 数组 UI)。
      name: 'profile',
      type: 'group',
      fields: [
        // 用户分型(E11-04):§2.5 A–E 的稳定 slug(overseas/studying/working/jobhunting/pr)。
        // onboarding 分叉锚 + 顾问 grounding 路径语境;界面大白话点选,幕后存 slug。枚举单一来源=lib/jobs/match.ts。
        { name: 'currentStatus', type: 'text', admin: { description: '分型 slug:overseas/studying/working/jobhunting/pr(界面大白话,幕后存码)' } },
        { name: 'nocCodes', type: 'json', admin: { description: '经验/学历对应 NOC 码(string[])' } },
        { name: 'clb', type: 'number', admin: { description: '语言 CLB 等级(自报)' } },
        { name: 'crs', type: 'number', admin: { description: 'EE CRS 分(自报,可空)' } },
        { name: 'targetProvinces', type: 'json', admin: { description: '目标省(省码 string[])' } },
        { name: 'pgwpMonthsLeft', type: 'number', admin: { description: 'PGWP 剩余月数' } },
        // ── 判定核个人条件要的槽(2026-08-12 Frank「先把功能做完善」)────────────────────
        // 病灶:答题时明明问了经验/offer/加拿大学历,quizToProfile 却只落 status/nocs/provs/clb,
        // /api/ruling/verdict 里其余一律硬写 null —— 于是「个人条件」那几行对**任何人**(含 Pro)
        // 都只能输出「判不了」。不是锁的问题,是答案根本没存下来。
        // 列由 docs/sql/user-profile-verdict-slots.sql 手写添加(不走 DB_PUSH,见 db-push-minefield)。
        { name: 'expCanadaMonths', type: 'number', admin: { description: '同职业加拿大工作经验(月)' } },
        { name: 'expForeignMonths', type: 'number', admin: { description: '同职业海外工作经验(月)' } },
        { name: 'hasOffer', type: 'checkbox', admin: { description: '手上有没有 job offer' } },
        { name: 'canadaStudy', type: 'checkbox', admin: { description: '有没有加拿大学历' } },
        { name: 'familySize', type: 'number', admin: { description: '随行家庭人数(AIP 资金档 / BC 最低收入表)' } },
        { name: 'profileUpdatedAt', type: 'date' },
        // 简历存档(E11-08):默认不存 —— 只有用户在对照弹框勾了「存进档案」才写;原件(PDF/DOCX)照旧不落盘,只存抽出的文本。
        // 列由 docs/sql/resume-archive.sql 手写添加(不走 DB_PUSH,见 [[db-push-minefield]])。
        {
          name: 'resumeText',
          type: 'textarea',
          maxLength: 20000,
          // 后台只读:这是 PII,管理员能看已经够,不该在 admin 里随手改用户简历(清除走账户页本人操作)。
          admin: { readOnly: true, description: '简历文本(PII,上限 2 万字符):用户勾选后由 /api/resume/match 写入' },
        },
        { name: 'resumeSavedAt', type: 'date', admin: { description: '简历存档时刻(账户页显示新旧)' } },
        {
          name: 'matchUses',
          type: 'text',
          // E11-08 §3 ①:这个键以前没在 collection 声明 → drizzle 静默丢弃 → 日限闸门在生产上一直失效。
          admin: { readOnly: true, description: '简历对照免费日限计数 "YYYY-MM-DD:N"(服务端记账,跨日自动清零)' },
        },
      ],
    },
  ],
}
