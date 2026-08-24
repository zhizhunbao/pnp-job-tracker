// ui/ 桶文件 —— 外部一律 `import { X } from './index'`,不直接点文件。
// 命名规矩(2026-08-17 Frank 立):**文件名用单词**(Button/Card/Table/Tabs/Tag/Chip/Notice/Banner/Page),
// **同一类东西放同一个文件**(Card.tsx 装白卡壳、键值区、职位卡、升级卡;Tabs.tsx 装选项卡与二级 tab 条)。
// 原来那个装了十样东西的 primitives.tsx 已退役(它按抽象层级命名,看名字不知道里面有什么)。
export { UI, gradeColor } from './colors'
export { Button } from './Button'
export { Card, CardKV, CardAction, ProCard, LockedRows, JobCard } from './Card'
export type { CardLink } from './Card'
export { Grid } from './Grid'
export { Row } from './Row'
export { Chip, chipStyle } from './Chip'
export { Tag } from './Tag'
export { Notice } from './Notice'
export { Banner, BANNER_IMGS } from './Banner'
export { Pager } from './Pager'
export { Tabs, TabPanel, SectionTabs } from './Tabs'
export type { TabItem } from './Tabs'
export { Shell } from './Shell'
export { Title } from './Title'
export * from './Icons'
export { BackLink, goBackOr } from './BackLink'
