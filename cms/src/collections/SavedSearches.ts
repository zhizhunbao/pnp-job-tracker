import { APIError, type Access, type CollectionConfig, type PayloadRequest } from 'payload'
import { FREE_SAVED_SEARCHES, PRO_SAVED_SEARCHES } from '../lib/plan'

// 保存的筛选(E5-03;D1 2026-07-19 降免费):登录即可存(留存钩),上限分档 免费 2/Pro 5——闸在「更多保存位」。
// access=本人+admin;创建时 hook 强制 user=req.user(不可代存);上限在 beforeChange 按档卡。
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
    // 创建=任意登录用户(D1 降免费);免费/Pro 上限差在 beforeChange 钩子卡
    create: ({ req }) => !!req.user,
    read: ownOrAdmin,
    update: ownOrAdmin,
    delete: ownOrAdmin,
  },
  hooks: {
    beforeChange: [async ({ req, data, operation }) => {
      if (operation === 'create' && req.user && !isAdmin(req)) {
        data.user = req.user.id  // 只能存给自己
        const isPro = !!(req.user as any).proUntil && new Date((req.user as any).proUntil) > new Date()
        const cap = isPro ? PRO_SAVED_SEARCHES : FREE_SAVED_SEARCHES
        const mine = await req.payload.count({ collection: 'saved-searches', where: { user: { equals: req.user.id } } })
        // APIError 消息才会透传客户端(裸 Error 被打码成 Something went wrong)——前端靠 'limit' 字样弹升级框
        if (mine.totalDocs >= cap) throw new APIError(`saved-search limit (${cap}) reached`, 400)
      }
      return data
    }],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'filters', type: 'json', admin: { description: '/jobs 前端筛选 state 原样(jobsSql 解释)' } },
    { name: 'lang', type: 'text', admin: { description: '存时的界面语言(zh/en/ko),发信用' } },
    { name: 'lastNotifiedAt', type: 'date', admin: { description: '上次发信游标(alerts run 回写,防重复通知)' } },
  ],
}
