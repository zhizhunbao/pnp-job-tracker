-- 联邦 Corporations Canada 官方成立日回写(2026-08-10,Frank「那 49 家成立日落库吧」)
-- 来源:官方免费 JSON 端点 activities[].activity='Incorporation' 的 date
--   https://www.ic.gc.ca/app/scr/cc/CorporationsCanada/api/corporations/<corpnum>.json?lang=eng
-- 口径:只收 Incorporation(成立)一种活动;Amalgamation/Continuance(合并/迁入)本轮不收(Frank 未拍)。
--   founded_src 从 'ai'(估算)升为 'corporations-canada'(官方硬数据),证据等级随之提升。
-- 归属:白名单外 + SQL 回写,同 emp-eligibility-facts-data.sql 惯例;seed 的 companyCols 不含这两列,
--   增量对账/换版不会覆盖。幂等:重复执行结果相同。
-- 本文件 49 家 = 新增 7 · 纠正 2 · 印证 40(印证家的 year 不变,仅升 founded_src)

BEGIN;
-- 7-Eleven Canada Inc. | corp 599379 | 1967-10-20 | 纠正 AI=1969
UPDATE companies SET founded_year = 1967, founded_src = 'corporations-canada' WHERE slug = '7-eleven-canada-inc';
-- AAR KAY Tax Consultants Ltd. | corp 10960888 | 2018-08-24 | 印证
UPDATE companies SET founded_year = 2018, founded_src = 'corporations-canada' WHERE slug = 'aar-kay-tax-consultants-ltd';
-- Accurate Indigenous Managers & Advisors | corp 14564341 | 2022-11-29 | 印证
UPDATE companies SET founded_year = 2022, founded_src = 'corporations-canada' WHERE slug = 'accurate-indigenous-managers-advisors';
-- AIM1221 TECH SOLUTIONS INC. | corp 14134494 | 2022-06-16 | 印证
UPDATE companies SET founded_year = 2022, founded_src = 'corporations-canada' WHERE slug = 'aim1221-tech-solutions-inc';
-- Appelt's Diamonds | corp 4395743 | 2006-12-08 | 新增
UPDATE companies SET founded_year = 2006, founded_src = 'corporations-canada' WHERE slug = 'appelt-s-diamonds';
-- AR HOME RENOVATION AND CONSTRUCTION INC. | corp 13947521 | 2022-04-12 | 印证
UPDATE companies SET founded_year = 2022, founded_src = 'corporations-canada' WHERE slug = 'ar-home-renovation-and-construction-inc';
-- Black River Logistics ltd | corp 12302977 | 2020-08-28 | 印证
UPDATE companies SET founded_year = 2020, founded_src = 'corporations-canada' WHERE slug = 'black-river-logistics-ltd';
-- Brisk Drywall Ltd. | corp 14184319 | 2022-07-05 | 印证
UPDATE companies SET founded_year = 2022, founded_src = 'corporations-canada' WHERE slug = 'brisk-drywall-ltd';
-- Brown's Plus+ Inc. | corp 15373352 | 2023-09-19 | 印证
UPDATE companies SET founded_year = 2023, founded_src = 'corporations-canada' WHERE slug = 'brown-s-plus-inc';
-- CHASE GLOBAL IMMIGRATION INC. | corp 12512564 | 2020-11-22 | 印证
UPDATE companies SET founded_year = 2020, founded_src = 'corporations-canada' WHERE slug = 'chase-global-immigration-inc';
-- Conquer Transport Inc | corp 10385301 | 2017-08-29 | 印证
UPDATE companies SET founded_year = 2017, founded_src = 'corporations-canada' WHERE slug = 'conquer-transport-inc';
-- CTOMS Inc | corp 6373879 | 2005-04-07 | 印证
UPDATE companies SET founded_year = 2005, founded_src = 'corporations-canada' WHERE slug = 'ctoms-inc';
-- DealFinder Auctions | corp 16679111 | 2025-01-20 | 印证
UPDATE companies SET founded_year = 2025, founded_src = 'corporations-canada' WHERE slug = 'dealfinder-auctions';
-- DMM ENERGY INC | corp 12197120 | 2020-07-14 | 印证
UPDATE companies SET founded_year = 2020, founded_src = 'corporations-canada' WHERE slug = 'dmm-energy-inc';
-- Empirica Infrastructure Inc. | corp 6991246 | 2008-06-09 | 印证
UPDATE companies SET founded_year = 2008, founded_src = 'corporations-canada' WHERE slug = 'empirica-infrastructure-inc';
-- ESTEEM DRYWALL LTD. | corp 15496918 | 2023-11-02 | 印证
UPDATE companies SET founded_year = 2023, founded_src = 'corporations-canada' WHERE slug = 'esteem-drywall-ltd';
-- EXSERSOL INC | corp 11651382 | 2019-09-27 | 印证
UPDATE companies SET founded_year = 2019, founded_src = 'corporations-canada' WHERE slug = 'exsersol-inc';
-- Firm Formwork Limited | corp 14850092 | 2023-03-15 | 印证
UPDATE companies SET founded_year = 2023, founded_src = 'corporations-canada' WHERE slug = 'firm-formwork-limited';
-- GSK PLUMBING LTD. | corp 9030565 | 2014-09-24 | 印证
UPDATE companies SET founded_year = 2014, founded_src = 'corporations-canada' WHERE slug = 'gsk-plumbing-ltd';
-- KEELINGPILLARCRAFT CONSTRUCTION INC | corp 16716407 | 2025-02-02 | 印证
UPDATE companies SET founded_year = 2025, founded_src = 'corporations-canada' WHERE slug = 'keelingpillarcraft-construction-inc';
-- Keysoft Technologies Inc. | corp 8604878 | 2013-08-12 | 印证
UPDATE companies SET founded_year = 2013, founded_src = 'corporations-canada' WHERE slug = 'keysoft-technologies-inc';
-- NEW DREAM LANDSCAPING LTD. | corp 12207354 | 2020-07-18 | 印证
UPDATE companies SET founded_year = 2020, founded_src = 'corporations-canada' WHERE slug = 'new-dream-landscaping-ltd';
-- NutraSun Foods Ltd. | corp 4141890 | 2003-01-31 | 印证
UPDATE companies SET founded_year = 2003, founded_src = 'corporations-canada' WHERE slug = 'nutrasun-foods-ltd';
-- Orbit Exteriors Inc. | corp 10091456 | 2017-02-03 | 新增
UPDATE companies SET founded_year = 2017, founded_src = 'corporations-canada' WHERE slug = 'orbit-exteriors-inc';
-- PATHFINDER TRUCK AND TRAILER REPAIR INC | corp 15808791 | 2024-02-26 | 印证
UPDATE companies SET founded_year = 2024, founded_src = 'corporations-canada' WHERE slug = 'pathfinder-truck-and-trailer-repair-inc';
-- Pioneer Trucking Solutions | corp 11620673 | 2019-09-11 | 印证
UPDATE companies SET founded_year = 2019, founded_src = 'corporations-canada' WHERE slug = 'pioneer-trucking-solutions';
-- Pulsify Canada Inc. | corp 11014013 | 2018-09-26 | 印证
UPDATE companies SET founded_year = 2018, founded_src = 'corporations-canada' WHERE slug = 'pulsify-canada-inc';
-- Rapid Motors | corp 16174949 | 2024-07-02 | 新增
UPDATE companies SET founded_year = 2024, founded_src = 'corporations-canada' WHERE slug = 'rapid-motors';
-- Raykeen Auto Ltd. | corp 17639031 | 2026-01-22 | 印证
UPDATE companies SET founded_year = 2026, founded_src = 'corporations-canada' WHERE slug = 'raykeen-auto-ltd';
-- SAI Sustainable Services Inc. | corp 16202462 | 2024-07-11 | 印证
UPDATE companies SET founded_year = 2024, founded_src = 'corporations-canada' WHERE slug = 'sai-sustainable-services-inc';
-- SANSHTECH INC. | corp 13796442 | 2022-02-21 | 印证
UPDATE companies SET founded_year = 2022, founded_src = 'corporations-canada' WHERE slug = 'sanshtech-inc';
-- Sidhu Bros Logistics Inc | corp 12482282 | 2020-11-09 | 印证
UPDATE companies SET founded_year = 2020, founded_src = 'corporations-canada' WHERE slug = 'sidhu-bros-logistics-inc';
-- Spruce Lane Potatoes Inc. | corp 4090730 | 2002-07-02 | 印证
UPDATE companies SET founded_year = 2002, founded_src = 'corporations-canada' WHERE slug = 'spruce-lane-potatoes-inc';
-- Symbicore Inc. | corp 8704066 | 2013-11-21 | 印证
UPDATE companies SET founded_year = 2013, founded_src = 'corporations-canada' WHERE slug = 'symbicore-inc';
-- Taza Township Inc. | corp 17824629 | 2026-04-02 | 印证
UPDATE companies SET founded_year = 2026, founded_src = 'corporations-canada' WHERE slug = 'taza-township-inc';
-- Tradewalks Venture Ltd. | corp 13808815 | 2022-02-24 | 印证
UPDATE companies SET founded_year = 2022, founded_src = 'corporations-canada' WHERE slug = 'tradewalks-venture-ltd';
-- V4U Homes Ltd | corp 15064864 | 2023-05-28 | 印证
UPDATE companies SET founded_year = 2023, founded_src = 'corporations-canada' WHERE slug = 'v4u-homes-ltd';
-- VanyaIT Consulting Inc. | corp 16255183 | 2024-08-01 | 印证
UPDATE companies SET founded_year = 2024, founded_src = 'corporations-canada' WHERE slug = 'vanyait-consulting-inc';
-- Vcura Canada Incorporated | corp 7549547 | 2010-05-11 | 新增
UPDATE companies SET founded_year = 2010, founded_src = 'corporations-canada' WHERE slug = 'vcura-canada-incorporated';
-- Vilt Design Homes Ltd. | corp 12674599 | 2021-01-22 | 印证
UPDATE companies SET founded_year = 2021, founded_src = 'corporations-canada' WHERE slug = 'vilt-design-homes-ltd';
-- VINTAGE FRAMING LTD | corp 13546454 | 2021-11-25 | 印证
UPDATE companies SET founded_year = 2021, founded_src = 'corporations-canada' WHERE slug = 'vintage-framing-ltd';
-- Vision Loss Rehabilitation Canada | corp 10229423 | 2017-05-10 | 新增
UPDATE companies SET founded_year = 2017, founded_src = 'corporations-canada' WHERE slug = 'vision-loss-rehabilitation-canada';
-- Vkam Automation & Security Systems Ltd | corp 14582705 | 2022-12-08 | 印证
UPDATE companies SET founded_year = 2022, founded_src = 'corporations-canada' WHERE slug = 'vkam-automation-security-systems-ltd';
-- Watts Group Ltd. | corp 12904446 | 2021-04-07 | 新增
UPDATE companies SET founded_year = 2021, founded_src = 'corporations-canada' WHERE slug = 'watts-group-ltd';
-- WestSquare Immigration Services Ltd | corp 12941627 | 2021-04-19 | 印证
UPDATE companies SET founded_year = 2021, founded_src = 'corporations-canada' WHERE slug = 'westsquare-immigration-services-ltd';
-- WINSUN GROUP INC. | corp 11878026 | 2020-01-31 | 印证
UPDATE companies SET founded_year = 2020, founded_src = 'corporations-canada' WHERE slug = 'winsun-group-inc';
-- WiserAire | corp 15521904 | 2023-11-12 | 新增
UPDATE companies SET founded_year = 2023, founded_src = 'corporations-canada' WHERE slug = 'wiseraire';
-- ZENFRI Inc. | corp 7599170 | 2010-09-16 | 纠正 AI=2006
UPDATE companies SET founded_year = 2010, founded_src = 'corporations-canada' WHERE slug = 'zenfri-inc';
-- ZINITE CORPORATION | corp 13025616 | 2021-05-17 | 印证
UPDATE companies SET founded_year = 2021, founded_src = 'corporations-canada' WHERE slug = 'zinite-corporation';
COMMIT;
