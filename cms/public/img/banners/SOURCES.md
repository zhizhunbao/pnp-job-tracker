# 模块 banner 图来源(2026-07-19,设计总表 mockups/模块banner-设计总表.html;统一裁 1280×300)

省图裁切版 ← ../regions/(出处见 regions/SOURCES.md):
- jobs-1 ← on.jpg(多伦多夜景)/ jobs-2 ← bc.jpg(温哥华)
- pathways-1 ← federal.jpg(国会山)
- rank-2 ← mb.jpg(温尼伯)/ rank-3 ← qc.jpg(芳堤娜古堡)
- stats-1 ← ab.jpg(梦莲湖)/ stats-2 ← sk.jpg(萨省议会)/ stats-3 ← ns.jpg(佩姬湾灯塔)

新下载(Wikimedia Commons,Special:FilePath 1600px):
- jobs-3 ← File:Downtown Calgary 2020-3.jpg(卡尔加里天际线)
- pathways-2 ← File:Pier 21 2010 1.JPG(哈利法克斯 Pier 21 移民博物馆)
- pathways-3 ← File:Air Canada Boeing 777-200LR Toronto takeoff.jpg(加航起飞)
- rank-1 ← File:Foggy skyscrapers (Unsplash).jpg(雾中高楼仰视)

许可以各 Commons 文件页为准;展示层致谢=img title 悬停(画面无水印,Frank 2026-07-18 拍板)。
换图=同名覆盖 jpg;缺图/加载失败前端自动退浅色渐变带(PageBanner 兜底态)。

home(L1-01 landing 首屏,2026-07-30):不新增下载,复用既有三张 —— pathways-2(Pier 21 移民博物馆)/
jobs-1(多伦多夜景)/ stats-3(佩姬湾灯塔);出处同上。要换专属图改 primitives.tsx 的 BANNER_IMGS.home。

2026-09-05 /fe banner(Frank「各板块首图重复」→ 下载专属图;「雇主页现在没有 banner」→ 新开雇主组):
同法 Special:FilePath 1600px 取图,统一裁 1280×300;license 与作者照 Commons extmetadata 抄录。
- news-1 ← File:DSC02758 - Supreme Court of Canada (44891560021).jpg(CC BY-SA 2.0,Dennis G. Jarvis)
- news-2 ← File:Rideau Canal skating 6548.jpg(CC0,Ahunt)
- news-3 ← File:OttawaPanorama2017.jpg(CC BY-SA 4.0,Harleyd613)
- library-1 ← File:Toronto Reference Library (01560).jpg(CC BY-SA 4.0,Rhododendrites)
- library-2 ← File:Vancouver Public Central Library (37319131610).jpg(CC BY 2.0,GoToVan from Vancouver, Canada)
- library-3 ← File:Halifax Central Library (40843345493).jpg(CC BY 2.0,Paulo O from Halifax, Canada)
- employers-1 ← File:Financial District May 2010.jpg(CC BY 2.0,mark.watmough from Edinburgh, UK)
- employers-2 ← File:Bankers Hall Calgary. (13440087335).jpg(CC0,Bernard Spragg. NZ from Christchurch, Ne)
- employers-3 ← File:Coal Harbour, Vancouver (470065) (9441357251).jpg(CC BY 2.0,Robert Linsdell from St. Andrews, Canada)
home 组改用 stats-1/2/3(/stats 路由退役后空着的三张),不新增下载;news 三张旧复用图路径退役。
