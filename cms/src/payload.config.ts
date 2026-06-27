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
import { PolicyDocs } from './collections/PolicyDocs'
import { DesignatedEmployers } from './collections/DesignatedEmployers'
import { Provinces } from './collections/Provinces'
import { Cities } from './collections/Cities'
import { Districts } from './collections/Districts'
import { NocCategories } from './collections/NocCategories'
import { Sources } from './collections/Sources'
import { ExperienceLevels } from './collections/ExperienceLevels'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Companies, Jobs, PnpOccupations, EeCategories, PolicyDocs, DesignatedEmployers, Provinces, Cities, Districts, NocCategories, Sources, ExperienceLevels],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
    push: true, // 自动建表(无需迁移文件),适合本地/dev
  }),
  sharp,
  plugins: [],
})
