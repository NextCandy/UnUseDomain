-- 修正模型名：0019 迁移错误地将 deepseek-v4-flash 改为 deepseek-chat
-- 实际上 deepseek-v4-flash 是 DeepSeek 当前正确的模型名
-- deepseek-chat 将于 2026/07/24 弃用，对应 deepseek-v4-flash 的非思考模式
-- 此迁移将模型名改回正确的 deepseek-v4-flash
UPDATE ai_configs
SET model = 'deepseek-v4-flash'
WHERE model = 'deepseek-chat';
