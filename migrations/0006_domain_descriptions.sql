-- 0006: 公开简介属于管理员维护字段，CSV 导入不得覆盖
PRAGMA foreign_keys = ON;

ALTER TABLE domains ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE domain_import_staging ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE domain_import_staging ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_domains_public_version
  ON domains(is_listed, updated_at DESC);

CREATE TABLE IF NOT EXISTS public_data_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO public_data_version (id, version) VALUES (1, 1);

CREATE TRIGGER IF NOT EXISTS domains_public_version_insert AFTER INSERT ON domains BEGIN
  UPDATE public_data_version SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS domains_public_version_update AFTER UPDATE ON domains BEGIN
  UPDATE public_data_version SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS domains_public_version_delete AFTER DELETE ON domains BEGIN
  UPDATE public_data_version SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1;
END;
