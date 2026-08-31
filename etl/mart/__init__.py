"""mart 域:跨源汇装层 —— 回答「mart 怎么建」(raw → clean → **mart** → load 的第三格)。

清洗好的各源在这里拼成「列和 DB 表一一对应」的最终表:评分 → mart 主表 → 榜单 → 统计。
档位库 grades(E12-08 职位三维 + 公司四维)与身份预筛 visa_flag(GAP1③)是本域私件
(唯一消费者都在汇装段,2026-08-31 批H 随域收编,自根上基础设施白名单摘出)——
同日批I 全溶后它们不再是文件,各成 functions.py 的一段(第 2/3 段档位、第 4 段红旗)。

**形制**:三件套 constants / scheme / functions + 门 main(2026-08-31 批I 全溶;原六个文件
——四个编号汇装件 + 两个私件库——一步一段收进 functions,段横幅三文件同名同序镜像 16 段)。

**本域不自带役**:无 META —— 汇装是 load 域 build 链按序点用的一段(谁的数据谁管的收口:
跨源汇装不归任何单源,归 mart;批H 拍板点见 docs/design/etl分域-20260829.md 8/10)。
入口 etl/mart/main.py,步骤清单在 main.py 的 SCHEDULED。
"""
