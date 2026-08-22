// eslint-config-next 16 起**自己就是 flat config**(exports 里 ./core-web-vitals、./typescript 各导出一个数组)。
// 原来经 FlatCompat.extends('next/…') 走 eslintrc 兼容层去加载它,拿到的是 flat 数组、喂给 eslintrc 的
// 校验器 → 校验失败 → 报错格式化里 JSON.stringify 撞上 plugins.react 的循环引用,**整个 eslint 直接崩**
// (`TypeError: Converting circular structure to JSON`,随便 lint 哪个文件都一样)。
// 后果不是「少了几条警告」,而是这道闸事实上一直是空的:算完不用的变量、撤功能留下的死代码,
// 全靠人肉发现(2026-08-11 实撞两处)。改成直接摊平 flat 配置,不再过兼容层。
import fs from 'node:fs'
import nodePath from 'node:path'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

// 带桶的模块(`lib/<名>/index.ts`)—— 下面那道边界闸认这几个,加新桶就加这里一行。
const BARRELS = ['agent', 'consult', 'db', 'i18n', 'jobs', 'pathways', 'gauge', 'points', 'quiz', 'ruling', 'score', 'employers', 'plan', 'stats', 'quota', 'llm', 'resume']
const ABSOLUTE = BARRELS.map((m) => `**/lib/${m}/*`)
// jobs / score / ruling / employers / plan / quiz / stats / quota / pathways 有**两个门**(index=客户端也安全的那半、server=要连库的那半;
// 理由见 lib/jobs/index.ts 顶上那段:混着 payload 依赖的桶会把连接池打进浏览器包)。
// 每加一个 server 门,下面 ALLOW 里补三条(绝对 + 两种相对),否则模块自己的服务端半边被闸拦住。
// 🔴 放行必须排在整个 group 的**最后** —— 同组内后面的模式覆盖前面的,
//    夹在中间会被后来的相对模式重新拦住(实撞:tools.ts/quizTop.ts/scoreTables.ts 三处照旧报错)。
const ALLOW = [
  '!**/lib/jobs/server', '!./jobs/server', '!../jobs/server',
  '!**/lib/score/server', '!./score/server', '!../score/server',
  '!**/lib/ruling/server', '!./ruling/server', '!../ruling/server',
  '!**/lib/employers/server', '!./employers/server', '!../employers/server',
  '!**/lib/plan/server', '!./plan/server', '!../plan/server',
  '!**/lib/quiz/server', '!./quiz/server', '!../quiz/server',
  '!**/lib/stats/server', '!./stats/server', '!../stats/server',
  '!**/lib/quota/server', '!./quota/server', '!../quota/server',
  '!**/lib/pathways/server', '!./pathways/server', '!../pathways/server',
  '!**/lib/agent/server', '!./agent/server', '!../agent/server',
  '!**/lib/consult/server', '!./consult/server', '!../consult/server',
  '!**/lib/db/server', '!./db/server', '!../db/server',
]
const SIBLING = BARRELS.flatMap((m) => [`./${m}/*`, `../${m}/*`])
const barrelOnly = (group) => ({
  'no-restricted-imports': [
    'error',
    { patterns: [{ group, message: '从桶取:@/lib/i18n 而不是 @/lib/i18n/chat。桶没转发的名字,去桶的 index.ts 补一行转发。' }] },
  ],
})

// ── 自定规则:`'use client'` 文件不许对 `/server` 门做**值**导入(2026-08-19 立)────────
// 上面那道 ALLOW 只管「允不允许 import 这个路径」,不管「取的是类型还是值」——
// 而两者的后果天差地别:`import type` 编译期擦除、不进运行时;取值就是把整条服务端链
// 拉进浏览器包,一屏 `Can't resolve 'fs/promises'`(08-18 实撞,tsc/lint 全绿只有 build 炸)。
// 立这条时存量是 **0 处**(6 处客户端引 `/server` 全是 `import type`),所以敢直接给 error。
// 没有现成规则能做这件事:`no-restricted-imports` 的 allowTypeImports 无法只对 'use client' 生效,
// 而 flat config 的 files glob 选不了「文件内容里有没有那行指令」—— 只能自己写。
const SERVER_DOOR = /(^|\/)lib\/[A-Za-z]+\/server$/
    // 取一个声明正上方的 JSDoc。
    // ⚠️ 要先跳过 `// eslint-disable-next-line …`:指令也是注释,不跳过就会把「写了 disable 的声明」
    //    误判成「没写 JSDoc」——2026-08-20 加 doc-every-function 时当场撞见 5 个假阳性。
    function docAbove(src, node) {
      const before = src.getCommentsBefore(node)
      let i = before.length - 1
      while (i >= 0 && before[i].type === 'Line' && /^\s*eslint-/.test(before[i].value)) i -= 1
      const doc = before[i]
      return doc && doc.type === 'Block' && doc.value.startsWith('*') ? doc : null
    }

const localRules = {
  rules: {
    // 入参与返回值都要用**自己的具名 type**(`XxxIn` / `XxxOut`,住 `types.ts`)。
    // 内联的对象字面量类型写在签名里,等于把形状藏在函数头上:别处想复用得抄一遍,
    // 改字段时也没有一个地方能一眼看全谁在用。返回值同理,而且**必须显式写出来** ——
    // 靠推断的返回类型会随实现悄悄变,调用方却不会有任何提示。
    'typed-signature': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          param:
            '`{{ name }}` 的入参类型必须是我们自己的名字:本域 `types.ts` 声明的,或从自家域(相对路径 / `@/lib`)'
            + ' `import type` 来的。库的类型(`Promise<…>` / `Model<…>` / `Error`)要先在 types.ts 起本地名。',
          noReturn: '`{{ name }}` 没有写返回类型。显式写出来 —— 推断出来的返回类型会随实现悄悄变。',
          ret:
            '`{{ name }}` 的返回类型必须是我们自己的名字:本域 `types.ts` 声明的,或从自家域(相对路径 / `@/lib`)'
            + ' `import type` 来的。返回是这个函数的对外契约,契约不能借库的名字。',
        },
      },
      create(context) {
        // 🔴 严格口径(2026-08-20 Frank 拍板):入参与返回**都必须是本域自己声明的类型**。
        //
        //    第一版只判「是不是类型引用」,`Promise<Candidate[]>` 就混过去了;
        //    第二版改判名字后缀 `In`/`Out`,又误伤了 `SearchTool` / `Watch` 这些**本来就是我们的**类型。
        //    Frank 的原话是「Promise 这个不是我们的 type」—— 判据落在**归属**上才对:
        //    名字得能在同目录的 `types.ts` 里找到 `export type`。库的类型(`Promise` / `Model` / `Error`)
        //    要用就先在 `types.ts` 里起个本地名字,那样才有地方挂注释说清它为什么在签名里。
        //    (宪法「库类型在 types.ts 里起本地名字,签名里不出现外部类型」。)
        //    2026-08-20 Frank 追加过「后缀也约束」(必须叫 XxxIn/XxxOut);2026-08-21 又收回 ——
        //    禁纯包装别名之后,`toRequirement(r: Row): ReqRow` 直接用真名才是对的,
        //    强制 In/Out 后缀会逼出一层 `ToRequirementOut = ReqRow` 转发别名。
        //    现口径:**必须是本域 types.ts 里声明的名字**(挡住 Promise/Model 这类库类型);
        //    In/Out 只对「专为这个函数新造的形状」保留为命名惯例,不由闸强制。
        //    ⚠️ 「本域」有两种形态:带 `types.ts` 的目录(`lib/consult/`),
        //    和**单文件叶子**(`lib/error.ts` / `lib/log.ts` —— 它们的类型就写在自己文件里)。
        //    只查目录的 types.ts 会把单文件叶子的 `LogIn` / `LogOut` 也判成外人(实测 16 条假阳性)。
        //    2026-08-21 拍板②的推论:禁纯包装别名后,跨域取形状只剩 `import type … from '../gauge'`
        //    这一条路,所以「自家模块空间(相对路径 / `@/lib`)import type 来的名字」也算我们的 ——
        //    它在源头域的 types.ts 里有注释有归属。库包(`@earendil-works/…`)的 import type 不算,
        //    仍逼着先起本地名(样板:agent/types.ts 的 `TranscriptMessage = AgentMessage`)。
        const declared = new Map()
        function typeNames(text) {
          const out = new Set(Array.from(text.matchAll(/^export type (\w+)/gm), (m) => m[1]))
          for (const m of text.matchAll(/import type \{([^}]*)\} from '(\.[^']*|@\/lib\/[^']*)'/g)) {
            for (const raw of m[1].split(',')) {
              const name = raw.trim().split(/\s+as\s+/).pop()
              if (name) out.add(name)
            }
          }
          return out
        }
        // 基本类型直写放行(2026-08-21 Frank 拍板②:「type 应该只允许基本类型,不应该允许包装类型」——
        // string/number/boolean/void/null 不必包一层别名;库的具名类型仍要先起本地名)。
        const PRIMS = new Set(['TSStringKeyword', 'TSNumberKeyword', 'TSBooleanKeyword', 'TSVoidKeyword', 'TSNullKeyword'])
        function ours(ann, context) {
          if (PRIMS.has(ann?.type)) return true
          if (ann?.type !== 'TSTypeReference') return false
          const n = ann.typeName
          const name = n?.type === 'Identifier' ? n.name : ''
          if (!name) return false
          const file = context.filename ?? ''
          if (!declared.has(file)) {
            const src = context.sourceCode ?? context.getSourceCode()
            const own = typeNames(src.getText())
            try {
              const sibling = fs.readFileSync(nodePath.join(nodePath.dirname(file), 'types.ts'), 'utf8')
              for (const t of typeNames(sibling)) own.add(t)
            } catch {
              /* 单文件叶子没有兄弟 types.ts,自己文件里的就够 */
            }
            declared.set(file, own)
          }
          return declared.get(file).has(name)
        }

        return {
          FunctionDeclaration(node) {
            const name = node.id?.name ?? '(匿名)'
            const suggest = name.charAt(0).toUpperCase() + name.slice(1)
            // 🔴 类型谓词整个豁免:`x is T` 的签名是**语言规定**的 —— 返回位置写不了别名,
            //    入参也必须直接收被判定的那个值。宪法「不用 class」那条把它列为
            //    「一个函数一个参数」唯一的例外,这里同理。
            if (node.returnType?.typeAnnotation?.type === 'TSTypePredicate') return
            for (const p of node.params) {
              // 库/语言定死签名里用不上的那个参数以 `_` 开头,不参与判定
              if (p.type === 'Identifier' && p.name.startsWith('_')) continue
              if (!ours(p.typeAnnotation?.typeAnnotation, context)) {
                context.report({ node: p, messageId: 'param', data: { name, suggest } })
              }
            }
            if (!node.returnType) {
              context.report({ node, messageId: 'noReturn', data: { name, suggest } })
              return
            }
            if (!ours(node.returnType.typeAnnotation, context)) {
              context.report({ node, messageId: 'ret', data: { name, suggest } })
            }
          },
        }
      },
    },

    // type 的每个属性、常量表的每个键,都要有自己的多行 JSDoc。
    // 这条比「每个导出都要注释」更要紧:一个 type 有十个字段,只在类型头上写一句话,
    // 读的人对着 `expMonths?: number | null` 还是不知道「不填」和「填 0」差在哪 —— 而那正是判定的分水岭。
    'doc-every-member': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          member: '`{{ name }}` 缺注释。type 的每个属性、常量表的每个键都要有自己的多行 JSDoc。',
        },
      },
      create(context) {
        const src = context.sourceCode ?? context.getSourceCode()
        // 用共享的 docAbove:它会跳过 `eslint-` 指令行再找 JSDoc。
        // 🔴 2026-08-20 给 doc-every-function / doc-every-export / jsdoc-tags 修过这个盲点,
        //    **漏了这一条** —— 属性上挂一行 eslint-disable,它就看不见上面的注释了(08-21 实撞)。
        function documented(node) {
          return Boolean(docAbove(src, node))
        }
        function keyName(node) {
          const k = node.key
          if (!k) return '(键)'
          return k.type === 'Identifier' ? k.name : String(k.value ?? '(键)')
        }
        return {
          TSPropertySignature(node) {
            if (!documented(node)) context.report({ node, messageId: 'member', data: { name: keyName(node) } })
          },
          Property(node) {
            // 只管**导出的常量表**里的键:函数里就地拼的对象不在此列(它是实现细节,不是约定);
            // 数组里的一行同理 —— `CASES = [{ id, page }, …]` 那是**数据**,形状由它的 type 说清,
            // 逐行逐字段再写一遍 JSDoc 只是噪音(2026-08-20 迁 caseLibrary 时实撞 32 条)。
            let p = node.parent
            let depth = 0
            let objects = 0
            while (p && depth < 8) {
              if (p.type === 'ExportNamedDeclaration') break
              if (p.type === 'ArrayExpression') return
              if (p.type === 'FunctionDeclaration' || p.type === 'ArrowFunctionExpression') return
              if (p.type === 'ObjectExpression') objects += 1
              if (objects > 1) return                        // 嵌套一层往下是数据,不是约定
              p = p.parent
              depth += 1
            }
            if (!p || p.type !== 'ExportNamedDeclaration') return
            if (node.parent?.type !== 'ObjectExpression') return
            if (!documented(node)) context.report({ node, messageId: 'member', data: { name: keyName(node) } })
          },
        }
      },
    },

    // `functions.ts` 顶层不许有变量 —— 常量归 `constants.ts`,形状归 `types.ts`。
    // 要拼一个带库类型的复杂对象就写个构建函数,别放成常量。
    'functions-file-no-variables': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          variable: '`functions.ts` 顶层只许有 function。`{{ name }}` 是变量 —— 标量/表/正则去 `constants.ts`,形状去 `types.ts`,运行时状态去 `variables.ts`。',
        },
      },
      create(context) {
        if (!/functions\.ts$/.test(context.filename ?? '')) return {}
        return {
          VariableDeclaration(node) {
            const p = node.parent
            const top = p?.type === 'Program' || (p?.type === 'ExportNamedDeclaration' && p.parent?.type === 'Program')
            if (!top) return
            const name = node.declarations[0]?.id?.name ?? '(解构)'
            context.report({ node, messageId: 'variable', data: { name } })
          },
        }
      },
    },

    // 文件头一块 JSDoc:这文件是什么 + `@author` + `@time`。
    // `@time` 取该文件的 git 创建时刻 —— 它让「这套写法是哪一天定的」有据可查。
    'file-header': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          missing: '文件头缺一块 JSDoc(这文件是什么、为什么单独存在、和邻居的分界)。',
          tags: '文件头的 JSDoc 缺 {{ tag }}。',
        },
      },
      create(context) {
        const src = context.sourceCode ?? context.getSourceCode()
        return {
          Program(node) {
            const first = src.getAllComments()[0]
            const isHead = first && first.type === 'Block' && first.value.startsWith('*') && first.loc.start.line <= 3
            if (!isHead) {
              context.report({ node, messageId: 'missing' })
              return
            }
            for (const tag of ['@author', '@time']) {
              if (!first.value.includes(tag)) context.report({ loc: first.loc, messageId: 'tags', data: { tag } })
            }
          },
        }
      },
    },

    // 函数的 JSDoc = 做什么 + `@param` + `@returns`。
    // ⚠️ **不逐条复述入参的字段** —— 字段的说明归 `XxxIn` 自己的属性;
    //    写在函数头上就是两份真相,迟早对不上(实测踩过)。这条只查标签在不在。
    'jsdoc-tags': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          tag: '`{{ name }}` 的 JSDoc 缺 {{ tag }}。函数的 JSDoc = 做什么 + `@param` + `@returns`。',
        },
      },
      create(context) {
        const src = context.sourceCode ?? context.getSourceCode()
        return {
          FunctionDeclaration(node) {
            const anchor = node.parent?.type === 'ExportNamedDeclaration' ? node.parent : node
            const doc = docAbove(src, anchor)
            if (!doc) return
            const name = node.id?.name ?? '(匿名)'
            if (node.params.length && !doc.value.includes('@param')) {
              context.report({ node, messageId: 'tag', data: { name, tag: '@param' } })
            }
            if (!doc.value.includes('@returns')) {
              context.report({ node, messageId: 'tag', data: { name, tag: '@returns' } })
            }
          },
        }
      },
    },

    // 造错只有 `lib/error` 一处。域里 `new Error` = 又长出一种没人认得的失败身份,
    // 判定那头就得多写一个 instanceof 分支,而跨模块边界它还不一定认得出。
    'no-new-error': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          newError: '域里不许 `new Error`。造错走 `lib/error` 的 `fail({ name, msg, code })`,判定写成类型谓词。',
        },
      },
      create(context) {
        if (/lib[\\/]error\.ts$/.test(context.filename ?? '')) return {}
        return {
          NewExpression(node) {
            if (node.callee?.type === 'Identifier' && node.callee.name === 'Error') {
              context.report({ node, messageId: 'newError' })
            }
          },
        }
      },
    },

    // `functions.ts` 里不许有**裸字符串**:所有字面量归 `constants.ts`(给模型看的归 `prompts.ts`)。
    //
    // 🔴 为什么值得单立一条:字面量散在函数体里,是「同一个词在三处各写一遍、改的时候漏一处」的温床。
    // 全站已经这么办过两次并且见了效 —— 日志字面量收进 `lib/log`、错误话术收进 `lib/error`,
    // 收拢当场就抓出逐字重复。这条把同一件事推到每个域的 `functions.ts`。
    //
    // 放行的只有三种,都不是「内容」:空串(缺省值)、类型位置的字面量(`'user' | 'assistant'`)、
    // import 路径。对象的键也要放行 —— 键是结构不是内容,收进 constants 反而看不出这个对象长什么样。
    // ── 域内只许有那九个文件(2026-08-20 Frank 立)────────────────────────────
    // 「一个域最多这九个文件」是**能测的**,那就别只写在宪法里 —— 起个别的名字塞进来,
    // 一年后没人记得当初为什么破例。要放的东西七个抽屉都装不下,说明它不属于这个域。
    'domain-file-names': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          bad: '域里只许有这十个文件:{{ allowed }}。`{{ name }}` 不在其中 —— 装不下就说明它不属于这个域,别新起一个名字。',
        },
      },
      create(context) {
        // rows.ts 是 2026-08-21 Frank 添的第十个抽屉:SQL 原始行 → 本域形状的构造器(to* 行映射),
        // 一条 SQL 一个;体内只许词汇表 + 纯拼装,不许业务判断(db 域的 rows 装词汇表与 queryRows 本体)。
        const ALLOWED = ['constants.ts', 'variables.ts', 'prompts.ts', 'schemas.ts', 'types.ts',
          'functions.ts', 'rows.ts', 'callbacks.ts', 'index.ts', 'server.ts']
        return {
          Program(node) {
            const full = context.filename ?? ''
            // 路径分隔符在 Windows 上是反斜杠 —— 用码点取,免得配置文件里出现转义
            const cut = Math.max(full.lastIndexOf('/'), full.lastIndexOf(String.fromCharCode(92)))
            const name = full.slice(cut + 1)
            if (!name || ALLOWED.includes(name)) return
            // db 独有的两个名字,别的域不许借:
            // · sql.ts —— 宪法特批的「另一种介质」(SQL 文本整体搬走的家),
            //   文件名就是内容说明,改叫 constants.ts 反而埋信号;
            // · pool.ts —— payload 接缝(getDb,2026-08-21 Frank 拍板:db 是基础设施,
            //   「怎么拿到那一个池」就是它的业务;门里不许有函数后它得有自己的抽屉)。
            const parent = full.slice(0, cut)
            const cut2 = Math.max(parent.lastIndexOf('/'), parent.lastIndexOf(String.fromCharCode(92)))
            if ((name === 'sql.ts' || name === 'pool.ts') && parent.slice(cut2 + 1) === 'db') return
            context.report({ node, messageId: 'bad', data: { allowed: ALLOWED.join(' / '), name } })
          },
        }
      },
    },
    'door-forward-only': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          impl:
            '门里只有转发(宪法「两个门的域怎么摆」):`index.ts` / `server.ts` 顶层只许 `import`'
            + ' 与带 `from` 的 `export`。这条 {{ kind }} 的家在别的抽屉。',
        },
      },
      create(context) {
        // 2026-08-21 Frank 实拍:db/server.ts 里藏着 dbOf/getDb 两个函数,push 一路绿灯 ——
        // 之前只有「门的 import 方向」有闸(client-no-server-values / 桶引用),
        // 「门里只许转发」这半句一直没闸。门允许的三样:import、`export * from`、
        // `export { … } from`(带 source 的转发);其余顶层语句(函数、变量、类、
        // 就地声明的 export)都是实现,归各自的抽屉。
        if (!/(index|server)\.ts$/.test(context.filename ?? '')) return {}
        return {
          Program(node) {
            for (const st of node.body) {
              if (st.type === 'ImportDeclaration') continue
              if (st.type === 'ExportAllDeclaration') continue
              if (st.type === 'ExportNamedDeclaration' && st.source != null && st.declaration == null) continue
              context.report({ node: st, messageId: 'impl', data: { kind: st.type } })
            }
          },
        }
      },
    },
    'no-bare-strings': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          bare: '`functions.ts` 里不许有裸字符串 {{ text }}。挪进 `constants.ts`(给模型看的字挪进 `prompts.ts`)。',
        },
      },
      create(context) {
        if (!/functions\.ts$/.test(context.filename ?? '')) return {}
        function inTypePosition(node) {
          let p = node.parent
          let depth = 0
          while (p && depth < 4) {
            if (p.type === 'TSLiteralType' || p.type === 'TSTypeReference' || p.type === 'TSAsExpression') return true
            p = p.parent
            depth += 1
          }
          return false
        }
        return {
          Literal(node) {
            // 正则也是常量(`constants.ts` 的文件头写着「标量、字符串表、正则」),
            // 但它的 `value` 是 RegExp 不是 string,第一版就这么漏过去了(2026-08-20 Frank 实拍)。
            if (node.regex) {
              context.report({ node, messageId: 'bare', data: { text: `/${node.regex.pattern}/` } })
              return
            }
            if (typeof node.value !== 'string' || node.value === '') return
            const p = node.parent
            if (p?.type === 'ImportDeclaration' || p?.type === 'ExportNamedDeclaration') return
            if (p?.type === 'Property' && p.key === node) return
            if (p?.type === 'MemberExpression' && p.property === node) return
            // `typeof x === 'string'` 的右边是**语言构造**,不是文案:它永远不会被翻译、
            // 永远不会改,收进 `constants.ts` 只是把一句读得懂的判断换成一次跳转(2026-08-20 立)。
            if (p?.type === 'BinaryExpression'
              && p.left?.type === 'UnaryExpression' && p.left.operator === 'typeof') return
            if (inTypePosition(node)) return
            context.report({ node, messageId: 'bare', data: { text: JSON.stringify(node.value).slice(0, 28) } })
          },
          TemplateElement(node) {
            const text = node.value?.cooked ?? ''
            // 纯空白的模板段是排版(`${a} ${b}`),不是内容
            if (!text.trim()) return
            context.report({ node, messageId: 'bare', data: { text: JSON.stringify(text).slice(0, 28) } })
          },
        }
      },
    },

    // 同一个模块拆成好几行 import,读的人得把散在各处的名字自己拼回去,还看不出「到底依赖了它几样」。
    // 2026-08-20 Frank 实拍:`ruling/types.ts` 里 `'../score'` 摞了 3 行、`'../rules'` 摞了 2 行 ——
    // 每次加类型顺手补一行,谁都没回头合并。
    // ⚠️ 只拦**同一种**的:值导入与 `import type` 分开写是对的(前者进运行时,后者编译期就没了),
    //    那正是「这个域到底在运行时依赖谁」一眼能看出来的原因。
    'no-split-import': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          split: '`{{ src }}` 已经在上面 import 过了(同为 {{ kind }})。合并成一行 —— 一个模块一行,才看得出依赖了它几样。',
        },
      },
      create(context) {
        const seen = new Set()
        return {
          ImportDeclaration(node) {
            const kind = node.importKind === 'type' ? '仅类型' : '值导入'
            const key = `${kind}|${node.source.value}`
            if (seen.has(key)) {
              context.report({ node, messageId: 'split', data: { src: String(node.source.value), kind } })
              return
            }
            seen.add(key)
          },
        }
      },
    },

    // 裸数字看不出它是什么:`parts.length === 2` 的 2 是「区间只有两个端点」,
    // `?? 9` 的 9 是「排序沉底」,`- 15` 的 15 是 BC 官方那条「每整元 1 分」的起算点。
    // 名字就是它们的说明书,而说明书的家是 `constants.ts`(2026-08-20 Frank 实拍立)。
    // 只放行 0 / 1 / -1:它们是「空、一个、倒序」这类语言级的量,起名反而更难读。
    // ⚠️ 只管 `functions.ts` —— `constants.ts` 本来就是放数的地方。
    // ── 禁止按位置取值(2026-08-20 Frank 立)────────────────────────────────
    // `m[2]` 读不出那是上界还是别的什么;`clb[3]` 读不出那是口语还是听力。
    // 更糟的是**写错不报错** —— 只会算出一个看起来很合理的错值。
    // 有名字的结构就用名字:正则用具名捕获组 + 本域自己的 type,固定几项用具名对象。
    // ⚠️ 放行 `[0]`:那是同构列表的「第一个」,不是对有名字的结构按位置取
    //    (`rows[0]?.factorMax` 里每一行都同构,第一行不代表某个特定的东西)。
    //    变量下标(`list[i]`)也放行 —— 那本来就是遍历。
    'no-literal-index': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          idx: '不许按位置取值 `[{{ n }}]`。有名字的结构就用名字:正则用具名捕获组配本域的 type,固定几项用具名对象。',
        },
      },
      create(context) {
        return {
          MemberExpression(node) {
            if (!node.computed || node.property?.type !== 'Literal') return
            const v = node.property.value
            if (typeof v !== 'number' || v === 0) return
            context.report({ node: node.property, messageId: 'idx', data: { n: String(v) } })
          },
        }
      },
    },

    // ── 边界收窄成语只许在行映射函数与 lib/db 词汇表里出现(2026-08-21 Frank 拍板)──
    // 设计:docs/implementation/默认值架构-20260821.md。三个成语 = `String(x ?? …)`、
    // `Number(x ?? …)`、`x == null ? 字面量 : Number/String(x)` —— 它们是「库行没洗就地补」的形状;
    // 普通的 `a ?? b` 可选回退不在射程里(那是正常 TS,不是边界收窄)。
    // 开闸策略:已迁完的域 error,其余 warn = 整改清单,迁完一个升一个(Frank:「基于检查出来的内容一点一点改」)。
    'no-inline-coercion': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          idiom:
            '边界收窄成语。库行的空值处理收进 `to*` 行映射函数,用 lib/db 的词汇表'
            + '(text / count / numOrNull,空值语义即 API)—— 业务代码拿到的该是洗完的对象。'
            + '见 docs/implementation/默认值架构-20260821.md。',
        },
      },
      create(context) {
        // 词汇表自己的实现就是这三个成语的家,豁免
        if (/lib[\\/]db[\\/]database\.ts$/.test(context.filename ?? '')) return {}
        const nullish = (n) => n?.type === 'LogicalExpression' && n.operator === '??'
        const wrapCall = (n) =>
          n?.type === 'CallExpression' && n.callee?.type === 'Identifier' &&
          (n.callee.name === 'String' || n.callee.name === 'Number')
        return {
          CallExpression(node) {
            if (!wrapCall(node)) return
            if (nullish(node.arguments[0])) context.report({ node, messageId: 'idiom' })
          },
          ConditionalExpression(node) {
            const t = node.test
            const eqNull =
              t?.type === 'BinaryExpression' && (t.operator === '==' || t.operator === '===') &&
              ((t.right?.type === 'Literal' && t.right.value === null) ||
               (t.left?.type === 'Literal' && t.left.value === null))
            if (!eqNull) return
            if (wrapCall(node.consequent) || wrapCall(node.alternate)) {
              context.report({ node, messageId: 'idiom' })
            }
          },
        }
      },
    },

    // ── 禁 `?`(2026-08-21 Frank 拍板「禁止用 ?」)────────────────────────────────
    // 设计讨论定案:`?:` 是「写的人省 10 秒,后面所有读的人每次都得防一手」的坏交换;
    // 终态 = 字段全声明、可空显式 `| null`、构造处格格交代 —— 拿 TS 当强类型语言用。
    // 两种形态一把抓:`?:` 可选属性/可选参数、`?.` 可选链。
    // 豁免:① `to*` 命名的行映射/采信函数体内(边界收窄本来就要摸「可能没有」);
    //      ② 描述**别人家对象**的形状挂逐行 disable 并写明理由(pi 的事件、Payload 的内部结构);
    //      ③ tsx 不管(React props 的 `?` 是框架惯例)。
    // 开闸:consult=error,全站其余 .ts=warn(整改清单),迁完一域升一个。
    'no-optional': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          prop:
            '`{{ name }}?` 可选属性/参数 —— 字段要全声明,可空写成 `{{ name }}: T | null`,'
            + '构造处显式给 null。描述外部对象的形状要豁免就逐行 disable 并写明是谁家的。',
          chain:
            '`?.` 可选链 —— 自家数据每格都该保证存在(顶多是 null):直接取,或显式 if/报错。'
            + '边界摸别人家对象的,收进 `to*` 采信/映射函数里。',
        },
      },
      create(context) {
        function inMapper(node) {
          let cur = node.parent
          while (cur) {
            if ((cur.type === 'FunctionDeclaration' || cur.type === 'FunctionExpression') &&
                cur.id?.name?.startsWith('to')) return true
            cur = cur.parent
          }
          return false
        }
        return {
          TSPropertySignature(node) {
            if (!node.optional) return
            const name = node.key?.name ?? node.key?.value ?? '(计算键)'
            context.report({ node, messageId: 'prop', data: { name } })
          },
          Identifier(node) {
            // 可选参数 `(x?: T)`:只看真在参数位上的
            if (!node.optional) return
            const p = node.parent
            const isParam = p && (p.type === 'FunctionDeclaration' || p.type === 'FunctionExpression' ||
              p.type === 'ArrowFunctionExpression' || p.type === 'TSFunctionType' || p.type === 'TSMethodSignature')
            if (isParam) context.report({ node, messageId: 'prop', data: { name: node.name } })
          },
          ChainExpression(node) {
            if (inMapper(node)) return
            context.report({ node, messageId: 'chain' })
          },
        }
      },
    },

    // ── 禁三目(2026-08-21 Frank 拍板)────────────────────────────────────────────
    // 「三目省的是写的功夫,而写的成本现在是零;读的成本才是全部。」
    // 流程位 → if/else;值位置(对象字面量的一格)→ 提成具名函数,概念顺带得名。
    // 豁免:lib/db/functions.ts(词汇表四行 = 全站空值坍缩地,病灶清零的前提是药只此一份);
    // tsx 不进 files(JSX 条件渲染是框架惯例)。
    'no-ternary-branch': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          ternary:
            '三目 —— 流程位改 if/else 一行一条出口;值位置提成具名小函数'
            + '(那一格的概念顺带得一个名字)。词汇表(lib/db/functions.ts)是唯一特区。',
        },
      },
      create(context) {
        return {
          ConditionalExpression(node) {
            context.report({ node, messageId: 'ternary' })
          },
        }
      },
    },

    'no-magic-number': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          magic: '裸数字 `{{ n }}` 看不出是什么。挪进 `constants.ts` 给它一个名字和一块 JSDoc。',
        },
      },
      create(context) {
        if (!/functions\.ts$/.test(context.filename ?? '')) return {}
        return {
          Literal(node) {
            if (typeof node.value !== 'number') return
            if (node.value === 0 || node.value === 1) return
            const neg = node.parent?.type === 'UnaryExpression' && node.parent.operator === '-'
            if (neg && node.value === 1) return
            if (node.parent?.type === 'VariableDeclarator') return          // 就地起名的不算
            context.report({ node, messageId: 'magic', data: { n: String(node.value) } })
          },
        }
      },
    },

    // 一个函数超过 75 行,读的人就得翻屏 —— 翻过去的那一刻,前半段的变量已经记不住了。
    // 原线 60(2026-08-20 立,当时五个定型域最长 57,拦「明天新长出来的那一个」,零误伤);
    // 2026-08-21 提到 75:同日「大括号 + 括号体换行」两道令把同样的逻辑机械涨行 ~25%
    //(ruling 六个 61-67 行的函数全是被展开顶过线的,复杂度没变)。前提变了闸跟着调,判定日期留着。
    // ⚠️ 数的是**声明到收尾的物理行**,注释也算:注释多到让函数翻屏,一样该拆。
    'function-length': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          long:
            '`{{ name }}` 有 {{ n }} 行,超过 75 行。拆成几个各自说得清一件事的函数;'
            + '真拆不动的(闭包变量一拆就得显式传一大串)写 eslint-disable 并在 `--` 后面说明为什么。',
        },
      },
      create(context) {
        return {
          FunctionDeclaration(node) {
            const n = node.loc.end.line - node.loc.start.line + 1
            if (n <= 75) {
              return
            }
            context.report({ node, messageId: 'long', data: { name: node.id?.name ?? '(匿名)', n: String(n) } })
          },
        }
      },
    },

    // 一个函数一个参数,入参与返回值都用自己的 type(`XxxIn` / `XxxOut`)。
    // 位置参数一多,调用点就变成一串没名字的值,读的人得回来数第几个是第几个;
    // 加一个参数还会把每个调用点都改一遍。收成一个对象之后,加字段不动调用点,字段名就是文档。
    // ⚠️ 例外:**库/语言定死的签名**(`Array.sort` 的比较器、pi 的 `execute(toolCallId, args)`)——
    //    用不上的那个参数以 `_` 开头即可放行;两个都用得上的,写 eslint-disable 并在 `--` 后面说明是谁定的。
    'one-parameter': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          many:
            '`{{ name }}` 有 {{ n }} 个参数。一个函数一个参数,入参收成一个对象并给它自己的 type;'
            + '库定死的签名请用 `_` 前缀标出用不上的那个,或写 eslint-disable 说明是谁定的。',
        },
      },
      create(context) {
        return {
          FunctionDeclaration(node) {
            const used = node.params.filter((p) => !(p.type === 'Identifier' && p.name.startsWith('_')))
            if (used.length > 1) {
              context.report({ node, messageId: 'many', data: { name: node.id?.name ?? '(匿名)', n: String(used.length) } })
            }
          },
        }
      },
    },

    // ── 写法约束(2026-08-19 立;宪法「域内文件的标准形态 / 禁止事项」)──────────
    // 判据同上:立法时这几个域的存量违规逐条数过是 0,所以敢直接给 error。
    // `any` / `console` 走内置规则,不重复造(见下面那一块的 rules)。
    'no-unknown-type': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          unknown:
            '不许 `unknown`。信任边界上收进来的东西要当场收窄成自己的类型,'
            + '把 `unknown` 往下传等于把校验推给下一个人。',
        },
      },
      create(context) {
        return { TSUnknownKeyword(node) { context.report({ node, messageId: 'unknown' }) } }
      },
    },

    // `!x` 把「x 是 null/undefined/''/0/false 里的哪一种没有」全折进一个布尔,读的人要回头
    // 查 x 的类型才知道这行到底在判什么(2026-08-21 Frank「禁止用感叹号」,Java 风格:比较写显式)。
    // 一并禁 TS 的后缀 `x!`(非空断言)—— 它和 `as unknown as X` 一样是把编译器闭嘴的写法。
    // `!==` / `!=` 不在此列:那是比较运算符,本身就是显式写法。
    'no-bang': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          bang:
            '不许 `!x`。判空写 `== null`,空串写 `=== \'\'`,空数组写 `.length === 0`,'
            + '布尔写 `=== false` —— 把「哪一种没有」写出来。',
          nonnull:
            '不许后缀 `x!`(非空断言)—— 它把编译器闭嘴。真知道非空就先 if 收窄,'
            + '编译器自己会认。',
        },
      },
      create(context) {
        return {
          UnaryExpression(node) {
            if (node.operator === '!') context.report({ node, messageId: 'bang' })
          },
          TSNonNullExpression(node) { context.report({ node, messageId: 'nonnull' }) },
        }
      },
    },

    // `a ?? b` 是把「a 没有就用 b」折进一个运算符 —— 和三目、`?.` 同一路:写起来省,读起来要
    // 展开脑内翻译(2026-08-21 Frank 补禁,当初禁 `?` 时它被放行,实看 agent 域后收回)。
    // 显式写法:`let v = b; if (a != null) v = a`;读库值走词汇表(text/count/numOrNull)。
    // `??=` 一并禁。
    'no-nullish': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          nullish:
            '不许 `??` / `??=`。写显式:`let v = 默认; if (x != null) v = x`;'
            + '库里读出来的值走词汇表(text/count/numOrNull)。',
        },
      },
      create(context) {
        return {
          LogicalExpression(node) {
            if (node.operator === '??') context.report({ node, messageId: 'nullish' })
          },
          AssignmentExpression(node) {
            if (node.operator === '??=') context.report({ node, messageId: 'nullish' })
          },
        }
      },
    },

    // undefined 是 JS 自己的「没有」(数组越界、缺属性、没 return),null 才是我们契约里的「没有」。
    // 两种「没有」并存,每个读值的人都要想两次(2026-08-21 Frank「any unknown undefined 都不允许」)。
    // 只查**类型位置**:运行时的 `x !== undefined` 判断是在边界收语言值,那是收窄不是传播。
    // 外部库定死的形状(pi 的 beforeToolCall 放行=undefined)逐行 disable 写理由。
    'no-undefined-type': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          undef:
            '不许 `undefined` 出现在类型里。契约里的「没有」用 `| null`;'
            + '语言给的 undefined(数组越界、缺属性)在拿到的那一行当场收掉。',
        },
      },
      create(context) {
        return { TSUndefinedKeyword(node) { context.report({ node, messageId: 'undef' }) } }
      },
    },

    // 对象展开会让「这个对象有哪些字段」变成运行时才知道的事,读的人翻不出来;
    // 加字段时也不会有人提醒你新字段要不要跟着走。字段写全,多几行换看得见。
    'no-object-spread': {
      meta: {
        type: 'problem',
        schema: [],
        messages: { spread: '不许对象展开 `...`,字段写全 —— 展开之后「这个对象有哪些字段」就只有运行时知道了。' },
      },
      create(context) {
        return {
          SpreadElement(node) {
            if (node.parent?.type === 'ObjectExpression') context.report({ node, messageId: 'spread' })
          },
        }
      },
    },

    // 匿名函数在堆栈里没有名字,出错时只看得见 `<anonymous>`;而具名函数顺带강迫你说清它在干什么。
    // 回调要么提成具名函数(`.map(f)` 可以),要么改写成 for 循环。
    // ⚠️ 只管**函数表达式**,不管箭头**类型**(`onStep?: (t: string) => void`)—— 那是形状不是函数。
    'no-arrow-function': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          arrow: '不许匿名/箭头函数。提成 `function 名()` 再传进去,或者改写成 for 循环 —— 堆栈里要看得见名字。',
        },
      },
      create(context) {
        return { ArrowFunctionExpression(node) { context.report({ node, messageId: 'arrow' }) } }
      },
    },

    // 🔴 双重断言把类型检查彻底关掉。单断言至少还在查两个类型有没有重叠,
    // `as unknown as X` 连这一层都没有 —— 它是「我不想让编译器说话」的写法。
    'no-double-assertion': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          double:
            '不许 `as unknown as X` 双重断言 —— 它把编译器彻底关掉。'
            + '单断言至少还在查两个类型有没有重叠;真跨不过去的边界,写单断言并在上一行说明为什么。',
        },
      },
      create(context) {
        return {
          TSAsExpression(node) {
            const inner = node.expression
            if (inner?.type !== 'TSAsExpression') return
            const k = inner.typeAnnotation?.type
            if (k === 'TSUnknownKeyword' || k === 'TSAnyKeyword') context.report({ node, messageId: 'double' })
          },
        }
      },
    },

    // 不用 class(2026-08-19 全站定)。失败抛原生 Error、身份挂 name、判定走类型谓词;
    // 状态用参数传,不用成员变量。唯一的例外是外部库要求的全局垫片(pdf.js 要 `new DOMMatrix()`)。
    'no-class': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          klass:
            '不用 `class`(2026-08-19 全站定)。失败抛原生 `Error`、身份挂 `name`、判定写类型谓词;'
            + '造错走 `lib/error` 的 `fail({ name, msg, code })`。',
        },
      },
      create(context) {
        function hit(node) { context.report({ node, messageId: 'klass' }) }
        return { ClassDeclaration: hit, ClassExpression: hit }
      },
    },

    // ── 注释的形状(2026-08-19 立;宪法「域内文件的标准形态 / 注释的形状」)────────
    // 这几条**编译器管不了**,而它们正是这个仓库的决策记录赖以存在的形式:
    // 注释挂在声明正上方、带日期带理由。写成单行、或者干脆不写,记录就没地方落。
    // 只对**已经定型的域**开 error(存量为 0 才敢给 error,同上面那条自定规则的立法方式);
    // 还没定型的域先不管,免得一次性红几百条、结果没人再跑 lint。
    'doc-multiline': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          single:
            'JSDoc 一律写成多行:`/**` 独占一行、` * 正文`、` */` 独占一行。'
            + '单行 `/** … */` 压不下一件事的来龙去脉,等于没写。',
        },
      },
      create(context) {
        const src = context.sourceCode ?? context.getSourceCode()
        return {
          Program() {
            for (const c of src.getAllComments()) {
              if (c.type !== 'Block' || !c.value.startsWith('*')) continue
              if (c.loc.start.line === c.loc.end.line) context.report({ loc: c.loc, messageId: 'single' })
            }
          },
        }
      },
    },

    // 段内的分类横线 2026-08-19 全站退役:它说的是「这底下是一类东西」,
    // 而这件事每个声明自己的注释已经说了,横线只是多一层要维护的目录。
    // 一级段横幅(三行 `//` 框 + `N.` 编号)不在此列,它有自己的形状。
    'no-section-dashes': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          dashes: '段内不许用 `// ── 名 ──` 分类横线(2026-08-19 退役)。要分段就切一级段横幅(三行 `//` 框 + `N.` 编号)。',
        },
      },
      create(context) {
        const src = context.sourceCode ?? context.getSourceCode()
        return {
          Program() {
            for (const c of src.getAllComments()) {
              if (c.type !== 'Line') continue
              // 判据:一条 `//` 行里有连着三个以上的长横线,而且横线之间夹着字 —— 那就是分类横线。
              // 纯横线的分隔行不算(那是排版),一级段横幅用的是 `=` 也不算。
              if (!/[─—]{3,}/.test(c.value)) continue
              if (/[^\s─—]/.test(c.value)) context.report({ loc: c.loc, messageId: 'dashes' })
            }
          },
        }
      },
    },

    // 每个导出的声明正上方都要有 JSDoc。**这条是这批规则的主菜** ——
    // 「读的人要能少翻」靠的就是它:名字说装什么,注释说为什么。
    'doc-every-export': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          missing: '`{{ name }}` 是导出的声明,正上方必须有一块多行 JSDoc(说清它是什么、为什么这么定)。',
        },
      },
      create(context) {
        const src = context.sourceCode ?? context.getSourceCode()
        function named(node) {
          if (node.type === 'FunctionDeclaration') return node.id?.name ?? '(匿名)'
          if (node.type === 'VariableDeclaration') return node.declarations[0]?.id?.name ?? '(解构)'
          if (node.type === 'TSTypeAliasDeclaration' || node.type === 'TSInterfaceDeclaration') return node.id.name
          return ''
        }
        return {
          ExportNamedDeclaration(node) {
            const d = node.declaration
            if (!d) return
            const name = named(d)
            if (!name) return
            if (!docAbove(src, node)) context.report({ node, messageId: 'missing', data: { name } })
          },
        }
      },
    },

    // 🔴 `doc-every-export` 只盯**导出的**声明,而宪法说的是「每个声明都要有注释,一个不落」——
    // 中间那一大截(非导出的函数)于是一道闸都没有。2026-08-20 Frank 实拍:`ruling` 定型、四道闸全绿,
    // 可 `evaluateOne` 这条主流水线头上一块注释都没有,10 个非导出函数集体漏网。
    // 顶层函数是**读的人第一眼落到的东西**,导不导出与「要不要说清它是什么」无关。
    'doc-every-function': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          missing:
            '`{{ name }}` 正上方没有 JSDoc。顶层函数一个不落都要有(导不导出无关)——'
            + '说清它是什么、为什么这么定,再加 `@param` / `@returns`。',
        },
      },
      create(context) {
        const src = context.sourceCode ?? context.getSourceCode()
        return {
          FunctionDeclaration(node) {
            if (node.parent?.type !== 'Program') return          // 导出的那半交给 doc-every-export
            if (docAbove(src, node)) return
            context.report({ node, messageId: 'missing', data: { name: node.id?.name ?? '(匿名)' } })
          },
        }
      },
    },

    // 🔴 常量文件与形状文件都**不许 import**(2026-08-20 Frank 实拍:「常量为什么要依赖 type」)。
    //
    // · `constants.ts` 装的是 JSON 装得下的东西(标量、字符串表、正则)—— 它不需要任何人。
    //   一旦给某张表加个 `Record<EduBand, MbEduBand>` 这样的注解,常量文件就被拴在了形状文件上,
    //   而那种注解本来就该拆成「标量常量 + `functions.ts` 里一个取值函数」(宪法同条)。
    // · `types.ts` 装的是**本域自己的**形状。Frank 2026-08-20:「直接就新建,然后自己依赖自己直接用,
    //   所有的域都这么做。之后所有域都重构完毕之后,再考虑不同域之间重复的问题,和不同域的边界问题。」
    //   只声明自己真正读的那几格:下层多一个字段不必跟着改,真读不到会当场 tsc 红。
    //
    // 于是一个域的依赖只剩一条边:`functions.ts` → 别人。看一眼那个文件的 import 就知道它压在谁身上。
    'no-import-in-leaf': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          leaf: '`{{ file }}` 不许 import。常量只装 JSON 装得下的东西,形状由本域自己声明 —— 要依赖别人,只能在 `functions.ts` 里。',
        },
      },
      create(context) {
        const m = /(constants|types)\.ts$/.exec(context.filename ?? '')
        if (!m) return {}
        return {
          ImportDeclaration(node) {
            // 2026-08-21 Frank 批的唯一例外:db 是基础设施叶子,连接/参数/结果形状归它一家 ——
            // types.ts 允许 `import type` 自 ../db(或 @/lib/db),别的来源照拦。
            if (node.importKind === 'type' && /^(\.\.\/db|@\/lib\/db)$/.test(node.source.value)) return
            context.report({ node, messageId: 'leaf', data: { file: `${m[1]}.ts` } })
          },
        }
      },
    },

    // 🔴 函数体里不许有注释(2026-08-20 Frank 实拍 `gateManifest` 立):
    // 挂在语句上的说明块**没有主人** —— 它解释的那件事本身就该是一个函数,注释就该是那个函数的 JSDoc。
    // 三种去处,一个都不许丢(带日期、带原话、带官方原句的决策记录只能**搬**,不能删):
    //   ① 和别处的 JSDoc 重复 → 删(记录已经挂在那个声明上了);
    //   ② 解释一个能独立成步骤的事 → 拆成函数,注释变它的 JSDoc;
    //   ③ 解释某一个 return / 分支为什么返回这个值 → 进所属函数的 `@returns`,写成一张口径表。
    // 实测:`lib/ruling` 按这三档清了 142 条,一个一行函数都没多出来,最长的函数反而从 57 行降到 51。
    // 放行的只有 eslint / ts 指令 —— 那是给工具看的,不是给人看的。
    'no-comment-in-function': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          inside:
            '`{{ name }}` 的函数体里有注释。要解释就把那件事拆成函数、注释写成它的 JSDoc;'
            + '只解释某个返回值的,进 `@returns`;和别处重复的直接删。',
        },
      },
      create(context) {
        const src = context.sourceCode ?? context.getSourceCode()
        function directive(c) {
          return /^\s*(eslint-|@ts-|ts-expect-error|ts-ignore)/.test(c.value)
        }
        return {
          FunctionDeclaration(node) {
            if (!node.body) return
            for (const c of src.getCommentsInside(node.body)) {
              if (directive(c)) continue
              context.report({ node: c, messageId: 'inside', data: { name: node.id?.name ?? '(匿名)' } })
            }
          },
        }
      },
    },

    'client-no-server-values': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          valueImport:
            "'use client' 文件只能对 {{ door }} 做 `import type`。取值会把整条服务端链打进浏览器包" +
            '(tsc 全绿、build 才炸)。要值就把它挪进该域的 index.ts,或让服务端父组件当 prop 传下来。',
        },
      },
      create(context) {
        const body = (context.sourceCode ?? context.getSourceCode()).ast.body
        const head = body[0]
        const isClient =
          head?.type === 'ExpressionStatement' &&
          head.expression?.type === 'Literal' &&
          head.expression.value === 'use client'
        if (!isClient) return {}
        return {
          ImportDeclaration(node) {
            const door = node.source.value
            if (typeof door !== 'string' || !SERVER_DOOR.test(door)) return
            if (node.importKind === 'type') return
            // 裸 `import '…/server'` 没有 specifier,但它是**副作用导入**,照样把模块拉进图。
            const takesValue =
              node.specifiers.length === 0 || node.specifiers.some((sp) => sp.importKind !== 'type')
            if (takesValue) context.report({ node, messageId: 'valueImport', data: { door } })
          },
        }
      },
    },
  },
}

/**
 * 已重构(定型)的域 —— 2026-08-21 Frank:「先改 lib 下我已经重构过的 domain,其他的先别动,
 * 以后都先只检查已重构过的代码」。新立的写法闸(四禁/感叹号/??/大括号/函数内注释)一律只查这张名单;
 * 未重构区域连 warn 清单都不出 —— 噪音会淹掉真该改的。域重构完一个,往这里加一个。
 * (app/seed/route.ts 是例外:它今晚跟着 unknown 批迁完了,它的 unknown 闸单独一块保留。)
 */
const REFACTORED = [
  'src/lib/consult/**/*.ts', 'src/lib/db/**/*.ts', 'src/lib/ruling/**/*.ts', 'src/lib/gauge/**/*.ts',
  'src/lib/points/**/*.ts', 'src/lib/agent/**/*.ts', 'src/lib/llm/**/*.ts', 'src/lib/error.ts', 'src/lib/log.ts',
]

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // ── 存量基线(2026-08-12 eslint 修活当天实测:87 error / 476 warning,全是历史存量)──
      // 闸门要有人真的会跑才算闸门。下面这批**降级为 warn** 的是 React Compiler 时代的**优化建议**
      // (「effect 里同步 setState 会连锁重渲」「组件定义搬到模块外」),不是 bug;73 条一次性红着,
      // 结果只会是没人再跑 lint。留 warn 当欠账本,新写的代码别再添。
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/globals': 'warn',
      // 内链**故意**用真 <a> 不用 <Link>:这站靠 Google 招聘富结果活着,内链要被爬到、要能整页导航
      // (见 caseLibrary「真 <a>,内链要被爬到」)。这条规则跟本站的既定口径相反,关掉而不是逐个 disable。
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    // ── 模块边界(2026-08-18):一个模块 = 一个目录 + index.ts 桶,**外部一律从桶取**
    // (CLAUDE.md「代码组织约定」)。桶就是这个项目的头文件 —— 绕过去点具体文件,
    // 桶写的那份「对外是什么」当场作废,而编译器不会有任何意见。
    //
    // 立这条时存量绕过是 **0** 处(唯一那处 chatOrchestrate → './i18n/chat' 同一轮收掉了),
    // 所以它是**保险不是救火**:拦的是明天新写的那一行。正因为存量是 0,才敢直接给 error ——
    // 上面那批 react-hooks 降 warn 是因为「73 条一次性红着,结果只会是没人再跑 lint」。
    //
    // 不管 lib/db:那边是 `import * as SQL from './db/sql'` 的命名空间形态(48 处),
    // 调用点写 `SQL.foo()` 自解释,是设计如此,不是绕过。
    rules: barrelOnly([...ABSOLUTE, ...ALLOW]),
  },
  {
    // lib/ 里的兄弟相对路径是同一件事的另一种写法(`./i18n/chat`),上一条的 `**/lib/…` 匹配不到它。
    // ⚠️ 这里必须把 ABSOLUTE 一起带上:flat config 同名规则是**后一块整个覆盖前一块**,
    //    不是合并 —— 只写相对那几条,src/lib 下的 `@/lib/quiz/fields` 就没人管了(实测漏过)。
    // 相对模式只在 src/lib 下生效,因为 app 那边有个同名的 quiz **页面**目录
    //    (`app/(frontend)/jobs/Jobs.tsx` 正当地引 `../quiz/EntryQuiz`),全局开会误伤。
    // 模块**自己目录内**的相对引用(lib/i18n/index.ts → './chat')不在此列,那是模块内部。
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: barrelOnly([...ABSOLUTE, ...SIBLING, ...ALLOW]),
  },
  {
    // ── 依赖环(2026-08-19 立):桶会把「不是环」焊成环 ─────────────────────────
    // 实撞:`chat/tools` 要 verdict 的 assembleReportFacts,而 verdict/verdictCache 反过来要
    // chat 的 loadVerdictData(**值**)。两个文件各自健康,一进同一个桶就成环 ——
    // tsc 全绿、build 全绿,**只有测试炸**(`PNP_PROVINCES is not iterable`,模块初始化时读到半成品)。
    // 这是 build 之后的第四类问题,前三道闸没有一道管得了,只有这条规则管得了。
    // maxDepth 留默认(全深度);ignoreExternal 跳过 node_modules,不然它去爬整棵依赖树。
    rules: { 'import/no-cycle': ['error', { ignoreExternal: true }] },
  },
  {
    // 自定规则挂在这里(见文件顶上那段):plugins 的键就是规则名的前缀。
    plugins: { local: localRules },
    rules: { 'local/client-no-server-values': 'error' },
  },
  {
    // ── 注释的形状:只对**已经定型的域**开闸(2026-08-19)────────────────────────
    // 立这条时这三个域的存量违规是 0,所以敢直接给 error —— 拦的是明天新写的那一行。
    // 还没定型的域(lib/chat 等)先不进这张名单:一次性红几百条的闸门,结果是没人再跑 lint。
    // 域定型一个就往这里加一个。
    // 域每定型一个就往这张名单里加一个。2026-08-19 当天 `agent` / `llm` / `error` / `log`
    // 的 91 条存量(多数是写成一行的 type,属性没各自的注释)已经逐条补完,所以它们也在里面。
    files: ['src/lib/consult/**/*.ts', 'src/lib/employers/**/*.ts', 'src/lib/gauge/**/*.ts', 'src/lib/points/**/*.ts', 'src/lib/ruling/**/*.ts', 'src/lib/agent/**/*.ts', 'src/lib/llm/**/*.ts', 'src/lib/error.ts', 'src/lib/log.ts'],
    plugins: { local: localRules },
    rules: {
      // 注释的形状
      'local/doc-multiline': 'error',
      'local/no-section-dashes': 'error',
      'local/doc-every-export': 'error',
      'local/doc-every-function': 'error',
      // 写法
      'local/no-unknown-type': 'error',
      'local/no-object-spread': 'error',
      'local/no-arrow-function': 'error',
      'local/no-double-assertion': 'error',
      'local/no-class': 'error',
      'local/one-parameter': 'error',
      'local/typed-signature': 'error',
      'local/doc-every-member': 'error',
      'local/functions-file-no-variables': 'error',
      'local/file-header': 'error',
      'local/jsdoc-tags': 'error',
      'local/no-new-error': 'error',
      'local/no-bare-strings': 'error',
      'local/function-length': 'error',
      // 这两条内置规则够用,不自己造:全局是 warn(存量欠账本),定型域收紧成 error
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
    },
  },
  {
    // ── 函数体里不许有注释:只对**已经清完存量**的域开(2026-08-20)────────────────
    // 判定域这一轮把存量逐条清完了,所以它先进名单;别的域清完一个加一个 —— 与上面那张名单同一个规矩。
    //   · no-comment-in-function:另外五个域还有 34 条(llm 24 / consult 7 / agent 2 / error 1);
    //   · no-magic-number:另外五个域还有 6 处(consult 3 / llm 3);
    //   · no-split-import:另外五个域还有 3 处(consult 2 / i18n 1);
    //   · no-import-in-leaf:constants 还有 3 处(consult 2 / agent 1),
    //     types 还有 16 处(consult 8 / agent 5 / llm 1 / pathways 1 / jobs 1)。
    files: ['src/lib/consult/**/*.ts', 'src/lib/employers/**/*.ts', 'src/lib/gauge/**/*.ts', 'src/lib/points/**/*.ts', 'src/lib/ruling/**/*.ts', 'src/lib/agent/**/*.ts', 'src/lib/llm/**/*.ts', 'src/lib/db/**/*.ts'],
    plugins: { local: localRules },
    rules: { 'local/domain-file-names': 'error', 'local/door-forward-only': 'error' },
  },
  {
    // ── `callbacks.ts`:签名由外部库/语言定死的那几个(2026-08-20 Frank 立)────────
    // 比较器的两参一返是 `Array.prototype.sort` 规定的,不是我们的选择。这两条对**这一个文件**
    // 关掉,别处照旧 —— 于是 `functions.ts` 里「一个函数一个参数」**零例外**(一条规矩没有例外,
    // 人才会信它),而「这个域有几处签名不归我们管」也一眼数得清。
    // ⚠️ 只关这两条:注释、命名、不许匿名函数在这个文件里照旧管着。
    files: ['src/lib/*/callbacks.ts'],
    rules: { 'local/one-parameter': 'off', 'local/typed-signature': 'off' },
  },
  {
    files: ['src/lib/ruling/**/*.ts', 'src/lib/gauge/**/*.ts', 'src/lib/points/**/*.ts'],
    plugins: { local: localRules },
    rules: {
      'local/no-literal-index': 'error',
      'local/no-comment-in-function': 'error',
      'local/no-magic-number': 'error',
      'local/no-split-import': 'error',
      'local/no-import-in-leaf': 'error',
    },
  },
  {
    // ── db 的注释闸(2026-08-21,Frank「每个 sql 上面也都需要 jsdoc」)────────────────
    // 只开注释那几道:sql.ts 174 条已 1:1 配齐。全套严闸(typed-signature/one-parameter/
    // no-arrow 等)要动 sql.ts 的 30 个箭头模板函数与词汇表签名 —— 那是 db 定型批的手术,
    // 到时再把 db 挪进上面的大名单。
    // 2026-08-21 晚 Frank「any unknown undefined 都不允许,所有代码」:db 当天清零,三道直接
    // error。rows: any[] 是唯一幸存者,挂着逐行特批牌(泛型装不出运行时保证,理由在声明上)。
    files: ['src/lib/db/**/*.ts'],
    plugins: { local: localRules },
    rules: {
      'local/doc-multiline': 'error',
      'local/no-section-dashes': 'off',
      'local/doc-every-export': 'error',
      'local/doc-every-function': 'error',
      'local/doc-every-member': 'error',
      'local/no-unknown-type': 'error',
      'local/no-undefined-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // ── seed 是 raw JSON → DB 的边界,unknown 已清零(MartValue 照实声明),先锁这一道 ──
    // any 还有存量(out: any[] 等),留在全站 warn 清单里,清完再升。
    files: ['src/app/seed/route.ts'],
    plugins: { local: localRules },
    rules: { 'local/no-unknown-type': 'error' },
  },
  {
    // ── consult 定型进闸(2026-08-21,Frank 实拍「怎么有函数内注释没检查出来」)────────
    // 五道里只开四道:`no-import-in-leaf` 不开 —— consult 与 agent 一样是**包 pi 的域**,
    // types.ts 里的 `Model<…>` / `AgentTool<…>` / `Static<…>` 是外部库的泛型形状,自声明不了;
    // 这批债和 agent 的那 5 处同挂在上面 domain-file-names 名单的注释里,等外部库形状的
    // 统一解法一起清,别拿 eslint-disable 一行行糊。
    files: ['src/lib/consult/**/*.ts'],
    plugins: { local: localRules },
    rules: {
      'local/no-literal-index': 'error',
      'local/no-comment-in-function': 'error',
      'local/no-magic-number': 'error',
      'local/no-split-import': 'error',
      'local/no-inline-coercion': 'error',
      'local/no-optional': 'error',
      'local/no-ternary-branch': 'error',
      'local/no-undefined-type': 'error',
    },
  },
  {
    // ── 禁三目:全站 warn = 整改清单(2026-08-21,consult 先清零)──────────────────
    files: REFACTORED,
    ignores: ['src/lib/consult/**', 'src/lib/db/functions.ts'],
    plugins: { local: localRules },
    rules: { 'local/no-ternary-branch': 'warn' },
  },
  {
    // ── 禁 `?`:全站 warn = 整改清单(2026-08-21 Frank「禁止用 ?」,consult 先清零)──
    // db 原本整层豁免,2026-08-21 晚 Frank「? 也不允许」后收回:剩 3 处真边界
    // (PayloadWithPool 描述别人家对象、pg 的 params 签名)进清单,迁移时逐行特批或改掉。
    files: REFACTORED,
    ignores: ['src/lib/consult/**'],
    plugins: { local: localRules },
    rules: { 'local/no-optional': 'warn' },
  },
  {
    // ── 控制语句一律大括号 + 括号体必须换行(2026-08-21 Frank 三连:「if/else 都要大括号」
    //    「for 也要」「还要换行的」):curly 'all' 管 if/else/for/while/do;brace-style 1tbs
    //    + allowSingleLine:false 把 `if (x) {return y}` 这种单行块拆开。两条都可 --fix,
    //    直接全站 error:auto-fix 一遍就清零,不值得留 warn 清单。
    files: REFACTORED,
    rules: {
      curly: ['error', 'all'],
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      // 比较基准(2026-08-21 同场拍板):默认 ===/!==,唯一例外 == null / != null。
      // 内置规则正好有这个形状:'always' + null: 'ignore'。
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      // brace-style 的 fixer 只插大括号不管缩进,展开出来的块体顶在 0 列(Frank 实看抓包)——
      // indent 补这一刀,同样可 --fix。SwitchCase:1:case 相对 switch 缩一层。
      indent: ['error', 2, { SwitchCase: 1 }],
    },
  },
  {
    // ── 禁 `!x` 与后缀 `x!`:全站 warn = 整改清单(2026-08-21 Frank「禁止用感叹号」)──
    // 比较基准同场拍板:默认 `===`,唯一例外 `== null` / `!= null`(一次命中 null 与 undefined)。
    files: REFACTORED,
    plugins: { local: localRules },
    rules: { 'local/no-bang': 'warn' },
  },
  {
    // ── 禁 `??` / `??=`:全站 warn = 整改清单(2026-08-21 Frank 实看 agent 后补禁)──
    files: REFACTORED,
    plugins: { local: localRules },
    rules: { 'local/no-nullish': 'warn' },
  },
  {
    // ── 函数内注释:全站 warn = 整改清单(2026-08-21 Frank 实看 agent 的 2 条欠账后补)──
    // ruling/gauge/points/consult 已清零升 error(各自的块),ignores 逐一对齐别盖降。
    files: REFACTORED,
    ignores: ['src/lib/ruling/**', 'src/lib/gauge/**', 'src/lib/points/**', 'src/lib/consult/**'],
    plugins: { local: localRules },
    rules: { 'local/no-comment-in-function': 'warn' },
  },
  {
    // ── 禁 undefined 出现在类型里:全站 warn = 整改清单(2026-08-21 Frank「都不允许」)──
    // consult 与 db 已清零升 error(各自的块);其余按清单清,清完一个域升一个。
    files: REFACTORED,
    ignores: ['src/lib/consult/**', 'src/lib/db/**'],
    plugins: { local: localRules },
    rules: { 'local/no-undefined-type': 'warn' },
  },
  {
    // ── 边界收窄成语:全站 warn = 整改清单(2026-08-21,设计见 默认值架构 卷宗 §5)──
    // consult 已迁完(上面那块 error 守着);其余域按清单一点一点改,迁完一个升一个 error。
    files: REFACTORED,
    ignores: ['src/lib/consult/**'],
    plugins: { local: localRules },
    rules: { 'local/no-inline-coercion': 'warn' },
  },
  {
    // ── 测试是例外,而且只有测试(2026-08-18 拆 lib/chat 时立)──────────────────
    // 判定层的测试要测的**就是模块内部的判定件**(穷举输入断言性质,见 verdictAnswer/guards 那批用例):
    // lib/chat 对外 76 个名字里 66 个只有测试在用。两条路只能选一条 ——
    //   ① 桶把这 66 个也导出:桶就不再是「看一眼知道对外是什么」,这条约定当场作废;
    //   ② 测试直接点文件:桶保持 23 个生产契约,内部件只有测试够得着。
    // 选②。测试不是运行时消费者,它绕过桶**不会**让生产代码的对外面失控;反过来才会。
    files: ['tests/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    ignores: ['.next/', 'src/payload-types.ts', 'src/payload-generated-schema.ts'],
  },
]

export default eslintConfig
