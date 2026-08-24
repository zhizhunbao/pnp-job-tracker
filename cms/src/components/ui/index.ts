// ui/ 聚类过渡桶(2026-08-24 起解散中,Frank「每个组件都拆的可复用,按我的规范来」):
// 迁出成域的件在这**转发**(将死的依赖幸存的),消费端 import 最后一批机械切换到各域桶;
// 全部迁完本目录删除。还没迁的:Banner。
export { UI, gradeColor } from '../colors'
export { Button } from '../button'
export { Card, CardKV, CardAction, ProCard, LockedRows, JobCard } from '../card'
export type { CardLink } from '../card'
export { Grid } from '../grid'
export { Row } from '../row'
export { Chip, chipStyle } from '../chip'
export { Tag } from '../tag'
export { Notice } from '../notice'
export { Banner, BANNER_IMGS } from './Banner'
export { Pager } from '../pager'
export { Tabs, TabPanel, SectionTabs } from '../tabs'
export type { TabItem } from '../tabs'
export { Shell } from '../shell'
export { Title } from '../title'
export { BackLink, goBackOr } from '../backlink'
