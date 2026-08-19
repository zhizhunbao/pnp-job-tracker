// eslint-config-next 16 起**自己就是 flat config**(exports 里 ./core-web-vitals、./typescript 各导出一个数组)。
// 原来经 FlatCompat.extends('next/…') 走 eslintrc 兼容层去加载它,拿到的是 flat 数组、喂给 eslintrc 的
// 校验器 → 校验失败 → 报错格式化里 JSON.stringify 撞上 plugins.react 的循环引用,**整个 eslint 直接崩**
// (`TypeError: Converting circular structure to JSON`,随便 lint 哪个文件都一样)。
// 后果不是「少了几条警告」,而是这道闸事实上一直是空的:算完不用的变量、撤功能留下的死代码,
// 全靠人肉发现(2026-08-11 实撞两处)。改成直接摊平 flat 配置,不再过兼容层。
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

// 带桶的模块(`lib/<名>/index.ts`)—— 下面那道边界闸认这几个,加新桶就加这里一行。
const BARRELS = ['chat', 'i18n', 'jobs', 'pathways', 'quiz', 'score', 'verdict', 'employers', 'plan', 'stats', 'quota', 'llm', 'resume']
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
