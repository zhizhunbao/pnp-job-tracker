# components 学名词表

`components/` 下每个目录是一个组件桶：一个目录加一个 `index.ts` 桶门，外面一律从桶门取。目录名只能从下表选。

- **选名顺序**：WAI-ARIA / HTML（W3C 标准）→ Microsoft Fluent 2（本站界面照微软）→ 其他主流组件库（Material UI、Radix、shadcn、Ant Design、Mantine）→ 业务名（最后一档，表里注明）
- **表里没有合适的**：先在表里补一行，写上名字、出处和公认含义，再建目录
- **检查**：ESLint 规则 `local/registered-domain` 读表格第一列，不在表里的目录在提交时会被拦下
- **缩写**：名字是缩写的，公认含义开头写「全称 …。」
- **在用**：✓ 表示本项目已经有这个目录
- **不改名**：现有目录照现名登记，改名另起一批

## WAI-ARIA / HTML（W3C 标准）

| 名字 | 出处 | 公认含义 | 在用 |
|---|---|---|---|
| `button` | HTML `<button>` / WAI-ARIA button | 全站统一按钮与返回钮 | ✓ |
| `footer` | HTML `<footer>` / WAI-ARIA contentinfo | 全站共用页脚 | ✓ |
| `header` | HTML `<header>` / WAI-ARIA banner | 全站唯一顶栏 | ✓ |
| `input` | HTML `<input>` | 通用文本框，外加全站输入件共用的尺寸档 | ✓ |
| `jsonld` | W3C JSON-LD 1.1 | 全称 JSON for Linking Data。JSON-LD 结构化数据脚本壳的唯一出口，数据各域自己拼 | ✓ |
| `search` | HTML `<input type="search">` / WAI-ARIA search | 搜索框：左边放大镜，有值时右边出清除钮 | ✓ |
| `select` | HTML `<select>` | 按内容量宽的下拉框 | ✓ |
| `table` | HTML `<table>` / WAI-ARIA table | 全站公共简单表 | ✓ |
| `tabs` | WAI-ARIA APG Tabs | 选项卡：横排页签、面板壳、模块二级页签条、竖排左栏 | ✓ |
| `time` | HTML `<time>` | 日期和时间的显示件，取值口径归 `lib/time` | ✓ |

## Microsoft Fluent 2

| 名字 | 出处 | 公认含义 | 在用 |
|---|---|---|---|
| `card` | Fluent 2 Card | 卡片积木：白卡、键值区、操作行、升级卡、打码锁区、职位卡等 | ✓ |
| `drawer` | Fluent 2 Drawer | 右侧编辑面板：从右边滑出的一页表单，标题、正文、底部钮，窄屏铺满整屏 | ✓ |
| `nav` | Fluent 2 Nav | 侧边导航：页面左边一列带图标的入口，窄屏收成从左边拉出的抽屉 | ✓ |
| `tag` | Fluent 2 Tag | 不可点的状态标签，外加已选标签一行 | ✓ |
| `toast` | Fluent 2 Toast | 右上角自动消失的提示 | ✓ |

## 其他主流组件库

| 名字 | 出处 | 公认含义 | 在用 |
|---|---|---|---|
| `chip` | Material UI Chip | 可点的筛选胶囊与选择格 | ✓ |
| `grid` | Material UI Grid、Mantine Grid | 事实网格：一批「标签-值」排成多列，列宽跨行对齐 | ✓ |
| `icons` | Material UI Icons | 全站唯一图标出口 | ✓ |
| `modal` | Material UI Modal、Mantine Modal | 全站弹框壳：遮罩、窗口形、关闭 | ✓ |
| `shell` | Mantine AppShell | 整页外框与正文轨 | ✓ |
| `timeline` | Material UI Timeline、Mantine Timeline | 政策时间线页正文 | ✓ |
| `title` | Mantine Title | 标题块：弹框标题与通用标题 | ✓ |

## 业务名（没有标准名时才用）

| 名字 | 出处 | 含义 | 在用 |
|---|---|---|---|
| `advisor` | 业务名 | 字段顾问：点表格里的一格，弹出这一格背后的事实 | ✓ |
| `apply` | 业务名 | 站内投递框：简历、求职信、预览、发送 | ✓ |
| `auth` | 业务名 | 全称 authentication（身份认证）。登录、注册、找回密码，外加头像与账户菜单 | ✓ |
| `banner` | 业务名 | 各模块统一页头横幅（渐变或配图），不是 WAI-ARIA 的 banner 地标 | ✓ |
| `cases` | 业务名 | 常见案例索引与处境详情两页正文 | ✓ |
| `chat` | 业务名 | 全站悬浮问答入口与问答面板 | ✓ |
| `city` | 业务名 | 城市详情页正文 | ✓ |
| `companies` | 业务名 | 公司详情页、公司弹框与卡片里的职位行 | ✓ |
| `css` | 业务名 | 全称 Cascading Style Sheets（层叠样式表）。拼 CSS 类名的小工具 | ✓ |
| `cv` | 业务名 | 全称 curriculum vitae（简历）。生成简历窗口，「我的简历」页与投递第 1 步共用 | ✓ |
| `employers` | 业务名 | 雇主板、雇主对比表与担保雇主卡片 | ✓ |
| `funnel` | 业务名 | 转化漏斗看板，只给管理员 | ✓ |
| `gate` | 业务名 | 访客门：未登录访客进站时的问题与注册屏 | ✓ |
| `guide` | 业务名 | 站内向导对话框，`chat` 挂件懒加载的那一半 | ✓ |
| `i18n` | 业务名 | 全称 internationalization（国际化；i 与 n 之间 18 个字母）。界面语言的客户端状态 | ✓ |
| `jobs` | 业务名 | 职位板与职位详情页 | ✓ |
| `jobtitle` | 业务名 | 职位名下面那行译名灰字：挑哪个、缺了去哪懒翻 | ✓ |
| `legal` | 业务名 | 关于页与法务三页共用的正文白卡 | ✓ |
| `loading` | 业务名 | 全站统一的「转圈加一句话」加载行 | ✓ |
| `majors` | 业务名 | 专业选择器：从 CIP 2021 全表里搜和挑专业 | ✓ |
| `me` | Microsoft Graph `/me` | 当前登录用户。「我的」页的框架：左侧导航、页标题、各页内容的摆放 | ✓ |
| `name` | 业务名 | 名字两行：英文黑字在上、译名灰字在下，外加地点一行 | ✓ |
| `news` | 业务名 | 移民动态列表与单条详情 | ✓ |
| `notice` | 业务名 | 提醒框 | ✓ |
| `notify` | 业务名 | 顶栏通知铃铛 | ✓ |
| `occupations` | 业务名 | 紧缺职业清单页正文 | ✓ |
| `og` | 业务名 | 全称 Open Graph。分享卡片图（Open Graph）的版式，芯从 `server` 门出 | ✓ |
| `pager` | 业务名 | 翻页行，外加清单「展开 20、收起」 | ✓ |
| `pdf` | ISO 32000（PDF） | 全称 Portable Document Format。用 pdf.js 把 PDF 原件逐页画出来、翻页、缩放；「我的简历」预览框与投递框共用 | ✓ |
| `pane` | 业务名 | 弹框白卡里的定高区，外加选择器的竖排外层 | ✓ |
| `peek` | 业务名 | 职位框和公司框的全站宿主 | ✓ |
| `plan` | 业务名 | 决策页：答题后三项判定 | ✓ |
| `pnp` | 业务名 | 全称 Provincial Nominee Program（省提名项目）。省提名与联邦 EE 的事实区块：通道、抽选、职业类别、匹配判定 | ✓ |
| `pricing` | 业务名 | 定价页、价卡、升级弹框与打码锁区 | ✓ |
| `profile` | 业务名 | 移民档案：档案表单、建档向导与点选项表 | ✓ |
| `pte` | 业务名 | 全称 Pearson Test of English。PTE 刷题的题单页、单题页与取数 | ✓ |
| `queue` | 业务名 | 管理员队列页：调度单元、待发投递、官网抓取与译名翻译 | ✓ |
| `quiz` | 业务名 | 答题公共件：答案读写、职业与省份挑选器、答题卡原件 | ✓ |
| `rankings` | 业务名 | 榜单页正文 | ✓ |
| `resources` | 业务名 | 官方资料索引页正文 | ✓ |
| `resume` | 业务名 | 简历对照职位要求的弹框 | ✓ |
| `row` | 业务名 | 事实行：一条「标签-值」，标签定宽让多行的值对齐 | ✓ |
| `start` | 业务名 | 就业把脉首页正文与服务端取数 | ✓ |
| `stats` | 业务名 | 全称 statistics（统计）。就业把脉的行情主图与取数钩子 | ✓ |
| `streams` | 业务名 | 「通道与门槛」「申请步骤」两页的外壳与省份胶囊 | ✓ |
| `verdict` | 业务名 | 三合一判定区（联邦 EE、省提名、雇主担保）与申请人条件格子 | ✓ |

## References

- World Wide Web Consortium. (2023). *Accessible Rich Internet Applications (WAI-ARIA) 1.2*. <https://www.w3.org/TR/wai-aria-1.2/>
- W3C Web Accessibility Initiative. (n.d.). *ARIA Authoring Practices Guide: Patterns*. <https://www.w3.org/WAI/ARIA/apg/patterns/>
- WHATWG. (n.d.). *HTML Living Standard*. <https://html.spec.whatwg.org/multipage/>
- World Wide Web Consortium. (2020). *JSON-LD 1.1*. <https://www.w3.org/TR/json-ld11/>
- Microsoft. (n.d.). *Fluent 2 Design System*. <https://fluent2.design/>
- MUI. (n.d.). *Material UI: All components*. <https://mui.com/material-ui/all-components/>
- Mantine. (n.d.). *Mantine: React components library*. <https://mantine.dev/>
