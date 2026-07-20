-- 将现有生产数据与静态品牌资源统一为 UnUseDomain。
-- 联系方式、展示密度、精品排序与主题色等管理员设置保持不变。
UPDATE site_settings
SET site_name = 'UnUseDomain',
    site_description = 'Unused Domains List',
    logo_url = '/unusedomain-logo.png',
    favicon_url = '/favicon-32x32.png',
    copyright_text = '© 2026 UnUseDomain. All rights reserved.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
