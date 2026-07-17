import type { Access, CollectionConfig, PayloadRequest } from 'payload'
import { SAVED_JOBS_CAP } from '../lib/plan'

// 我的求职(E9-01 最小求职看板,2026-07-16):收藏岗位+状态标记(想投/已投/面试中/offer)。
// **对免费用户开放**——它是行动环+免费留存钩子,不是付费功能(区别于 saved-searches=Pro)。
// status 用 text 不用 select:规避 pg enum,手写生产 DDL 更稳(值域由前端下拉限定)。
const isAdmin = (req: PayloadRequest) => req.user?.role === 'admin'
const ownOrAdmin: Access = ({ req }) => {
  if (!req.user) return false
  if (isAdmin(req)) return true
  return { user: { equals: req.user.id } }
}

export const SavedJobs: CollectionConfig = {
  slug: 'saved-jobs',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'company', 'status', 'user'], group: 'Users' },
  access: {
    create: ({ req }) => !!req.user,   // 登录即可(免费留存钩子)
    read: ownOrAdmin,
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
