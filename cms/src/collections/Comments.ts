import type { CollectionConfig, PayloadRequest } from 'payload'

// 新闻评论(E12-06 v3,Frank 2026-07-18 拍板提前上,原 P2 流量触发):
// 登录可评 → 默认 pending → admin 人工审核(approved)后公开可见——挡中介广告/灌水的第一道闸。
// authorName=创建时脱敏快照(昵称或邮箱前缀截 3 字+***),公开读走它,不经 user 关系(不漏邮箱)。
// status 用 text 不用 select(规避 pg enum,手写 DDL 更稳,SavedJobs 惯例)。
const isAdmin = (req: PayloadRequest) => req.user?.role === 'admin'
const PENDING_CAP = 10   // 单用户待审上限(防灌水;审核过了就释放额度)
const BODY_MAX = 1000
// PTE 题下评论(2026-09-03,设计稿 docs/design/PTE刷题-20260903.md「题下评论区」;DDL docs/sql/pte-comments.sql):
// kind=exam「我考到了」= 日期 + 城市两格结构化数据,没有广告位,**免审直接 approved**;
// kind=note 留言走新闻评论同款人工闸。题下不开楼中楼(批二)。
const KIND_EXAM = 'exam'
const KIND_NOTE = 'note'
const EXAM_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const CITY_MAX = 40

const mask = (u: { displayName?: string | null; email?: string | null }) => {
  let name = (u.displayName || '').trim()
  if (name === '') {
    const head = (u.email || '').split('@')[0]
    if (head != null) {
      name = head
    }
  }
  return name.length <= 3 ? `${name}***` : `${name.slice(0, 3)}***`
}

export const Comments: CollectionConfig = {
  slug: 'comments',
  admin: { useAsTitle: 'body', defaultColumns: ['newsSlug', 'authorName', 'status', 'body', 'createdAt'], group: 'Community' },
  access: {
    create: ({ req }) => !!req.user,
    // 公开只读 approved;admin 全量(审核台)
    read: ({ req }) => (isAdmin(req) ? true : { status: { equals: 'approved' } }),
    update: ({ req }) => isAdmin(req),   // 审核=admin 后台改 status
    delete: ({ req }) => isAdmin(req),
  },
  hooks: {
    beforeChange: [async ({ req, data, operation }) => {
      if (operation === 'create' && req.user && !isAdmin(req) && typeof data.qid === 'string' && data.qid !== '') {
        // PTE 题下:两种东西,各自的闸(见文件头 KIND_*)
        if (data.parent != null) throw new Error('pte comments have no replies')
        data.newsSlug = null
        data.user = req.user.id
        data.authorName = mask(req.user as { displayName?: string; email?: string })
        data.pinned = false
        if (data.kind === KIND_EXAM) {
          const d = String(data.examDate || '').trim()
          const city = String(data.examCity || '').trim()
          if (!EXAM_DATE_RE.test(d) || d > new Date().toISOString().slice(0, 10)) throw new Error('exam date must be YYYY-MM-DD and not in the future')
          if (city.length > CITY_MAX) throw new Error(`exam city must be <= ${CITY_MAX} chars`)
          data.kind = KIND_EXAM
          data.examDate = d
          data.examCity = city
          // 2026-09-04 Frank「点考过应该显示这样一个弹框」:正文 = 考试回忆(选填);没写就落日期占位
          const recall = String(data.body || '').trim()
          if (recall.length > BODY_MAX) throw new Error(`comment body must be 1-${BODY_MAX} chars`)
          data.body = recall || d
          data.status = 'approved'
          return data
        }
        const body = (data.body || '').trim()
        if (!body || body.length > BODY_MAX) throw new Error(`comment body must be 1-${BODY_MAX} chars`)
        const pending = await req.payload.count({
          collection: 'comments', where: { and: [{ user: { equals: req.user.id } }, { status: { equals: 'pending' } }] },
        })
        if (pending.totalDocs >= PENDING_CAP) throw new Error('too many pending comments')
        data.kind = KIND_NOTE
        data.examDate = null
        data.examCity = null
        data.body = body
        data.status = 'pending'
        return data
      }
      if (operation === 'create' && req.user && !isAdmin(req)) {
        const body = (data.body || '').trim()
        if (!body || body.length > BODY_MAX) throw new Error(`comment body must be 1-${BODY_MAX} chars`)
        const pending = await req.payload.count({
          collection: 'comments', where: { and: [{ user: { equals: req.user.id } }, { status: { equals: 'pending' } }] },
        })
        if (pending.totalDocs >= PENDING_CAP) throw new Error('too many pending comments')
        // F 件(E8-07)楼中楼:parent 只允许指向本文顶层已过审楼(一层封顶,审核台/排版可控);置顶=admin 专属
        if (data.parent != null) {
          const p = await req.payload.findByID({ collection: 'comments', id: data.parent, depth: 0 }).catch(() => null)
          if (!p || p.status !== 'approved' || p.parent != null || p.newsSlug !== data.newsSlug) throw new Error('invalid reply target')
        }
        data.pinned = false
        data.body = body
        data.user = req.user.id
        data.authorName = mask(req.user as { displayName?: string; email?: string })
        data.status = 'pending'
      }
      return data
    }],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'newsSlug', type: 'text', index: true, admin: { description: '所评新闻 slug(/news/[slug])' } },
    { name: 'authorName', type: 'text', admin: { description: '脱敏昵称快照(公开显示用,不回 user 关系)' } },
    { name: 'body', type: 'textarea', required: true },
    { name: 'status', type: 'text', index: true, admin: { description: 'pending(默认,不公开)/ approved / rejected —— admin 审核台改' } },
    // F 件(E8-07,2026-07-20):楼中楼一层 + 官方置顶楼。DDL 手写生产先行(docs/sql/comments-thread.sql 同款):
    // ALTER TABLE comments ADD COLUMN parent_id integer / pinned boolean DEFAULT false
    { name: 'parent', type: 'relationship', relationTo: 'comments', index: true, admin: { description: '楼中楼:指向顶层楼(一层封顶,hook 校验);空=顶层' } },
    { name: 'pinned', type: 'checkbox', defaultValue: false, admin: { description: '置顶楼(admin 专属;配合 admin 号发的评论=官方置顶)' } },
    // PTE 题下评论四格(2026-09-03;DDL docs/sql/pte-comments.sql 先行生产)
    { name: 'qid', type: 'text', index: true, admin: { description: '所评 PTE 题(pte_questions.qid);空 = 新闻评论' } },
    { name: 'kind', type: 'text', admin: { description: 'exam(考试记录,免审)/ note(留言,待审);空 = 新闻评论' } },
    { name: 'examDate', type: 'text', admin: { description: '考试日 YYYY-MM-DD(kind=exam)' } },
    { name: 'examCity', type: 'text', admin: { description: '考点城市(kind=exam,选填)' } },
  ],
}
