-- 品牌统一为 UnUseDomain；仅精确匹配历史品牌值，不覆盖其他管理员内容。
UPDATE site_settings
SET site_name = 'UnUseDomain', updated_at = CURRENT_TIMESTAMP
WHERE site_name IN ('DOMAIN HUNTER', 'DomainHunter', 'domain hunter', 'WanMi', '玩米');

UPDATE site_settings
SET copyright_text = '© 2026 UnUseDomain. All rights reserved.', updated_at = CURRENT_TIMESTAMP
WHERE copyright_text IN ('@ DOMAIN HUNTER', '© DOMAIN HUNTER', '@DOMAIN HUNTER', '© WanMi · 玩米');
