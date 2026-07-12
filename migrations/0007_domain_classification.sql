-- 0007: 自动分类与管理员人工分类分离；category 继续作为人工覆盖
PRAGMA foreign_keys = ON;

ALTER TABLE domains ADD COLUMN auto_category TEXT NOT NULL DEFAULT '其他';
ALTER TABLE domains ADD COLUMN auto_subcategory TEXT NOT NULL DEFAULT 'other';
ALTER TABLE domains ADD COLUMN auto_category_confidence REAL NOT NULL DEFAULT 0;
ALTER TABLE domain_import_staging ADD COLUMN auto_category TEXT NOT NULL DEFAULT '其他';
ALTER TABLE domain_import_staging ADD COLUMN auto_subcategory TEXT NOT NULL DEFAULT 'other';
ALTER TABLE domain_import_staging ADD COLUMN auto_category_confidence REAL NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_domains_auto_category
  ON domains(auto_category, is_listed);
