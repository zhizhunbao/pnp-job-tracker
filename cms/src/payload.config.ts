import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Companies } from './collections/Companies'
import { Jobs } from './collections/Jobs'
import { PnpOccupations } from './collections/PnpOccupations'
import { EeCategories } from './collections/EeCategories'
import { PnpDraws } from './collections/PnpDraws'
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

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Companies, Jobs, PnpOccupations, PnpDraws, EeCategories, NocDescriptions, PolicyDocs, DesignatedEmployers, Provinces, Cities, Districts, NocCategories, Sources, ExperienceLevels, FieldSources, Rankings, Stats, SavedSearches],
  editor: lexicalEditor(),
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
