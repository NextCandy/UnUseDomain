PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_algorithm TEXT NOT NULL,
  password_iterations INTEGER NOT NULL CHECK (password_iterations >= 100000),
  password_version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL,
  password_version INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_hash TEXT,
  user_agent TEXT,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  success INTEGER NOT NULL CHECK (success IN (0, 1)),
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_window ON auth_login_attempts(email_hash, ip_hash, attempted_at);

CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_domain TEXT NOT NULL,
  normalized_domain TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tld TEXT NOT NULL,
  category TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_listed INTEGER NOT NULL DEFAULT 1 CHECK (is_listed IN (0, 1)),
  public_price TEXT,
  public_price_currency TEXT,
  public_price_approved INTEGER NOT NULL DEFAULT 0 CHECK (public_price_approved IN (0, 1)),
  notes TEXT,
  source TEXT NOT NULL,
  source_imported_at TEXT,
  registrar_account_id INTEGER,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registrar_account_id) REFERENCES registrar_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_domains_public_sort ON domains(is_listed, is_featured DESC, name, normalized_domain);
CREATE INDEX IF NOT EXISTS idx_domains_tld ON domains(tld, is_listed);
CREATE INDEX IF NOT EXISTS idx_domains_category ON domains(category, is_listed);

CREATE TABLE IF NOT EXISTS domain_marketplace_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL,
  source_name TEXT NOT NULL,
  source_file TEXT NOT NULL,
  buy_now_price TEXT,
  floor_price TEXT,
  min_offer TEXT,
  price_currency TEXT,
  lease_to_own INTEGER,
  max_lease_period INTEGER,
  sale_lander TEXT,
  show_buy_now_option INTEGER,
  show_lease_to_own_option INTEGER,
  show_make_offer_option INTEGER,
  hidden INTEGER,
  listing_status TEXT,
  fast_transfer TEXT,
  views INTEGER,
  leads INTEGER,
  unique_searches_30d INTEGER,
  unique_searches_90d INTEGER,
  unique_searches_365d INTEGER,
  total_searches_30d INTEGER,
  total_searches_90d INTEGER,
  total_searches_365d INTEGER,
  godaddy_ns TEXT,
  date_added_at TEXT,
  raw_metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
  UNIQUE (domain_id, source_name)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_status ON domain_marketplace_listings(listing_status);

CREATE TABLE IF NOT EXISTS registrar_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  credential_iv TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unverified',
  last_tested_at TEXT,
  last_synced_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dns_records_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL,
  provider_record_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  ttl INTEGER,
  priority INTEGER,
  proxied INTEGER CHECK (proxied IN (0, 1)),
  last_synced_at TEXT NOT NULL,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
  UNIQUE (domain_id, provider_record_id)
);

CREATE INDEX IF NOT EXISTS idx_dns_domain ON dns_records_cache(domain_id);

CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  site_name TEXT NOT NULL,
  site_description TEXT NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  accent_color TEXT NOT NULL,
  display_density TEXT NOT NULL,
  featured_first INTEGER NOT NULL CHECK (featured_first IN (0, 1)),
  show_prices INTEGER NOT NULL CHECK (show_prices IN (0, 1)),
  copyright_text TEXT,
  icp_number TEXT,
  contact_email TEXT,
  contact_wechat TEXT,
  contact_telegram TEXT,
  wechat_qr_url TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO site_settings (
  id, site_name, site_description, accent_color, display_density, featured_first, show_prices
) VALUES (
  1, 'UnUseDomain', 'Unused Domains List', '#133429', 'comfortable', 1, 0
);

CREATE TABLE IF NOT EXISTS notification_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  reminder_days_json TEXT NOT NULL,
  email_enabled INTEGER NOT NULL CHECK (email_enabled IN (0, 1)),
  telegram_enabled INTEGER NOT NULL CHECK (telegram_enabled IN (0, 1)),
  bark_enabled INTEGER NOT NULL CHECK (bark_enabled IN (0, 1)),
  email_recipient TEXT,
  telegram_chat_id TEXT,
  bark_device_key_encrypted TEXT,
  bark_device_key_iv TEXT,
  timezone TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO notification_settings (
  id, reminder_days_json, email_enabled, telegram_enabled, bark_enabled, timezone
) VALUES (
  1, '[30,14,7,3,1]', 0, 0, 0, 'Asia/Shanghai'
);

CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  message TEXT NOT NULL,
  details_json TEXT,
  actor_user_id INTEGER,
  success INTEGER NOT NULL CHECK (success IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action, created_at DESC);

CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  registrar_account_id INTEGER,
  status TEXT NOT NULL,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  error_message TEXT,
  FOREIGN KEY (registrar_account_id) REFERENCES registrar_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON sync_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  domain_id INTEGER NOT NULL,
  channel TEXT NOT NULL,
  reminder_days INTEGER NOT NULL,
  scheduled_date TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
  UNIQUE (domain_id, channel, reminder_days, scheduled_date)
);

CREATE TABLE IF NOT EXISTS domain_import_staging (
  import_id TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  full_domain TEXT NOT NULL,
  normalized_domain TEXT NOT NULL,
  name TEXT NOT NULL,
  tld TEXT NOT NULL,
  is_listed INTEGER NOT NULL,
  source_file TEXT NOT NULL,
  buy_now_price TEXT,
  floor_price TEXT,
  min_offer TEXT,
  price_currency TEXT,
  lease_to_own INTEGER,
  max_lease_period INTEGER,
  sale_lander TEXT,
  show_buy_now_option INTEGER,
  show_lease_to_own_option INTEGER,
  show_make_offer_option INTEGER,
  hidden INTEGER,
  listing_status TEXT,
  fast_transfer TEXT,
  views INTEGER,
  leads INTEGER,
  unique_searches_30d INTEGER,
  unique_searches_90d INTEGER,
  unique_searches_365d INTEGER,
  total_searches_30d INTEGER,
  total_searches_90d INTEGER,
  total_searches_365d INTEGER,
  godaddy_ns TEXT,
  date_added_at TEXT,
  raw_metadata_json TEXT NOT NULL,
  PRIMARY KEY (import_id, normalized_domain)
);

CREATE INDEX IF NOT EXISTS idx_import_staging_id ON domain_import_staging(import_id);

CREATE TABLE IF NOT EXISTS domain_import_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_id TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  domain TEXT,
  code TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_domain_import_errors_import ON domain_import_errors(import_id, row_number);
