"""
fsa 域:「FSA(邮编前三位)→ 区」维度表 —— GeoNames 加拿大邮编开放数据建,我们自己维护,
无外部 API/限速。GeoNames 给到社区级:K2K→"Kanata (Beaverbrook / South March)";
04c 据此洗区(district = main≠城市 ? main : hood,判定在 04c)。

**手动域,无 META**:GeoNames 源偶尔更新,手动重跑;auto_update 只调度声明了 META
且 role 匹配的域,无 META 即不进任何角色容器。IN 的 CA.txt 是手动下载落位的
(https://download.geonames.org/export/zip/CA.zip,免费)。
"""
