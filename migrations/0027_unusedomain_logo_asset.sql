UPDATE site_settings
SET logo_url = '/unusedomain-logo.png',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
