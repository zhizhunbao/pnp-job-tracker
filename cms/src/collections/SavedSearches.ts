import type { Access, CollectionConfig, PayloadRequest } from 'payload'
import { PRO_SAVED_SEARCHES } from '../lib/plan'

// 保存的筛选(E5-03):Pro 用户存 /jobs 前端筛选 state 原样(json),alerts run 用共享 jobsQuery 解释。
// access=本人+admin;创建时 hook 强制 user=req.user(不可代存);上限在 API 层由 plan.ts 常量卡。
const isAdmin = (req: PayloadRequest) => req.user?.role === 'admin'
const ownOrAdmin: Access = ({ req }) => {
  if (!req.user) return false
  if (isAdmin(req)) return true
  return { user: { equals: req.user.id } }
}

export const SavedSearches: CollectionConfig = {
  slug: 'saved-searches',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'user', 'lastNotifiedAt'], group: 'Users' },
  access: {
    // 创建=Pro(proUntil 在未来)或 admin;上限在 beforeChange 钩子卡(plan.PRO_SAVED_SEARCHES)
    create: ({ req }) => !!req.user && (req.user.role === 'admin' || (!!(req.user as any).proUntil && new Date((req.user as any).proUntil) > new Date())),
    read: ownOrAdmin,
    update: ownOrAdmin,
    delete: ownOrAdmin,
  },
  hooks: {
    beforeChange: [async ({ req, data, operation }) => {
      if (operation === 'create' && req.user && !isAdmin(req)) {
        data.user = req.user.id  // 只能存给自己
        const mine = await req.payload.count({ collection: 'saved-searches', where: { user: { equals: req.user.id } } })
        if (mine.totalDocs >= PRO_SAVED_SEARCHES) throw new Error(`saved-search limit (${PRO_SAVED_SEARCHES}) reached`)
      }
      return data
    }],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'filters', type: 'json', admin: { description: '/jobs 前端筛选 state 原样(jobsQuery 解释)' } },
    { name: 'lang', type: 'text', admin: { description: '存时的界面语言(zh/en/ko),发信用' } },
    { name: 'lastNotifiedAt', type: 'date', admin: { description: '上次发信游标(alerts run 回写,防重复通知)' } },
  ],
}
