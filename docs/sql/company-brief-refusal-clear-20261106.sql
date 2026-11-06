-- 2026-11-06 清掉「查不到」写成的公司简介(Frank 截图 Private Home 的主营业务是「The provided search results do not contain information…」)。
-- 来路:cms 联网现查(lib/employers investigate)时模型没回 NOT_FOUND,在 [WHAT] 节写了一句「给的材料里查不到」,被当简介存库;
-- 11-06 起 investigate 用 BRIEF_REFUSAL_RE 拒收同类回答(cms/src/lib/employers/constants.ts),本文件清存量,判据与它同一条。
-- 清法:简介、出处、简介里带出的官网、中韩译文一起置空(译文对的是这句胡话);官网 / 总部 / 名字不动。人工核定过的(curated)不碰。
-- 置空后:板上主营业务显示「—」;被雇主板列出过、有公司页、不是人名的,下一轮由官网队列的工人补(findsite / visit 取活认「简介为空」)。
-- 11-06 只读预查:命中 510 行,curated 0 行,抽查全是这类(大半是人名)。幂等:再跑一次命中 0 行。
UPDATE companies
   SET ai_brief = NULL, ai_sources = NULL, ai_website = NULL, ai_brief_zh = NULL, ai_brief_ko = NULL
 WHERE ai_brief ~* '\[WHAT\][:\s]*(based on the (provided |available )?(web )?(search results?|text|information)[,\s]*)?(the (provided|given|available) (web )?(search results?|text|input|information|reference|sources?|content) |the (web )?search results? |there (is|are) (no|insufficient|not enough) |no (specific |relevant |public |publicly available )?(information|company|business|details|data) |i (cannot|can[''’]t|could not|couldn[''’]t|was unable|am unable) |unable to )'
   AND COALESCE(website_source, '') <> 'curated';
