import type { Access, CollectionConfig, PayloadRequest } from 'payload'
import { SAVED_JOBS_CAP } from '../lib/quota'

// 我的求职(E9-01 最小求职看板,2026-07-16):收藏岗位+状态标记(想投/已投/面试中/offer)。
// **对免费用户开放**——它是行动环+免费留存钩子,不是付费功能(区别于 saved-searches=Pro)。
// status 用 text 不用 select:规避 pg enum,手写生产 DDL 更稳(值域由前端下拉限定)。
const isAdmin = (req: PayloadRequest) => req.user?.role === 'admin'
const ownOrAdmin: Access = ({ req }) => {
  if (!req.user) return false
  if (isAdmin(req)) return true
  return { user: { equals: req.user.id } }
}
// 2026-11-10 Frank「应该在运维模块能看到全部」:站上拉收藏清单带 mine=1,管理员也只拿自己的
// (原先管理员拿到全站的,别人收藏过的岗在他这边显示已收藏,再点一下删的是别人的记录);全部收藏看运维页与后台。
const readOwnOrAdmin: Access = (args) => {
  const { req } = args
  if (req.user && req.query.mine === '1') return { user: { equals: req.user.id } }
  return ownOrAdmin(args)
}

export const SavedJobs: CollectionConfig = {
  slug: 'saved-jobs',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'company', 'status', 'user'], group: 'Users' },
  access: {
    create: ({ req }) => !!req.user,   // 登录即可(免费留存钩子)
    read: readOwnOrAdmin,
    update: ownOrAdmin,
    delete: ownOrAdmin,
  },
  hooks: {
    beforeChange: [async ({ req, data, operation }) => {
      if (operation === 'create' && req.user && !isAdmin(req)) {
        data.user = req.user.id  // 只能存给自己
        const mine = await req.payload.count({ collection: 'saved-jobs', where: { user: { equals: req.user.id } } })
        if (mine.totalDocs >= SAVED_JOBS_CAP) throw new Error(`saved-jobs limit (${SAVED_JOBS_CAP}) reached`)
      }
      // 2026-11-10 线上走查:管理员在站上点收藏不带 user,必填校验回 400;没指定收藏人就记给自己(后台代人建的照旧)。
      if (operation === 'create' && req.user && isAdmin(req) && data.user == null) {
        data.user = req.user.id
      }
      return data
    }],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'job', type: 'relationship', relationTo: 'jobs', index: true },
    { name: 'title', type: 'text', admin: { description: '岗位标题快照(岗位下架后看板仍可读)' } },
    { name: 'company', type: 'text', admin: { description: '公司名快照' } },
    { name: 'status', type: 'text', admin: { description: 'wish | applied | interview | offer(前端下拉限定)' } },
  ],
}
