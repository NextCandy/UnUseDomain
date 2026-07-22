-- 页脚左侧友情链接。display_mode 控制每条的显示形式，与 site_settings 无关，
-- 独立成表以便增删多条；sort_order 相同时按 id 兜底排序。
CREATE TABLE IF NOT EXISTS friend_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  logo_url TEXT,
  display_mode TEXT NOT NULL DEFAULT 'logo_text' CHECK (display_mode IN ('logo_text', 'logo_only', 'text_only')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_friend_links_order ON friend_links(sort_order, id);

INSERT OR IGNORE INTO friend_links (id, name, url, logo_url, display_mode, sort_order)
VALUES (1, '大佬论坛', 'https://www.dalao.net', 'https://www.dalao.net/img/dalao-svg.svg', 'logo_text', 0);
