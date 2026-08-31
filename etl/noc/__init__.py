"""
noc 域:NOC 2021 官方分类 —— 抓 StatCan 两张开放 CSV(层级 structure / 职责 elements)
+ 分类法单一来源库(teer/broad/mid/fine,08/09/10/11/employers 消费)。

沿革:2026-08-31 Frank 拍板「noc 就叫 noc」—— 原 noc_facts/ 两个步骤文件与根上
noc.py / noc_buckets.py 两库并为本域(同名包遮蔽同名模块,库必须随迁)。
本域在形制闸 INFRA 名单里(基础设施叶:换掉它业务一个字不用改),域可引。

**手动域,无 META**:官方 NOC 分类一年不动几次,两个步骤只在官方改版时手动重跑
(auto_update 只调度声明了 META 且 role 匹配的域,无 META 即不进任何角色容器);
产物 structure.json / descriptions.json 被 noc 库与 09 只读消费,新鲜度哨兵的
source_manifest 也不含本域文件。
"""
