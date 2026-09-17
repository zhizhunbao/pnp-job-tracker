-- 公司简介坏译文清理(2026-09-17 Frank「清库 + 加检查」;一次性数据修复,幂等)
-- 现象:company 域 brief 步的本地模型时而把英文 / 法文原文原样交回,节标记齐全就被当成译文收了 ——
-- 生产库 ai_brief_zh 有 55 家一个汉字都没有(49 家与英文简介逐字相同,Cargill 实撞:中文对照开着却没有中文行),
-- ai_brief_ko 有 80 家没有韩文字。
-- 堵源头(同批代码):etl/company 译文要真有目标语种文字才收、坏的清空进补翻队列;etl/mart 没有目标语种文字的不进列;
-- cms employers/translate 懒翻过 translationOk 写入闸才缓存落库。⚠️ 先让 mart 新代码生效(restart build 容器)再跑本文件 ——
-- seed 对这两列是「mart 有值就覆盖」,mart 还带着坏译文时清了也会被下一轮整点批灌回来。
UPDATE companies SET ai_brief_zh = NULL WHERE ai_brief_zh IS NOT NULL AND ai_brief_zh <> '' AND ai_brief_zh !~ '[一-鿿]';
UPDATE companies SET ai_brief_ko = NULL WHERE ai_brief_ko IS NOT NULL AND ai_brief_ko <> '' AND ai_brief_ko !~ '[가-힣]';
