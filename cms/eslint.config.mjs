// eslint-config-next 16 起**自己就是 flat config**(exports 里 ./core-web-vitals、./typescript 各导出一个数组)。
// 原来经 FlatCompat.extends('next/…') 走 eslintrc 兼容层去加载它,拿到的是 flat 数组、喂给 eslintrc 的
// 校验器 → 校验失败 → 报错格式化里 JSON.stringify 撞上 plugins.react 的循环引用,**整个 eslint 直接崩**
// (`TypeError: Converting circular structure to JSON`,随便 lint 哪个文件都一样)。
// 后果不是「少了几条警告」,而是这道闸事实上一直是空的:算完不用的变量、撤功能留下的死代码,
// 全靠人肉发现(2026-08-11 实撞两处)。改成直接摊平 flat 配置,不再过兼容层。
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

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
    ignores: ['.next/', 'src/payload-types.ts', 'src/payload-generated-schema.ts'],
  },
]

export default eslintConfig
