-- #290 公共部门漏标回写(人审过:PUB 补 forces 词 + 快照保鲜后新增 4 家,幂等)
UPDATE companies SET sector = 'public' WHERE slug = 'canadian-forces-morale-and-welfare-services' AND (sector IS NULL OR sector = '');
UPDATE companies SET sector = 'public' WHERE slug = 'canadian-forces-morale-and-welfare-services-cfmws' AND (sector IS NULL OR sector = '');
UPDATE companies SET sector = 'public' WHERE slug = 'canadian-forces-non-public-funds' AND (sector IS NULL OR sector = '');
UPDATE companies SET sector = 'public' WHERE slug = 'horizon-health-network' AND (sector IS NULL OR sector = '');
