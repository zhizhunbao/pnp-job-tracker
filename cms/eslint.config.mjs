// eslint-config-next 16 起**自己就是 flat config**(exports 里 ./core-web-vitals、./typescript 各导出一个数组)。
// 原来经 FlatCompat.extends('next/…') 走 eslintrc 兼容层去加载它,拿到的是 flat 数组、喂给 eslintrc 的
// 校验器 → 校验失败 → 报错格式化里 JSON.stringify 撞上 plugins.react 的循环引用,**整个 eslint 直接崩**
// (`TypeError: Converting circular structure to JSON`,随便 lint 哪个文件都一样)。
// 后果不是「少了几条警告」,而是这道闸事实上一直是空的:算完不用的变量、撤功能留下的死代码,
// 全靠人肉发现(2026-08-11 实撞两处)。改成直接摊平 flat 配置,不再过兼容层。
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

// 带桶的模块(`lib/<名>/index.ts`)—— 下面那道边界闸认这三个,加新桶就加这里一行。
const BARRELS = ['chat', 'i18n', 'jobs', 'pathways', 'quiz']
const ABSOLUTE = BARRELS.map((m) => `**/lib/${m}/*`)
// jobs 是唯一有**两个门**的模块(index=客户端也安全的那半、server=要连库的那半;
// 理由见 lib/jobs/index.ts 顶上那段:混着 payload 依赖的桶会把连接池打进浏览器包)。
// 🔴 放行必须排在整个 group 的**最后** —— 同组内后面的模式覆盖前面的,
//    夹在中间会被后来的相对模式重新拦住(实撞:tools.ts/quizTop.ts/scoreTables.ts 三处照旧报错)。
const ALLOW = ['!**/lib/jobs/server', '!./jobs/server', '!../jobs/server']
const SIBLING = BARRELS.flatMap((m) => [`./${m}/*`, `../${m}/*`])
const barrelOnly = (group) => ({
  'no-restricted-imports': [
    'error',
    { patterns: [{ group, message: '从桶取:@/lib/i18n 而不是 @/lib/i18n/chat。桶没转发的名字,去桶的 index.ts 补一行转发。' }] },
  ],
})

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
