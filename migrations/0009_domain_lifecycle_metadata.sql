-- 域名生命周期元数据：用于后台维护和到期提醒。
-- registrar 仅为显示/记录用文本，不恢复已移除的注册商账户集成功能。

ALTER TABLE domains ADD COLUMN registered_at TEXT;
ALTER TABLE domains ADD COLUMN registrar TEXT;

-- 暂存表不保存业务数据，直接重建以兼容早期线上曾出现过的
-- registered_at / expires_at / registrar_name 试验字段。
DROP TABLE domain_import_staging;
CREATE TABLE domain_import_staging (
  import_id TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  full_domain TEXT NOT NULL,
  normalized_domain TEXT NOT NULL,
  name TEXT NOT NULL,
  tld TEXT NOT NULL,
  is_listed INTEGER NOT NULL,
  source_file TEXT NOT NULL,
  raw_metadata_json TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_featured INTEGER NOT NULL DEFAULT 0,
  registered_at TEXT,
  expires_at TEXT,
  registrar TEXT,
  auto_category TEXT NOT NULL DEFAULT '其他',
  auto_subcategory TEXT NOT NULL DEFAULT 'other',
  auto_category_confidence REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (import_id, normalized_domain)
);
CREATE INDEX idx_import_staging_id ON domain_import_staging(import_id);

CREATE INDEX idx_domains_expires_at ON domains(expires_at);
