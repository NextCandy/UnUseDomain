ALTER TABLE site_settings ADD COLUMN turnstile_site_key TEXT;
ALTER TABLE site_settings ADD COLUMN turnstile_secret_ref TEXT;
ALTER TABLE site_settings ADD COLUMN show_ip_card INTEGER NOT NULL DEFAULT 1 CHECK (show_ip_card IN (0, 1));
ALTER TABLE site_settings ADD COLUMN contact_whatsapp TEXT;
ALTER TABLE site_settings ADD COLUMN contact_x TEXT;
ALTER TABLE site_settings ADD COLUMN contact_xiaohongshu TEXT;
ALTER TABLE site_settings ADD COLUMN contact_qq TEXT;
