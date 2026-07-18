import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { sendMail } from './lib/mailer'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Companies } from './collections/Companies'
import { Jobs } from './collections/Jobs'
import { PnpOccupations } from './collections/PnpOccupations'
import { EeCategories } from './collections/EeCategories'
import { PnpDraws } from './collections/PnpDraws'
import { Dli } from './collections/Dli'
import { NocDescriptions } from './collections/NocDescriptions'
import { PolicyDocs } from './collections/PolicyDocs'
import { DesignatedEmployers } from './collections/DesignatedEmployers'
import { Provinces } from './collections/Provinces'
import { Cities } from './collections/Cities'
import { Districts } from './collections/Districts'
import { NocCategories } from './collections/NocCategories'
import { Sources } from './collections/Sources'
import { ExperienceLevels } from './collections/ExperienceLevels'
import { FieldSources } from './collections/FieldSources'
import { Rankings } from './collections/Rankings'
import { Stats } from './collections/Stats'
import { SavedSearches } from './collections/SavedSearches'
import { News } from './collections/News'
import { Comments } from './collections/Comments'
import { SavedJobs } from './collections/SavedJobs'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Companies, Jobs, PnpOccupations, PnpDraws, Dli, EeCategories, NocDescriptions, PolicyDocs, DesignatedEmployers, Provinces, Cities, Districts, NocCategories, Sources, ExperienceLevels, FieldSources, Rankings, Stats, SavedSearches, SavedJobs, News, Comments],
  editor: lexicalEditor(),
  // E3-07:邮件适配器=包一层现成 lib/mailer(Resend HTTP 直调,零新依赖);目前只有 forgot-password 走这里。
  // RESEND_API_KEY 未设 → sendMail 返回 false 不发信(dry-run 语义,与 alerts 一致)。
  email: () => ({
    name: 'resend-mailer',
    defaultFromAddress: (process.env.RESEND_FROM || 'alerts@offer2pr.com').replace(/^.*<|>.*$/g, ''),
    defaultFromName: 'Offer2PR',
    sendEmail: async (message: unknown) => {
      const m = message as { to?: unknown; subject?: unknown; html?: unknown; text?: unknown }
      const addr = (v: unknown): string =>
        typeof v === 'string' ? v : v && typeof v === 'object' && 'address' in (v as Record<string, unknown>) ? String((v as { address?: unknown }).address ?? '') : ''
      const to = Array.isArray(m.to) ? addr(m.to[0]) : addr(m.to)
      if (to) await sendMail(to, String(m.subject || ''), String(m.html || m.text || ''))
    },
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
    // 直连正式库护栏(2026-07-04 拍板):dev 默认**不**自动推 schema —— 本地 dev 连的就是生产,
    // 热重载推垃圾/删列会直接伤生产。改 collection 的流程:显式 `DB_PUSH=1 npm run dev` 单次推(加列级),
    // 删列/改类型手写 SQL。生产 next start 本就不推。
    push: process.env.DB_PUSH === '1',
  }),
  sharp,
  plugins: [],
})
