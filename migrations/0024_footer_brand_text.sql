-- 页脚品牌署名与 UnUseDomain 保持一致。
UPDATE site_settings
SET copyright_text = '© 2026 UnUseDomain. All rights reserved.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
