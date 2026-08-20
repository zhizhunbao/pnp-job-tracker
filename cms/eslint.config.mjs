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
const BARRELS = ['agent', 'chat', 'i18n', 'jobs', 'pathways', 'quiz', 'score', 'verdict', 'employers', 'plan', 'stats', 'quota', 'llm', 'resume']
const ABSOLUTE = BARRELS.map((m) => `**/lib/${m}/*`)
// jobs / score / verdict / employers / plan / quiz / stats / quota / pathways 有**两个门**(index=客户端也安全的那半、server=要连库的那半;
// 理由见 lib/jobs/index.ts 顶上那段:混着 payload 依赖的桶会把连接池打进浏览器包)。
// 每加一个 server 门,下面 ALLOW 里补三条(绝对 + 两种相对),否则模块自己的服务端半边被闸拦住。
// 🔴 放行必须排在整个 group 的**最后** —— 同组内后面的模式覆盖前面的,
//    夹在中间会被后来的相对模式重新拦住(实撞:tools.ts/quizTop.ts/scoreTables.ts 三处照旧报错)。
const ALLOW = [
  '!**/lib/jobs/server', '!./jobs/server', '!../jobs/server',
  '!**/lib/score/server', '!./score/server', '!../score/server',
  '!**/lib/verdict/server', '!./verdict/server', '!../verdict/server',
  '!**/lib/employers/server', '!./employers/server', '!../employers/server',
  '!**/lib/plan/server', '!./plan/server', '!../plan/server',
  '!**/lib/quiz/server', '!./quiz/server', '!../quiz/server',
  '!**/lib/stats/server', '!./stats/server', '!../stats/server',
  '!**/lib/quota/server', '!./quota/server', '!../quota/server',
  '!**/lib/pathways/server', '!./pathways/server', '!../pathways/server',
  '!**/lib/agent/server', '!./agent/server', '!../agent/server',
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
            '`{{ name }}` 的入参要同时满足两条:本域 `types.ts` 里声明,且叫 `{{ suggest }}In`。'
            + '库的类型(`Promise<…>` / `Model<…>` / `Error`)不是我们的契约,要先起个本地名字。',
          noReturn: '`{{ name }}` 没有写返回类型。显式写出来 —— 推断出来的返回类型会随实现悄悄变。',
          ret:
            '`{{ name }}` 的返回要同时满足两条:本域 `types.ts` 里声明,且叫 `{{ suggest }}Out`。'
            + '返回是这个函数的对外契约,契约要有我们自己的名字,不能借库的。',
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
        //    2026-08-20 Frank 追加:**后缀也约束** —— 光「是我们的类型」不够,还得叫 `XxxIn` / `XxxOut`。
        //    两条一起才拦得住两种漏法:借库的类型(Promise)、和拿一个恰好存在的领域类型顶上去
        //    (`SearchTool` 是我们的,但它是「一把工具」不是「searchTool 的返回契约」)。
        //    ⚠️ 「本域」有两种形态:带 `types.ts` 的目录(`lib/consult/`),
        //    和**单文件叶子**(`lib/error.ts` / `lib/log.ts` —— 它们的类型就写在自己文件里)。
        //    只查目录的 types.ts 会把单文件叶子的 `LogIn` / `LogOut` 也判成外人(实测 16 条假阳性)。
        const declared = new Map()
        function typeNames(text) {
          return new Set(Array.from(text.matchAll(/^export type (\w+)/gm), (m) => m[1]))
        }
        function ours(ann, context, tail) {
          if (ann?.type !== 'TSTypeReference') return false
          const n = ann.typeName
          const name = n?.type === 'Identifier' ? n.name : ''
          if (!name || !name.endsWith(tail)) return false
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
              if (!ours(p.typeAnnotation?.typeAnnotation, context, 'In')) {
                context.report({ node: p, messageId: 'param', data: { name, suggest } })
              }
            }
            if (!node.returnType) {
              context.report({ node, messageId: 'noReturn', data: { name, suggest } })
              return
            }
            if (!ours(node.returnType.typeAnnotation, context, 'Out')) {
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
        function documented(node) {
          const before = src.getCommentsBefore(node)
          const doc = before[before.length - 1]
          return Boolean(doc) && doc.type === 'Block' && doc.value.startsWith('*')
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
            // 只管**导出的常量表**里的键:函数里就地拼的对象不在此列(它是实现细节,不是约定)
            let p = node.parent
            let depth = 0
            while (p && depth < 6) {
              if (p.type === 'ExportNamedDeclaration') break
              if (p.type === 'FunctionDeclaration' || p.type === 'ArrowFunctionExpression') return
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
          variable: '`functions.ts` 顶层只许有 function。`{{ name }}` 是变量 —— 标量/表/正则去 `constants.ts`,形状去 `types.ts`。',
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
            const before = src.getCommentsBefore(anchor)
            const doc = before[before.length - 1]
            if (!doc || doc.type !== 'Block' || !doc.value.startsWith('*')) return
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
            if (typeof node.value !== 'string' || node.value === '') return
            const p = node.parent
            if (p?.type === 'ImportDeclaration' || p?.type === 'ExportNamedDeclaration') return
            if (p?.type === 'Property' && p.key === node) return
            if (p?.type === 'MemberExpression' && p.property === node) return
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
            const before = src.getCommentsBefore(node)
            const doc = before[before.length - 1]
            const ok = doc && doc.type === 'Block' && doc.value.startsWith('*')
            if (!ok) context.report({ node, messageId: 'missing', data: { name } })
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
    files: ['src/lib/consult/**/*.ts', 'src/lib/ruling/**/*.ts', 'src/lib/agent/**/*.ts', 'src/lib/llm/**/*.ts', 'src/lib/error.ts', 'src/lib/log.ts'],
    plugins: { local: localRules },
    rules: {
      // 注释的形状
      'local/doc-multiline': 'error',
      'local/no-section-dashes': 'error',
      'local/doc-every-export': 'error',
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
      // 这两条内置规则够用,不自己造:全局是 warn(存量欠账本),定型域收紧成 error
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
    },
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
